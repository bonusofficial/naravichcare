import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Package from "@/models/Package";
import Agent from "@/models/Agent";
import { checkPermission } from "@/lib/check-permission";
import { buildProfitMatch, PROFIT_EFFECTIVE_STAGES } from "@/lib/profit-report";

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

        const pipeline: any[] = [
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

        const results = await Registration.aggregate(pipeline);

        // Fetch package names and agent names
        const packages = await Package.find({}).lean();
        const agents = await Agent.find({}).lean();

        const packageMap = packages.reduce((acc: any, pkg: any) => {
            acc[pkg._id.toString()] = pkg.name;
            return acc;
        }, {});

        const agentMap = agents.reduce((acc: any, agent: any) => {
            acc[agent.agentCode] = agent.name;
            return acc;
        }, {});

        // Enrich results with names
        const enrichedResults = results.map((item: any) => ({
            ...item,
            packageName: packageMap[item.packageId] || item.packageId || "ไม่ระบุ",
            agentName: agentMap[item.agentCode] || item.agentCode || "ไม่ระบุ",
        }));

        // Calculate summary
        const sum = (key: string) =>
            results.reduce((acc: number, r: any) => acc + (r[key] || 0), 0);

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

    } catch (error: any) {
        console.error("Profit report error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
