import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { recordAdminLog } from "@/lib/admin-log";

export async function GET() {
    try {
        await dbConnect();
        const users = await AdminUser.find({}).select("-password").sort({ createdAt: -1 });
        return NextResponse.json(users);
    } catch (error) {
        console.error("Fetch Users Error:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        const { username, password, name, role, email } = body;

        // Check for existing user
        const existing = await AdminUser.findOne({ username });
        if (existing) {
            return NextResponse.json({ error: "Username already exists" }, { status: 400 });
        }

        const newUser = await AdminUser.create({
            username,
            password,
            name,
            role,
            email,
            isActive: true
        });

        // ACTIVITY LOG
        await recordAdminLog({
            req,
            action: "create_user",
            description: `เพิ่มพนักงานใหม่ชื่อ "${newUser.name}" (@${newUser.username}) ระดับสิทธิ์: ${newUser.role}`,
            targetId: newUser._id.toString(),
            targetType: "AdminUser"
        });

        const userResponse = newUser.toObject();
        delete userResponse.password;

        return NextResponse.json(userResponse, { status: 201 });
    } catch (error) {
        console.error("Create User Error:", error);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });

        const updatedUser = await AdminUser.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        ).select("-password");

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("Update User Error:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });

        const userToDelete = await AdminUser.findById(id);
        if (!userToDelete) return NextResponse.json({ error: "User not found" }, { status: 404 });

        await AdminUser.findByIdAndDelete(id);

        // ACTIVITY LOG
        await recordAdminLog({
            req,
            action: "delete_user",
            description: `ลบพนักงานชื่อ "${userToDelete.name}" (@${userToDelete.username}) ออกจากระบบ`,
            targetId: id,
            targetType: "AdminUser"
        });

        return NextResponse.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Delete User Error:", error);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
