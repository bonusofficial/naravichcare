import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const data = await req.json();
        const user = await AdminUser.findByIdAndUpdate(id, data, { new: true });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

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

        return NextResponse.json(user);
    } catch (error) {
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
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete admin user" }, { status: 500 });
    }
}
