import type { AdminRole } from "@/lib/admin-auth";
import { formatSatang } from "@/lib/buyback";

export const BUYBACK_ROLES: AdminRole[] = ["admin", "super_admin"];

export function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unexpected error";
}

export function isDuplicateKeyError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

type JsonRecord = Record<string, unknown>;

export function serializeBuyback(source: unknown) {
    const raw = JSON.parse(JSON.stringify(source)) as JsonRecord;
    const id = String(raw._id || "");
    const files = (raw.files || {}) as Record<string, JsonRecord | undefined>;
    const serializeFile = (key: string) => {
        const file = files[key];
        if (!file) return null;
        return {
            available: !file.deletedAt,
            deletedAt: file.deletedAt || null,
            mimeType: file.mimeType,
            bytes: file.bytes,
            sourceMode: file.sourceMode,
            url: !file.deletedAt ? `/api/admin/buybacks/${id}/files/${key}` : null,
        };
    };
    const recommended = Number(raw.recommendedAmountSatang || 0);
    const actual = Number(raw.actualAmountSatang || 0);
    const customerSnapshot = (raw.customerSnapshot || {}) as JsonRecord;
    const packagePrice = Number(customerSnapshot.packagePriceSatang || 0);
    delete raw.recommendedAmountSatang;
    delete raw.actualAmountSatang;
    delete customerSnapshot.packagePriceSatang;
    delete raw.receiptRelativePath;
    return {
        ...raw,
        customerSnapshot: {
            ...customerSnapshot,
            packagePrice: formatSatang(packagePrice),
        },
        recommendedAmount: formatSatang(recommended),
        actualAmount: formatSatang(actual),
        files: {
            customerSignature: serializeFile("customerSignature"),
            employeeSignature: serializeFile("employeeSignature"),
            paymentProof: serializeFile("paymentProof"),
        },
        receiptUrl: raw.status === "approved" ? `/api/admin/buybacks/${id}/receipt` : null,
    };
}
