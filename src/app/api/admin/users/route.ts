import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import Branch from "@/models/Branch";
import { recordAdminLog } from "@/lib/admin-log";
import { validatePassword } from "@/lib/password-policy";

export async function GET() {
    try {
        await dbConnect();
        const users = await AdminUser.find({}).select("-password").populate("branchId", "name location").sort({ createdAt: -1 });
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
        const { username, password, name, role, email, branchId } = body;
        const passwordError = validatePassword(password);
        if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
        if (branchId && (!mongoose.isValidObjectId(branchId) || !(await Branch.exists({ _id: branchId, isActive: true })))) {
            return NextResponse.json({ error: "Branch not found or inactive" }, { status: 400 });
        }

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
            branchId: branchId || undefined,
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

        const user = await AdminUser.findById(id).select("+password");
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { username, password, name, role, email, isActive, branchId } = updateData;
        if (branchId && (!mongoose.isValidObjectId(branchId) || !(await Branch.exists({ _id: branchId, isActive: true })))) {
            return NextResponse.json({ error: "Branch not found or inactive" }, { status: 400 });
        }
        if (typeof username === "string") user.username = username;
        if (typeof name === "string") user.name = name;
        if (typeof role === "string") user.role = role;
        if (typeof email === "string") user.email = email;
        if (typeof isActive === "boolean") user.isActive = isActive;
        if (branchId === "" || branchId === null) user.branchId = undefined;
        else if (typeof branchId === "string") user.branchId = branchId;

        if (password) {
            const passwordError = validatePassword(password);
            if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
            user.password = password;
        }

        await user.save();
        const updatedUser = user.toObject();
        delete updatedUser.password;

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
