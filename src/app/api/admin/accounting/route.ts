import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Claim from "@/models/Claim";
import CoveragePlan from "@/models/CoveragePlan";

export async function GET() {
    try {
        await dbConnect();

        // 1. Calculate Insurance Sales (Income)
        // Fetch only needed fields and use lean() for faster processing
        const registrations = await Registration.find({ status: { $in: ["approved", "paid"] } })
            .select("devicePrice packageType")
            .lean();

        const plans = await CoveragePlan.find({}).select("_id priceMultiplier").lean();
        const planMap = new Map(plans.map((p: any) => [p._id.toString(), p.priceMultiplier]));

        let totalInsuranceSales = 0;
        registrations.forEach((r: any) => {
            const multiplier = planMap.get(r.packageType) || 0;
            totalInsuranceSales += (r.devicePrice || 0) * multiplier;
        });

        // 2. Calculate Claims (Expense)
        // Fetch only needed fields and use lean()
        const claims = await Claim.find({ status: "completed" })
            .select("parts deductibleAmount createdAt customerName deviceModel")
            .sort({ createdAt: -1 })
            .lean();

        let totalPartsCost = 0;
        let totalDeductibleAmount = 0;

        claims.forEach((c: any) => {
            const partsCost = c.parts?.reduce((sum: number, p: any) => sum + (p.qty * p.unitCost), 0) || 0;
            totalPartsCost += partsCost;
            totalDeductibleAmount += (c.deductibleAmount || 0);
        });

        const netClaimExpense = totalPartsCost - totalDeductibleAmount;

        return NextResponse.json({
            success: true,
            totalInsuranceSales,
            totalPartsCost,
            totalDeductibleAmount,
            netClaimExpense,
            recentClaims: claims.slice(0, 5) // since we sorted descending, take first 5
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
