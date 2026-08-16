import mongoose from "mongoose";
import Buyback from "@/models/Buyback";
import Registration from "@/models/Registration";
import { normalizeDigits } from "@/lib/buyback";
import { differenceInBangkokCalendarDays } from "@/lib/buyback";

const LOCKING_STATUSES = ["pending_approval", "processing", "approved"];

export class ClaimEligibilityError extends Error {
    constructor(message: string, public code: "BUYBACK_PENDING" | "COVERAGE_ENDED") {
        super(message);
    }
}

export async function assertClaimEligible(input: { registrationId?: string; imei?: string }) {
    let registration = null;
    if (input.registrationId && mongoose.isValidObjectId(input.registrationId)) {
        registration = await Registration.findById(input.registrationId).select("coverageStatus coverageSnapshot.coverageEndAt imei").lean();
    }
    if (!registration && input.imei) {
        registration = await Registration.findOne({ imeiNormalized: normalizeDigits(input.imei) })
            .sort({ createdAt: -1 })
            .select("coverageStatus coverageSnapshot.coverageEndAt imei")
            .lean();
    }
    if (!registration) return;
    const expiredByDate = registration.coverageSnapshot?.coverageEndAt
        ? differenceInBangkokCalendarDays(new Date(registration.coverageSnapshot.coverageEndAt), new Date()) <= 0
        : false;
    if (registration.coverageStatus === "bought_back" || registration.coverageStatus === "expired" || expiredByDate) {
        throw new ClaimEligibilityError("สิทธิ์แพ็กคุ้มครองสิ้นสุดแล้ว", "COVERAGE_ENDED");
    }
    const locked = await Buyback.exists({ registrationId: registration._id, status: { $in: LOCKING_STATUSES } });
    if (locked) throw new ClaimEligibilityError("แพ็กอยู่ระหว่างหรือเสร็จสิ้นการซื้อคืน จึงไม่สามารถทำรายการเคลมได้", "BUYBACK_PENDING");
}
