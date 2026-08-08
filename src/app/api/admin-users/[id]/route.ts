import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import Branch from "@/models/Branch";
import { validatePassword } from "@/lib/password-policy";
import mongoose from "mongoose";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const data = await req.json();
        const user = await AdminUser.findById(id).select("+password");
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { name, role, email, isActive, branchId } = data;
        if (branchId && (!mongoose.isValidObjectId(branchId) || !(await Branch.exists({ _id: branchId, isActive: true })))) {
            return NextResponse.json({ error: "Branch not found or inactive" }, { status: 400 });
        }
        if (typeof name === "string") user.name = name;
        if (typeof role === "string") user.role = role;
        if (typeof email === "string") user.email = email;
        if (typeof isActive === "boolean") user.isActive = isActive;
        if (branchId === "" || branchId === null) user.branchId = undefined;
        else if (typeof branchId === "string" && mongoose.isValidObjectId(branchId)) user.branchId = new mongoose.Types.ObjectId(branchId);

        if (data.password) {
            const passwordError = validatePassword(data.password);
            if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
            user.password = data.password;
        }

        await user.save();

        // Record Admin Log
        const { recordAdminLog } = await import("@/lib/admin-log");
        await recordAdminLog({
            action: "update_admin",
            description: `แก้ไขข้อมูลแอดมิน: ${user.name} (User: ${user.username})`,
            targetId: user._id.toString(),
            targetType: "AdminUser",
            details: { name: user.name, role: user.role, isActive: user.isActive },
            req
        });

        const response = user.toObject();
        delete response.password;
        return NextResponse.json(response);
    } catch {
        return NextResponse.json({ error: "Failed to update admin user" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const user = await AdminUser.findByIdAndDelete(id);
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Record Admin Log
        const { recordAdminLog } = await import("@/lib/admin-log");
        await recordAdminLog({
            action: "delete_admin",
            description: `ลบแอดมิน: ${user.name} (User: ${user.username})`,
            targetId: id,
            targetType: "AdminUser",
            details: { name: user.name, username: user.username },
            req
        });

        return NextResponse.json({ message: "User deleted successfully" });
    } catch {
        return NextResponse.json({ error: "Failed to delete admin user" }, { status: 500 });
    }
}
