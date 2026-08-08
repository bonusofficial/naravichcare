import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/admin-auth";
import { BUYBACK_ROLES, getErrorMessage, serializeBuyback } from "@/lib/buyback-api";
import Buyback from "@/models/Buyback";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin(BUYBACK_ROLES);
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        const buyback = await Buyback.findById(id).lean();
        if (!buyback) return NextResponse.json({ error: "ไม่พบรายการซื้อคืน" }, { status: 404 });
        return NextResponse.json({ data: serializeBuyback(buyback) });
    } catch (error) {
        const auth = authErrorResponse(error);
        return NextResponse.json({ error: auth?.message || getErrorMessage(error) }, { status: auth?.status || 500 });
    }
}
