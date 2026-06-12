import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";

export async function GET() {
    try {
        await dbConnect();
        const users = await AdminUser.find({}).sort({ createdAt: -1 });
        return NextResponse.json(users);
    } catch (error) {
        console.error("Failed to fetch admin users:", error);
        return NextResponse.json({ error: "Failed to fetch admin users" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await dbConnect();
        const data = await req.json();

        // Add a default password if not provided (though the UI should provide it)
        if (!data.password) {
            data.password = "Admin@12345"; // Default temporary password
        }

        const user = await AdminUser.create(data);

        // Record Admin Log
        const { recordAdminLog } = await import("@/lib/admin-log");
        await recordAdminLog({
            action: "create_admin",
            description: `สร้างแอดมินใหม่: ${user.name} (User: ${user.username})`,
            targetId: user._id.toString(),
            targetType: "AdminUser",
            details: { name: user.name, role: user.role },
            req
        });

        return NextResponse.json(user, { status: 201 });
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "Username already exists" }, { status: 400 });
        }
        console.error("Create Admin Error:", error);
        return NextResponse.json({ error: "Failed to create admin user" }, { status: 500 });
    }
}
