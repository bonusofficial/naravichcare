import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/admin-auth";
import { addDays, bangkokDateParts } from "@/lib/buyback";
import { BUYBACK_ROLES, getErrorMessage, serializeBuyback } from "@/lib/buyback-api";
import { generateBuybackReceiptPdf } from "@/lib/buyback-receipt";
import { writeBuybackReceipt } from "@/lib/buyback-storage";
import { recordAdminLog } from "@/lib/admin-log";
import Buyback from "@/models/Buyback";
import Claim from "@/models/Claim";
import Counter from "@/models/Counter";
import Registration from "@/models/Registration";
import RepairJob from "@/models/RepairJob";

async function nextDocumentNumber(completedAt: Date): Promise<string> {
    const year = bangkokDateParts(completedAt).year;
    const counter = await Counter.findOneAndUpdate(
        { key: `buyback:${year}` },
        { $inc: { value: 1 } },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );
    return `BB-${year}-${String(counter.value).padStart(6, "0")}`;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    let lockedId: string | null = null;
    try {
        const admin = await requireAdmin(BUYBACK_ROLES);
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        const existing = await Buyback.findById(id);
        if (!existing) return NextResponse.json({ error: "ไม่พบรายการซื้อคืน" }, { status: 404 });
        if (existing.status === "approved") return NextResponse.json({ success: true, data: serializeBuyback(existing.toObject()) });
        if (existing.status === "rejected") return NextResponse.json({ error: "รายการนี้ถูกปฏิเสธถาวรแล้ว" }, { status: 409 });
        if (existing.createdBy.id.toString() === admin.id) {
            return NextResponse.json({ error: "ผู้สร้างรายการไม่สามารถอนุมัติรายการของตนเองได้" }, { status: 403 });
        }

        const actor = { id: admin.id, username: admin.username, name: admin.name };
        const staleProcessingBefore = new Date(Date.now() - 5 * 60 * 1000);
        const locked = await Buyback.findOneAndUpdate(
            {
                _id: id,
                $or: [
                    { status: "pending_approval" },
                    { status: "processing", lastProcessingError: { $exists: true, $ne: "" } },
                    { status: "processing", processingStartedAt: { $lte: staleProcessingBefore } },
                ],
            },
            {
                $set: { status: "processing", processingStartedAt: new Date(), lastProcessingError: "" },
                $push: { statusHistory: { status: "processing", changedAt: new Date(), changedBy: actor, note: "เริ่มดำเนินการอนุมัติ" } },
            },
            { returnDocument: "after" }
        );
        if (!locked) return NextResponse.json({ error: "รายการกำลังถูกประมวลผลโดยผู้ใช้อื่น" }, { status: 409 });
        lockedId = id;

        const completedAt = new Date();
        const documentNumber = locked.documentNumber || await nextDocumentNumber(completedAt);
        if (!locked.documentNumber) {
            locked.documentNumber = documentNumber;
            await locked.save();
        }

        const registration = await Registration.findById(locked.registrationId);
        if (!registration || registration.status !== "approved") throw new Error("แพ็กคุ้มครองต้นทางไม่อยู่ในสถานะอนุมัติ");
        if (registration.coverageStatus !== "bought_back") {
            registration.coverageStatus = "bought_back";
            await registration.save();
        }

        const cancellationReason = `ยกเลิกเนื่องจากซื้อคืนแพ็ก ${documentNumber}`;
        await Claim.updateMany(
            {
                $or: [{ registrationId: registration._id }, { imei: registration.imei }],
                status: { $in: ["draft", "pending"] },
            },
            {
                $set: {
                    status: "rejected",
                    cancelledByBuybackId: locked._id,
                    cancelledAt: completedAt,
                    cancellationReason,
                },
            }
        );
        await RepairJob.updateMany(
            {
                jobType: "claim",
                imei: registration.imei,
                status: { $nin: ["completed", "cancelled"] },
            },
            {
                $set: { status: "cancelled", cancelledByBuybackId: locked._id, cancelledAt: completedAt },
                $push: { statusHistory: { status: "cancelled", changedAt: completedAt, changedBy: admin.username, note: cancellationReason } },
            }
        );

        const pdf = await generateBuybackReceiptPdf({
            documentNumber,
            completedAt,
            customer: {
                fullName: locked.customerSnapshot.fullName,
                idCard: locked.customerSnapshot.idCard,
                imei: locked.customerSnapshot.imei,
                policyNumber: locked.customerSnapshot.policyNumber,
                packageName: locked.customerSnapshot.packageName,
            },
            actualAmountSatang: locked.actualAmountSatang,
            payment: {
                method: locked.payment.method,
                otherLabel: locked.payment.otherLabel,
                reference: locked.payment.reference,
            },
            confirmationText: locked.confirmation.text,
            branch: { name: locked.branchSnapshot.name, location: locked.branchSnapshot.location },
            employeeName: locked.createdBy.name,
            customerSignaturePath: locked.files.customerSignature.relativePath,
            employeeSignaturePath: locked.files.employeeSignature.relativePath,
        });
        const receiptRelativePath = await writeBuybackReceipt(id, documentNumber, pdf);

        const approved = await Buyback.findOneAndUpdate(
            { _id: id, status: "processing" },
            {
                $set: {
                    status: "approved",
                    approvedBy: actor,
                    completedAt,
                    terminalAt: completedAt,
                    imageDeleteAt: addDays(completedAt, 35),
                    receiptRelativePath,
                    lastProcessingError: "",
                },
                $push: { statusHistory: { status: "approved", changedAt: completedAt, changedBy: actor, note: "อนุมัติและปิดสิทธิ์เคลมสำเร็จ" } },
            },
            { returnDocument: "after" }
        );
        if (!approved) throw new Error("ไม่สามารถบันทึกสถานะอนุมัติได้");
        lockedId = null;

        await recordAdminLog({
            req,
            action: "approve_buyback",
            description: `อนุมัติซื้อคืนแพ็กและออกเอกสาร ${documentNumber}`,
            targetId: id,
            targetType: "Buyback",
            details: { registrationId: registration._id.toString(), documentNumber, actualAmountSatang: approved.actualAmountSatang },
        });
        return NextResponse.json({ success: true, data: serializeBuyback(approved.toObject()) });
    } catch (error) {
        if (lockedId) {
            await Buyback.updateOne({ _id: lockedId, status: "processing" }, { $set: { lastProcessingError: getErrorMessage(error) } }).catch(() => undefined);
        }
        const auth = authErrorResponse(error);
        return NextResponse.json({ error: auth?.message || getErrorMessage(error) }, { status: auth?.status || 500 });
    }
}
