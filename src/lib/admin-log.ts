import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import AdminLog from "@/models/AdminLog";
import dbConnect from "@/lib/mongodb";

const secretKey = process.env.JWT_SECRET || "navarichcare_secret_key_12345";
const JWT_SECRET = new TextEncoder().encode(secretKey);

interface LogParams {
    action: string;
    description: string;
    targetId?: string;
    targetType?: string;
    details?: any;
    req?: Request;
}

export async function recordAdminLog({ action, description, targetId, targetType, details, req }: LogParams) {
    try {
        await dbConnect();

        // 1. Get current admin from cookie
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_token")?.value;

        let adminId = null;
        let adminName = "System";

        if (token) {
            try {
                const { payload } = await jwtVerify(token, JWT_SECRET);
                adminId = payload.id as string;
                adminName = (payload.username as string) || "Unknown Admin";
            } catch (err) {
                console.error("Log: Failed to verify token", err);
            }
        }

        // 2. Get IP and User Agent if request object is provided
        let ipAddress = "";
        let userAgent = "";

        if (req) {
            ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
            userAgent = req.headers.get("user-agent") || "";
        }

        // 3. Create log entry
        await AdminLog.create({
            adminId,
            adminName,
            action,
            description,
            targetId,
            targetType,
            details,
            ipAddress,
            userAgent
        });

    } catch (error) {
        console.error("Failed to record admin log:", error);
    }
}
