import { NextRequest, NextResponse } from "next/server";
import RepairJob from "@/models/RepairJob";
import { recordAdminLog } from "@/lib/admin-log";
import { ADMIN_JOB_POPULATE, loadScopedRepairJob } from "@/lib/repair/branch-scope";
import { PAYMENT_KIND, PAYMENT_METHOD } from "@/lib/repair/options";
import { parsePaymentInput, paymentPermission } from "@/lib/repair/payments";
import { paymentErrorResponse, recordPayment } from "@/lib/repair/payment-service";

interface Context {
    params: Promise<{ id: string }>;
}

/** Record a deposit, payment or refund: `{ kind, amount, method, receivedAt?, note? }`. */
export async function POST(req: NextRequest, { params }: Context) {
    try {
        const { id } = await params;
        const body: unknown = await req.json().catch(() => null);
        const kind = body && typeof body === "object" ? (body as Record<string, unknown>).kind : undefined;

        const access = await loadScopedRepairJob(req, id, paymentPermission(kind), {
            select: "jobId brand deviceModel status totalPrice payments branchId",
        });
        if (!access.ok) return access.error;
        const { job, actor } = access;

        const input = parsePaymentInput(body);
        const recorded = await recordPayment(job, input, actor);
        const updated = await RepairJob.findById(id).populate(ADMIN_JOB_POPULATE);

        const verb = input.kind === "refund" ? "คืนเงิน" : `รับ${PAYMENT_KIND.labels[input.kind]}`;
        await recordAdminLog({
            req,
            actor: { id: actor.id, name: actor.name },
            action: input.kind === "refund" ? "refund_repair_payment" : "record_repair_payment",
            description: `${verb} ${input.amount.toLocaleString("th-TH")} บาท (${PAYMENT_METHOD.labels[input.method]}) งาน ${job.jobId} (${job.brand} ${job.deviceModel}) ใบเสร็จ ${recorded.receiptNo}`,
            targetId: id,
            targetType: "RepairJob",
            details: { paymentId: String(recorded._id), receiptNo: recorded.receiptNo, kind: input.kind, amount: input.amount, method: input.method, receivedAt: input.receivedAt, note: input.note },
        });

        return NextResponse.json(updated, { status: 201 });
    } catch (error) {
        const handled = paymentErrorResponse(error);
        if (handled) return handled;
        console.error("Record repair payment error:", error);
        return NextResponse.json({ error: "บันทึกรายการรับเงินไม่สำเร็จ" }, { status: 500 });
    }
}
