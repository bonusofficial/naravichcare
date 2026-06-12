import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Loan from "@/models/Loan";
import Insurance from "@/models/Insurance";
import { sendLineNotify } from "@/lib/line";

export async function POST(req: Request) {
    try {
        await dbConnect();
        const data = await req.json();

        // 1. Generate Contract ID (NC-XXXX)
        const lastLoan = await Loan.findOne().sort({ createdAt: -1 });
        let nextNum = 1001;
        if (lastLoan && lastLoan.contractId) {
            const lastNum = parseInt(lastLoan.contractId.split("-")[1]);
            nextNum = lastNum + 1;
        }
        const contractId = `NC-${nextNum}`;

        // 2. Calculate Monthly Payment (Simple example: Principal + 3% interest)
        const principal = data.loanAmount;
        const interestRate = 3 / 100;
        const totalInterest = principal * interestRate * data.totalInstallments;
        const totalToPay = principal + totalInterest;
        const monthlyPayment = Math.ceil(totalToPay / data.totalInstallments);

        // 3. Create Loan
        const loan = await Loan.create({
            ...data,
            contractId,
            monthlyPayment,
            nextPaymentDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        });

        // 4. Create Associated Insurance (3-Year Model)
        const policyId = `INS-${nextNum}`;
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 3); // 36 months protection

        await Insurance.create({
            loanId: loan._id,
            policyId,
            imei: loan.imei,
            startDate: loan.startDate,
            endDate: endDate,
            quota: {
                screen: { total: 2, used: 0 },
                water: { total: 1, used: 0 },
                battery: { total: 1, used: 0 }
            }
        });

        // 5. Notify via Line
        await sendLineNotify(
            `📝 สัญญาใหม่: ${contractId}\n` +
            `👤 ลูกค้า: ${loan.customerName}\n` +
            `📱 รุ่น: ${loan.deviceModel}\n` +
            `💰 ยอดจัด: ฿${loan.loanAmount.toLocaleString()}\n` +
            `📅 เริ่ม: ${new Date().toLocaleDateString('th-TH')}`
        );

        return NextResponse.json({ success: true, contractId, loan });
    } catch (error: any) {
        console.error("Loan Creation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        await dbConnect();
        const loans = await Loan.find().sort({ createdAt: -1 });
        return NextResponse.json({ success: true, loans });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
