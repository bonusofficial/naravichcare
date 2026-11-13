import { NextResponse, type NextRequest } from "next/server";
import { ClaimEligibilityError } from "@/lib/claim-eligibility";
import { AdminValidationError } from "./admin-validation";
import { RepairWorkflowError } from "./service";

/** Error body shared by the admin repair job routes: `{ error, code, fields? }`. */
export function adminRepairErrorResponse(error: unknown): NextResponse | null {
    if (error instanceof AdminValidationError) return NextResponse.json({ error: error.message, code: "VALIDATION_ERROR", fields: error.fields }, { status: 400 });
    if (error instanceof RepairWorkflowError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    if (error instanceof ClaimEligibilityError) return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    return null;
}

/** A JSON object body, or null for anything else. */
export async function readJsonObject(req: NextRequest): Promise<Record<string, unknown> | null> {
    const body = await req.json().catch(() => null);
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

export const invalidBody = () => NextResponse.json({ error: "Invalid request body", code: "VALIDATION_ERROR" }, { status: 400 });

export const CLOSED_STATUSES = ["completed", "cancelled"] as const;

export const repairClosed = () =>
    NextResponse.json({ error: "งานนี้ปิดแล้ว ไม่สามารถบันทึกเพิ่มได้", code: "REPAIR_CLOSED" }, { status: 409 });

export const concurrentEdit = () =>
    NextResponse.json({ error: "งานซ่อมถูกแก้ไขพร้อมกัน กรุณาโหลดข้อมูลใหม่แล้วลองอีกครั้ง", code: "CONFLICT" }, { status: 409 });
