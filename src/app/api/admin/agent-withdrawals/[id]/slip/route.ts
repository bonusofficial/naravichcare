import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import AgentWithdrawal from "@/models/AgentWithdrawal";
import { checkPermission } from "@/lib/check-permission";
import { readBuybackFile } from "@/lib/buyback-storage";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { authorized, error } = await checkPermission(req, "view_agents");
        if (!authorized) return error;

        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

        await dbConnect();
        const withdrawal = await AgentWithdrawal.findById(id).select("slip").lean<any>();
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
        console.error("Admin Slip Error:", error);
        return NextResponse.json({ error: "เปิดสลิปไม่สำเร็จ" }, { status: 500 });
    }
}
