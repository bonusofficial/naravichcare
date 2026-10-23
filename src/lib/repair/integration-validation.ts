import type { FieldError } from "@/lib/integration/errors";

/**
 * Field allowlists and validation for /api/integration/v1/repair-jobs.
 * Unknown fields are rejected rather than ignored so a typo in the client is
 * caught instead of silently dropping data.
 */

// Same pattern NaravichPOS uses for IMEIs (14-17 digits covers IMEI with and
// without check digit and IMEISV).
export const IMEI_PATTERN = /^\d{14,17}$/;
export const EXTERNAL_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/;
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const OPAQUE_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const SERIAL_PATTERN = /^[A-Za-z0-9./-]{1,64}$/;
const BRANCH_CODE_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const THAI_PHONE_PATTERN = /^0\d{8,9}$/;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const CONTROL_CHARS_NO_NEWLINE = /[\u0000-\u001F\u007F]/;
const RELATIVE_PATH_PATTERN = /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*(\?[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*)?$/;

export const MAX_IMAGE_URLS = 10;
export const MAX_IMAGE_URL_LENGTH = 2048;
export const MAX_SYMPTOM_LENGTH = 4000;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export const CREATE_FIELDS = [
    "reference",
    "inventoryItemId",
    "productCode",
    "imei",
    "serialNumber",
    "model",
    "branchId",
    "branchCode",
    "ownerType",
    "customer",
    "symptom",
    "imageUrls",
] as const;

const CUSTOMER_FIELDS = ["firstName", "lastName", "phone", "lineId"] as const;

export type OwnerType = "store" | "customer";

export interface IntegrationCustomerInput {
    firstName: string;
    lastName: string;
    phone: string;
    lineId: string | null;
}

export interface IntegrationCreateInput {
    reference: string;
    inventoryItemId: string | null;
    productCode: string | null;
    imei: string | null;
    serialNumber: string | null;
    model: string;
    branchId: string | null;
    branchCode: string | null;
    ownerType: OwnerType;
    customer: IntegrationCustomerInput | null;
    symptom: string;
    imageUrls: string[];
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false, errors: FieldError[] };

interface StringRule {
    required?: boolean;
    max: number;
    pattern?: RegExp;
    multiline?: boolean;
}

function readString(body: Record<string, unknown>, field: string, rule: StringRule, errors: FieldError[], prefix = ""): string | null {
    const name = prefix + field;
    const raw = body[field];
    if (raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "")) {
        if (rule.required) errors.push({ field: name, message: "is required" });
        return null;
    }
    if (typeof raw !== "string") {
        errors.push({ field: name, message: "must be a string" });
        return null;
    }
    const value = raw.trim();
    if (value.length > rule.max) {
        errors.push({ field: name, message: `must be at most ${rule.max} characters` });
        return null;
    }
    if ((rule.multiline ? CONTROL_CHARS : CONTROL_CHARS_NO_NEWLINE).test(value)) {
        errors.push({ field: name, message: "contains control characters" });
        return null;
    }
    if (rule.pattern && !rule.pattern.test(value)) {
        errors.push({ field: name, message: "has an invalid format" });
        return null;
    }
    return value;
}

function rejectUnknown(body: Record<string, unknown>, allowed: readonly string[], errors: FieldError[], prefix = "") {
    for (const key of Object.keys(body)) {
        if (!allowed.includes(key)) errors.push({ field: prefix + key, message: "is not an allowed field" });
    }
}

export function integrationAllowsHttp(): boolean {
    return process.env.INTEGRATION_API_ALLOW_HTTP === "true";
}

/**
 * Accepts https URLs (http only when INTEGRATION_API_ALLOW_HTTP=true) and
 * root-relative paths such as "/api/product-images/files/x.jpg", which is the
 * form the current POS stores. data: URIs and credentials in URLs are refused.
 */
export function validateImageUrl(raw: unknown, allowHttp: boolean): { value?: string; error?: string } {
    if (typeof raw !== "string") return { error: "must be a string" };
    const value = raw.trim();
    if (!value) return { error: "must not be empty" };
    if (value.length > MAX_IMAGE_URL_LENGTH) return { error: `must be at most ${MAX_IMAGE_URL_LENGTH} characters` };
    if (/^data:/i.test(value)) return { error: "base64/data URIs are not accepted; send an image URL" };
    if (value.startsWith("/")) {
        if (value.startsWith("//") || /(^|\/)\.\.(\/|\?|$)/.test(value) || !RELATIVE_PATH_PATTERN.test(value)) {
            return { error: "is not a valid relative path" };
        }
        return { value };
    }
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return { error: "must be an absolute http(s) URL or a root-relative path" };
    }
    if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) {
        return { error: allowHttp ? "must use http or https" : "must use https" };
    }
    if (url.username || url.password) return { error: "must not contain credentials" };
    return { value };
}

function readCustomer(raw: unknown, errors: FieldError[]): IntegrationCustomerInput | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        errors.push({ field: "customer", message: "must be an object" });
        return null;
    }
    const body = raw as Record<string, unknown>;
    const before = errors.length;
    rejectUnknown(body, CUSTOMER_FIELDS, errors, "customer.");
    const firstName = readString(body, "firstName", { required: true, max: 100 }, errors, "customer.");
    const lastName = readString(body, "lastName", { required: true, max: 100 }, errors, "customer.");
    const phone = readString(body, "phone", { required: true, max: 10, pattern: THAI_PHONE_PATTERN }, errors, "customer.");
    const lineId = readString(body, "lineId", { max: 100 }, errors, "customer.");
    if (errors.length > before || !firstName || !lastName || !phone) return null;
    return { firstName, lastName, phone, lineId };
}

