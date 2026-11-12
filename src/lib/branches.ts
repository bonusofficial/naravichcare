import mongoose from "mongoose";
import Branch from "@/models/Branch";

/**
 * Validate Branch.posBranchIds from a request body: the POS branch ids or
 * branch codes that route POS repair jobs to this branch. Returns undefined
 * when the field is absent, an error message string when it is invalid.
 */
export function parsePosBranchIds(raw: unknown): string[] | undefined | { error: string } {
    if (raw === undefined) return undefined;
    if (raw === null) return [];
    if (!Array.isArray(raw) || raw.length > 20 || raw.some((id) => typeof id !== "string" || id.trim().length > 100)) {
        return { error: "รหัสสาขาใน POS ไม่ถูกต้อง (สูงสุด 20 รหัส รหัสละไม่เกิน 100 ตัวอักษร)" };
    }
    return [...new Set((raw as string[]).map((id) => id.trim()).filter(Boolean))];
}

export type BranchIdsResult = { ok: true; ids: mongoose.Types.ObjectId[] } | { ok: false; error: string };

/**
 * Validate a list of branch ids from a request body: every id must be an
 * active branch. Duplicates are dropped. null or [] clears the list.
 */
export async function validateBranchIds(raw: unknown): Promise<BranchIdsResult> {
    if (raw === null || raw === undefined) return { ok: true, ids: [] };
    if (!Array.isArray(raw) || raw.length > 100 || raw.some((id) => typeof id !== "string" || !mongoose.isValidObjectId(id))) {
        return { ok: false, error: "รายการสาขาไม่ถูกต้อง" };
    }
    const unique = [...new Set(raw as string[])];
    if (!unique.length) return { ok: true, ids: [] };
    const found = await Branch.countDocuments({ _id: { $in: unique }, isActive: true });
    if (found !== unique.length) return { ok: false, error: "มีสาขาที่ไม่พบหรือปิดใช้งานอยู่" };
    return { ok: true, ids: unique.map((id) => new mongoose.Types.ObjectId(id)) };
}
