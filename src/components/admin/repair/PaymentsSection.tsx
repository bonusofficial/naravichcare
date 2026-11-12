"use client";

import type { RepairJobSectionProps } from "@/lib/repair/types";

/**
 * Money received against the job (งานเพิ่ม 2): deposits, payments, refunds
 * and voids from job.payments, with method, receipt number, and the totals
 * from summarizePayments() in @/lib/repair/summary. Prints receipts with
 * onPrint({ mode: "receipt", paymentId }).
 *
 * Placeholder from the multi-branch foundation; renders nothing until the
 * S2 payments work fills it in. Already placed on the job page.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function PaymentsSection({ job, onChanged, onPrint }: RepairJobSectionProps) {
    return null;
}
