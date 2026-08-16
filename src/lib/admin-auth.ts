import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import dbConnect from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import "@/models/Branch";

export type AdminRole = "super_admin" | "admin" | "viewer" | "technician" | "staff";

export class AdminAuthError extends Error {
    constructor(public status: 401 | 403, message: string) {
        super(message);
    }
}

export interface AuthenticatedAdmin {
    id: string;
    username: string;
    name: string;
    role: AdminRole;
    branch: { id: string; name: string; location: string } | null;
}

export async function requireAdmin(allowedRoles?: AdminRole[]): Promise<AuthenticatedAdmin> {
    const token = (await cookies()).get("admin_token")?.value;
    const secret = process.env.JWT_SECRET;
    if (!token || !secret) throw new AdminAuthError(401, "Unauthorized");

    let id: string;
    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
        if (typeof payload.id !== "string") throw new Error("Missing admin id");
        id = payload.id;
    } catch {
        throw new AdminAuthError(401, "Invalid session");
    }

    await dbConnect();
    const user = await AdminUser.findById(id).populate("branchId", "name location").lean();
    if (!user || !user.isActive) throw new AdminAuthError(401, "Inactive or missing user");
    if (allowedRoles && !allowedRoles.includes(user.role as AdminRole)) throw new AdminAuthError(403, "Forbidden");

    const branchDoc = user.branchId as unknown as { _id?: { toString(): string }; name?: string; location?: string } | null;
    return {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        role: user.role as AdminRole,
        branch: branchDoc?._id && branchDoc.name
            ? { id: branchDoc._id.toString(), name: branchDoc.name, location: branchDoc.location || "" }
            : null,
    };
}

export function authErrorResponse(error: unknown): { status: number; message: string } | null {
    return error instanceof AdminAuthError ? { status: error.status, message: error.message } : null;
}
