import mongoose from "mongoose";
import { MAX_MONEY } from "./costs";
import {
    APPROVAL_CHANNEL, APPROVAL_DECISION, DATA_BACKUP, QC_CHECKLIST, QC_ITEM_KEYS, QC_RESULT, REPAIR_OUTCOME,
    type ApprovalChannel, type ApprovalDecision, type DataBackupStatus, type QcItemKey, type QcOverall, type QcResult, type RepairOutcome,
} from "./options";
import { isRepairStatus } from "./status";

/**
 * Field allowlists for the admin repair job API. Request bodies used to be
 * spread straight into Mongoose, which let a client set jobId, statusHistory,
 * totalPrice or anything else on the document.
 */

export class AdminValidationError extends Error {
    constructor(message: string, public readonly fields: string[] = []) {
        super(message);
    }
}

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function text(body: Record<string, unknown>, field: string, max: number, required = false): string | undefined {
    const raw = body[field];
    if (raw === undefined || raw === null || (typeof raw === "string" && !raw.trim())) {
        if (required) throw new AdminValidationError(`กรุณากรอก ${field}`, [field]);
        return raw === undefined ? undefined : "";
    }
    if (typeof raw !== "string") throw new AdminValidationError(`${field} ต้องเป็นข้อความ`, [field]);
    const value = raw.trim();
    if (value.length > max) throw new AdminValidationError(`${field} ยาวเกิน ${max} ตัวอักษร`, [field]);
    if (CONTROL_CHARS.test(value)) throw new AdminValidationError(`${field} มีอักขระที่ไม่อนุญาต`, [field]);
    return value;
}

function rejectUnknown(body: Record<string, unknown>, allowed: readonly string[], ignored: readonly string[] = []) {
    const unknown = Object.keys(body).filter((key) => !allowed.includes(key) && !ignored.includes(key));
    if (unknown.length) throw new AdminValidationError(`ไม่อนุญาตให้แก้ไข field: ${unknown.join(", ")}`, unknown);
}

function stringList(body: Record<string, unknown>, field: string, maxItems: number, maxLength: number): string[] | undefined {
    const raw = body[field];
    if (raw === undefined) return undefined;
    if (raw === null) return [];
    if (!Array.isArray(raw) || raw.length > maxItems || raw.some((item) => typeof item !== "string" || item.length > maxLength)) {
        throw new AdminValidationError(`${field} ไม่ถูกต้อง`, [field]);
    }
    return raw as string[];
}

function dateField(body: Record<string, unknown>, field: string): Date | null | undefined {
    const raw = body[field];
    if (raw === undefined) return undefined;
    if (raw === null || raw === "") return null;
    if (typeof raw !== "string") throw new AdminValidationError(`${field} ไม่ถูกต้อง`, [field]);
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) throw new AdminValidationError(`${field} ไม่ถูกต้อง`, [field]);
    return date;
}

/** An AdminUser id, null to clear it, or undefined when absent. */
function technicianId(body: Record<string, unknown>): string | null | undefined {
    const raw = body.assignedTechnician;
    if (raw === undefined) return undefined;
    if (raw === null || raw === "") return null;
    if (typeof raw === "string" && mongoose.isValidObjectId(raw)) return raw;
    throw new AdminValidationError("ช่างผู้รับผิดชอบไม่ถูกต้อง", ["assignedTechnician"]);
}

function dataBackupStatus(body: Record<string, unknown>, required: boolean): DataBackupStatus | undefined {
    const raw = body.dataBackupStatus;
    if (raw === undefined || raw === null || raw === "") {
        if (required) throw new AdminValidationError("กรุณาเลือกสถานะข้อมูลในเครื่องลูกค้า", ["dataBackupStatus"]);
        return undefined;
    }
    if (!DATA_BACKUP.is(raw)) throw new AdminValidationError("สถานะข้อมูลในเครื่องไม่ถูกต้อง", ["dataBackupStatus"]);
    return raw;
}

