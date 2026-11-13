import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { recordAdminLog } from "@/lib/admin-log";
import { ADMIN_JOB_POPULATE, loadScopedRepairJob } from "@/lib/repair/branch-scope";
import { holderAfterReturn, parseReturnInput, type MovementRuleError } from "@/lib/repair/movements";
import RepairJob from "@/models/RepairJob";
import Branch from "@/models/Branch";

interface Context {
    params: Promise<{ id: string; movementId: string }>;
}

const ruleError = (error: MovementRuleError) =>
    NextResponse.json({ error: error.message, code: error.code, fields: error.fields }, { status: error.status });

/**
 * Record the device coming back from the latest movement: when, who took it,
 * and for an outside repair the actual cost. The device goes back to the
 * job's receiving branch unless `toBranchId` names another active branch.
 */
export async function PATCH(req: NextRequest, { params }: Context) {
    try {
        const { id, movementId } = await params;
        const access = await loadScopedRepairJob(req, id, "edit_repair_jobs");
        if (!access.ok) return access.error;
        const { job, actor } = access;

        const parsed = parseReturnInput(job, movementId, await req.json().catch(() => null));
        if (!parsed.ok) return ruleError(parsed);
        const input = parsed.value;

        const branchId = input.toBranchId ?? (job.branchId ? String(job.branchId) : null);
        if (!branchId) {
            return NextResponse.json({ error: "งานนี้ยังไม่ผูกสาขา กรุณาเลือกสาขาที่รับเครื่องกลับ", code: "VALIDATION_ERROR", fields: ["toBranchId"] }, { status: 400 });
        }
        // A named branch must be active; the receiving branch is accepted as is.
        const branch = await Branch.findOne(input.toBranchId ? { _id: branchId, isActive: true } : { _id: branchId })
            .select("name").lean<{ _id: mongoose.Types.ObjectId; name: string }>();
        if (!branch) return NextResponse.json({ error: "ไม่พบสาขาที่รับเครื่องกลับ หรือสาขาถูกปิดใช้งาน", code: "VALIDATION_ERROR", fields: ["toBranchId"] }, { status: 400 });

        const returnReceivedBy = input.returnReceivedBy || actor.name;
        const set: Record<string, unknown> = {
            "movements.$[m].returnedAt": input.returnedAt,
            "movements.$[m].returnReceivedBy": returnReceivedBy,
        };
        if (input.actualCost !== undefined) set["movements.$[m].actualCost"] = input.actualCost;
        if (input.note) {
            const previous = (job.movements.find((m) => String(m._id) === movementId)?.note ?? "").trim();
            set["movements.$[m].note"] = previous ? `${previous}\nรับกลับ: ${input.note}` : `รับกลับ: ${input.note}`;
        }
        const holder = holderAfterReturn(job, branch);
        if (holder) set.currentHolder = { kind: holder.kind, label: holder.label, branchId: branch._id };

        // Still open and still the latest movement, so a return cannot be recorded twice.
        const mid = new mongoose.Types.ObjectId(movementId);
        const result = await RepairJob.updateOne(
            { _id: job._id, $and: [{ movements: { $elemMatch: { _id: mid, returnedAt: null } } }, { movements: { $size: job.movements.length } }] },
            { $set: set },
            { arrayFilters: [{ "m._id": mid }], runValidators: true },
        );
        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "บันทึกรับเครื่องกลับรายการนี้ไปแล้ว หรือข้อมูลเปลี่ยนไป กรุณาโหลดหน้าใหม่", code: "CONFLICT" }, { status: 409 });
        }

        const external = input.movement.type === "external_repair";
        await recordAdminLog({
            req,
            actor: { id: actor.id, name: actor.name },
            action: external ? "repair_return_external" : "repair_return_device",
            description: `รับเครื่องงาน ${job.jobId} กลับจาก "${input.movement.toLabel ?? ""}" เข้า "${branch.name}"${external ? ` ค่าซ่อมภายนอก ${input.actualCost} บาท` : ""}`,
            targetId: String(job._id),
            targetType: "RepairJob",
            details: { movementId, returnedAt: input.returnedAt, returnReceivedBy, actualCost: input.actualCost, toBranchId: String(branch._id) },
        });

        const updated = await RepairJob.findById(job._id).populate(ADMIN_JOB_POPULATE);
        return NextResponse.json(updated);
    } catch (error) {
        console.error("Record repair return error:", error);
        return NextResponse.json({ error: "บันทึกรับเครื่องกลับไม่สำเร็จ" }, { status: 500 });
    }
}
