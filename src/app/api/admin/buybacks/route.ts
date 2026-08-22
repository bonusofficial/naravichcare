import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/admin-auth";
import {
    BUYBACK_CONFIRMATION_TEXT,
    BUYBACK_CONFIRMATION_VERSION,
    calculateBuybackRecommendation,
    formatSatang,
    parseBahtToSatang,
} from "@/lib/buyback";
import { BUYBACK_ROLES, getErrorMessage, isDuplicateKeyError, serializeBuyback } from "@/lib/buyback-api";
import { BuybackFileValidationError, deleteBuybackFile, saveBuybackImage, SignatureSourceMode, StoredBuybackFile } from "@/lib/buyback-storage";
import { recordAdminLog } from "@/lib/admin-log";
import Buyback from "@/models/Buyback";
import Registration from "@/models/Registration";

const PAYMENT_METHODS = ["cash", "transfer", "cheque", "other"] as const;

function asFile(value: FormDataEntryValue | null): File | null {
    return value instanceof File && value.size > 0 ? value : null;
}

function signatureMode(value: FormDataEntryValue | null): SignatureSourceMode {
    return value === "draw" ? "draw" : "upload";
}

export async function GET(req: Request) {
    try {
        await requireAdmin(BUYBACK_ROLES);
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const query = searchParams.get("q")?.trim();
        const page = Math.max(1, Number(searchParams.get("page")) || 1);
        const filter: Record<string, unknown> = {};
        if (status && ["pending_approval", "processing", "approved", "rejected"].includes(status)) filter.status = status;
        if (query) {
            filter.$or = [
                { documentNumber: { $regex: query, $options: "i" } },
                { "customerSnapshot.fullName": { $regex: query, $options: "i" } },
                { "customerSnapshot.policyNumber": { $regex: query, $options: "i" } },
                { "customerSnapshot.imei": { $regex: query, $options: "i" } },
            ];
        }
        const [items, total, summary] = await Promise.all([
            Buyback.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 30).limit(30).lean(),
            Buyback.countDocuments(filter),
            Buyback.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 }, actualAmountSatang: { $sum: "$actualAmountSatang" } } },
            ]),
        ]);
        return NextResponse.json({
            items: items.map(serializeBuyback),
            total,
            page,
            summary: summary.map((item) => ({
                status: item._id,
                count: item.count,
                actualAmount: formatSatang(item.actualAmountSatang || 0),
            })),
        });
    } catch (error) {
        const auth = authErrorResponse(error);
        return NextResponse.json({ error: auth?.message || getErrorMessage(error) }, { status: auth?.status || 500 });
    }
}

