import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import RepairCustomer from "@/models/RepairCustomer";
import RepairJob from "@/models/RepairJob";
import { adminRepairErrorResponse, invalidBody, readJsonObject } from "@/lib/repair/admin-route";
import { requireRepairAccess, scopeFilter } from "@/lib/repair/branch-scope";
import { updateRepairCustomer } from "@/lib/repair/customers";

interface Context {
    params: Promise<{ id: string }>;
}

/**
 * One customer with their repair history. Customers are shared across
 * branches, but the history lists only jobs in the caller's branch scope.
 */
export async function GET(req: NextRequest, { params }: Context) {
    try {
        const access = await requireRepairAccess(req, "view_repair_jobs");
        if (!access.ok) return access.error;
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "ไม่พบข้อมูลลูกค้า" }, { status: 404 });

        await dbConnect();
        const customer = await RepairCustomer.findById(id);
        if (!customer) return NextResponse.json({ error: "ไม่พบข้อมูลลูกค้า" }, { status: 404 });

        const jobs = await RepairJob.find({ customer: customer._id, ...scopeFilter(access.scope) })
            .select("jobId jobType status outcome brand deviceModel imei serialNumber reportedSymptom totalPrice receivedAt appointmentDate handedOverAt branchId")
            .populate("branchId", "name")
            .sort({ receivedAt: -1 })
            .limit(200)
            .lean();

        return NextResponse.json({ customer, jobs });
    } catch (error) {
        console.error("Fetch Customer Error:", error);
        return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: Context) {
    try {
        const access = await requireRepairAccess(req, "edit_repair_jobs");
        if (!access.ok) return access.error;
        const { id } = await params;
        await dbConnect();
        const body = await readJsonObject(req);
        if (!body) return invalidBody();
        return await updateRepairCustomer(req, id, body);
    } catch (error) {
        const handled = adminRepairErrorResponse(error);
        if (handled) return handled;
        console.error("Update Customer Error:", error);
        return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
    }
}
