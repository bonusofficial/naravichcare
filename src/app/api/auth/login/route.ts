import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    console.log("LOGIN_ATTEMPT: Connection initiated");

    try {
        // 1. Initial Checks
        const secretKey = process.env.JWT_SECRET || "navarichcare_secret_key_12345";
        const JWT_SECRET = new TextEncoder().encode(secretKey);

        // 2. Database Connection
        try {
            await dbConnect();
            console.log("LOGIN_ATTEMPT: DB Connected");
        } catch (dbErr: any) {
            console.error("LOGIN_ATTEMPT: DB Connection Failed", dbErr);
            return NextResponse.json({
                error: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้",
                details: dbErr.message
            }, { status: 500 });
        }

        // 3. Parse Body
        let body;
        try {
            body = await req.json();
            console.log("LOGIN_ATTEMPT: Payload received for", body.username);
        } catch (jsonErr: any) {
            return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
        }

        const { username, password } = body;
        if (!username || !password) {
            return NextResponse.json({ error: "กรุณากรอก Username และ Password" }, { status: 400 });
        }

        // 4. Find User & Verify
        // We use lean() for better performance and to avoid some Mongoose method issues in dev
        const user = await AdminUser.findOne({ username }).select("+password").lean();

        if (!user) {
            console.log("LOGIN_ATTEMPT: User not found:", username);
            return NextResponse.json({ error: "Username หรือ Password ไม่ถูกต้อง" }, { status: 401 });
        }

        if (!user.isActive) {
            console.log("LOGIN_ATTEMPT: User is inactive:", username);
            return NextResponse.json({ error: "บัญชีนี้ยังไม่ถูกเปิดใช้งาน" }, { status: 401 });
        }

        // 5. Password Check (Manual Bcrypt to be safe)
        console.log("LOGIN_ATTEMPT: Verifying password...");
        if (!user.password) {
            console.error("LOGIN_ATTEMPT: Password field missing in DB for user", username);
            return NextResponse.json({ error: "ข้อมูลบัญชีมีปัญหา (No password stored)" }, { status: 500 });
        }

        const isMatch = await bcrypt.compare(password, user.password as string);
        if (!isMatch) {
            console.log("LOGIN_ATTEMPT: Password mismatch for", username);
            return NextResponse.json({ error: "Username หรือ Password ไม่ถูกต้อง" }, { status: 401 });
        }

        // 6. Generate Token
        console.log("LOGIN_ATTEMPT: Creating session...");
        let token;
        try {
            token = await new SignJWT({
                id: user._id.toString(),
                username: user.username,
                role: user.role
            })
                .setProtectedHeader({ alg: "HS256" })
                .setIssuedAt()
                .setExpirationTime("24h")
                .sign(JWT_SECRET);
        } catch (jwtErr: any) {
            console.error("LOGIN_ATTEMPT: JWT Generation Failed", jwtErr);
            return NextResponse.json({ error: "ไม่สามารถสร้าง Token ได้", details: jwtErr.message }, { status: 500 });
        }

        // 7. Set Cookie
        console.log("LOGIN_ATTEMPT: Setting cookie...");
        try {
            const cookieStore = await cookies();
            cookieStore.set("admin_token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24, // 1 day
                path: "/",
            });
        } catch (cookErr: any) {
            console.error("LOGIN_ATTEMPT: Cookie setting failed", cookErr);
            // This is critical since middleware depends on it
            return NextResponse.json({ error: "ไม่สามารถบันทึก Cookie ได้", details: cookErr.message }, { status: 500 });
        }

        console.log("LOGIN_ATTEMPT: Login Successful!");
        return NextResponse.json({
            success: true,
            user: { username: user.username, name: (user as any).name, role: user.role }
        });

    } catch (globalErr: any) {
        console.error("LOGIN_ATTEMPT: UNEXPECTED ERROR", globalErr);
        return NextResponse.json({
            error: "เกิดข้อผิดพลาดที่ไม่คาดคิด",
            debug: globalErr.message,
            stack: globalErr.stack
        }, { status: 500 });
    }
}
