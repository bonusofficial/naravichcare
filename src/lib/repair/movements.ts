/**
 * Device custody rules (งานเพิ่ม 1): sending a repair device to another branch,
 * a technician or an outside shop, and recording it coming back.
 *
 * Pure functions with no server-only imports, so the admin API and the job
 * page share them. The routes under /api/admin/repair/jobs/[id]/movements
 * look up branch names and write the result; everything they decide comes
 * from here.
 */

import { isValidMoney } from "./costs";
import { HOLDER, type HolderKind, type MovementType } from "./options";
import { TERMINAL_STATUSES } from "./status";

export type MovementErrorCode =
    | "VALIDATION_ERROR"
    | "REPAIR_CLOSED"
    | "EXTERNAL_REPAIR_OPEN"
    | "SAME_HOLDER"
    | "MOVEMENT_NOT_FOUND"
    | "NOT_LATEST_MOVEMENT"
    | "ALREADY_RETURNED";

export interface MovementRuleError {
    ok: false;
    code: MovementErrorCode;
    status: 400 | 404 | 409;
    message: string;
    fields?: string[];
}

export type MovementResult<T> = { ok: true; value: T } | MovementRuleError;

/** Where a device can be sent. Handing it to the customer is the handover, not a movement. */
export const MOVEMENT_TARGET_KINDS = ["branch", "technician", "external"] as const satisfies readonly HolderKind[];
export type MovementTargetKind = (typeof MOVEMENT_TARGET_KINDS)[number];

export const MOVEMENT_LIMITS = { name: 100, vendorName: 120, note: 500 } as const;

/**
 * Clock tolerance for "not in the future" and "not before it was sent". The
 * job page sends times from <input type="datetime-local">, which has no
 * seconds, while server defaults do.
 */
export const MOVEMENT_CLOCK_TOLERANCE_MS = 60_000;

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const OBJECT_ID = /^[a-f0-9]{24}$/i;

const fail = (code: MovementErrorCode, status: MovementRuleError["status"], message: string, fields?: string[]): MovementRuleError =>
    ({ ok: false, code, status, message, ...(fields ? { fields } : {}) });
const invalid = (message: string, field: string) => fail("VALIDATION_ERROR", 400, message, [field]);

// ---------------------------------------------------------------------------
// Shapes the rules read. Both the lean Mongoose document and RepairJobView fit.
// ---------------------------------------------------------------------------

type Id = { toString(): string };

export interface HolderLike {
    kind: string;
    label: string;
    branchId?: Id | null;
}

export interface MovementRecordLike {
    _id: Id;
    type: string;
    toKind?: string;
    toLabel?: string;
    sentAt: Date | string;
    returnedAt?: Date | string | null;
}

export interface CustodyJobLike {
    status: string;
    receivedAt?: Date | string | null;
    currentHolder?: HolderLike | null;
    movements?: readonly MovementRecordLike[] | null;
}

// ---------------------------------------------------------------------------
// Reading the history
// ---------------------------------------------------------------------------

export function isJobClosed(job: Pick<CustodyJobLike, "status">): boolean {
    return (TERMINAL_STATUSES as readonly string[]).includes(job.status);
}

/** The outside repair the device is still at, if any. */
export function openExternalRepair<M extends MovementRecordLike>(job: { movements?: readonly M[] | null }): M | undefined {
    return (job.movements ?? []).find((movement) => movement.type === "external_repair" && !movement.returnedAt);
}

/** The most recent movement if the device has not come back from it yet. */
export function returnableMovement<M extends MovementRecordLike>(job: { movements?: readonly M[] | null }): M | undefined {
    const movements = job.movements ?? [];
    const latest = movements[movements.length - 1];
    return latest && !latest.returnedAt ? latest : undefined;
}

/**
 * - returned: the device came back from this hand-off.
 * - open: the device is still with this movement's receiver.
 * - handed_on: the receiver passed the device on (a later movement started
 *   before this one was returned), so it is no longer there.
 */
export type MovementState = "returned" | "open" | "handed_on";

