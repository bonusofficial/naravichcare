import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth-middleware";
import { resolveRolePermissions } from "@/lib/check-permission";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentAdmin(req);

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Don't send password to client
        const { password, ...userWithoutPassword } = user.toObject();

        // Ship the resolved permissions with the user so the admin UI has one
        // source for both. The sidebar used to fetch these from
        // /api/admin/roles, which needs view_roles - a permission technician and
        // staff don't have, so their menu silently rendered empty.
        const permissions = await resolveRolePermissions(user.role);

        return NextResponse.json({ user: userWithoutPassword, permissions }, { status: 200 });
    } catch (error) {
        console.error("Get current user error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
