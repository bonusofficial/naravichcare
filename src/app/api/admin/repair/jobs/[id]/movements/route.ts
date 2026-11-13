import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { recordAdminLog } from "@/lib/admin-log";
import { ADMIN_JOB_POPULATE, loadScopedRepairJob } from "@/lib/repair/branch-scope";
import { checkCanSend, currentHolderLabel, parseSendInput, type MovementRuleError } from "@/lib/repair/movements";
import { TERMINAL_STATUSES } from "@/lib/repair/status";
import RepairJob from "@/models/RepairJob";
import Branch from "@/models/Branch";

interface Context {
    params: Promise<{ id: string }>;
}

const ruleError = (error: MovementRuleError) =>
    NextResponse.json({ error: error.message, code: error.code, fields: error.fields }, { status: error.status });

/**
 * Send the device to another branch (any active branch; the job's owning
 * branch does not change), a technician, or an outside repair shop.
 */
export async function POST(req: NextRequest, { params }: Context) {
    try {
        const { id } = await params;
        const access = await loadScopedRepairJob(req, id, "edit_repair_jobs");
        if (!access.ok) return access.error;
        const { job, actor } = access;

        const parsed = parseSendInput(await req.json().catch(() => null));
        if (!parsed.ok) return ruleError(parsed);
        const input = parsed.value;

        let toBranchId: mongoose.Types.ObjectId | undefined;
        if (input.toKind === "branch") {
            const branch = await Branch.findOne({ _id: input.toBranchId, isActive: true }).select("name").lean<{ _id: mongoose.Types.ObjectId; name: string }>();
            if (!branch) return NextResponse.json({ error: "ไม่พบสาขาปลายทาง หรือสาขาถูกปิดใช้งาน", code: "VALIDATION_ERROR", fields: ["toBranchId"] }, { status: 400 });
            input.toLabel = branch.name;
            toBranchId = branch._id;
        }

        const blocked = checkCanSend(job, input);
        if (blocked) return ruleError(blocked);

        const now = new Date();
        const movementId = new mongoose.Types.ObjectId();
        const fromLabel = currentHolderLabel(job);
        const movement = {
            _id: movementId,
            type: input.type,
            fromLabel,
            toKind: input.toKind,
            toLabel: input.toLabel,
            ...(toBranchId ? { toBranchId } : {}),
            ...(input.vendorName ? { vendorName: input.vendorName } : {}),
            sentBy: input.sentBy || actor.name,
            ...(input.receivedBy ? { receivedBy: input.receivedBy } : {}),
            sentAt: input.sentAt,
            note: input.note,
            recordedBy: actor.name,
            recordedById: actor.id ?? undefined,
            recordedAt: now,
        };
        const currentHolder = { kind: input.toKind, label: input.toLabel, ...(toBranchId ? { branchId: toBranchId } : {}) };

        // Only write if nobody moved the device or closed the job since we read it.
        // Jobs created before custody tracking have no movements array at all.
        const count = job.movements?.length ?? 0;
        const sameMovements = count === 0
            ? { $or: [{ movements: { $size: 0 } }, { movements: { $exists: false } }] }
            : { movements: { $size: count } };
        const sameHolder = job.currentHolder
            ? { "currentHolder.kind": job.currentHolder.kind, "currentHolder.label": job.currentHolder.label }
            : { currentHolder: null };
        const result = await RepairJob.updateOne(
            { _id: job._id, status: { $nin: TERMINAL_STATUSES }, $and: [sameMovements, sameHolder] },
            { $push: { movements: movement }, $set: { currentHolder } },
            { runValidators: true },
        );
        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "ข้อมูลงานเปลี่ยนไประหว่างบันทึก กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง", code: "CONFLICT" }, { status: 409 });
        }

        await recordAdminLog({
            req,
            actor: { id: actor.id, name: actor.name },
            action: input.type === "external_repair" ? "repair_send_external" : "repair_transfer_device",
            description: `ส่งเครื่องงาน ${job.jobId} จาก "${fromLabel}" ไป "${input.toLabel}"`,
            targetId: String(job._id),
            targetType: "RepairJob",
            details: { movementId: String(movementId), type: input.type, toKind: input.toKind, toLabel: input.toLabel, sentBy: movement.sentBy, sentAt: input.sentAt },
        });

        const updated = await RepairJob.findById(job._id).populate(ADMIN_JOB_POPULATE);
        return NextResponse.json(updated, { status: 201 });
    } catch (error) {
        console.error("Record repair movement error:", error);
        return NextResponse.json({ error: "บันทึกการส่งเครื่องไม่สำเร็จ" }, { status: 500 });
    }
}
