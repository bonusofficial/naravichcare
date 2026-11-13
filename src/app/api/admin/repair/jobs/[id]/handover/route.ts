import { NextRequest, NextResponse } from "next/server";
import RepairJob from "@/models/RepairJob";
import { recordAdminLog } from "@/lib/admin-log";
import { sendLineFlexMessage } from "@/lib/line-messaging";
import { adminRepairErrorResponse, invalidBody, readJsonObject } from "@/lib/repair/admin-route";
import { parseHandover } from "@/lib/repair/admin-validation";
import { ADMIN_JOB_POPULATE, loadScopedRepairJob } from "@/lib/repair/branch-scope";
import { REPAIR_OUTCOME } from "@/lib/repair/options";
import { transitionRepairJob } from "@/lib/repair/service";
import { repairStatusLabel } from "@/lib/repair/status";

interface Context {
    params: Promise<{ id: string }>;
}

/**
 * Close the job: record who took the device back, who handed it over and
 * when, and move it from ready_pickup to completed in the same update. Used
 * for repaired and not-repaired jobs alike.
 */
export async function POST(req: NextRequest, { params }: Context) {
    try {
        const { id } = await params;
        const access = await loadScopedRepairJob(req, id, "edit_repair_jobs");
        if (!access.ok) return access.error;
        const { job, actor } = access;
        const body = await readJsonObject(req);
        if (!body) return invalidBody();
        const input = parseHandover(body);
        if (job.status !== "ready_pickup") {
            return NextResponse.json({
                error: `ส่งมอบเครื่องได้เฉพาะงานที่อยู่ในสถานะ "${repairStatusLabel("ready_pickup")}" (สถานะปัจจุบัน: "${repairStatusLabel(job.status)}")`,
                code: job.status === "completed" || job.status === "cancelled" ? "REPAIR_CLOSED" : "INVALID_STATUS_TRANSITION",
            }, { status: 409 });
        }
        const handedOverAt = input.handedOverAt ?? new Date();
        if (job.receivedAt && handedOverAt.getTime() < new Date(job.receivedAt).getTime()) {
            return NextResponse.json({ error: "เวลาส่งมอบต้องไม่ก่อนเวลารับเครื่อง", code: "VALIDATION_ERROR", fields: ["handedOverAt"] }, { status: 400 });
        }

        const handover = {
            receiverName: input.receiverName,
            receiverPhone: input.receiverPhone,
            receiverRelation: input.receiverRelation,
            handedOverBy: actor.name,
            handedOverById: actor.id,
            handedOverAt,
            note: input.note,
        };
        const updatedLean = await transitionRepairJob(job, "completed", actor, input.note || `ส่งมอบเครื่องให้ ${input.receiverName}`, { set: { handover } });

        try {
            await sendLineFlexMessage(job, repairStatusLabel("completed"), "#10B981");
        } catch (lineError) {
            console.error("LINE notify failed:", lineError instanceof Error ? lineError.message : lineError);
        }
        const outcome = updatedLean.outcome ?? "repaired";
        await recordAdminLog({
            req,
            actor: { id: actor.id, name: actor.name },
            action: "record_handover",
            description: `ส่งมอบเครื่องและปิดงาน ${job.jobId} (${REPAIR_OUTCOME.labels[outcome]}) ผู้รับ: ${input.receiverName}`,
            targetId: String(job._id),
            targetType: "RepairJob",
            details: { outcome, receiverName: input.receiverName, receiverRelation: input.receiverRelation, handedOverAt },
        });

        const updated = await RepairJob.findById(job._id).populate(ADMIN_JOB_POPULATE);
        return NextResponse.json(updated);
    } catch (error) {
        const handled = adminRepairErrorResponse(error);
        if (handled) return handled;
        console.error("Handover error:", error);
        return NextResponse.json({ error: "บันทึกการส่งมอบไม่สำเร็จ" }, { status: 500 });
    }
}
