import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireRepairAccess } from "@/lib/repair/branch-scope";
import Branch from "@/models/Branch";

/**
 * Every active branch, for the "send device to" picker on the job page. A
 * device may be sent to any branch, not only the caller's own.
 */
export async function GET(req: NextRequest) {
    try {
        const access = await requireRepairAccess(req, "view_repair_jobs");
        if (!access.ok) return access.error;
        await dbConnect();
        const branches = await Branch.find({ isActive: true }).select("name location").sort({ name: 1 }).lean();
        return NextResponse.json({ branches });
    } catch (error) {
        console.error("Fetch movement targets error:", error);
        return NextResponse.json({ error: "Failed to fetch branches" }, { status: 500 });
    }
}
