import { NextRequest, NextResponse } from "next/server";
import type mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Package from "@/models/Package";
import CoveragePlan from "@/models/CoveragePlan";
import Agent from "@/models/Agent";
import { checkPermission } from "@/lib/check-permission";
import { buildProfitMatch, PROFIT_EFFECTIVE_STAGES } from "@/lib/profit-report";
import { getErrorMessage } from "@/lib/errors";

type ProfitTotals = Record<
    | "salesCount"
    | "cancelledCount"
    | "refundedCount"
    | "totalRevenue"
    | "totalCost"
    | "totalPackageCost"
    | "totalCommission"
    | "totalOtherExpenses"
    | "totalProfit",
    number
>;

/** One row of the grouped aggregation; which ids are set depends on groupBy. */
type ProfitGroupRow = ProfitTotals & {
    packageId?: string | null;
    agentCode?: string | null;
};

export async function GET(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "view_profit_report");
        if (!authorized) return error;

        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const packageId = searchParams.get("packageId");
        const agentCode = searchParams.get("agentCode");
        const branchId = searchParams.get("branchId");
        const status = searchParams.get("status");
        const groupBy = searchParams.get("groupBy") || "package"; // package | agent | both

        const filter = buildProfitMatch({
            startDate,
            endDate,
            packageId,
            agentCode,
            branchId,
            status,
        });

        // One grouping key per mode, and the matching way to project it back out.
        const groupId =
            groupBy === "agent"
                ? "$agentCode"
                : groupBy === "both"
                    ? { packageType: "$packageType", agentCode: "$agentCode" }
                    : "$packageType";

        const identityProjection =
            groupBy === "agent"
                ? { agentCode: "$_id" }
                : groupBy === "both"
                    ? { packageId: "$_id.packageType", agentCode: "$_id.agentCode" }
                    : { packageId: "$_id" };

        const pipeline: mongoose.PipelineStage[] = [
            { $match: filter },
            ...PROFIT_EFFECTIVE_STAGES,
            {
                $group: {
                    _id: groupId,
                    // Void sales are reported separately and never counted as sales.
                    salesCount: { $sum: { $cond: ["$isVoid", 0, 1] } },
                    cancelledCount: { $sum: { $cond: [{ $eq: ["$isCancelled", true] }, 1, 0] } },
                    refundedCount: { $sum: { $cond: [{ $eq: ["$isRefunded", true] }, 1, 0] } },
                    totalRevenue: { $sum: "$effectiveRevenue" },
                    totalCost: { $sum: "$effectiveTotalCost" },
                    totalPackageCost: { $sum: "$effectivePackageCost" },
                    totalCommission: { $sum: "$effectiveCommission" },
                    totalOtherExpenses: { $sum: "$effectiveOtherExpenses" },
                    totalProfit: { $sum: "$effectiveProfit" },
                },
            },
            {
                $project: {
                    ...identityProjection,
                    salesCount: 1,
                    cancelledCount: 1,
                    refundedCount: 1,
                    totalRevenue: 1,
                    totalCost: 1,
                    totalPackageCost: 1,
                    totalCommission: 1,
                    totalOtherExpenses: 1,
                    totalProfit: 1,
                    avgProfitPerSale: {
                        $cond: [
                            { $gt: ["$salesCount", 0] },
                            { $divide: ["$totalProfit", "$salesCount"] },
                            0,
                        ],
                    },
                    profitMargin: {
                        $cond: [
                            { $gt: ["$totalRevenue", 0] },
                            { $multiply: [{ $divide: ["$totalProfit", "$totalRevenue"] }, 100] },
                            0,
                        ],
                    },
                },
            },
            { $sort: { totalProfit: -1 } },
        ];

        const results: ProfitGroupRow[] = await Registration.aggregate(pipeline);

        // packageType points at either a Package or a CoveragePlan, so both have to
        // be looked up — resolving only Packages left plan-based sales showing their
        // raw ObjectId instead of a name.
        const [packages, plans, agents] = await Promise.all([
            Package.find({}).select("name").lean(),
            CoveragePlan.find({}).select("name").lean(),
            Agent.find({}).lean(),
        ]);

        const packageMap = [...packages, ...plans].reduce((acc: Record<string, string>, pkg: { _id: mongoose.Types.ObjectId; name: string }) => {
            acc[pkg._id.toString()] = pkg.name;
            return acc;
        }, {});

        const agentMap = agents.reduce((acc: Record<string, string>, agent: { agentCode: string; name: string }) => {
            acc[agent.agentCode] = agent.name;
            return acc;
        }, {});

        // Enrich results with names
        const enrichedResults = results.map((item) => ({
            ...item,
            packageName: packageMap[String(item.packageId)] || item.packageId || "ไม่ระบุ",
            agentName: agentMap[String(item.agentCode)] || item.agentCode || "ไม่ระบุ",
        }));

        // Calculate summary
        const sum = (key: keyof ProfitTotals) =>
            results.reduce((acc: number, r) => acc + (r[key] || 0), 0);

        const summary = {
            totalSales: sum("salesCount"),
            cancelledCount: sum("cancelledCount"),
            refundedCount: sum("refundedCount"),
            totalRevenue: sum("totalRevenue"),
            totalCost: sum("totalCost"),
            totalPackageCost: sum("totalPackageCost"),
            totalCommission: sum("totalCommission"),
            totalOtherExpenses: sum("totalOtherExpenses"),
            totalProfit: sum("totalProfit"),
            profitMargin: 0,
        };

        summary.profitMargin = summary.totalRevenue > 0
            ? ((summary.totalProfit / summary.totalRevenue) * 100)
            : 0;

        return NextResponse.json({
            success: true,
            data: enrichedResults,
            summary,
            filter: {
                startDate,
                endDate,
                packageId,
                agentCode,
                branchId,
                status,
                groupBy,
            }
        });

    } catch (error) {
        console.error("Profit report error:", error);
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
}
