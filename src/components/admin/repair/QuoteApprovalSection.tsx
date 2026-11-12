"use client";

import type { RepairJobSectionProps } from "@/lib/repair/types";

/**
 * Customer approval of each quotation round (พัฒนา 4): amount, time and
 * channel per round from job.quoteApprovals, and whether the current prices
 * (job.costsVersion) still need approval.
 *
 * Placeholder from the multi-branch foundation; renders nothing until the
 * S3 quote approvals work fills it in. Already placed on the job page.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function QuoteApprovalSection({ job, onChanged, onPrint }: RepairJobSectionProps) {
    return null;
}
