import { NextRequest, NextResponse } from "next/server";
import RepairJob from "@/models/RepairJob";
import { recordAdminLog } from "@/lib/admin-log";
import { ADMIN_JOB_POPULATE, loadScopedRepairJob } from "@/lib/repair/branch-scope";
import { PAYMENT_KIND } from "@/lib/repair/options";
import { parseVoidInput, VOID_PAYMENT_PERMISSION } from "@/lib/repair/payments";
import { paymentErrorResponse, voidPayment } from "@/lib/repair/payment-service";

interface Context {
    params: Promise<{ id: string; paymentId: string }>;
}

/** Void one entry: `{ action: "void", reason }`. Entries are never deleted. */
export async function PATCH(req: NextRequest, { params }: Context) {
    try {
        const { id, paymentId } = await params;
        const access = await loadScopedRepairJob(req, id, VOID_PAYMENT_PERMISSION, {
            select: "jobId brand deviceModel status totalPrice payments branchId",
        });
        if (!access.ok) return access.error;
        const { job, actor } = access;

        const { reason } = parseVoidInput(await req.json().catch(() => null));
        const payment = await voidPayment(job, paymentId, reason, actor);
        const updated = await RepairJob.findById(id).populate(ADMIN_JOB_POPULATE);

        const entry = payment as { kind: string; amount: number; receiptNo?: string };
        await recordAdminLog({
            req,
            actor: { id: actor.id, name: actor.name },
            action: "void_repair_payment",
            description: `ยกเลิกรายการ${PAYMENT_KIND.is(entry.kind) ? PAYMENT_KIND.labels[entry.kind] : entry.kind} ${entry.amount.toLocaleString("th-TH")} บาท ใบเสร็จ ${entry.receiptNo ?? "-"} งาน ${job.jobId} (${job.brand} ${job.deviceModel})`,
            targetId: id,
            targetType: "RepairJob",
            details: { paymentId, receiptNo: entry.receiptNo, kind: entry.kind, amount: entry.amount, reason },
        });

        return NextResponse.json(updated);
    } catch (error) {
        const handled = paymentErrorResponse(error);
        if (handled) return handled;
        console.error("Void repair payment error:", error);
        return NextResponse.json({ error: "ยกเลิกรายการไม่สำเร็จ" }, { status: 500 });
    }
}
