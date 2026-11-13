import { NextRequest, NextResponse } from "next/server";
import { requireRepairAccess } from "@/lib/repair/branch-scope";
import { getRepairDashboard } from "@/lib/repair/dashboard";
import { parseReportPeriod, PeriodInputError } from "@/lib/repair/period";

/**
 * Repair dashboard: per-branch counts and money for the caller's branches.
 *
 * Query: from, to (YYYY-MM-DD in Bangkok time, `to` inclusive; default: this
 * month), branchId (a branch in scope, or "none" for jobs with no branch).
 * Answers 404 for a branch outside the caller's scope.
 */
export async function GET(req: NextRequest) {
    try {
        const access = await requireRepairAccess(req, "view_repair_jobs");
        if (!access.ok) return access.error;

        const { searchParams } = new URL(req.url);
        const period = parseReportPeriod({ from: searchParams.get("from"), to: searchParams.get("to") });
        const dashboard = await getRepairDashboard({
            scope: access.scope,
            period,
            branchId: searchParams.get("branchId"),
        });
        if (!dashboard) return NextResponse.json({ error: "Branch not found" }, { status: 404 });
        return NextResponse.json(dashboard);
    } catch (error) {
        if (error instanceof PeriodInputError) {
            return NextResponse.json({ error: error.message, code: "VALIDATION_ERROR", fields: [error.field] }, { status: 400 });
        }
        console.error("Repair dashboard error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
