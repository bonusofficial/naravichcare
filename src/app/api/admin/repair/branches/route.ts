import { NextRequest, NextResponse } from "next/server";
import { branchesInScope, requireRepairAccess } from "@/lib/repair/branch-scope";

/**
 * Active branches the caller can work in, for the branch pickers on the repair
 * pages. /api/admin/branches lists every branch but is super_admin only.
 */
export async function GET(req: NextRequest) {
    try {
        const access = await requireRepairAccess(req, "view_repair_jobs");
        if (!access.ok) return access.error;
        const branches = await branchesInScope(access.scope);
        return NextResponse.json({ branches, allBranches: access.scope.all });
    } catch (error) {
        console.error("Fetch repair branches error:", error);
        return NextResponse.json({ error: "Failed to fetch branches" }, { status: 500 });
    }
}