// ---------------------------------------------------------------------------
// POST /api/admin/repair/jobs
// ---------------------------------------------------------------------------

const CREATE_FIELDS = [
    "deviceType", "brand", "deviceModel", "serialNumber", "imei", "color",
    "deviceCondition", "accessories", "jobType", "reportedSymptom", "internalNotes",
    "customer", "newCustomer", "assignedTechnician",
    "branchId", "appointmentDate", "dataBackupStatus",
] as const;

export interface AdminCreateInput {
    job: Record<string, unknown>;
    customerId: string | null;
    newCustomer: Record<string, string> | null;
    /** Receiving branch as sent; the route checks it against the caller's scope. */
    branchId: string | null;
    /** The route stores it with the caller's name and the time. */
    dataBackupStatus: DataBackupStatus;
}

export function parseAdminCreate(body: Record<string, unknown>): AdminCreateInput {
    rejectUnknown(body, CREATE_FIELDS);
    const jobType = body.jobType ?? "repair";
    if (jobType !== "repair" && jobType !== "claim") throw new AdminValidationError("ประเภทงานไม่ถูกต้อง", ["jobType"]);

    const brand = text(body, "brand", 80);
    const deviceModel = text(body, "deviceModel", 120);
    const reportedSymptom = text(body, "reportedSymptom", 4000);
    if (!brand || !deviceModel || !reportedSymptom) {
        throw new AdminValidationError("กรุณากรอกข้อมูล แบรนด์, รุ่น และอาการเสียให้ครบถ้วน", ["brand", "deviceModel", "reportedSymptom"]);
    }

    const job: Record<string, unknown> = {
        ownerType: "customer",
        source: "admin",
        jobType,
        deviceType: text(body, "deviceType", 50) || "Smartphone",
        brand,
        deviceModel,
        reportedSymptom,
        serialNumber: text(body, "serialNumber", 64) ?? "",
        imei: text(body, "imei", 32) ?? "",
        color: text(body, "color", 50) ?? "",
        deviceCondition: text(body, "deviceCondition", 1000) ?? "",
        internalNotes: text(body, "internalNotes", 4000) ?? "",
        accessories: stringList(body, "accessories", 30, 100) ?? [],
    };
    const appointmentDate = dateField(body, "appointmentDate");
    if (appointmentDate) job.appointmentDate = appointmentDate;
    const technician = technicianId(body);
    if (technician) job.assignedTechnician = technician;

    let branchId: string | null = null;
    if (body.branchId !== undefined && body.branchId !== null && body.branchId !== "") {
        if (typeof body.branchId !== "string" || !mongoose.isValidObjectId(body.branchId)) {
            throw new AdminValidationError("สาขาไม่ถูกต้อง", ["branchId"]);
        }
        branchId = body.branchId;
    }
    const backup = dataBackupStatus(body, true)!;

    let customerId: string | null = null;
    if (body.customer !== undefined && body.customer !== null && body.customer !== "") {
        if (typeof body.customer !== "string" || !mongoose.isValidObjectId(body.customer)) {
            throw new AdminValidationError("รหัสลูกค้าไม่ถูกต้อง", ["customer"]);
        }
        customerId = body.customer;
    }

    let newCustomer: Record<string, string> | null = null;
    if (!customerId && body.newCustomer) {
        if (typeof body.newCustomer !== "object" || Array.isArray(body.newCustomer)) {
            throw new AdminValidationError("ข้อมูลลูกค้าใหม่ไม่ถูกต้อง", ["newCustomer"]);
        }
        const parsed = parseCustomerInput(body.newCustomer as Record<string, unknown>);
        newCustomer = { lineId: "", address: "", notes: "", ...parsed } as Record<string, string>;
    }

    if (!customerId && !newCustomer) throw new AdminValidationError("กรุณาระบุข้อมูลลูกค้า (Customer info required)", ["customer"]);
    return { job, customerId, newCustomer, branchId, dataBackupStatus: backup };
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/repair/jobs/:id
// ---------------------------------------------------------------------------

const PATCH_FIELDS = [
    "status", "statusNote", "outcome",
    "laborCost", "partsCost", "partsPurchaseCost",
    "diagnosticResult", "internalNotes", "quotationApproved", "assignedTechnician",
    "warrantyStartDate", "warrantyExpireDate", "warrantyType", "voidStickerCode",
    "photosBefore", "photosAfter",
    "deviceType", "brand", "deviceModel", "serialNumber", "imei", "reportedSymptom",
    "color", "deviceCondition", "accessories",
    "appointmentDate", "dataBackupStatus",
] as const;

/** Device fields that cannot be blanked once the job exists. */
const REQUIRED_DEVICE_FIELDS = new Set(["deviceType", "brand", "deviceModel", "reportedSymptom"]);

// Sent by older copies of the admin UI. adminUsername is ignored because the
// actor comes from the JWT; totalPrice is ignored because the server computes it.
const IGNORED_PATCH_FIELDS = ["adminUsername", "totalPrice"] as const;

const MAX_PHOTOS = 10;
// Admin photos are still stored inline as data URLs by the job detail page.
const MAX_PHOTO_LENGTH = 15 * 1024 * 1024;
const PHOTO_PATTERN = /^(data:image\/(png|jpe?g|webp|gif);base64,|https:\/\/|\/)/i;

export interface AdminPatchInput {
    status?: string;
    statusNote: string;
    /** Only with status "ready_pickup"; transitionRepairJob defaults it to "repaired". */
    outcome?: RepairOutcome;
    costs?: { laborCost?: number; partsCost?: number; partsPurchaseCost?: number };
    set: Record<string, unknown>;
    /** The route stores it with the caller's name and the time. */
    dataBackupStatus?: DataBackupStatus;
}

function money(body: Record<string, unknown>, field: string): number | undefined {
    const raw = body[field];
    if (raw === undefined) return undefined;
    const value = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > MAX_MONEY) {
        throw new AdminValidationError(`${field} ต้องเป็นจำนวนเงินตั้งแต่ 0 ถึง ${MAX_MONEY.toLocaleString()}`, [field]);
    }
    return Math.round(value * 100) / 100;
}

