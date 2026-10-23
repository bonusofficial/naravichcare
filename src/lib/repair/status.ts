/**
 * Repair job state machine, shared by the admin API, the integration API and
 * the admin UI. Keep this file free of server-only imports.
 */

export const REPAIR_STATUSES = [
    "pending",
    "checking",
    "quoted",
    "waiting_approval",
    "in_progress",
    "waiting_parts",
    "testing",
    "ready_pickup",
    "completed",
    "cancelled",
] as const;

export type RepairStatus = (typeof REPAIR_STATUSES)[number];

/** Allowed next statuses. completed and cancelled are terminal. */
export const STATUS_TRANSITIONS: Record<RepairStatus, readonly RepairStatus[]> = {
    pending: ["checking", "quoted", "in_progress", "cancelled"],
    checking: ["quoted", "waiting_approval", "in_progress", "waiting_parts", "cancelled"],
    quoted: ["checking", "waiting_approval", "in_progress", "waiting_parts", "cancelled"],
    waiting_approval: ["quoted", "in_progress", "waiting_parts", "cancelled"],
    in_progress: ["waiting_parts", "testing", "ready_pickup", "cancelled"],
    waiting_parts: ["in_progress", "cancelled"],
    testing: ["in_progress", "ready_pickup", "cancelled"],
    // Back to in_progress covers a device that fails the pickup check.
    ready_pickup: ["completed", "in_progress"],
    completed: [],
    cancelled: [],
};

export const TERMINAL_STATUSES: readonly RepairStatus[] = ["completed", "cancelled"];

export function isRepairStatus(value: unknown): value is RepairStatus {
    return typeof value === "string" && (REPAIR_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: string, to: string): boolean {
    if (!isRepairStatus(from) || !isRepairStatus(to)) return false;
    return STATUS_TRANSITIONS[from].includes(to);
}

export function allowedNextStatuses(from: string): readonly RepairStatus[] {
    return isRepairStatus(from) ? STATUS_TRANSITIONS[from] : [];
}

/** Status vocabulary of the Web POS (RepairStatus enum in NaravichPOS). */
export type PosRepairStatus = "sent" | "repairing" | "completed" | "cancelled";

export const POS_STATUS_MAP: Record<RepairStatus, PosRepairStatus> = {
    pending: "sent",
    checking: "repairing",
    quoted: "repairing",
    waiting_approval: "repairing",
    in_progress: "repairing",
    waiting_parts: "repairing",
    testing: "repairing",
    ready_pickup: "completed",
    completed: "completed",
    cancelled: "cancelled",
};

export function toPosStatus(status: string): PosRepairStatus {
    return isRepairStatus(status) ? POS_STATUS_MAP[status] : "repairing";
}

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
    pending: "รอตรวจเช็ก",
    checking: "กำลังเช็กอาการ",
    quoted: "เสนอราคาแล้ว",
    waiting_approval: "รออนุมัติ",
    in_progress: "กำลังซ่อม",
    waiting_parts: "รออะไหล่",
    testing: "ตรวจสอบงานซ่อม",
    ready_pickup: "ซ่อมเสร็จ/รอรับคืน",
    completed: "รับเครื่องคืนแล้ว",
    cancelled: "ยกเลิก",
};

export function repairStatusLabel(status: string): string {
    return isRepairStatus(status) ? REPAIR_STATUS_LABELS[status] : status;
}
