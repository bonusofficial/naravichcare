"use client";

import type { RepairJobSectionProps } from "@/lib/repair/types";

/**
 * QC before the device goes back (พัฒนา 4): the fixed QC_CHECKLIST from
 * @/lib/repair/options, pass/fail per item, note, who checked and when, from
 * job.qcChecks.
 *
 * Placeholder from the multi-branch foundation; renders nothing until the
 * S3 QC work fills it in. Already placed on the job page.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function QcSection({ job, onChanged, onPrint }: RepairJobSectionProps) {
    return null;
}
