import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/jwt";

function unauthorized(request: NextRequest) {
    const { pathname } = request.nextUrl;
    if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const adminToken = request.cookies.get("admin_token")?.value;
    const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
    const isAdminApi = pathname.startsWith("/api/admin/")
        || pathname === "/api/admin-users"
        || pathname.startsWith("/api/admin-users/")
        || pathname === "/api/auth/change-password";
    const isUserManagementApi = pathname === "/api/admin/users" || pathname === "/api/admin-users" || pathname.startsWith("/api/admin-users/");
    // Machine credentials: super_admin only. The route handlers re-check the
    // role from the database; this only stops other roles earlier.
    const isIntegrationKeyApi = pathname === "/api/admin/integration-keys" || pathname.startsWith("/api/admin/integration-keys/");
    const isIntegrationKeyPage = pathname === "/admin/settings/integration-keys" || pathname.startsWith("/admin/settings/integration-keys/");

    if (isAdminPage || isAdminApi) {
        if (!adminToken) {
            return unauthorized(request);
        }

        try {
            const secret = process.env.JWT_SECRET;
            if (!secret || secret.length < 32) {
                console.error("JWT_SECRET is missing or shorter than 32 characters");
                return NextResponse.json({ error: "Server authentication is not configured" }, { status: 500 });
            }

            const { payload } = await jwtVerify(adminToken, new TextEncoder().encode(secret));

            if ((isUserManagementApi || isIntegrationKeyApi) && payload.role !== "super_admin") {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            if (isIntegrationKeyPage && payload.role !== "super_admin") {
                return NextResponse.redirect(new URL("/admin", request.url));
            }

            return NextResponse.next();
        } catch {
            return unauthorized(request);
        }
    }

    if (pathname === "/admin/login" && adminToken) {
        try {
            const secret = process.env.JWT_SECRET;
            if (!secret) return NextResponse.next();
            await jwtVerify(adminToken, new TextEncoder().encode(secret));
            return NextResponse.redirect(new URL("/admin", request.url));
        } catch {
            return NextResponse.next();
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*", "/api/admin-users/:path*", "/api/auth/change-password"],
};