export function validateCreatePayload(body: Record<string, unknown>, allowHttp = integrationAllowsHttp()): ValidationResult<IntegrationCreateInput> {
    const errors: FieldError[] = [];
    rejectUnknown(body, CREATE_FIELDS, errors);

    const reference = readString(body, "reference", { required: true, max: 120, pattern: EXTERNAL_REF_PATTERN }, errors);
    const inventoryItemId = readString(body, "inventoryItemId", { max: 64, pattern: OPAQUE_ID_PATTERN }, errors);
    const productCode = readString(body, "productCode", { max: 64 }, errors);
    const imei = readString(body, "imei", { max: 17, pattern: IMEI_PATTERN }, errors);
    const serialNumber = readString(body, "serialNumber", { max: 64, pattern: SERIAL_PATTERN }, errors);
    const model = readString(body, "model", { required: true, max: 200 }, errors);
    const branchId = readString(body, "branchId", { max: 64, pattern: OPAQUE_ID_PATTERN }, errors);
    const branchCode = readString(body, "branchCode", { max: 32, pattern: BRANCH_CODE_PATTERN }, errors);
    const symptom = readString(body, "symptom", { required: true, max: MAX_SYMPTOM_LENGTH, multiline: true }, errors);

    let ownerType: OwnerType = "store";
    if (body.ownerType !== undefined && body.ownerType !== null) {
        if (body.ownerType === "store" || body.ownerType === "customer") ownerType = body.ownerType;
        else errors.push({ field: "ownerType", message: "must be 'store' or 'customer'" });
    }

    let customer: IntegrationCustomerInput | null = null;
    if (ownerType === "customer") {
        if (body.customer === undefined || body.customer === null) errors.push({ field: "customer", message: "is required when ownerType is 'customer'" });
        else customer = readCustomer(body.customer, errors);
    } else if (body.customer !== undefined && body.customer !== null) {
        // A store-owned device has no customer; refusing here stops callers
        // from attaching a placeholder person to shop stock.
        errors.push({ field: "customer", message: "must not be sent when ownerType is 'store'" });
    }

    const imageUrls: string[] = [];
    if (body.imageUrls !== undefined && body.imageUrls !== null) {
        if (!Array.isArray(body.imageUrls)) {
            errors.push({ field: "imageUrls", message: "must be an array" });
        } else if (body.imageUrls.length > MAX_IMAGE_URLS) {
            errors.push({ field: "imageUrls", message: `must contain at most ${MAX_IMAGE_URLS} items` });
        } else {
            body.imageUrls.forEach((raw, index) => {
                const result = validateImageUrl(raw, allowHttp);
                if (result.error) errors.push({ field: `imageUrls[${index}]`, message: result.error });
                else if (result.value) imageUrls.push(result.value);
            });
        }
    }

    if (!imei && !serialNumber && !productCode) {
        errors.push({ field: "imei", message: "one of imei, serialNumber or productCode is required" });
    }

    if (errors.length || !reference || !model || !symptom) return { ok: false, errors };
    return {
        ok: true,
        value: {
            reference,
            inventoryItemId,
            productCode,
            imei,
            serialNumber,
            model,
            branchId,
            branchCode,
            ownerType,
            customer,
            symptom,
            imageUrls,
        },
    };
}

export function validateCancelPayload(body: Record<string, unknown>): ValidationResult<{ reason: string }> {
    const errors: FieldError[] = [];
    rejectUnknown(body, ["reason"], errors);
    const reason = readString(body, "reason", { required: true, max: 500, multiline: true }, errors);
    if (errors.length || !reason) return { ok: false, errors };
    return { ok: true, value: { reason } };
}

export function validateHandoverPayload(body: Record<string, unknown>): ValidationResult<{ note: string | null }> {
    const errors: FieldError[] = [];
    rejectUnknown(body, ["note"], errors);
    const note = readString(body, "note", { max: 500, multiline: true }, errors);
    if (errors.length) return { ok: false, errors };
    return { ok: true, value: { note } };
}

export interface SearchQuery {
    externalRef: string | null;
    imei: string | null;
    page: number;
    limit: number;
}

export function validateSearchQuery(params: URLSearchParams): ValidationResult<SearchQuery> {
    const errors: FieldError[] = [];
    const allowed = ["externalRef", "imei", "page", "limit"];
    for (const key of new Set(params.keys())) {
        if (!allowed.includes(key)) errors.push({ field: key, message: "is not an allowed query parameter" });
        else if (params.getAll(key).length > 1) errors.push({ field: key, message: "must be given once" });
    }
    const values = Object.fromEntries(allowed.map((key) => [key, params.get(key) ?? undefined]));
    const externalRef = readString(values, "externalRef", { max: 120, pattern: EXTERNAL_REF_PATTERN }, errors);
    const imei = readString(values, "imei", { max: 17, pattern: IMEI_PATTERN }, errors);

    const parsePositive = (field: string, fallback: number, max: number) => {
        const raw = values[field];
        if (raw === undefined || raw === "") return fallback;
        if (!/^\d{1,6}$/.test(String(raw)) || Number(raw) < 1) {
            errors.push({ field, message: "must be a positive integer" });
            return fallback;
        }
        if (Number(raw) > max) {
            errors.push({ field, message: `must be at most ${max}` });
            return fallback;
        }
        return Number(raw);
    };
    const page = parsePositive("page", 1, 100_000);
    const limit = parsePositive("limit", DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);

    if (errors.length) return { ok: false, errors };
    return { ok: true, value: { externalRef, imei, page, limit } };
}
