import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Agent from "@/models/Agent";

export async function GET() {
    try {
        await dbConnect();
        const agents = await Agent.find().sort({ name: 1 });
        return NextResponse.json({ success: true, agents });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();

        // Generate Agent Code if not provided
        if (!body.agentCode) {
            const count = await Agent.countDocuments();
            body.agentCode = `AG-${(count + 1).toString().padStart(3, '0')}`;
        }

        const agent = await Agent.create(body);

        // Record Admin Log
        const { recordAdminLog } = await import("@/lib/admin-log");
        await recordAdminLog({
            action: "create_agent",
            description: `สร้างตัวแทนใหม่: ${agent.name} (Code: ${agent.agentCode})`,
            targetId: agent._id.toString(),
            targetType: "Agent",
            details: { name: agent.name, code: agent.agentCode },
            req
        });

        return NextResponse.json({ success: true, agent });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
