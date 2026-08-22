import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/admin-auth";
import { addDays } from "@/lib/buyback";
import { BUYBACK_ROLES, getErrorMessage, serializeBuyback } from "@/lib/buyback-api";
import { recordAdminLog } from "@/lib/admin-log";
import Buyback from "@/models/Buyback";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const admin = await requireAdmin(BUYBACK_ROLES);
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        const body = await req.json();
        const reason = typeof body.reason === "string" ? body.reason.trim() : "";
        if (!reason) return NextResponse.json({ error: "กรุณาระบุเหตุผลที่ปฏิเสธ" }, { status: 400 });
        const existing = await Buyback.findById(id);
        if (!existing) return NextResponse.json({ error: "ไม่พบรายการซื้อคืน" }, { status: 404 });
        // Separation of duties: the creator can't reject their own request — except
        // super_admin, who is trusted to act alone (often the only operator).
        if (existing.createdBy.id.toString() === admin.id && admin.role !== "super_admin") {
            return NextResponse.json({ error: "ผู้สร้างรายการไม่สามารถปฏิเสธรายการของตนเองได้" }, { status: 403 });
        }
        const rejectedAt = new Date();
        const actor = { id: admin.id, username: admin.username, name: admin.name };
        const rejected = await Buyback.findOneAndUpdate(
            { _id: id, status: "pending_approval" },
            {
                $set: {
                    status: "rejected",
                    rejectedBy: actor,
                    rejectionReason: reason,
                    rejectedAt,
                    terminalAt: rejectedAt,
                    imageDeleteAt: addDays(rejectedAt, 35),
                },
                $push: { statusHistory: { status: "rejected", changedAt: rejectedAt, changedBy: actor, note: reason } },
            },
            { returnDocument: "after" }
        );
        if (!rejected) return NextResponse.json({ error: "รายการไม่ได้อยู่ในสถานะรออนุมัติ" }, { status: 409 });
        await recordAdminLog({
            req,
            action: "reject_buyback",
            description: `ปฏิเสธรายการซื้อคืนแพ็ก ${rejected.customerSnapshot.policyNumber}`,
            targetId: id,
            targetType: "Buyback",
            details: { reason },
        });
        return NextResponse.json({ success: true, data: serializeBuyback(rejected.toObject()) });
    } catch (error) {
        const auth = authErrorResponse(error);
        return NextResponse.json({ error: auth?.message || getErrorMessage(error) }, { status: auth?.status || 500 });
    }
}
