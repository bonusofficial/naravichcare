import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { checkPermission } from "@/lib/check-permission";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { authorized, user, error } = await checkPermission(req, "edit_admin_users");
        if (!authorized) return error;

        await dbConnect();
        const { id } = await params;
        const data = await req.json();

        const updatedUser = await AdminUser.findById(id);
        if (!updatedUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Assign and save() rather than findByIdAndUpdate() so the pre-save hook
        // hashes a new password. findByIdAndUpdate skips the hook, which stored
        // whatever plaintext the client sent. An omitted/blank password means
        // "leave the existing one alone".
        const { password, ...rest } = data;
        Object.assign(updatedUser, rest);
        if (password) updatedUser.password = password;
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
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete admin user" }, { status: 500 });
    }
}