export function parseAdminPatch(body: Record<string, unknown>): AdminPatchInput {
    rejectUnknown(body, PATCH_FIELDS, IGNORED_PATCH_FIELDS);
    const set: Record<string, unknown> = {};

    let status: string | undefined;
    if (body.status !== undefined) {
        if (!isRepairStatus(body.status)) throw new AdminValidationError("สถานะไม่ถูกต้อง", ["status"]);
        status = body.status;
    }
    const statusNote = text(body, "statusNote", 1000) ?? "";

    let outcome: RepairOutcome | undefined;
    if (body.outcome !== undefined && body.outcome !== null && body.outcome !== "") {
        if (!REPAIR_OUTCOME.is(body.outcome)) throw new AdminValidationError("ผลการซ่อมไม่ถูกต้อง", ["outcome"]);
        if (status !== "ready_pickup") throw new AdminValidationError("ระบุผลการซ่อมได้เฉพาะเมื่อเปลี่ยนเป็นสถานะรอรับคืน", ["outcome"]);
        outcome = body.outcome;
    }

    const laborCost = money(body, "laborCost");
    const partsCost = money(body, "partsCost");
    const partsPurchaseCost = money(body, "partsPurchaseCost");
    const costs = laborCost !== undefined || partsCost !== undefined || partsPurchaseCost !== undefined
        ? { laborCost, partsCost, partsPurchaseCost }
        : undefined;

    for (const [field, max] of [
        ["diagnosticResult", 4000], ["internalNotes", 4000], ["warrantyType", 100], ["voidStickerCode", 100],
        ["deviceType", 50], ["brand", 80], ["deviceModel", 120], ["serialNumber", 64], ["imei", 32], ["reportedSymptom", 4000],
        ["color", 50], ["deviceCondition", 1000],
    ] as const) {
        const value = text(body, field, max);
        if (value === undefined) continue;
        if (!value && REQUIRED_DEVICE_FIELDS.has(field)) throw new AdminValidationError(`กรุณากรอก ${field}`, [field]);
        set[field] = value;
    }

    if (body.quotationApproved !== undefined) {
        if (!["pending", "approved", "rejected"].includes(body.quotationApproved as string)) {
            throw new AdminValidationError("quotationApproved ไม่ถูกต้อง", ["quotationApproved"]);
        }
        set.quotationApproved = body.quotationApproved;
    }

    const technician = technicianId(body);
    if (technician !== undefined) set.assignedTechnician = technician;

    for (const field of ["warrantyStartDate", "warrantyExpireDate", "appointmentDate"] as const) {
        const value = dateField(body, field);
        if (value !== undefined) set[field] = value;
    }

    const accessories = stringList(body, "accessories", 30, 100);
    if (accessories !== undefined) set.accessories = accessories;

    for (const field of ["photosBefore", "photosAfter"] as const) {
        const photos = stringList(body, field, MAX_PHOTOS, MAX_PHOTO_LENGTH);
        if (photos === undefined) continue;
        if (photos.some((photo) => !PHOTO_PATTERN.test(photo))) throw new AdminValidationError(`${field} มีรูปภาพที่ไม่รองรับ`, [field]);
        set[field] = photos;
    }

    return { status, statusNote, outcome, costs, set, dataBackupStatus: dataBackupStatus(body, false) };
}

