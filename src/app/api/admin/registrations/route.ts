import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Package from "@/models/Package";
import Agent from "@/models/Agent";
import { checkPermission } from "@/lib/check-permission";

export async function GET(req: NextRequest) {
    try {
        const { authorized, user, error } = await checkPermission(req, "view_registrations");
        if (!authorized) return error;

        await connectToDatabase();
        const registrations = await Registration.find()
            .select("-images -paymentReceipt")
            .sort({ createdAt: -1 })
            .lean();
        return NextResponse.json({ data: registrations.map(serializeRegistration) }, { status: 200 });
    } catch (error: unknown) {
        return NextResponse.json({ message: errorMessage(error) }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, status, paymentReceipt, policyNumber, referenceNumber } = body;

        // Check permission based on status action
        if (status === "approved") {
            const { authorized, error } = await checkPermission(req, "approve_registrations");
            if (!authorized) return error;
        } else if (status === "rejected") {
            const { authorized, error } = await checkPermission(req, "reject_registrations");
            if (!authorized) return error;
        } else {
            // Covers cancelled/refunded, which reverse revenue and claw back
            // commission, so this needs edit rights - it used to accept anyone
            // holding the read-only view_registrations.
            const { authorized, error } = await checkPermission(req, "edit_registrations");
            if (!authorized) return error;
        }

        await connectToDatabase();

        // Load the document and save() it rather than findByIdAndUpdate(), so the
        // pre-save hook in src/models/Registration.ts recomputes totalCost,
        // netProfit and profitMargin. findByIdAndUpdate bypasses that hook, which
        // is why approved sales used to land in the profit report as all zeros.
        const registration = await Registration.findById(id);
        if (!registration) {
            return NextResponse.json({ message: "Registration not found" }, { status: 404 });
        }

        registration.status = status;
        if (paymentReceipt) registration.paymentReceipt = paymentReceipt;

        // Auto-generate Policy Number & Reference Number if approved and empty
        if (status === "approved") {
            // Generate Policy Number if not exists and not provided
            if (!registration.policyNumber && !policyNumber) {
                const count = await Registration.countDocuments({ status: "approved" });
                registration.policyNumber = `NC-${(1000 + count + 1).toString()}`;
            } else if (policyNumber !== undefined) {
                registration.policyNumber = policyNumber;
            }

            // Generate Reference Number if not exists and not provided
            if (!registration.referenceNumber && !referenceNumber) {
                registration.referenceNumber = `REF-${id.slice(-6).toUpperCase()}`;
            } else if (referenceNumber !== undefined) {
                registration.referenceNumber = referenceNumber;
            }

            registration.approvedAt = new Date();

            // Snapshot the profit figures at approval time. Only fill them when the
            // sale has never been priced, so manual corrections made later through
            // PATCH /api/admin/profit-report/[id] survive a re-approval.
            if (!registration.salePrice) {
                const pkg = mongoose.isValidObjectId(registration.packageType)
                    ? await Package.findById(registration.packageType)
                    : null;
                const agent = registration.agentCode
                    ? await Agent.findOne({ agentCode: registration.agentCode })
                    : null;

                registration.salePrice = pkg?.yearlyPrice || 0;
                registration.packageCost = pkg?.costPrice || 0;
                // No agent on the sale means no commission is owed.
                registration.agentCommission =
                    (registration.salePrice * (agent?.commissionRate || 0)) / 100;
                registration.otherExpenses = registration.otherExpenses || 0;
            }
        } else {
            if (policyNumber !== undefined) registration.policyNumber = policyNumber;
            if (referenceNumber !== undefined) registration.referenceNumber = referenceNumber;
        }

        // Keep the cancel/refund flags in step with status; the profit report reads
        // them to zero out revenue and claw back commission on those sales.
        if (status === "cancelled") {
            registration.isCancelled = true;
        }
        if (status === "refunded") {
            registration.isRefunded = true;
            if (!registration.refundedAt) registration.refundedAt = new Date();
        }

        await registration.save();

        // Record Admin Log
        const { recordAdminLog } = await import("@/lib/admin-log");
        await recordAdminLog({
            action: status === "approved" ? "approve_registration" : status === "rejected" ? "reject_registration" : "update_registration_status",
            description: `${status === "approved" ? "อนุมัติ" : status === "rejected" ? "ปฏิเสธ" : "อัปเดต"}การลงทะเบียนของ ${registration.firstName} ${registration.lastName} (ID: ${id})`,
            targetId: id,
            targetType: "Registration",
            details: { status, policyNumber: registration.policyNumber },
            req
        });

        return NextResponse.json({ message: "Updated successfully", data: serializeRegistration(registration) }, { status: 200 });
    } catch (error: unknown) {
        return NextResponse.json({ message: errorMessage(error) }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { authorized, user, error } = await checkPermission(req, "delete_registrations");
        if (!authorized) return error;

        await connectToDatabase();
        const { ids } = await req.json();
        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ message: "ids array required" }, { status: 400 });
        }
        const result = await Registration.deleteMany({ _id: { $in: ids } });
        return NextResponse.json({ success: true, deletedCount: result.deletedCount }, { status: 200 });
    } catch (error: unknown) {
        return NextResponse.json({ message: errorMessage(error) }, { status: 500 });
    }
}
