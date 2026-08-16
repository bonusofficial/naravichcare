import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import Branch from "@/models/Branch";
import { checkPermission } from "@/lib/check-permission";
import { validatePassword } from "@/lib/password-policy";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { authorized, error } = await checkPermission(req, "edit_admin_users");
        if (!authorized) return error;

        await dbConnect();
        const { id } = await params;
        const data = await req.json();

        const updatedUser = await AdminUser.findById(id);
        if (!updatedUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { name, role, email, isActive, branchId, password } = data;

        if (branchId && (!mongoose.isValidObjectId(branchId) || !(await Branch.exists({ _id: branchId, isActive: true })))) {
            return NextResponse.json({ error: "Branch not found or inactive" }, { status: 400 });
        }

        // Whitelist the editable fields rather than assigning the raw body, so a
        // client cannot set arbitrary schema paths.
        if (typeof name === "string") updatedUser.name = name;
        if (typeof role === "string") updatedUser.role = role;
        if (typeof email === "string") updatedUser.email = email;
        if (typeof isActive === "boolean") updatedUser.isActive = isActive;
        if (branchId === "" || branchId === null) updatedUser.branchId = undefined;
        else if (typeof branchId === "string" && mongoose.isValidObjectId(branchId)) {
            updatedUser.branchId = new mongoose.Types.ObjectId(branchId);
        }

        if (password) {
            const passwordError = validatePassword(password);
            if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
            updatedUser.password = password;
        }

        // save() rather than findByIdAndUpdate() so the pre-save hook hashes a
        // changed password; findByIdAndUpdate skips it and stored plaintext.
        await updatedUser.save();

        // Record Admin Log
        const { recordAdminLog } = await import("@/lib/admin-log");
        await recordAdminLog({
            action: "update_admin",
            description: `แก้ไขข้อมูลแอดมิน: ${updatedUser.name} (User: ${updatedUser.username})`,
            targetId: updatedUser._id.toString(),
            targetType: "AdminUser",
            details: { name: updatedUser.name, role: updatedUser.role, isActive: updatedUser.isActive },
            req
        });

        const { password: _omit, ...safeUser } = updatedUser.toObject();
        return NextResponse.json(safeUser);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update admin user" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { authorized, user, error } = await checkPermission(req, "delete_admin_users");
        if (!authorized) return error;

        await dbConnect();
        const { id } = await params;
        const deletedUser = await AdminUser.findByIdAndDelete(id);
        if (!deletedUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Record Admin Log
        const { recordAdminLog } = await import("@/lib/admin-log");
        await recordAdminLog({
            action: "delete_admin",
            description: `ลบแอดมิน: ${deletedUser.name} (User: ${deletedUser.username})`,
            targetId: id,
            targetType: "AdminUser",
            details: { name: deletedUser.name, username: deletedUser.username },
            req
        });

        return NextResponse.json({ message: "User deleted successfully" });
    } catch {
        return NextResponse.json({ error: "Failed to delete admin user" }, { status: 500 });
    }
}