// ---------------------------------------------------------------------------
// Quote approvals, QC and handover (POST /api/admin/repair/jobs/:id/...)
// ---------------------------------------------------------------------------

/** Clock skew allowed for times the staff enter (decidedAt, handedOverAt). */
const MAX_FUTURE_MS = 5 * 60 * 1000;

function pastDate(body: Record<string, unknown>, field: string, label: string): Date | undefined {
    const value = dateField(body, field);
    if (!value) return undefined;
    if (value.getTime() > Date.now() + MAX_FUTURE_MS) throw new AdminValidationError(`${label}ต้องไม่เป็นเวลาในอนาคต`, [field]);
    return value;
}

export interface QuoteApprovalInput {
    decision: ApprovalDecision;
    channel: ApprovalChannel;
    approverName: string;
    /** Defaults to now in the route. */
    decidedAt?: Date;
    note: string;
}

export function parseQuoteApproval(body: Record<string, unknown>): QuoteApprovalInput {
    rejectUnknown(body, ["decision", "channel", "approverName", "decidedAt", "note"]);
    if (!APPROVAL_DECISION.is(body.decision)) throw new AdminValidationError("กรุณาเลือกผลการอนุมัติ (อนุมัติ/ไม่อนุมัติ)", ["decision"]);
    if (!APPROVAL_CHANNEL.is(body.channel)) throw new AdminValidationError("กรุณาเลือกช่องทางที่ลูกค้าแจ้ง", ["channel"]);
    const approverName = text(body, "approverName", 120);
    if (!approverName) throw new AdminValidationError("กรุณากรอกชื่อผู้อนุมัติ", ["approverName"]);
    return {
        decision: body.decision,
        channel: body.channel,
        approverName,
        decidedAt: pastDate(body, "decidedAt", "เวลาที่ลูกค้าแจ้ง"),
        note: text(body, "note", 1000) ?? "",
    };
}

export interface QcCheckInput {
    items: { key: QcItemKey; result: QcResult }[];
    overall: QcOverall;
    note: string;
}

