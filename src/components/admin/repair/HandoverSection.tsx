"use client";

import type { RepairJobSectionProps } from "@/lib/repair/types";

/**
 * Handover and closing (พัฒนา 2): who took the device back, who handed it
 * over and when (job.handover), for repaired and not-repaired outcomes
 * (job.outcome). Prints the handover document with onPrint({ mode: "handover" }).
 *
 * Placeholder from the multi-branch foundation; renders nothing until the
 * S3 handover work fills it in. Already placed on the job page.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function HandoverSection({ job, onChanged, onPrint }: RepairJobSectionProps) {
    return null;
}
