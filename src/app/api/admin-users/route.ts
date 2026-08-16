import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { checkPermission } from "@/lib/check-permission";

export async function GET(req: NextRequest) {
    try {
        const { authorized, user, error } = await checkPermission(req, "view_admin_users");
        if (!authorized) return error;

        await dbConnect();
        // Never return the bcrypt hash to the client.
        const users = await AdminUser.find({}).select("-password").sort({ createdAt: -1 });
        return NextResponse.json(users);
    } catch (error) {
        console.error("Failed to fetch admin users:", error);
        return NextResponse.json({ error: "Failed to fetch admin users" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { authorized, user, error } = await checkPermission(req, "create_admin_users");
        if (!authorized) return error;

        await dbConnect();
        const data = await req.json();

        const passwordError = validatePassword(data.password);
        if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

        const { username, password, name, role, email, isActive = true, branchId } = data;
        if (branchId && (!mongoose.isValidObjectId(branchId) || !(await Branch.exists({ _id: branchId, isActive: true })))) {
            return NextResponse.json({ error: "Branch not found or inactive" }, { status: 400 });
        }

        const newUser = await AdminUser.create(data);

        // Record Admin Log
        const { recordAdminLog } = await import("@/lib/admin-log");
        await recordAdminLog({
            action: "create_admin",
            description: `สร้างแอดมินใหม่: ${newUser.name} (User: ${newUser.username})`,
            targetId: newUser._id.toString(),
            targetType: "AdminUser",
            details: { name: newUser.name, role: newUser.role },
            req
        });

        const { password, ...safeUser } = newUser.toObject();
        return NextResponse.json(safeUser, { status: 201 });
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "Username already exists" }, { status: 400 });
        }
        console.error("Create Admin Error:", error);
        return NextResponse.json({ error: "Failed to create admin user" }, { status: 500 });
    }
}