export async function POST(req: Request) {
    const savedFiles: StoredBuybackFile[] = [];
    try {
        const admin = await requireAdmin(BUYBACK_ROLES);
        if (!admin.branch) return NextResponse.json({ error: "กรุณาผูกบัญชีผู้ใช้กับสาขาก่อนทำรายการ" }, { status: 400 });
        const form = await req.formData();
        const registrationId = String(form.get("registrationId") || "");
        if (!mongoose.isValidObjectId(registrationId)) return NextResponse.json({ error: "Registration ID ไม่ถูกต้อง" }, { status: 400 });

        const registration = await Registration.findById(registrationId).lean();
        if (!registration) return NextResponse.json({ error: "ไม่พบแพ็กคุ้มครอง" }, { status: 404 });
        if (registration.status !== "approved" || registration.coverageStatus === "bought_back") {
            return NextResponse.json({ error: "แพ็กนี้ไม่อยู่ในสถานะที่ซื้อคืนได้" }, { status: 409 });
        }
        // A rejected buyback must not block a fresh one, but an open one must.
        // The partial unique index enforces this too; this check just returns a
        // clear message instead of a raw duplicate-key error.
        const openBuyback = await Buyback.exists({
            registrationId: registration._id,
            status: { $in: ["pending_approval", "processing", "approved"] },
        });
        if (openBuyback) {
            return NextResponse.json({ error: "แพ็กนี้มีรายการซื้อคืนที่ยังไม่ปิดอยู่แล้ว" }, { status: 409 });
        }
        const snapshot = registration.coverageSnapshot;
        if (!snapshot?.coverageEndAt || !snapshot.coverageStartAt || !snapshot.totalCoverageDays || !Number.isSafeInteger(snapshot.packagePriceSatang)) {
            return NextResponse.json({ error: "ข้อมูลราคาและช่วงคุ้มครองไม่ครบ กรุณาให้ super_admin แก้ไขข้อมูลแพ็ก" }, { status: 422 });
        }
        const fullName = `${registration.firstName || ""} ${registration.lastName || ""}`.trim();
        if (!fullName || !registration.idCard || !registration.policyNumber || !registration.imei) {
            return NextResponse.json({ error: "ข้อมูลชื่อ เลขบัตรประชาชน เลขแพ็ก หรือ IMEI ไม่ครบ กรุณาแก้ข้อมูลแพ็กก่อน" }, { status: 422 });
        }

        const transactionAt = new Date();
        const calculation = calculateBuybackRecommendation(
            snapshot.packagePriceSatang,
            snapshot.totalCoverageDays,
            new Date(snapshot.coverageEndAt),
            transactionAt
        );
        if (calculation.remainingCoverageDays < 1) return NextResponse.json({ error: "แพ็กหมดอายุแล้ว ไม่สามารถซื้อคืนได้" }, { status: 409 });

        const actualAmountSatang = parseBahtToSatang(form.get("actualAmount"));
        if (actualAmountSatang === null) return NextResponse.json({ error: "ยอดที่ตกลงจริงต้องเป็นจำนวนเงินไม่เกิน 2 ตำแหน่ง" }, { status: 400 });
        const note = String(form.get("note") || "").trim();
        if (actualAmountSatang !== calculation.recommendedAmountSatang && !note) {
            return NextResponse.json({ error: "กรุณาระบุหมายเหตุเมื่อยอดจริงไม่เท่ากับยอดแนะนำ" }, { status: 400 });
        }

        const paymentMethod = String(form.get("paymentMethod") || "") as (typeof PAYMENT_METHODS)[number];
        if (!PAYMENT_METHODS.includes(paymentMethod)) return NextResponse.json({ error: "ช่องทางคืนเงินไม่ถูกต้อง" }, { status: 400 });
        const paymentOther = String(form.get("paymentOther") || "").trim();
        if (paymentMethod === "other" && !paymentOther) return NextResponse.json({ error: "กรุณาระบุช่องทางคืนเงินอื่น ๆ" }, { status: 400 });

        const customerSignature = asFile(form.get("customerSignature"));
        const employeeSignature = asFile(form.get("employeeSignature"));
        if (!customerSignature || !employeeSignature) return NextResponse.json({ error: "ต้องมีลายเซ็นลูกค้าและพนักงานครบถ้วน" }, { status: 400 });

        const buybackId = new mongoose.Types.ObjectId();
        const customerStored = await saveBuybackImage(customerSignature, buybackId.toString(), "customer-signature", signatureMode(form.get("customerSignatureMode")));
        savedFiles.push(customerStored);
        const employeeStored = await saveBuybackImage(employeeSignature, buybackId.toString(), "employee-signature", signatureMode(form.get("employeeSignatureMode")));
        savedFiles.push(employeeStored);
        const paymentProofFile = asFile(form.get("paymentProof"));
        const paymentProof = paymentProofFile
            ? await saveBuybackImage(paymentProofFile, buybackId.toString(), "payment-proof", "upload")
            : undefined;
        if (paymentProof) savedFiles.push(paymentProof);

        const actor = { id: admin.id, username: admin.username, name: admin.name };
        const buyback = await Buyback.create({
            _id: buybackId,
            registrationId: registration._id,
            customerSnapshot: {
                fullName,
                idCard: registration.idCard,
                imei: registration.imei,
                policyNumber: registration.policyNumber,
                packageName: snapshot.planName || "แพ็กคุ้มครอง",
                packagePriceSatang: snapshot.packagePriceSatang,
                coverageStartAt: snapshot.coverageStartAt,
                coverageEndAt: snapshot.coverageEndAt,
                totalCoverageDays: snapshot.totalCoverageDays,
            },
            transactionAt,
            remainingCoverageDays: calculation.remainingCoverageDays,
            recommendedAmountSatang: calculation.recommendedAmountSatang,
            actualAmountSatang,
            note,
            payment: { method: paymentMethod, otherLabel: paymentOther, reference: String(form.get("paymentReference") || "").trim() },
            confirmation: { version: BUYBACK_CONFIRMATION_VERSION, text: BUYBACK_CONFIRMATION_TEXT },
            files: { customerSignature: customerStored, employeeSignature: employeeStored, paymentProof },
            createdBy: actor,
            branchSnapshot: { id: admin.branch.id, name: admin.branch.name, location: admin.branch.location },
            statusHistory: [{ status: "pending_approval", changedAt: transactionAt, changedBy: actor, note: "ส่งรายการเพื่ออนุมัติ" }],
        });

        await recordAdminLog({
            req,
            action: "submit_buyback",
            description: `ส่งรายการซื้อคืนแพ็ก ${registration.policyNumber || registration._id}`,
            targetId: buyback._id.toString(),
            targetType: "Buyback",
            details: { registrationId, recommendedAmountSatang: calculation.recommendedAmountSatang, actualAmountSatang },
        });
        return NextResponse.json({ success: true, data: serializeBuyback(buyback.toObject()) }, { status: 201 });
    } catch (error) {
        await Promise.all(savedFiles.map((file) => deleteBuybackFile(file.relativePath).catch(() => false)));
        const auth = authErrorResponse(error);
        const status = auth?.status || (isDuplicateKeyError(error) ? 409 : error instanceof BuybackFileValidationError ? 400 : 500);
        return NextResponse.json({ error: auth?.message || (status === 409 ? "แพ็กนี้มีรายการซื้อคืนที่ยังไม่ปิดอยู่แล้ว" : getErrorMessage(error)) }, { status });
    }
}
