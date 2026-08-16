import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Loan from "@/models/Loan";
import { sendLineNotify } from "@/lib/line";
import { recordAdminLog } from "@/lib/admin-log";
import { checkPermission } from "@/lib/check-permission";

export async function POST(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "create_payments");
        if (!authorized) return error;

        await dbConnect();
        const { loanId, amount, paymentMethod, recordedBy, note } = await req.json();

        const loan = await Loan.findById(loanId);
        if (!loan) {
            return NextResponse.json({ error: "ไม่พบข้อมูลสัญญา" }, { status: 404 });
        }

        // 1. Generate Receipt ID
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const count = await Payment.countDocuments({ createdAt: { $gt: new Date().setHours(0, 0, 0, 0) } });
        const receiptId = `REC-${dateStr}-${count + 1}`;

        // 2. Create Payment Record
        const payment = await Payment.create({
            loanId,
            contractId: loan.contractId,
            amount,
            installmentNumber: loan.paidInstallments + 1,
            paymentMethod,
            recordedBy,
            receiptId,
            note
        });

        // 3. Update Loan Status
        loan.paidInstallments += 1;
        if (loan.paidInstallments >= loan.totalInstallments) {
            loan.status = "closed";
        } else {
            loan.status = "normal"; // Reset warning/critical if paid
        }
        loan.overdueDays = 0;
        // Update next payment date to next month
        const nextDate = new Date(loan.nextPaymentDate);
        nextDate.setMonth(nextDate.getMonth() + 1);
        loan.nextPaymentDate = nextDate;

        await loan.save();

        // 4. Notify via Line
        await sendLineNotify(
            `💰 รับชำระเงินค่างวด\n` +
            `🧾 เลขที่ใบเสร็จ: ${receiptId}\n` +
            `📜 สัญญา: ${loan.contractId}\n` +
            `👤 ลูกค้า: ${loan.customerName}\n` +
            `💵 ยอดชำระ: ฿${amount.toLocaleString()}\n` +
            `🔢 งวดที่: ${loan.paidInstallments}/${loan.totalInstallments}`
        );

        // 5. Record Admin Log
        await recordAdminLog({
            req,
            action: "record_payment",
            description: `บันทึกรับชำระเงิน: ${receiptId} - สัญญา ${loan.contractId} งวดที่ ${loan.paidInstallments}`,
            targetId: payment._id.toString(),
            targetType: "Payment",
            details: { receiptId, contractId: loan.contractId, amount, installmentNumber: loan.paidInstallments }
        });

        return NextResponse.json({ success: true, receiptId, payment });
    } catch (error: any) {
        console.error("Payment recording error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
