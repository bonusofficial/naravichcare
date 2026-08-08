import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientKey(req: Request, username: string) {
    const ip = req.headers.get("cf-connecting-ip")
        || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || "unknown";
    return `${ip}:${username.toLowerCase()}`;
}

export async function POST(req: Request) {
    try {
        const secretKey = process.env.JWT_SECRET;
        if (!secretKey || secretKey.length < 32) {
            console.error("JWT_SECRET is missing or shorter than 32 characters");
            return NextResponse.json({ error: "Server authentication is not configured" }, { status: 500 });
        }
        const JWT_SECRET = new TextEncoder().encode(secretKey);

        try {
            await dbConnect();
        } catch (dbErr) {
            console.error("LOGIN_ATTEMPT: DB Connection Failed", dbErr);
            return NextResponse.json({ error: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้" }, { status: 500 });
        }

        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
        }

        const { username, password } = body;
        if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
            return NextResponse.json({ error: "กรุณากรอก Username และ Password" }, { status: 400 });
        }

        const attemptKey = getClientKey(req, username);
        const now = Date.now();
        const existingAttempt = loginAttempts.get(attemptKey);
        if (existingAttempt && existingAttempt.resetAt > now && existingAttempt.count >= LOGIN_MAX_ATTEMPTS) {
            return NextResponse.json(
                { error: "ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาที" },
                { status: 429, headers: { "Retry-After": String(Math.ceil((existingAttempt.resetAt - now) / 1000)) } }
            );
        }
        if (existingAttempt && existingAttempt.resetAt <= now) loginAttempts.delete(attemptKey);

        const user = await AdminUser.findOne({ username }).select("+password").lean();

        if (!user || !user.password || !user.isActive) {
            const attempt = loginAttempts.get(attemptKey);
            loginAttempts.set(attemptKey, {
                count: (attempt?.count || 0) + 1,
                resetAt: attempt?.resetAt || now + LOGIN_WINDOW_MS,
            });
            return NextResponse.json({ error: "Username หรือ Password ไม่ถูกต้อง" }, { status: 401 });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const attempt = loginAttempts.get(attemptKey);
            loginAttempts.set(attemptKey, {
                count: (attempt?.count || 0) + 1,
                resetAt: attempt?.resetAt || now + LOGIN_WINDOW_MS,
            });
            return NextResponse.json({ error: "Username หรือ Password ไม่ถูกต้อง" }, { status: 401 });
        }

        loginAttempts.delete(attemptKey);
        let token;
        try {
            token = await new SignJWT({
                id: user._id.toString(),
                username: user.username,
                role: user.role
            })
                .setProtectedHeader({ alg: "HS256" })
                .setIssuedAt()
                .setExpirationTime("8h")
                .sign(JWT_SECRET);
        } catch (jwtErr) {
            console.error("LOGIN_ATTEMPT: JWT Generation Failed", jwtErr);
            return NextResponse.json({ error: "ไม่สามารถสร้าง Token ได้" }, { status: 500 });
        }

        try {
            const cookieStore = await cookies();
            cookieStore.set("admin_token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 8,
                path: "/",
            });
        } catch (cookErr) {
            console.error("LOGIN_ATTEMPT: Cookie setting failed", cookErr);
            return NextResponse.json({ error: "ไม่สามารถบันทึก Cookie ได้" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            user: { username: user.username, name: user.name, role: user.role }
        });

    } catch (globalErr) {
        console.error("LOGIN_ATTEMPT: UNEXPECTED ERROR", globalErr);
        return NextResponse.json({ error: "เกิดข้อผิดพลาดที่ไม่คาดคิด" }, { status: 500 });
    }
}
