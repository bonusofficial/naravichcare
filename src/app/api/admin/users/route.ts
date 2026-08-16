import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { recordAdminLog } from "@/lib/admin-log";
import { checkPermission } from "@/lib/check-permission";

// Used by /admin/repair/users to manage repair staff. It reads and writes
// AdminUser records, so it is gated on the admin-user permissions rather than
// the repair ones - a POST here can mint an account of any role.
export async function GET(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "view_admin_users");
        if (!authorized) return error;

        await dbConnect();
        const users = await AdminUser.find({}).select("-password").sort({ createdAt: -1 });
        return NextResponse.json(users);
    } catch (error) {
        console.error("Fetch Users Error:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "create_admin_users");
        if (!authorized) return error;

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

export async function PATCH(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "edit_admin_users");
        if (!authorized) return error;

        await dbConnect();
        const body = await req.json();
        const { id, password, ...updateData } = body;

        if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });

        const updatedUser = await AdminUser.findById(id);
        if (!updatedUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // save() rather than findByIdAndUpdate() so the pre-save hook hashes a
        // changed password; an omitted/blank one leaves the existing hash alone.
        Object.assign(updatedUser, updateData);
        if (password) updatedUser.password = password;
        await updatedUser.save();

        await recordAdminLog({
            req,
            action: "update_user",
            description: `แก้ไขข้อมูลพนักงาน "${updatedUser.name}" (@${updatedUser.username})`,
            targetId: id,
            targetType: "AdminUser",
            details: updateData
        });

        const { password: _omit, ...safeUser } = updatedUser.toObject();
        return NextResponse.json(safeUser);
    } catch (error) {
        console.error("Update User Error:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "delete_admin_users");
        if (!authorized) return error;

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
