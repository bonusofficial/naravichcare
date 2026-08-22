import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/admin-auth";
import { calculateBuybackRecommendation, formatSatang, normalizeDigits, normalizePolicyNumber } from "@/lib/buyback";
import { BUYBACK_ROLES, getErrorMessage, serializeBuyback } from "@/lib/buyback-api";
import Buyback from "@/models/Buyback";
import Claim from "@/models/Claim";
import Registration from "@/models/Registration";
import RepairJob from "@/models/RepairJob";

export async function GET(req: Request) {
    try {
        await requireAdmin(BUYBACK_ROLES);
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");
        const raw = searchParams.get("q")?.trim() || "";
        if (!raw || !["idCard", "policyNumber", "imei"].includes(type || "")) {
            return NextResponse.json({ error: "กรุณาระบุประเภทและคำค้นหา" }, { status: 400 });
        }
        const query = type === "policyNumber" ? normalizePolicyNumber(raw) : normalizeDigits(raw);
        const field = type === "idCard" ? "idCardNormalized" : type === "imei" ? "imeiNormalized" : "policyNumberNormalized";
        const registrations = await Registration.find({ [field]: query })
            .select("firstName lastName idCard imei policyNumber status coverageStatus coverageSnapshot brand model")
            .sort({ createdAt: -1 })
            .limit(25)
            .lean();
        const ids = registrations.map((registration) => registration._id);
        const imeis = [...new Set(registrations.map((registration) => registration.imei).filter(Boolean))];
        const policies = [...new Set(registrations.map((registration) => registration.policyNumber).filter(Boolean))];
        const [buybacks, claims, repairClaims] = await Promise.all([
            Buyback.find({ registrationId: { $in: ids } }).sort({ createdAt: -1 }).lean(),
            Claim.find({ $or: [{ registrationId: { $in: ids } }, { imei: { $in: imeis } }, { policyNumber: { $in: policies } }] })
                .select("registrationId customerName imei policyNumber status consumedQuotaName deductibleAmount createdAt updatedAt cancellationReason")
                .sort({ createdAt: -1 })
                .lean(),
            RepairJob.find({ jobType: "claim", imei: { $in: imeis } })
                .select("jobId imei status reportedSymptom receivedAt completedAt createdAt")
                .sort({ createdAt: -1 })
                .lean(),
        ]);
        // Only an open buyback blocks a re-submission; a rejected one must not.
        // Track the newest live one for eligibility, and the newest of any status
        // for display, so the UI can still show the rejection that happened before.
        const ACTIVE_BUYBACK_STATUSES = ["pending_approval", "processing", "approved"];
        const activeByRegistration = new Map<string, (typeof buybacks)[number]>();
        const latestByRegistration = new Map<string, (typeof buybacks)[number]>();
        for (const item of buybacks) {
            const rid = item.registrationId.toString();
            if (!latestByRegistration.has(rid)) latestByRegistration.set(rid, item);
            if (ACTIVE_BUYBACK_STATUSES.includes(item.status) && !activeByRegistration.has(rid)) {
                activeByRegistration.set(rid, item);
            }
        }
        const now = new Date();
        const results = registrations.map((registration) => {
            const id = registration._id.toString();
            const activeBuyback = activeByRegistration.get(id);
            const buyback = activeBuyback || latestByRegistration.get(id);
            const snapshot = registration.coverageSnapshot;
            const calculation = snapshot?.coverageEndAt && snapshot.totalCoverageDays && Number.isSafeInteger(snapshot.packagePriceSatang)
                ? calculateBuybackRecommendation(snapshot.packagePriceSatang, snapshot.totalCoverageDays, new Date(snapshot.coverageEndAt), now)
                : null;
            let ineligibleReason: string | null = null;
            if (activeBuyback) ineligibleReason = `แพ็กนี้มีรายการซื้อคืนสถานะ ${activeBuyback.status}`;
            else if (registration.status !== "approved" || registration.coverageStatus === "bought_back") ineligibleReason = "แพ็กไม่ได้เปิดสิทธิ์คุ้มครอง";
            else if (!`${registration.firstName || ""} ${registration.lastName || ""}`.trim() || !registration.idCard || !registration.policyNumber || !registration.imei) ineligibleReason = "ข้อมูลชื่อ เลขบัตรประชาชน เลขแพ็ก หรือ IMEI ไม่ครบ";
            else if (!calculation) ineligibleReason = "ข้อมูลราคาและช่วงคุ้มครองไม่ครบ";
            else if (calculation.remainingCoverageDays < 1) ineligibleReason = "แพ็กหมดอายุแล้ว";

            const relatedClaims = claims.filter((claim) =>
                claim.registrationId?.toString() === id || claim.imei === registration.imei || claim.policyNumber === registration.policyNumber
            );
            const relatedRepairClaims = repairClaims.filter((claim) => claim.imei === registration.imei);
            const registrationResponse = JSON.parse(JSON.stringify(registration));
            if (registrationResponse.coverageSnapshot?.packagePriceSatang !== undefined) {
                registrationResponse.coverageSnapshot.packagePrice = formatSatang(registrationResponse.coverageSnapshot.packagePriceSatang);
                delete registrationResponse.coverageSnapshot.packagePriceSatang;
            }
            return {
                registration: registrationResponse,
                eligible: !ineligibleReason,
                ineligibleReason,
                calculation: calculation ? {
                    remainingCoverageDays: calculation.remainingCoverageDays,
                    recommendedAmount: formatSatang(calculation.recommendedAmountSatang),
                } : null,
                buyback: buyback ? serializeBuyback(buyback) : null,
                claims: relatedClaims,
                repairClaims: relatedRepairClaims,
            };
        });
        return NextResponse.json({ results });
    } catch (error) {
        const auth = authErrorResponse(error);
        return NextResponse.json({ error: auth?.message || getErrorMessage(error) }, { status: auth?.status || 500 });
    }
}
