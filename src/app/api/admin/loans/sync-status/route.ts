import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Loan from "@/models/Loan";

export async function GET() {
    try {
        await dbConnect();
        const now = new Date();
        const loans = await Loan.find({ status: { $ne: "closed" } });

        let updatedCount = 0;

        for (const loan of loans) {
            const nextPay = new Date(loan.nextPaymentDate);
            const diffTime = now.getTime() - nextPay.getTime();
            const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            let newStatus = "normal";
            if (overdueDays >= 7) {
                newStatus = "critical";
            } else if (overdueDays >= 1) {
                newStatus = "warning";
            }

            if (loan.overdueDays !== overdueDays || loan.status !== newStatus) {
                loan.overdueDays = Math.max(0, overdueDays);
                loan.status = newStatus;
                await loan.save();
                updatedCount++;
            }
        }

        return NextResponse.json({ success: true, updatedCount });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
