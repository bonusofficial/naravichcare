import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import Branch from "@/models/Branch";
import { validatePassword } from "@/lib/password-policy";

export async function GET() {
    try {
        await dbConnect();
        const users = await AdminUser.find({}).select("-password").populate("branchId", "name location").sort({ createdAt: -1 });
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

        const passwordError = validatePassword(data.password);
        if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

        const { username, password, name, role, email, isActive = true, branchId } = data;
        if (branchId && (!mongoose.isValidObjectId(branchId) || !(await Branch.exists({ _id: branchId, isActive: true })))) {
            return NextResponse.json({ error: "Branch not found or inactive" }, { status: 400 });
        }

        const user = await AdminUser.create({ username, password, name, role, email, isActive, branchId: branchId || undefined });

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

        const response = user.toObject();
        delete response.password;
        return NextResponse.json(response, { status: 201 });
    } catch (error: unknown) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
            return NextResponse.json({ error: "Username already exists" }, { status: 400 });
        }
        console.error("Create Admin Error:", error);
        return NextResponse.json({ error: "Failed to create admin user" }, { status: 500 });
    }
}
