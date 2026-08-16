import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Package from "@/models/Package";
import Agent from "@/models/Agent";
import { checkPermission } from "@/lib/check-permission";
import { buildProfitMatch, PROFIT_EFFECTIVE_STAGES } from "@/lib/profit-report";

export async function GET(req: NextRequest) {
    try {
        // Uses the same DB-backed check as the summary endpoint, so a custom role
        // that can open the report can also open its drill-down.
        const { authorized, error } = await checkPermission(req, "view_profit_report");
        if (!authorized) return error;

        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");

        const filter = buildProfitMatch({
            startDate: searchParams.get("startDate"),
            endDate: searchParams.get("endDate"),
            packageId: searchParams.get("packageId"),
            agentCode: searchParams.get("agentCode"),
            branchId: searchParams.get("branchId"),
            status: searchParams.get("status"),
        });

        const skip = (page - 1) * limit;

        const [rows, total] = await Promise.all([
            Registration.aggregate([
                { $match: filter },
                ...PROFIT_EFFECTIVE_STAGES,
                { $sort: { approvedAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        approvedAt: 1,
                        createdAt: 1,
                        policyNumber: 1,
                        referenceNumber: 1,
                        firstName: 1,
                        lastName: 1,
                        packageType: 1,
                        agentCode: 1,
                        branchId: 1,
                        status: 1,
                        isCancelled: 1,
                        isRefunded: 1,
                        isVoid: 1,
                        salePrice: "$effectiveRevenue",
                        packageCost: "$effectivePackageCost",
                        agentCommission: "$effectiveCommission",
                        otherExpenses: "$effectiveOtherExpenses",
                        totalCost: "$effectiveTotalCost",
                        netProfit: "$effectiveProfit",
                        // Kept so the UI can show what was reversed on a refund.
                        originalSalePrice: "$salePrice",
                        originalCommission: "$agentCommission",
                    },
                },
            ]),
            Registration.countDocuments(filter),
        ]);

        // Resolve ids/codes to names, same as the summary endpoint does.
        const [packages, agents] = await Promise.all([
            Package.find({}).lean(),
            Agent.find({}).lean(),
        ]);

        const packageMap = packages.reduce((acc: any, pkg: any) => {
            acc[pkg._id.toString()] = pkg.name;
            return acc;
        }, {});

        const agentMap = agents.reduce((acc: any, agent: any) => {
            acc[agent.agentCode] = agent.name;
            return acc;
        }, {});

        const data = rows.map((row: any) => ({
            ...row,
            customerName: [row.firstName, row.lastName].filter(Boolean).join(" ") || "ไม่ระบุ",
            packageName: packageMap[row.packageType] || row.packageType || "ไม่ระบุ",
            agentName: agentMap[row.agentCode] || row.agentCode || "ไม่ระบุ",
        }));

        return NextResponse.json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            }
        });

    } catch (error: any) {
        console.error("Profit details error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
