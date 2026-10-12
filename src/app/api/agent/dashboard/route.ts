import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Loan from "@/models/Loan";
import Registration from "@/models/Registration";
import Agent from "@/models/Agent";
import mongoose from "mongoose";
import { getAgentBalance } from "@/lib/agent-portal";

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get("agentId");

        if (!agentId) {
            return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
        }

        const agent = await Agent.findById(agentId);
        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const stats = await Loan.aggregate([
            { $match: { agentId: new mongoose.Types.ObjectId(agentId) } },
            {
                $group: {
                    _id: null,
                    totalVolume: { $sum: "$loanAmount" },
                    customerCount: { $count: {} },
                }
            }
        ]);

        const summary = stats[0] || { totalVolume: 0, customerCount: 0 };

        // Insurance commission is snapshotted on each sale at approval; loans
        // carry no commission field yet, so they stay a flat estimate.
        const { earned } = await getAgentBalance(agent._id, agent.agentCode);
        const estimatedCommission = summary.customerCount * 500 + earned;

        const recentLoans = await Loan.find({ agentId })
            .sort({ createdAt: -1 })
            .limit(5);

        // Fetch registrations made with this agent's code
        const recentRegistrations = await Registration.find({ agentCode: agent.agentCode })
            .sort({ createdAt: -1 })
            .limit(10);

        // Count insurance registrations
        const registrationCount = await Registration.countDocuments({ agentCode: agent.agentCode });

        return NextResponse.json({
            success: true,
            stats: {
                totalVolume: summary.totalVolume,
                customerCount: summary.customerCount,
                registrationCount: registrationCount, // <--- New: count of people who bought insurance
                commission: estimatedCommission
            },
            recentLoans,
            recentRegistrations
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
