import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Registration from "@/models/Registration";

export async function GET() {
    try {
        await connectToDatabase();
        const registrations = await Registration.find()
            .select("-images -paymentReceipt")
            .sort({ createdAt: -1 })
            .lean();
        return NextResponse.json({ data: registrations }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        await connectToDatabase();
        const { id, status, paymentReceipt, policyNumber, referenceNumber } = await req.json();

        const updateData: any = { status };
        if (paymentReceipt) updateData.paymentReceipt = paymentReceipt;

        // Auto-generate Policy Number & Reference Number if approved and empty
        if (status === "approved") {
            const currentDoc = await Registration.findById(id);

            // Generate Policy Number if not exists and not provided
            if (!currentDoc.policyNumber && !policyNumber) {
                const count = await Registration.countDocuments({ status: "approved" });
                updateData.policyNumber = `NC-${(1000 + count + 1).toString()}`;
            } else if (policyNumber !== undefined) {
                updateData.policyNumber = policyNumber;
            }

            // Generate Reference Number if not exists and not provided
            if (!currentDoc.referenceNumber && !referenceNumber) {
                updateData.referenceNumber = `REF-${id.slice(-6).toUpperCase()}`;
            } else if (referenceNumber !== undefined) {
                updateData.referenceNumber = referenceNumber;
            }

            updateData.approvedAt = new Date();
        } else {
            if (policyNumber !== undefined) updateData.policyNumber = policyNumber;
            if (referenceNumber !== undefined) updateData.referenceNumber = referenceNumber;
        }

        const registration = await Registration.findByIdAndUpdate(id, updateData, { new: true });

        // Record Admin Log
        const { recordAdminLog } = await import("@/lib/admin-log");
        await recordAdminLog({
            action: status === "approved" ? "approve_registration" : status === "rejected" ? "reject_registration" : "update_registration_status",
            description: `${status === "approved" ? "อนุมัติ" : status === "rejected" ? "ปฏิเสธ" : "อัปเดต"}การลงทะเบียนของ ${registration.firstName} ${registration.lastName} (ID: ${id})`,
            targetId: id,
            targetType: "Registration",
            details: { status, policyNumber: updateData.policyNumber },
            req
        });

        return NextResponse.json({ message: "Updated successfully", data: registration }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        await connectToDatabase();
        const { ids } = await req.json();
        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ message: "ids array required" }, { status: 400 });
        }
        const result = await Registration.deleteMany({ _id: { $in: ids } });
        return NextResponse.json({ success: true, deletedCount: result.deletedCount }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