/** Every QC_CHECKLIST item exactly once; overall passes when nothing failed. */
export function parseQcCheck(body: Record<string, unknown>): QcCheckInput {
    rejectUnknown(body, ["items", "note"]);
    if (!Array.isArray(body.items)) throw new AdminValidationError("กรุณาบันทึกผล QC ให้ครบทุกรายการ", ["items"]);
    const results = new Map<string, QcResult>();
    for (const raw of body.items as unknown[]) {
        const item = raw as { key?: unknown; result?: unknown } | null;
        if (!item || typeof item !== "object" || Array.isArray(item) || Object.keys(item).some((k) => k !== "key" && k !== "result")) {
            throw new AdminValidationError("รายการ QC ไม่ถูกต้อง", ["items"]);
        }
        if (typeof item.key !== "string" || !(QC_ITEM_KEYS as readonly string[]).includes(item.key)) {
            throw new AdminValidationError(`ไม่รู้จักรายการ QC "${String(item.key)}"`, ["items"]);
        }
        if (results.has(item.key)) throw new AdminValidationError(`รายการ QC "${item.key}" ซ้ำ`, ["items"]);
        if (!QC_RESULT.is(item.result)) throw new AdminValidationError(`ผล QC ของ "${item.key}" ไม่ถูกต้อง`, ["items"]);
        results.set(item.key, item.result);
    }
    const missing = QC_CHECKLIST.filter((item) => !results.has(item.key));
    if (missing.length) {
        throw new AdminValidationError(`กรุณาบันทึกผล QC ให้ครบ: ${missing.map((item) => item.label).join(", ")}`, ["items"]);
    }
    const items = QC_ITEM_KEYS.map((key) => ({ key, result: results.get(key)! }));
    return {
        items,
        overall: items.every((item) => item.result !== "fail") ? "pass" : "fail",
        note: text(body, "note", 1000) ?? "",
    };
}

export interface HandoverInput {
    receiverName: string;
    receiverPhone: string;
    receiverRelation: string;
    /** Defaults to now in the route. */
    handedOverAt?: Date;
    note: string;
}

export function parseHandover(body: Record<string, unknown>): HandoverInput {
    rejectUnknown(body, ["receiverName", "receiverPhone", "receiverRelation", "handedOverAt", "note"]);
    const receiverName = text(body, "receiverName", 120);
    if (!receiverName) throw new AdminValidationError("กรุณากรอกชื่อผู้รับเครื่อง", ["receiverName"]);
    const receiverPhone = text(body, "receiverPhone", 20) ?? "";
    if (receiverPhone && !/^[0-9+\-\s()]{6,20}$/.test(receiverPhone)) {
        throw new AdminValidationError("เบอร์โทรผู้รับเครื่องไม่ถูกต้อง", ["receiverPhone"]);
    }
    return {
        receiverName,
        receiverPhone,
        receiverRelation: text(body, "receiverRelation", 100) ?? "",
        handedOverAt: pastDate(body, "handedOverAt", "เวลาส่งมอบ"),
        note: text(body, "note", 1000) ?? "",
    };
}

// ---------------------------------------------------------------------------
// Repair customers (POST/PATCH /api/admin/repair/customers...)
// ---------------------------------------------------------------------------

const CUSTOMER_FIELDS = ["firstName", "lastName", "phone", "lineId", "address", "notes"] as const;
type CustomerField = (typeof CUSTOMER_FIELDS)[number];
export type CustomerInput = Partial<Record<CustomerField, string>>;

const CUSTOMER_LIMITS: Record<CustomerField, number> = { firstName: 100, lastName: 100, phone: 20, lineId: 100, address: 500, notes: 1000 };
const CUSTOMER_LABELS: Record<CustomerField, string> = { firstName: "ชื่อ", lastName: "นามสกุล", phone: "เบอร์โทร", lineId: "LINE ID", address: "ที่อยู่", notes: "หมายเหตุ" };
const REQUIRED_CUSTOMER_FIELDS: readonly CustomerField[] = ["firstName", "lastName", "phone"];

