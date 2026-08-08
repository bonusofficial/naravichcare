import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Registration from "@/models/Registration";
import CoveragePlan from "@/models/CoveragePlan";
import { calculateCoverageSnapshot, formatSatang, inferCoverageMonths, normalizeDigits, normalizePolicyNumber } from "@/lib/buyback";

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

export async function GET() {
    try {
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

export async function PATCH(req: Request) {
    try {
        await connectToDatabase();
        const { id, status, paymentReceipt, policyNumber, referenceNumber } = await req.json();

        const currentDoc = await Registration.findById(id);
        if (!currentDoc) return NextResponse.json({ message: "Not found" }, { status: 404 });

        const updateData: Record<string, unknown> = { status };
        if (paymentReceipt) updateData.paymentReceipt = paymentReceipt;

        // Auto-generate Policy Number & Reference Number if approved and empty
        if (status === "approved") {
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

            if (!currentDoc.approvedAt && !currentDoc.coverageSnapshot?.snapshottedAt) {
                const plan = await CoveragePlan.findById(currentDoc.packageType).lean();
                const durationMonths = plan?.coverageDurationMonths || inferCoverageMonths(plan?.durationText);
                const devicePrice = Number(currentDoc.devicePrice);
                if (!plan || !durationMonths || !Number.isFinite(devicePrice) || devicePrice <= 0) {
                    return NextResponse.json(
                        { message: "ไม่สามารถอนุมัติได้: ราคาเครื่องหรือระยะเวลาคุ้มครองไม่ครบ" },
                        { status: 400 }
                    );
                }
                const approvedAt = new Date();
                const coverage = calculateCoverageSnapshot(approvedAt, durationMonths);
                updateData.approvedAt = approvedAt;
                updateData.coverageStatus = "active";
                updateData.coverageSnapshot = {
                    planId: plan._id,
                    planName: [plan.name, plan.subTitle, plan.durationText].filter(Boolean).join(" "),
                    priceMultiplier: plan.priceMultiplier,
                    packagePriceSatang: Math.round(devicePrice * plan.priceMultiplier * 100),
                    coverageStartAt: coverage.coverageStartAt,
                    coverageEndAt: coverage.coverageEndAt,
                    totalCoverageDays: coverage.totalCoverageDays,
                    durationMonths,
                    snapshottedAt: approvedAt,
                };
            }
        } else {
            if (policyNumber !== undefined) updateData.policyNumber = policyNumber;
            if (referenceNumber !== undefined) updateData.referenceNumber = referenceNumber;
        }

        const effectivePolicyNumber = typeof updateData.policyNumber === "string" ? updateData.policyNumber : currentDoc.policyNumber;
        updateData.imeiNormalized = normalizeDigits(currentDoc.imei || "");
        updateData.idCardNormalized = normalizeDigits(currentDoc.idCard || "");
        updateData.policyNumberNormalized = effectivePolicyNumber ? normalizePolicyNumber(effectivePolicyNumber) : undefined;

        const registration = await Registration.findByIdAndUpdate(id, updateData, { returnDocument: "after" });
        if (!registration) return NextResponse.json({ message: "Not found" }, { status: 404 });

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

        return NextResponse.json({ message: "Updated successfully", data: serializeRegistration(registration) }, { status: 200 });
    } catch (error: unknown) {
        return NextResponse.json({ message: errorMessage(error) }, { status: 500 });
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
    } catch (error: unknown) {
        return NextResponse.json({ message: errorMessage(error) }, { status: 500 });
    }
}
