import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/admin-auth";
import { BUYBACK_ROLES, getErrorMessage } from "@/lib/buyback-api";
import { readBuybackFile } from "@/lib/buyback-storage";
import Buyback from "@/models/Buyback";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin(BUYBACK_ROLES);
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        const buyback = await Buyback.findById(id).select("status receiptRelativePath documentNumber").lean();
        if (!buyback || buyback.status !== "approved" || !buyback.receiptRelativePath) {
            return NextResponse.json({ error: "ยังไม่มีใบรับคืนเงิน" }, { status: 404 });
        }
        const pdf = await readBuybackFile(buyback.receiptRelativePath);
        return new NextResponse(new Uint8Array(pdf), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${buyback.documentNumber || "buyback-receipt"}.pdf"`,
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        const auth = authErrorResponse(error);
        return NextResponse.json({ error: auth?.message || getErrorMessage(error) }, { status: auth?.status || 500 });
    }
}
