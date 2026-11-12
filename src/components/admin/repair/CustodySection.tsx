"use client";

import type { RepairJobSectionProps } from "@/lib/repair/types";

/**
 * Device custody (งานเพิ่ม 1): where the device is now (job.currentHolder) and
 * every hand-off in job.movements - to another branch, a technician, or an
 * outside repair shop - with sender, receiver, send/return times and, for
 * outside repairs, the actual cost charged.
 *
 * Placeholder from the multi-branch foundation; renders nothing until the
 * S1 custody work fills it in. Already placed on the job page.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function CustodySection({ job, onChanged, onPrint }: RepairJobSectionProps) {
    return null;
}
