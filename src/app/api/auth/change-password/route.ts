import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { validatePassword } from "@/lib/password-policy";

export async function POST(req: Request) {
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 32) {
            return NextResponse.json({ error: "Server authentication is not configured" }, { status: 500 });
        }

        const cookieStore = await cookies();
        const token = cookieStore.get("admin_token")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
        if (typeof payload.id !== "string") {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        const body = await req.json();
        const { currentPassword, newPassword } = body;
        if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
            return NextResponse.json({ error: "กรุณากรอกรหัสผ่านให้ครบ" }, { status: 400 });
        }

        const passwordError = validatePassword(newPassword);
        if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
        if (currentPassword === newPassword) {
            return NextResponse.json({ error: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม" }, { status: 400 });
        }

        await dbConnect();
        const user = await AdminUser.findById(payload.id).select("+password");
        if (!user || !user.isActive || !user.password) {
            return NextResponse.json({ error: "ไม่พบบัญชีผู้ใช้" }, { status: 401 });
        }

        const matches = await bcrypt.compare(currentPassword, user.password);
        if (!matches) {
            return NextResponse.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 401 });
        }

        user.password = newPassword;
        await user.save();
        cookieStore.delete("admin_token");

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Change Password Error:", error);
        return NextResponse.json({ error: "ไม่สามารถเปลี่ยนรหัสผ่านได้" }, { status: 500 });
    }
}
