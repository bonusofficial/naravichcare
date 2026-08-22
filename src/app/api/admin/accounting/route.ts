import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Claim from "@/models/Claim";
import { checkPermission } from "@/lib/check-permission";
import { buildProfitMatch, PROFIT_EFFECTIVE_STAGES } from "@/lib/profit-report";

export async function GET(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "view_accounting");
        if (!authorized) return error;

        await dbConnect();

        // 1. Insurance Sales (Income)
        // Use the exact same source and rules as /api/admin/profit-report so the two
        // pages can never disagree. Income is the recorded salePrice of each sale
        // (locked at approval), not devicePrice x the current multiplier — otherwise
        // editing a plan's multiplier later would silently rewrite past revenue, and
        // this page also used to count unapproved "paid" rows the report never did.
        const salesAgg = await Registration.aggregate([
            { $match: buildProfitMatch({}) },
            ...PROFIT_EFFECTIVE_STAGES,
            { $group: { _id: null, totalRevenue: { $sum: "$effectiveRevenue" } } },
        ]);
        const totalInsuranceSales = salesAgg[0]?.totalRevenue || 0;

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
