import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import AgentWithdrawal from "@/models/AgentWithdrawal";
import { checkPermission } from "@/lib/check-permission";
import { recordAdminLog } from "@/lib/admin-log";
import { deleteBuybackFile } from "@/lib/buyback-storage";
import { saveWithdrawalSlip, SlipValidationError } from "@/lib/agent-withdrawal-storage";

// Settles a pending withdrawal: "paid" needs the transfer slip, "rejected"
// needs a reason the agent will see. Multipart because of the slip upload.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    let savedSlip: string | null = null;
    try {
        const { authorized, user, error } = await checkPermission(req, "edit_agents");
        if (!authorized) return error;

        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

        const form = await req.formData();
        const action = String(form.get("action") || "");
        const note = String(form.get("note") || "").trim();
        const slip = form.get("slip");

        if (action !== "paid" && action !== "rejected") {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
        if (action === "paid" && !(slip instanceof File && slip.size > 0)) {
            return NextResponse.json({ error: "กรุณาแนบสลิปการโอน" }, { status: 400 });
        }
        if (action === "rejected" && !note) {
            return NextResponse.json({ error: "กรุณาระบุเหตุผลที่ปฏิเสธ" }, { status: 400 });
        }

        await dbConnect();
        const existing = await AgentWithdrawal.findById(id).select("status").lean<any>();
        if (!existing) return NextResponse.json({ error: "ไม่พบคำขอถอน" }, { status: 404 });
        if (existing.status !== "pending") {
            return NextResponse.json({ error: "คำขอนี้ถูกดำเนินการไปแล้ว" }, { status: 409 });
        }

        const update: Record<string, unknown> = {
            status: action,
            note,
            processedBy: user._id,
            processedAt: new Date(),
        };
        if (action === "paid") {
            const stored = await saveWithdrawalSlip(slip as File, id);
            savedSlip = stored.relativePath;
            update.slip = stored;
        }

        // Conditional on still being pending, so two admins clicking at once
        // cannot both settle it.
        const withdrawal = await AgentWithdrawal.findOneAndUpdate(
            { _id: id, status: "pending" },
            { $set: update },
            { returnDocument: "after" }
        );
        if (!withdrawal) {
            if (savedSlip) await deleteBuybackFile(savedSlip);
            return NextResponse.json({ error: "คำขอนี้ถูกดำเนินการไปแล้ว" }, { status: 409 });
        }

        await recordAdminLog({
            req,
            action: action === "paid" ? "pay_agent_withdrawal" : "reject_agent_withdrawal",
            description: `${action === "paid" ? "โอนค่าคอม" : "ปฏิเสธคำขอถอนค่าคอม"} ตัวแทน ${withdrawal.agentCode} จำนวน ฿${withdrawal.amount.toLocaleString()}`,
            targetId: id,
            targetType: "AgentWithdrawal",
            details: { amount: withdrawal.amount, note },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (savedSlip) await deleteBuybackFile(savedSlip).catch(() => {});
        if (error instanceof SlipValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        console.error("Settle Agent Withdrawal Error:", error);
        return NextResponse.json({ error: "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
    }
}
