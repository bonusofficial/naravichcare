import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import AdminLog from "@/models/AdminLog";
import dbConnect from "@/lib/mongodb";
import { JWT_SECRET } from "@/lib/jwt";
import { redact } from "@/lib/integration/redact";

interface LogParams {
    action: string;
    description: string;
    targetId?: string;
    targetType?: string;
    details?: unknown;
    req?: Request;
    /**
     * Who acted, when the caller already knows. Required outside an admin
     * cookie session (integration clients) and avoids re-verifying the JWT.
     */
    actor?: { id?: string | null; name: string };
}

export async function recordAdminLog({ action, description, targetId, targetType, details, req, actor }: LogParams) {
    try {
        await dbConnect();

        let adminId = actor?.id ?? null;
        let adminName = actor?.name ?? "System";

        // 1. Get current admin from cookie
        const token = actor ? undefined : (await cookies()).get("admin_token")?.value;

        if (token) {
            try {
                const secretKey = process.env.JWT_SECRET;
                if (!secretKey) throw new Error("JWT_SECRET is not configured");
                const { payload } = await jwtVerify(token, new TextEncoder().encode(secretKey));
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
            ipAddress = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
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
            // Secrets and base64 blobs never belong in the audit trail; customer
            // fields stay because admins audit changes to them.
            details: details === undefined ? undefined : redact(details, { customerPii: false, maxString: 20_000, maxArray: 1_000 }),
            ipAddress,
            userAgent
        });

    } catch (error) {
        console.error("Failed to record admin log:", error);
    }
}
