import { describe, expect, it } from "vitest";
import {
    MAX_IMAGE_URLS,
    validateCancelPayload,
    validateCreatePayload,
    validateHandoverPayload,
    validateImageUrl,
    validateSearchQuery,
} from "./integration-validation";

const base = {
    reference: "REP-20261024-LXK2Z-AB12CD",
    productCode: "NV-00001",
    imei: "356938035643809",
    model: "Apple iPhone 13 128GB",
    branchId: "6f1c2a52-6a1e-4bd4-9c39-1f0f6f0b9a11",
    symptom: "หน้าจอมีปัญหา",
    imageUrls: [],
};

function fields(result: ReturnType<typeof validateCreatePayload>) {
    return result.ok ? [] : result.errors.map((error) => error.field);
}

describe("integration create payload", () => {
    it("accepts the current POS payload and defaults ownerType to store", () => {
        const result = validateCreatePayload(base);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.ownerType).toBe("store");
            expect(result.value.customer).toBeNull();
        }
    });

    it("accepts imageUrls: null and imei: null as the POS sends for items without them", () => {
        const result = validateCreatePayload({ ...base, imei: null, imageUrls: null });
        expect(result.ok).toBe(true);
    });

    it("rejects fields outside the allowlist, including internal ones", () => {
        const result = validateCreatePayload({ ...base, jobId: "JOB9999-0001", statusHistory: [], status: "completed", _id: "x", totalPrice: 1 });
        expect(fields(result)).toEqual(expect.arrayContaining(["jobId", "statusHistory", "status", "_id", "totalPrice"]));
    });

    it.each(["12345", "3569380356438091234", "35693803564380A", "356938 035643809"])("rejects IMEI %s", (imei) => {
        expect(fields(validateCreatePayload({ ...base, imei }))).toContain("imei");
    });

    it("requires reference, model and symptom", () => {
        expect(fields(validateCreatePayload({ ...base, reference: undefined, model: "", symptom: " " }))).toEqual(
            expect.arrayContaining(["reference", "model", "symptom"]),
        );
    });

    it("limits string lengths", () => {
        expect(fields(validateCreatePayload({ ...base, symptom: "x".repeat(4001) }))).toContain("symptom");
        expect(fields(validateCreatePayload({ ...base, reference: `R${"x".repeat(120)}` }))).toContain("reference");
        expect(fields(validateCreatePayload({ ...base, model: "m".repeat(201) }))).toContain("model");
    });

    it("rejects base64 images", () => {
        expect(fields(validateCreatePayload({ ...base, imageUrls: ["data:image/png;base64,iVBORw0KGgo="] }))).toContain("imageUrls[0]");
    });

    it("rejects too many images and over-long URLs", () => {
        const many = Array.from({ length: MAX_IMAGE_URLS + 1 }, (_, i) => `https://cdn.example.com/${i}.jpg`);
        expect(fields(validateCreatePayload({ ...base, imageUrls: many }))).toContain("imageUrls");
        expect(fields(validateCreatePayload({ ...base, imageUrls: [`https://cdn.example.com/${"a".repeat(2050)}`] }))).toContain("imageUrls[0]");
    });

    it("refuses a customer on a store-owned device", () => {
        const result = validateCreatePayload({ ...base, ownerType: "store", customer: { firstName: "A", lastName: "B", phone: "0812345678" } });
        expect(fields(result)).toContain("customer");
    });

    it("requires valid customer data for ownerType customer", () => {
        expect(fields(validateCreatePayload({ ...base, ownerType: "customer" }))).toContain("customer");
        expect(fields(validateCreatePayload({ ...base, ownerType: "customer", customer: { firstName: "A", lastName: "B", phone: "12" } }))).toContain("customer.phone");
        const ok = validateCreatePayload({ ...base, ownerType: "customer", customer: { firstName: "A", lastName: "B", phone: "0812345678" } });
        expect(ok.ok).toBe(true);
    });

    it("needs at least one device identifier", () => {
        expect(fields(validateCreatePayload({ ...base, imei: null, productCode: null }))).toContain("imei");
    });
});

describe("image URL rules", () => {
    it("accepts https and POS root-relative paths", () => {
        expect(validateImageUrl("https://cdn.example.com/a.jpg", false).value).toBeDefined();
        expect(validateImageUrl("/api/product-images/files/abc-123.jpg", false).value).toBeDefined();
    });

    it("accepts http only when allowed", () => {
        expect(validateImageUrl("http://cdn.example.com/a.jpg", false).error).toBeDefined();
        expect(validateImageUrl("http://cdn.example.com/a.jpg", true).value).toBeDefined();
    });

    it.each([
        "javascript:alert(1)",
        "ftp://example.com/a.jpg",
        "//evil.example.com/a.jpg",
        "/../etc/passwd",
        "/a\\b.jpg",
        "https://user:pass@example.com/a.jpg",
        "data:image/jpeg;base64,/9j/4AAQ",
    ])("rejects %s", (url) => {
        expect(validateImageUrl(url, true).error).toBeDefined();
    });
});

describe("cancel / handover / search payloads", () => {
    it("requires a cancel reason and rejects extra fields", () => {
        expect(validateCancelPayload({}).ok).toBe(false);
        expect(validateCancelPayload({ reason: "x", status: "cancelled" }).ok).toBe(false);
        expect(validateCancelPayload({ reason: "ยกเลิกจาก Web POS" }).ok).toBe(true);
    });

    it("allows an empty handover body", () => {
        expect(validateHandoverPayload({}).ok).toBe(true);
        expect(validateHandoverPayload({ note: "ok" }).ok).toBe(true);
        expect(validateHandoverPayload({ status: "completed" }).ok).toBe(false);
    });

    it("validates search parameters and caps the page size", () => {
        const ok = validateSearchQuery(new URLSearchParams("externalRef=REP-1&imei=356938035643809&page=2&limit=50"));
        expect(ok).toEqual({ ok: true, value: { externalRef: "REP-1", imei: "356938035643809", page: 2, limit: 50 } });
        expect(validateSearchQuery(new URLSearchParams("limit=101")).ok).toBe(false);
        expect(validateSearchQuery(new URLSearchParams("limit=0")).ok).toBe(false);
        expect(validateSearchQuery(new URLSearchParams("page=-1")).ok).toBe(false);
        expect(validateSearchQuery(new URLSearchParams("externalRef=.*")).ok).toBe(false);
        expect(validateSearchQuery(new URLSearchParams("imei[$ne]=1")).ok).toBe(false);
        expect(validateSearchQuery(new URLSearchParams("status=pending")).ok).toBe(false);
        expect(validateSearchQuery(new URLSearchParams("")).ok).toBe(true);
    });
});
