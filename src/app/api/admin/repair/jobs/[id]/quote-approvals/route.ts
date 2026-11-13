import { NextRequest, NextResponse } from "next/server";
import RepairJob from "@/models/RepairJob";
import { recordAdminLog } from "@/lib/admin-log";
import { adminRepairErrorResponse, CLOSED_STATUSES, concurrentEdit, invalidBody, readJsonObject, repairClosed } from "@/lib/repair/admin-route";
import { parseQuoteApproval } from "@/lib/repair/admin-validation";
import { ADMIN_JOB_POPULATE, loadScopedRepairJob } from "@/lib/repair/branch-scope";
import { APPROVAL_CHANNEL, APPROVAL_DECISION } from "@/lib/repair/options";
import { currentCostsVersion } from "@/lib/repair/workflow";

interface Context {
    params: Promise<{ id: string }>;
}

/**
 * Record the customer's decision on the current quotation as a new round.
 * The round snapshots the prices it covers, so a later price change needs a
 * new approval before the job can go (back) to in_progress.
 */
export async function POST(req: NextRequest, { params }: Context) {
    try {
        const { id } = await params;
        const access = await loadScopedRepairJob(req, id, "edit_repair_jobs");
        if (!access.ok) return access.error;
        const { job, actor } = access;
        const body = await readJsonObject(req);
        if (!body) return invalidBody();
        const input = parseQuoteApproval(body);
        if ((CLOSED_STATUSES as readonly string[]).includes(job.status)) return repairClosed();

        const round = Math.max(0, ...(job.quoteApprovals ?? []).map((r) => r.round)) + 1;
        const entry = {
            round,
            laborCost: job.laborCost ?? 0,
            partsCost: job.partsCost ?? 0,
            totalPrice: job.totalPrice ?? 0,
            costsVersion: currentCostsVersion(job),
            decision: input.decision,
            channel: input.channel,
            approverName: input.approverName,
            decidedAt: input.decidedAt ?? new Date(),
            recordedBy: actor.name,
            recordedById: actor.id,
            note: input.note,
        };
        // Conditional on the prices we snapshot and on nobody adding this round first.
        const result = await RepairJob.updateOne(
            {
                _id: job._id,
                status: { $nin: CLOSED_STATUSES },
                costsVersion: job.costsVersion ?? null,
                "quoteApprovals.round": { $ne: round },
            },
            { $push: { quoteApprovals: entry }, $set: { quotationApproved: input.decision } },
            { runValidators: true },
        );
        if (!result.modifiedCount) return concurrentEdit();

        await recordAdminLog({
            req,
            actor: { id: actor.id, name: actor.name },
            action: "record_quote_approval",
            description: `บันทึกผลอนุมัติราคา รอบ ${round} งาน ${job.jobId}: ${APPROVAL_DECISION.labels[input.decision]} ${entry.totalPrice.toLocaleString()} บาท (${APPROVAL_CHANNEL.labels[input.channel]})`,
            targetId: String(job._id),
            targetType: "RepairJob",
            details: { round, decision: input.decision, channel: input.channel, approverName: input.approverName, totalPrice: entry.totalPrice, costsVersion: entry.costsVersion },
        });

        const updated = await RepairJob.findById(job._id).populate(ADMIN_JOB_POPULATE);
        return NextResponse.json(updated, { status: 201 });
    } catch (error) {
        const handled = adminRepairErrorResponse(error);
        if (handled) return handled;
        console.error("Quote approval error:", error);
        return NextResponse.json({ error: "บันทึกผลอนุมัติราคาไม่สำเร็จ" }, { status: 500 });
    }
}
