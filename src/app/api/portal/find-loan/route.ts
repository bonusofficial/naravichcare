import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Loan from "@/models/Loan";
import Insurance from "@/models/Insurance";
import Payment from "@/models/Payment";

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { phone, idNumber } = await req.json();

        if (!phone || !idNumber) {
            return NextResponse.json({ error: "กรุณาระบุระบุข้อมูลให้ครบถ้วน" }, { status: 400 });
        }

        // Search by phone, then verify last 4 digits of ID card
        const loan = await Loan.findOne({ customerPhone: phone }).sort({ createdAt: -1 });

        if (!loan) {
            return NextResponse.json({ error: "ไม่พบข้อมูลสัญญานี้ ในระบบ" }, { status: 404 });
        }

        const idCardString = loan.idCard.toString();
        if (!idCardString.endsWith(idNumber)) {
            return NextResponse.json({ error: "ข้อมูลยืนยันตัวตนไม่ถูกต้อง" }, { status: 401 });
        }

        const insurance = await Insurance.findOne({ loanId: loan._id });
        const payments = await Payment.find({ loanId: loan._id }).sort({ installmentNumber: 1 });

        return NextResponse.json({
            success: true,
            loan,
            insurance,
            payments
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
