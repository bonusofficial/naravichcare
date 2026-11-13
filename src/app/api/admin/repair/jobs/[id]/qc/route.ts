import { NextRequest, NextResponse } from "next/server";
import RepairJob from "@/models/RepairJob";
import { recordAdminLog } from "@/lib/admin-log";
import { adminRepairErrorResponse, CLOSED_STATUSES, concurrentEdit, invalidBody, readJsonObject, repairClosed } from "@/lib/repair/admin-route";
import { parseQcCheck } from "@/lib/repair/admin-validation";
import { ADMIN_JOB_POPULATE, loadScopedRepairJob } from "@/lib/repair/branch-scope";
import { QC_CHECKLIST } from "@/lib/repair/options";

interface Context {
    params: Promise<{ id: string }>;
}

/**
 * Record a QC check against the fixed checklist. A repaired job can only move
 * to ready_pickup once its latest QC passed after it last entered in_progress
 * (enforced by transitionRepairJob).
 */
export async function POST(req: NextRequest, { params }: Context) {
    try {
        const { id } = await params;
        const access = await loadScopedRepairJob(req, id, "edit_repair_jobs", { select: "jobId status" });
        if (!access.ok) return access.error;
        const { job, actor } = access;
        const body = await readJsonObject(req);
        if (!body) return invalidBody();
        const input = parseQcCheck(body);
        if ((CLOSED_STATUSES as readonly string[]).includes(job.status)) return repairClosed();

        const entry = { ...input, checkedBy: actor.name, checkedById: actor.id, checkedAt: new Date() };
        const result = await RepairJob.updateOne(
            { _id: job._id, status: { $nin: CLOSED_STATUSES } },
            { $push: { qcChecks: entry } },
            { runValidators: true },
        );
        if (!result.modifiedCount) return concurrentEdit();

        const failed = QC_CHECKLIST.filter((item) => input.items.some((i) => i.key === item.key && i.result === "fail")).map((item) => item.label);
        await recordAdminLog({
            req,
            actor: { id: actor.id, name: actor.name },
            action: "record_qc_check",
            description: `บันทึก QC งาน ${job.jobId}: ${input.overall === "pass" ? "ผ่าน" : `ไม่ผ่าน (${failed.join(", ")})`}`,
            targetId: String(job._id),
            targetType: "RepairJob",
            details: { overall: input.overall, items: input.items, note: input.note },
        });

        const updated = await RepairJob.findById(job._id).populate(ADMIN_JOB_POPULATE);
        return NextResponse.json(updated, { status: 201 });
    } catch (error) {
        const handled = adminRepairErrorResponse(error);
        if (handled) return handled;
        console.error("QC check error:", error);
        return NextResponse.json({ error: "บันทึก QC ไม่สำเร็จ" }, { status: 500 });
    }
}
