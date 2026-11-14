import mongoose from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { recordAdminLog } from "@/lib/admin-log";
import RepairCustomer from "@/models/RepairCustomer";
import { parseCustomerInput } from "./admin-validation";

const notFound = () => NextResponse.json({ error: "ไม่พบข้อมูลลูกค้า" }, { status: 404 });

/**
 * Edit a customer's contact details (name, phone, LINE ID, address, notes).
 * Only those fields can change. A phone number already used by another
 * customer is refused, because the intake form finds customers by phone.
 * The caller has already checked edit_repair_jobs.
 */
export async function updateRepairCustomer(req: NextRequest, id: string, body: Record<string, unknown>): Promise<NextResponse> {
    if (!mongoose.isValidObjectId(id)) return notFound();
    const input = parseCustomerInput(body, { partial: true });
    const current = await RepairCustomer.findById(id).lean<Record<string, unknown> & { firstName: string; lastName: string; phone: string }>();
    if (!current) return notFound();

    if (input.phone && input.phone !== current.phone && (await RepairCustomer.exists({ _id: { $ne: id }, phone: input.phone }))) {
        return NextResponse.json({ error: "เบอร์โทรนี้เป็นของลูกค้ารายอื่นแล้ว", code: "VALIDATION_ERROR", fields: ["phone"] }, { status: 409 });
    }

    const changed = Object.fromEntries(Object.entries(input).filter(([field, value]) => (current[field] ?? "") !== value));
    if (!Object.keys(changed).length) return NextResponse.json(await RepairCustomer.findById(id));

    const updated = await RepairCustomer.findByIdAndUpdate(id, { $set: changed }, { returnDocument: "after", runValidators: true });
    await recordAdminLog({
        req,
        action: "update_customer",
        description: `แก้ไขข้อมูลลูกค้า "${current.firstName} ${current.lastName}" (${current.phone})`,
        targetId: id,
        targetType: "RepairCustomer",
        details: Object.fromEntries(Object.keys(changed).map((field) => [field, { before: current[field] ?? "", after: changed[field] }])),
    });
    return NextResponse.json(updated);
}
