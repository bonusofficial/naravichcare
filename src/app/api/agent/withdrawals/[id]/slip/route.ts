import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import AgentWithdrawal from "@/models/AgentWithdrawal";
import { readBuybackFile } from "@/lib/buyback-storage";

// Lets an agent open the transfer slip of their own paid withdrawal.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const agentId = new URL(req.url).searchParams.get("agentId");
        if (!mongoose.isValidObjectId(id) || !agentId || !mongoose.isValidObjectId(agentId)) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        await dbConnect();
        const withdrawal = await AgentWithdrawal.findOne({ _id: id, agentId }).select("slip").lean<any>();
        if (!withdrawal?.slip?.relativePath) return NextResponse.json({ error: "ไม่พบสลิป" }, { status: 404 });

        const content = await readBuybackFile(withdrawal.slip.relativePath);
        return new NextResponse(new Uint8Array(content), {
            headers: {
                "Content-Type": withdrawal.slip.mimeType || "application/octet-stream",
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        console.error("Agent Slip Error:", error);
        return NextResponse.json({ error: "เปิดสลิปไม่สำเร็จ" }, { status: 500 });
    }
}
