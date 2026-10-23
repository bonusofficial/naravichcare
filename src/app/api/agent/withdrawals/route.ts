import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Agent from "@/models/Agent";
import AgentWithdrawal from "@/models/AgentWithdrawal";
import { getAgentBalance, toWithdrawalView, type AgentRecord } from "@/lib/agent-portal";
import { isDuplicateKeyError } from "@/lib/errors";

// Agent-side commission withdrawals. Like /api/agent/dashboard these are keyed
// by agentId, which the portal receives from /api/agent/login.
async function loadAgent(agentId: unknown) {
    if (typeof agentId !== "string" || !mongoose.isValidObjectId(agentId)) return null;
    return Agent.findById(agentId).lean<AgentRecord>();
}

export async function GET(req: Request) {
    try {
        await dbConnect();
        const agent = await loadAgent(new URL(req.url).searchParams.get("agentId"));
        if (!agent) return NextResponse.json({ error: "ไม่พบข้อมูลตัวแทน" }, { status: 404 });

        const [balance, withdrawals] = await Promise.all([
            getAgentBalance(agent._id, agent.agentCode),
            AgentWithdrawal.find({ agentId: agent._id }).sort({ createdAt: -1 }).limit(20).lean(),
        ]);

        return NextResponse.json({ success: true, balance, withdrawals: withdrawals.map(toWithdrawalView) });
    } catch (error) {
        console.error("Agent Withdrawals Error:", error);
        return NextResponse.json({ error: "โหลดข้อมูลการถอนไม่สำเร็จ" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json().catch(() => ({}));
        const agent = await loadAgent(body.agentId);
        if (!agent) return NextResponse.json({ error: "ไม่พบข้อมูลตัวแทน" }, { status: 404 });
        if (!agent.isActive) return NextResponse.json({ error: "บัญชีตัวแทนนี้ถูกระงับ กรุณาติดต่อเจ้าหน้าที่" }, { status: 403 });
        if (!agent.bankName || !agent.bankAccount) {
            return NextResponse.json({ error: "ยังไม่มีข้อมูลบัญชีธนาคารสำหรับรับค่าคอม กรุณาติดต่อเจ้าหน้าที่" }, { status: 400 });
        }

        const amount = Math.round(Number(body.amount) * 100) / 100;
        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json({ error: "กรุณาระบุจำนวนเงินที่ต้องการถอน" }, { status: 400 });
        }

        if (await AgentWithdrawal.exists({ agentId: agent._id, status: "pending" })) {
            return NextResponse.json({ error: "มีคำขอถอนที่รอโอนอยู่แล้ว กรุณารอให้เจ้าหน้าที่ดำเนินการก่อน" }, { status: 409 });
        }

        const { available } = await getAgentBalance(agent._id, agent.agentCode);
        if (amount > available) {
            return NextResponse.json({ error: `ยอดที่ถอนได้คงเหลือ ฿${available.toLocaleString()}` }, { status: 400 });
        }

        const withdrawal = await AgentWithdrawal.create({
            agentId: agent._id,
            agentCode: agent.agentCode,
            amount,
            bankName: agent.bankName,
            bankAccount: agent.bankAccount,
            bankAccountName: agent.bankAccountName,
        });

        return NextResponse.json({ success: true, withdrawal: toWithdrawalView(withdrawal) }, { status: 201 });
    } catch (error) {
        // The partial unique index caught a second request racing this one.
        if (isDuplicateKeyError(error)) {
            return NextResponse.json({ error: "มีคำขอถอนที่รอโอนอยู่แล้ว กรุณารอให้เจ้าหน้าที่ดำเนินการก่อน" }, { status: 409 });
        }
        console.error("Agent Withdrawal Request Error:", error);
        return NextResponse.json({ error: "ส่งคำขอถอนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
    }
}
