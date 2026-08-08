import mongoose from "mongoose";
import dotenv from "dotenv";
import Registration from "./src/models/Registration";
import CoveragePlan from "./src/models/CoveragePlan";
import {
    calculateCoverageSnapshot,
    differenceInBangkokCalendarDays,
    inferCoverageMonths,
    normalizeDigits,
    normalizePolicyNumber,
} from "./src/lib/buyback";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function run() {
    const apply = process.argv.includes("--apply");
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
    await mongoose.connect(process.env.MONGODB_URI);

    const plans = await CoveragePlan.find({}).lean();
    const planMap = new Map(plans.map((plan) => [plan._id.toString(), plan]));
    let ready = 0;
    let incomplete = 0;
    let normalized = 0;

    for (const plan of plans) {
        if (plan.coverageDurationMonths) continue;
        const inferred = inferCoverageMonths(plan.durationText);
        if (inferred && apply) await CoveragePlan.updateOne({ _id: plan._id }, { $set: { coverageDurationMonths: inferred } });
        console.log(`${inferred ? "PLAN_READY" : "PLAN_INCOMPLETE"} ${plan._id} ${plan.name} duration=${inferred || "?"}`);
    }

    const registrations = await Registration.find({});
    for (const registration of registrations) {
        const normalizedUpdate = {
            imeiNormalized: normalizeDigits(registration.imei || ""),
            idCardNormalized: normalizeDigits(registration.idCard || ""),
            policyNumberNormalized: registration.policyNumber ? normalizePolicyNumber(registration.policyNumber) : undefined,
        };
        normalized += 1;

        if (registration.status !== "approved" || registration.coverageSnapshot?.totalCoverageDays) {
            if (apply) await Registration.updateOne({ _id: registration._id }, { $set: normalizedUpdate });
            continue;
        }

        const plan = planMap.get(String(registration.packageType));
        const durationMonths = plan?.coverageDurationMonths || inferCoverageMonths(plan?.durationText);
        const devicePrice = Number(registration.devicePrice);
        const approvedAt = registration.approvedAt || registration.createdAt;
        if (!plan || !durationMonths || !approvedAt || !Number.isFinite(devicePrice) || devicePrice <= 0) {
            incomplete += 1;
            console.log(`REGISTRATION_INCOMPLETE ${registration._id} policy=${registration.policyNumber || "-"}`);
            if (apply) await Registration.updateOne({ _id: registration._id }, { $set: normalizedUpdate });
            continue;
        }

        const coverage = calculateCoverageSnapshot(approvedAt, durationMonths);
        const coverageStatus = differenceInBangkokCalendarDays(coverage.coverageEndAt, new Date()) > 0 ? "active" : "expired";
        const update = {
            ...normalizedUpdate,
            coverageStatus,
            coverageSnapshot: {
                planId: plan._id,
                planName: [plan.name, plan.subTitle, plan.durationText].filter(Boolean).join(" "),
                priceMultiplier: plan.priceMultiplier,
                packagePriceSatang: Math.round(devicePrice * plan.priceMultiplier * 100),
                coverageStartAt: coverage.coverageStartAt,
                coverageEndAt: coverage.coverageEndAt,
                totalCoverageDays: coverage.totalCoverageDays,
                durationMonths,
                snapshottedAt: new Date(),
            },
        };
        ready += 1;
        console.log(`REGISTRATION_READY ${registration._id} days=${coverage.totalCoverageDays}`);
        if (apply) await Registration.updateOne({ _id: registration._id }, { $set: update });
    }

    console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", plans: plans.length, normalized, ready, incomplete }));
}

run()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
