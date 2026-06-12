import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const adminToken = request.cookies.get("admin_token")?.value;

    // 1. If trying to access admin pages (except login)
    if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
        if (!adminToken) {
            return NextResponse.redirect(new URL("/admin/login", request.url));
        }

        try {
            // Verify token
            await jwtVerify(adminToken, JWT_SECRET);
            return NextResponse.next();
        } catch (error) {
            // Token invalid or expired
            const response = NextResponse.redirect(new URL("/admin/login", request.url));
            response.cookies.delete("admin_token");
            return response;
        }
    }

    // 2. If already logged in and trying to access login page
    if (pathname === "/admin/login" && adminToken) {
        try {
            await jwtVerify(adminToken, JWT_SECRET);
            return NextResponse.redirect(new URL("/admin", request.url));
        } catch (error) {
            // Token invalid, let them stay on login page
            return NextResponse.next();
        }
    }

    return NextResponse.next();
}

// Config to match only admin routes
export const config = {
    matcher: ["/admin/:path*"],
};
