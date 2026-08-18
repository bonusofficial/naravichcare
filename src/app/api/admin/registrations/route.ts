import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Package from "@/models/Package";
import Agent from "@/models/Agent";
import CoveragePlan from "@/models/CoveragePlan";
import { checkPermission } from "@/lib/check-permission";
import {
    calculateCoverageSnapshot,
    differenceInBangkokCalendarDays,
    formatSatang,
    parseBahtToSatang,
} from "@/lib/buyback";

// Restored from 6bd21e5; the merge in fe993d6 kept the call sites but dropped
// these definitions.
function serializeRegistration(source: unknown) {
    const value = JSON.parse(JSON.stringify(source));
    if (value.coverageSnapshot?.packagePriceSatang !== undefined) {
        value.coverageSnapshot.packagePrice = formatSatang(value.coverageSnapshot.packagePriceSatang);
        delete value.coverageSnapshot.packagePriceSatang;
    }
    return value;
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unexpected error";
}

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
        const { id, status, paymentReceipt, policyNumber, referenceNumber, coverageStartDate } = body;

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

            // Coverage period. The admin picks the start date by hand (การทำประกัน
            // ย้อนหลังได้); the end date is derived from the plan's duration. Only
            // recompute when a start date is supplied or none exists yet, so
            // re-saving an approved policy (e.g. just editing the policy number)
            // never silently resets the coverage window.
            const startProvided = typeof coverageStartDate === "string" && coverageStartDate.length > 0;
            const hasSnapshot = Boolean(registration.coverageSnapshot?.coverageStartAt);
            if (startProvided || !hasSnapshot) {
                const coverageStart = startProvided
                    ? new Date(`${coverageStartDate}T00:00:00+07:00`)
                    : new Date();
                if (Number.isFinite(coverageStart.getTime())) {
                    try {
                        const plan = mongoose.isValidObjectId(registration.packageType)
                            ? await CoveragePlan.findById(registration.packageType).select("coverageDurationMonths name").lean<{ coverageDurationMonths?: number; name?: string }>()
                            : null;
                        const rawMonths = Number(plan?.coverageDurationMonths);
                        const durationMonths = Number.isInteger(rawMonths) && rawMonths >= 1 ? rawMonths : 12;
                        const snap = calculateCoverageSnapshot(coverageStart, durationMonths);
                        const priceSatang = parseBahtToSatang(registration.packagePrice || registration.salePrice || 0) ?? 0;
                        registration.coverageStatus =
                            differenceInBangkokCalendarDays(snap.coverageEndAt, new Date()) > 0 ? "active" : "expired";
                        registration.coverageSnapshot = {
                            planId: registration.packageType || undefined,
                            planName: plan?.name || "",
                            packagePriceSatang: priceSatang,
                            coverageStartAt: snap.coverageStartAt,
                            coverageEndAt: snap.coverageEndAt,
                            totalCoverageDays: snap.totalCoverageDays,
                            snapshottedAt: new Date(),
                        };
                    } catch (snapErr) {
                        // A bad plan duration must not block the approval itself.
                        console.error("Coverage snapshot skipped:", snapErr);
                    }
                }
            }

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

                // packagePrice is the figure quoted to the customer at step 3
                // (devicePrice x the plan's multiplier). Coverage plans have no
                // fixed yearlyPrice, so without this every such sale priced at 0.
                registration.salePrice = registration.packagePrice || pkg?.yearlyPrice || 0;
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