export function movementState(job: { movements?: readonly MovementRecordLike[] | null }, movementId: Id): MovementState {
    const movements = job.movements ?? [];
    const index = movements.findIndex((movement) => String(movement._id) === String(movementId));
    const movement = movements[index];
    if (!movement || movement.returnedAt) return "returned";
    return index === movements.length - 1 ? "open" : "handed_on";
}

/** Label of whoever has the device now, for `fromLabel`. */
export function currentHolderLabel(job: Pick<CustodyJobLike, "currentHolder">, fallback = "ไม่ระบุ"): string {
    return job.currentHolder?.label?.trim() || fallback;
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

function text(body: Record<string, unknown>, field: string, label: string, max: number): MovementResult<string> {
    const raw = body[field];
    if (raw === undefined || raw === null) return { ok: true, value: "" };
    if (typeof raw !== "string") return invalid(`${label}ต้องเป็นข้อความ`, field);
    const value = raw.trim();
    if (value.length > max) return invalid(`${label}ยาวเกิน ${max} ตัวอักษร`, field);
    if (CONTROL_CHARS.test(value)) return invalid(`${label}มีอักขระที่ไม่อนุญาต`, field);
    return { ok: true, value };
}

/** An ISO date from the client, or `now` when absent. Never later than now. */
function when(body: Record<string, unknown>, field: string, label: string, now: Date): MovementResult<Date> {
    const raw = body[field];
    if (raw === undefined || raw === null || raw === "") return { ok: true, value: now };
    if (typeof raw !== "string") return invalid(`${label}ไม่ถูกต้อง`, field);
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return invalid(`${label}ไม่ถูกต้อง`, field);
    if (date.getTime() > now.getTime() + MOVEMENT_CLOCK_TOLERANCE_MS) return invalid(`${label}ต้องไม่เป็นเวลาในอนาคต`, field);
    return { ok: true, value: date };
}

function rejectUnknown(body: Record<string, unknown>, allowed: readonly string[]): MovementRuleError | null {
    const unknown = Object.keys(body).filter((key) => !allowed.includes(key));
    return unknown.length ? fail("VALIDATION_ERROR", 400, `ไม่รู้จัก field: ${unknown.join(", ")}`, unknown) : null;
}

const isObject = (body: unknown): body is Record<string, unknown> =>
    typeof body === "object" && body !== null && !Array.isArray(body);

// ---------------------------------------------------------------------------
// Sending the device
// ---------------------------------------------------------------------------

const SEND_FIELDS = ["type", "toKind", "toBranchId", "toLabel", "vendorName", "sentBy", "receivedBy", "sentAt", "note"] as const;

export interface SendInput {
    type: MovementType;
    toKind: MovementTargetKind;
    /** Set for toKind "branch"; the route resolves the branch name. */
    toBranchId?: string;
    /** Technician name or outside shop; empty for a branch until the route fills it in. */
    toLabel: string;
    vendorName?: string;
    /** Empty means "the logged-in admin"; the route fills it in. */
    sentBy: string;
    receivedBy: string;
    sentAt: Date;
    note: string;
}

/** Validate a POST /movements body. `type` follows from `toKind` and may be omitted. */
export function parseSendInput(body: unknown, now: Date = new Date()): MovementResult<SendInput> {
    if (!isObject(body)) return fail("VALIDATION_ERROR", 400, "Invalid request body");
    const unknown = rejectUnknown(body, SEND_FIELDS);
    if (unknown) return unknown;

    const toKind = body.toKind;
    if (!(MOVEMENT_TARGET_KINDS as readonly unknown[]).includes(toKind)) {
        return invalid("กรุณาเลือกปลายทาง (สาขา ช่าง หรือร้านซ่อมภายนอก)", "toKind");
    }
    const kind = toKind as MovementTargetKind;
    const type: MovementType = kind === "external" ? "external_repair" : "transfer";
    if (body.type !== undefined && body.type !== type) {
        return invalid(type === "external_repair" ? "ส่งร้านซ่อมภายนอกต้องเป็นประเภท \"ส่งซ่อมภายนอก\"" : "ประเภท \"ส่งซ่อมภายนอก\" ต้องส่งไปร้านซ่อมภายนอก", "type");
    }

    const sentBy = text(body, "sentBy", "ชื่อผู้ส่ง", MOVEMENT_LIMITS.name);
    if (!sentBy.ok) return sentBy;
    const receivedBy = text(body, "receivedBy", "ชื่อผู้รับ", MOVEMENT_LIMITS.name);
    if (!receivedBy.ok) return receivedBy;
    const note = text(body, "note", "หมายเหตุ", MOVEMENT_LIMITS.note);
    if (!note.ok) return note;
    const sentAt = when(body, "sentAt", "เวลาส่ง", now);
    if (!sentAt.ok) return sentAt;

    const input: SendInput = {
        type,
        toKind: kind,
        toLabel: "",
        sentBy: sentBy.value,
        receivedBy: receivedBy.value,
        sentAt: sentAt.value,
        note: note.value,
    };
    if (kind === "branch") {
        if (typeof body.toBranchId !== "string" || !OBJECT_ID.test(body.toBranchId)) return invalid("กรุณาเลือกสาขาปลายทาง", "toBranchId");
        input.toBranchId = body.toBranchId;
    } else if (kind === "technician") {
        const name = text(body, "toLabel", "ชื่อช่าง", MOVEMENT_LIMITS.name);
        if (!name.ok) return name;
        if (!name.value) return invalid("กรุณากรอกชื่อช่าง", "toLabel");
        input.toLabel = name.value;
    } else {
        const vendor = text(body, "vendorName", "ชื่อร้านซ่อม", MOVEMENT_LIMITS.vendorName);
        if (!vendor.ok) return vendor;
        if (!vendor.value) return invalid("กรุณากรอกชื่อร้านซ่อมภายนอก", "vendorName");
        input.vendorName = vendor.value;
        input.toLabel = vendor.value;
    }
    return { ok: true, value: input };
}

/**
 * Whether the device can be sent to `target` now: the job is still open, it
 * is not at an outside shop, it is not already there, and it is not sent
 * before the job was received.
 */
export function checkCanSend(
    job: CustodyJobLike,
    target: { toKind: MovementTargetKind; toLabel: string; toBranchId?: string; sentAt: Date },
): MovementRuleError | null {
    if (isJobClosed(job)) return fail("REPAIR_CLOSED", 409, "งานนี้ปิดแล้ว ไม่สามารถบันทึกการส่งเครื่องได้");
    const external = openExternalRepair(job);
    if (external) {
        return fail("EXTERNAL_REPAIR_OPEN", 409, `เครื่องยังอยู่ที่ร้านซ่อมภายนอก "${external.toLabel ?? ""}" ต้องบันทึกรับเครื่องกลับก่อน`);
    }
    const holder = job.currentHolder;
    if (holder && holder.kind === target.toKind) {
        const same = target.toKind === "branch"
            ? Boolean(holder.branchId) && String(holder.branchId) === target.toBranchId
            : holder.label.trim().toLowerCase() === target.toLabel.trim().toLowerCase();
        if (same) return fail("SAME_HOLDER", 409, `เครื่องอยู่กับ "${holder.label}" อยู่แล้ว`);
    }
    if (job.receivedAt) {
        const received = new Date(job.receivedAt).getTime();
        if (target.sentAt.getTime() < received - MOVEMENT_CLOCK_TOLERANCE_MS) {
            return invalid("เวลาส่งต้องไม่ก่อนวันที่รับงาน", "sentAt");
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Recording the device coming back
// ---------------------------------------------------------------------------

const RETURN_FIELDS = ["returnedAt", "returnReceivedBy", "actualCost", "toBranchId", "note"] as const;

export interface ReturnInput {
    returnedAt: Date;
    /** Empty means "the logged-in admin"; the route fills it in. */
    returnReceivedBy: string;
    /** Required for outside repairs, absent otherwise. */
    actualCost?: number;
    /** Branch the device comes back to; the job's receiving branch when absent. */
    toBranchId?: string;
    /** Appended to the movement's note. */
    note: string;
}

/**
 * Validate a PATCH /movements/[movementId] body against the movement it
 * closes. Only the latest movement can be returned, and only once.
 */
export function parseReturnInput(
    job: CustodyJobLike,
    movementId: string,
    body: unknown,
    now: Date = new Date(),
): MovementResult<ReturnInput & { movement: MovementRecordLike }> {
    if (!isObject(body)) return fail("VALIDATION_ERROR", 400, "Invalid request body");
    const unknown = rejectUnknown(body, RETURN_FIELDS);
    if (unknown) return unknown;

    const movements = job.movements ?? [];
    const index = movements.findIndex((movement) => String(movement._id) === movementId);
    if (index < 0) return fail("MOVEMENT_NOT_FOUND", 404, "ไม่พบรายการส่งเครื่องนี้");
    const movement = movements[index];
    if (movement.returnedAt) return fail("ALREADY_RETURNED", 409, "บันทึกรับเครื่องกลับรายการนี้ไปแล้ว");
    if (index !== movements.length - 1) {
        return fail("NOT_LATEST_MOVEMENT", 409, "เครื่องถูกส่งต่อไปแล้ว บันทึกรับกลับได้เฉพาะรายการล่าสุด");
    }

    const receivedBy = text(body, "returnReceivedBy", "ชื่อผู้รับเครื่องกลับ", MOVEMENT_LIMITS.name);
    if (!receivedBy.ok) return receivedBy;
    const note = text(body, "note", "หมายเหตุ", MOVEMENT_LIMITS.note);
    if (!note.ok) return note;
    const returnedAt = when(body, "returnedAt", "เวลารับกลับ", now);
    if (!returnedAt.ok) return returnedAt;
    if (returnedAt.value.getTime() < new Date(movement.sentAt).getTime() - MOVEMENT_CLOCK_TOLERANCE_MS) {
        return invalid("เวลารับกลับต้องไม่ก่อนเวลาส่ง", "returnedAt");
    }

    const input: ReturnInput & { movement: MovementRecordLike } = {
        movement,
        returnedAt: returnedAt.value,
        returnReceivedBy: receivedBy.value,
        note: note.value,
    };
    if (movement.type === "external_repair") {
        if (body.actualCost === undefined || body.actualCost === null || body.actualCost === "") {
            return invalid("กรุณากรอกค่าซ่อมจริงจากร้านภายนอก (ไม่มีค่าใช้จ่ายให้กรอก 0)", "actualCost");
        }
        if (!isValidMoney(body.actualCost)) return invalid("ค่าซ่อมจริงไม่ถูกต้อง", "actualCost");
        input.actualCost = body.actualCost;
    } else if (body.actualCost !== undefined && body.actualCost !== null && body.actualCost !== "") {
        return invalid("ค่าซ่อมจริงบันทึกได้เฉพาะการส่งซ่อมภายนอก", "actualCost");
    }
    if (body.toBranchId !== undefined && body.toBranchId !== null && body.toBranchId !== "") {
        if (typeof body.toBranchId !== "string" || !OBJECT_ID.test(body.toBranchId)) return invalid("สาขาที่รับเครื่องกลับไม่ถูกต้อง", "toBranchId");
        input.toBranchId = body.toBranchId;
    }
    return { ok: true, value: input };
}

/**
 * Who holds the device after a return, or null to leave the holder alone.
 * Returns stay possible on a closed job, so an outside repair still open when
 * the job was cancelled can get its cost recorded, but a return never
 * overrides a handover to the customer.
 */
export function holderAfterReturn(
    job: Pick<CustodyJobLike, "status" | "currentHolder">,
    branch: { _id: Id; name: string },
): { kind: "branch"; label: string; branchId: string } | null {
    if (job.status === "completed" || job.currentHolder?.kind === "customer") return null;
    return { kind: "branch", label: branch.name, branchId: String(branch._id) };
}

/** "สาขา: สาขา A", "ร้านซ่อมภายนอก: ร้าน B" */
export function holderText(holder: { kind: string; label: string } | null | undefined): string {
    if (!holder) return "ไม่ระบุ";
    const kind = HOLDER.is(holder.kind) ? HOLDER.labels[holder.kind] : holder.kind;
    return `${kind}: ${holder.label}`;
}
