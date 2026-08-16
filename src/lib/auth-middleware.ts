import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import connectToDatabase from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { Permission, hasPermission } from "@/lib/permissions";
import { JWT_SECRET } from "@/lib/jwt";
import { cookies } from "next/headers";

export interface AuthenticatedRequest extends NextRequest {
    user?: any;
}

// Get current admin user from JWT token (for App Router Route Handlers)
export async function getCurrentAdmin(req?: NextRequest) {
    try {
        let token: string | undefined;

        if (req) {
            // If NextRequest is provided, use it
            token = req.cookies.get("admin_token")?.value;
        } else {
            // Otherwise, use cookies() from next/headers
            const cookieStore = await cookies();
            token = cookieStore.get("admin_token")?.value;
        }

        if (!token) return null;

        const { payload } = await jwtVerify(token, JWT_SECRET);

        await connectToDatabase();
        // Never hand the bcrypt hash to callers; several routes return this
        // document straight to the client.
        const user = await AdminUser.findById(payload.id).select("-password");

        return user;
    } catch (error) {
        return null;
    }
}

// Middleware to check if user has required permission
export function requirePermission(...permissions: Permission[]) {
    return async (req: NextRequest) => {
        const user = await getCurrentAdmin(req);

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized - Please login" },
                { status: 401 }
            );
        }

        if (!user.isActive) {
            return NextResponse.json(
                { success: false, error: "Your account is deactivated" },
                { status: 403 }
            );
        }

        // Check if user has any of the required permissions
        const hasAccess = permissions.some(permission => hasPermission(user, permission));

        if (!hasAccess) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Forbidden - You don't have permission to access this resource",
                    required: permissions,
                    role: user.role
                },
                { status: 403 }
            );
        }

        return null; // Permission granted
    };
}

// Middleware to require authentication only (no specific permission)
export async function requireAuth(req: NextRequest) {
    const user = await getCurrentAdmin(req);

    if (!user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized - Please login" },
            { status: 401 }
        );
    }

    if (!user.isActive) {
        return NextResponse.json(
            { success: false, error: "Your account is deactivated" },
            { status: 403 }
        );
    }

    return null; // Authenticated
}

// Helper to wrap API route with permission check
export function withPermission(permissions: Permission[], handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
    return async (req: NextRequest) => {
        const user = await getCurrentAdmin(req);

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (!user.isActive) {
            return NextResponse.json(
                { success: false, error: "Account deactivated" },
                { status: 403 }
            );
        }

        const hasAccess = permissions.some(permission => hasPermission(user, permission));

        if (!hasAccess) {
            return NextResponse.json(
                { success: false, error: "Forbidden - Insufficient permissions" },
                { status: 403 }
            );
        }

        return handler(req, user);
    };
}
