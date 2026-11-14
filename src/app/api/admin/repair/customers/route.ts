import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import RepairCustomer from "@/models/RepairCustomer";
import { recordAdminLog } from "@/lib/admin-log";
import { checkPermission } from "@/lib/check-permission";
import { isDuplicateKeyError } from "@/lib/errors";
import { AdminValidationError, parseCustomerInput } from "@/lib/repair/admin-validation";
import { adminRepairErrorResponse, invalidBody, readJsonObject } from "@/lib/repair/admin-route";
import { customerSearchFilter } from "@/lib/repair/search";
import { updateRepairCustomer } from "@/lib/repair/customers";

/**
 * Repair customers. `phone` looks one customer up by the exact number (intake
 * form); `q` searches name, "first last", phone or customer id.
 */
export async function GET(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "view_repair_jobs");
        if (!authorized) return error;

        await dbConnect();
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q")?.trim().slice(0, 100) ?? "";
        const phone = searchParams.get("phone")?.trim().slice(0, 20) ?? "";

        let filter: Record<string, unknown> = {};
        if (phone) filter = { phone };
        else if (query) filter = customerSearchFilter(query) ?? {};

        const customers = await RepairCustomer.find(filter).sort({ createdAt: -1 }).limit(50);
        return NextResponse.json(customers);
    } catch (error) {
        console.error("Fetch Customers Error:", error);
        return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "create_repair_jobs");
        if (!authorized) return error;

        await dbConnect();
        const body = await readJsonObject(req);
        if (!body) return invalidBody();
        const customer = await RepairCustomer.create(parseCustomerInput(body));

        await recordAdminLog({
            req,
            action: "create_customer",
            description: `ลงทะเบียนลูกค้าใหม่ชื่อ "${customer.firstName} ${customer.lastName}" (${customer.phone})`,
            targetId: customer._id.toString(),
            targetType: "RepairCustomer"
        });

        return NextResponse.json(customer, { status: 201 });
    } catch (error) {
        if (error instanceof AdminValidationError) return adminRepairErrorResponse(error)!;
        if (isDuplicateKeyError(error)) {
            return NextResponse.json({ error: "Customer already exists" }, { status: 400 });
        }
        console.error("Create Customer Error:", error);
        return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
    }
}

/** Older clients send `{ id, ...fields }` here; /customers/[id] is the same edit. */
export async function PATCH(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "edit_repair_jobs");
        if (!authorized) return error;

        await dbConnect();
        const body = await readJsonObject(req);
        if (!body) return invalidBody();
        const { id, ...fields } = body;
        if (typeof id !== "string" || !id) return NextResponse.json({ error: "ID required" }, { status: 400 });
        return await updateRepairCustomer(req, id, fields);
    } catch (error) {
        const handled = adminRepairErrorResponse(error);
        if (handled) return handled;
        console.error("Update Customer Error:", error);
        return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
    }
}
