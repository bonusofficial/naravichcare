import mongoose from "mongoose";
import { MAX_MONEY } from "./costs";
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

// ---------------------------------------------------------------------------
// POST /api/admin/repair/jobs
// ---------------------------------------------------------------------------

const CREATE_FIELDS = [
    "deviceType", "brand", "deviceModel", "serialNumber", "imei", "color",
    "deviceCondition", "accessories", "jobType", "reportedSymptom", "internalNotes",
    "customer", "newCustomer",
] as const;
const NEW_CUSTOMER_FIELDS = ["firstName", "lastName", "phone", "lineId", "address", "notes"] as const;

export interface AdminCreateInput {
    job: Record<string, unknown>;
    customerId: string | null;
    newCustomer: Record<string, string> | null;
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
        const raw = body.newCustomer as Record<string, unknown>;
        rejectUnknown(raw, NEW_CUSTOMER_FIELDS);
        const firstName = text(raw, "firstName", 100);
        const lastName = text(raw, "lastName", 100);
        const phone = text(raw, "phone", 20);
        if (!firstName || !lastName || !phone) {
            throw new AdminValidationError("กรุณากรอกชื่อ นามสกุล และเบอร์โทรลูกค้า", ["newCustomer"]);
        }
        newCustomer = {
            firstName,
            lastName,
            phone,
            lineId: text(raw, "lineId", 100) ?? "",
            address: text(raw, "address", 500) ?? "",
            notes: text(raw, "notes", 1000) ?? "",
        };
    }

    if (!customerId && !newCustomer) throw new AdminValidationError("กรุณาระบุข้อมูลลูกค้า (Customer info required)", ["customer"]);
    return { job, customerId, newCustomer };
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/repair/jobs/:id
// ---------------------------------------------------------------------------

const PATCH_FIELDS = [
    "status", "statusNote",
    "laborCost", "partsCost", "partsPurchaseCost",
    "diagnosticResult", "internalNotes", "quotationApproved", "assignedTechnician",
    "warrantyStartDate", "warrantyExpireDate", "warrantyType", "voidStickerCode",
    "photosBefore", "photosAfter",
    "color", "deviceCondition", "accessories",
] as const;

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
    costs?: { laborCost?: number; partsCost?: number; partsPurchaseCost?: number };
    set: Record<string, unknown>;
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

function dateField(body: Record<string, unknown>, field: string): Date | null | undefined {
    const raw = body[field];
    if (raw === undefined) return undefined;
    if (raw === null || raw === "") return null;
    if (typeof raw !== "string") throw new AdminValidationError(`${field} ไม่ถูกต้อง`, [field]);
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) throw new AdminValidationError(`${field} ไม่ถูกต้อง`, [field]);
    return date;
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

    const laborCost = money(body, "laborCost");
    const partsCost = money(body, "partsCost");
    const partsPurchaseCost = money(body, "partsPurchaseCost");
    const costs = laborCost !== undefined || partsCost !== undefined || partsPurchaseCost !== undefined
        ? { laborCost, partsCost, partsPurchaseCost }
        : undefined;

    for (const [field, max] of [["diagnosticResult", 4000], ["internalNotes", 4000], ["warrantyType", 100], ["voidStickerCode", 100], ["color", 50], ["deviceCondition", 1000]] as const) {
        const value = text(body, field, max);
        if (value !== undefined) set[field] = value;
    }

    if (body.quotationApproved !== undefined) {
        if (!["pending", "approved", "rejected"].includes(body.quotationApproved as string)) {
            throw new AdminValidationError("quotationApproved ไม่ถูกต้อง", ["quotationApproved"]);
        }
        set.quotationApproved = body.quotationApproved;
    }

    if (body.assignedTechnician !== undefined) {
        if (body.assignedTechnician === null || body.assignedTechnician === "") set.assignedTechnician = null;
        else if (typeof body.assignedTechnician === "string" && mongoose.isValidObjectId(body.assignedTechnician)) set.assignedTechnician = body.assignedTechnician;
        else throw new AdminValidationError("assignedTechnician ไม่ถูกต้อง", ["assignedTechnician"]);
    }

    for (const field of ["warrantyStartDate", "warrantyExpireDate"] as const) {
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

    return { status, statusNote, costs, set };
}
