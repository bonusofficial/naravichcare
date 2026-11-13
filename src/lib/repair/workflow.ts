/**
 * Business guards on repair status changes: quotation approval, QC and the
 * handover record. Pure functions with no server-only imports, so the admin
 * API (through transitionRepairJob) and the job page share one rule set.
 */
import type { RepairOutcome } from "./options";
import { canTransition, REPAIR_STATUS_LABELS, repairStatusLabel } from "./status";

export interface WorkflowJob {
    status: string;
    ownerType?: string | null;
    totalPrice?: number | null;
    costsVersion?: number | null;
    quoteApprovals?: readonly { round: number; decision: string; costsVersion: number }[] | null;
    qcChecks?: readonly { overall: string; checkedAt: Date | string }[] | null;
    statusHistory?: readonly { status: string; changedAt?: Date | string | null }[] | null;
    handover?: unknown;
    outcome?: string | null;
}

export type TransitionBlockCode = "INVALID_STATUS_TRANSITION" | "QUOTE_APPROVAL_REQUIRED" | "QC_REQUIRED" | "HANDOVER_REQUIRED";

export interface TransitionBlock {
    code: TransitionBlockCode;
    message: string;
}

/** Jobs without the field predate price versioning and count as version 1. */
export const currentCostsVersion = (job: Pick<WorkflowJob, "costsVersion">) => job.costsVersion ?? 1;

export function latestQuoteApproval<T extends { round: number }>(job: { quoteApprovals?: readonly T[] | null }): T | null {
    const rounds = job.quoteApprovals ?? [];
    return rounds.length ? rounds.reduce((latest, round) => (round.round > latest.round ? round : latest)) : null;
}

/** A customer job with a price and no approved round for the current prices. */
export function needsQuoteApproval(job: WorkflowJob): boolean {
    if ((job.ownerType ?? "customer") !== "customer") return false;
    if (!((Number(job.totalPrice) || 0) > 0)) return false;
    const version = currentCostsVersion(job);
    return !(job.quoteApprovals ?? []).some((round) => round.decision === "approved" && round.costsVersion === version);
}

/** When the job last entered `status`, from its history. */
export function lastEnteredAt(job: Pick<WorkflowJob, "statusHistory">, status: string): Date | null {
    const history = job.statusHistory ?? [];
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].status === status && history[i].changedAt) return new Date(history[i].changedAt!);
    }
    return null;
}

export function latestQcCheck<T>(job: { qcChecks?: readonly T[] | null }): T | null {
    const checks = job.qcChecks ?? [];
    return checks.length ? checks[checks.length - 1] : null;
}

/** The latest QC is a pass recorded after the job last entered in_progress. */
export function qcPassedForCurrentRepair(job: WorkflowJob): boolean {
    const latest = latestQcCheck(job);
    if (!latest || latest.overall !== "pass") return false;
    const started = lastEnteredAt(job, "in_progress");
    return !started || new Date(latest.checkedAt).getTime() >= started.getTime();
}

/** ready_pickup outcome: "repaired" unless the caller says otherwise. */
export function resolveOutcome(outcome?: string | null): RepairOutcome {
    return outcome === "not_repaired" ? "not_repaired" : "repaired";
}

/** Status label that does not tell a customer "repaired" when it was not. */
export function statusLabelForOutcome(status: string, outcome?: string | null): string {
    if (status === "ready_pickup" && outcome === "not_repaired") return "ไม่ซ่อม/รอรับเครื่องคืน";
    return repairStatusLabel(status);
}

/**
 * Why `job` cannot move to `to`, or null when it can. `job` must already
 * reflect any price or handover change written in the same update.
 */
export function transitionBlock(job: WorkflowJob, to: string, outcome?: string | null): TransitionBlock | null {
    const resolved = to === "ready_pickup" ? resolveOutcome(outcome) : undefined;
    if (!canTransition(job.status, to, { outcome: resolved })) {
        return {
            code: "INVALID_STATUS_TRANSITION",
            message: `ไม่สามารถเปลี่ยนสถานะจาก "${repairStatusLabel(job.status)}" เป็น "${statusLabelForOutcome(to, resolved)}" ได้`,
        };
    }
    if (to === "in_progress" && needsQuoteApproval(job)) {
        return {
            code: "QUOTE_APPROVAL_REQUIRED",
            message: "ราคาปัจจุบันยังไม่ได้รับอนุมัติจากลูกค้า กรุณาบันทึกการอนุมัติราคาในส่วน \"อนุมัติราคา\" ก่อนเริ่มซ่อม",
        };
    }
    if (to === "ready_pickup" && resolved === "repaired" && !qcPassedForCurrentRepair(job)) {
        return {
            code: "QC_REQUIRED",
            message: `ต้องบันทึก QC ผลผ่านหลังการซ่อมรอบล่าสุดก่อนเปลี่ยนเป็น "${REPAIR_STATUS_LABELS.ready_pickup}"`,
        };
    }
    if (to === "completed" && !job.handover) {
        return {
            code: "HANDOVER_REQUIRED",
            message: "ปิดงานได้จากส่วน \"ส่งมอบเครื่อง\" เท่านั้น กรุณาบันทึกผู้รับเครื่องและผู้ส่งมอบก่อน",
        };
    }
    return null;
}