/**
 * Customer contact details. `partial` (editing) accepts any subset but never
 * blanks a required field; otherwise name and phone are required.
 */
export function parseCustomerInput(body: Record<string, unknown>, { partial = false, ignore = [] as readonly string[] } = {}): CustomerInput {
    rejectUnknown(body, CUSTOMER_FIELDS, ignore);
    const input: CustomerInput = {};
    for (const field of CUSTOMER_FIELDS) {
        const value = text(body, field, CUSTOMER_LIMITS[field]);
        if (value === undefined) continue;
        input[field] = value;
    }
    for (const field of REQUIRED_CUSTOMER_FIELDS) {
        const missing = partial ? input[field] === "" : !input[field];
        if (missing) throw new AdminValidationError(`กรุณากรอก${CUSTOMER_LABELS[field]}ลูกค้า`, [field]);
    }
    if (input.phone && !/^[0-9+\-\s()]{6,20}$/.test(input.phone)) {
        throw new AdminValidationError("เบอร์โทรลูกค้าไม่ถูกต้อง", ["phone"]);
    }
    return input;
}

// ---------------------------------------------------------------------------
// One photo change (POST /api/admin/repair/jobs/:id/photos)
// ---------------------------------------------------------------------------

export const PHOTO_ACTIONS = ["add", "replace", "delete"] as const;
export type PhotoAction = (typeof PHOTO_ACTIONS)[number];

/**
 * Photos live inline on the job document (16 MB limit for the whole job), so
 * one photo is capped well below that. The job page shrinks photos first.
 */
const MAX_UPLOAD_PHOTO_LENGTH = 3 * 1024 * 1024;

export interface PhotoChangeInput {
    action: PhotoAction;
    field: "photosBefore" | "photosAfter";
    /** Position of the photo to replace or delete. */
    index?: number;
    image?: string;
    /** How many photos the client saw; the change is refused if that is stale. */
    expectedCount: number;
}

export function parsePhotoChange(body: Record<string, unknown>): PhotoChangeInput {
    rejectUnknown(body, ["action", "type", "index", "image", "expectedCount"]);
    const action = body.action;
    if (typeof action !== "string" || !(PHOTO_ACTIONS as readonly string[]).includes(action)) {
        throw new AdminValidationError("คำสั่งรูปภาพไม่ถูกต้อง", ["action"]);
    }
    if (body.type !== "before" && body.type !== "after") throw new AdminValidationError("ประเภทรูปต้องเป็น before หรือ after", ["type"]);
    const expectedCount = body.expectedCount;
    if (typeof expectedCount !== "number" || !Number.isInteger(expectedCount) || expectedCount < 0 || expectedCount > MAX_PHOTOS) {
        throw new AdminValidationError("จำนวนรูปไม่ถูกต้อง", ["expectedCount"]);
    }
    const input: PhotoChangeInput = { action: action as PhotoAction, field: body.type === "before" ? "photosBefore" : "photosAfter", expectedCount };

    if (action !== "add") {
        const index = body.index;
        if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= expectedCount) {
            throw new AdminValidationError("ตำแหน่งรูปไม่ถูกต้อง", ["index"]);
        }
        input.index = index;
    } else if (expectedCount >= MAX_PHOTOS) {
        throw new AdminValidationError(`เพิ่มรูปได้ไม่เกิน ${MAX_PHOTOS} รูปต่อหมวด`, ["image"]);
    }
    if (action !== "delete") {
        const image = body.image;
        if (typeof image !== "string" || !PHOTO_PATTERN.test(image)) {
            throw new AdminValidationError("ไฟล์รูปไม่รองรับ (ใช้ JPG, PNG, WEBP หรือ GIF)", ["image"]);
        }
        if (image.length > MAX_UPLOAD_PHOTO_LENGTH) throw new AdminValidationError("รูปใหญ่เกินไป กรุณาใช้รูปขนาดเล็กลง", ["image"]);
        input.image = image;
    }
    return input;
}
