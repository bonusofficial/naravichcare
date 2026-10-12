import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AgentWithdrawal from "@/models/AgentWithdrawal";
// Registered for populate().
import "@/models/Agent";
import "@/models/AdminUser";
import { checkPermission } from "@/lib/check-permission";

const STATUSES = ["pending", "paid", "rejected"];

export async function GET(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "view_agents");
        if (!authorized) return error;

        await dbConnect();
        const status = new URL(req.url).searchParams.get("status") || "pending";
        const filter = STATUSES.includes(status) ? { status } : {};

        const [withdrawals, counts] = await Promise.all([
            AgentWithdrawal.find(filter)
                .populate("agentId", "name agentCode phone contactPerson")
                .populate("processedBy", "name username")
                .sort({ createdAt: status === "pending" ? 1 : -1 })
                .limit(200)
                .lean(),
            AgentWithdrawal.aggregate([{ $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } }]),
        ]);

        const summary = Object.fromEntries(STATUSES.map((s) => {
            const row = counts.find((c: any) => c._id === s);
            return [s, { count: row?.count || 0, total: row?.total || 0 }];
        }));

        const rows = withdrawals.map((w: any) => ({
            ...w,
            hasSlip: !!w.slip?.relativePath,
            slip: undefined,
        }));

        return NextResponse.json({ success: true, withdrawals: rows, summary });
    } catch (error) {
        console.error("Fetch Agent Withdrawals Error:", error);
        return NextResponse.json({ error: "Failed to fetch withdrawals" }, { status: 500 });
    }
}
