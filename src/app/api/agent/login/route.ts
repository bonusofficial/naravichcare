import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Agent from "@/models/Agent";
import { normalizeAgentCode, toAgentView } from "@/lib/agent-portal";

// Public sign-in for /agent. The portal used to download the whole agent list
// from /api/admin/agents, which only worked in a browser already signed in as
// an admin; this looks up the one code and returns only portal-safe fields.
export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const code = normalizeAgentCode(body.agentCode);
        if (!code) return NextResponse.json({ error: "กรุณากรอกรหัสตัวแทน" }, { status: 400 });

        await dbConnect();
        const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const agent = await Agent.findOne({ agentCode: { $regex: `^${escaped}$`, $options: "i" } }).lean();
        if (!agent) return NextResponse.json({ error: "ไม่พบรหัสตัวแทนนี้ในระบบ" }, { status: 404 });
        if (!(agent as any).isActive) {
            return NextResponse.json({ error: "บัญชีตัวแทนนี้ถูกระงับ กรุณาติดต่อเจ้าหน้าที่" }, { status: 403 });
        }

        return NextResponse.json({ success: true, agent: toAgentView(agent) });
    } catch (error) {
        console.error("Agent Login Error:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
    }
}
