import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireRepairAccess } from "@/lib/repair/branch-scope";
import { listRepairTechnicians } from "@/lib/repair/technicians";

/** Staff who can be assigned to a repair job, optionally only those working in `branchId`. */
export async function GET(req: NextRequest) {
    try {
        const access = await requireRepairAccess(req, "view_repair_jobs");
        if (!access.ok) return access.error;
        const branchId = new URL(req.url).searchParams.get("branchId");
        const technicians = await listRepairTechnicians(branchId && mongoose.isValidObjectId(branchId) ? branchId : null);
        return NextResponse.json({ technicians });
    } catch (error) {
        console.error("Fetch repair technicians error:", error);
        return NextResponse.json({ error: "Failed to fetch technicians" }, { status: 500 });
    }
}
