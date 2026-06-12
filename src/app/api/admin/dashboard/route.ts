import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Loan from "@/models/Loan";
import Payment from "@/models/Payment";
import Claim from "@/models/Claim";
import Agent from "@/models/Agent";
import Registration from "@/models/Registration";

export async function GET() {
    try {
        await dbConnect();

        const now = new Date();
        const currentYear = now.getFullYear();

        // --- Loans ---
        const allLoans = await Loan.find().lean();
        const activeLoans = allLoans.filter((l: any) => l.status !== "closed");
        const totalPrincipal = allLoans.reduce((sum: number, l: any) => sum + (l.loanAmount || 0), 0);

        // NPL: ใช้ loanAmount ของสัญญา warning/critical (ประมาณยอดค้าง)
        const nplLoans = allLoans.filter((l: any) => l.status === "warning" || l.status === "critical");
        const nplValueSum = nplLoans.reduce((sum: number, l: any) => {
            const paid = (l.paidInstallments || 0) * (l.monthlyPayment || 0);
            const remaining = Math.max(0, (l.loanAmount || 0) - paid);
            return sum + remaining;
        }, 0);

        // --- Payments (ยอดรับชำระจากสัญญา Loan) ---
        const payments = await Payment.find().lean();
        const totalFromPayments = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

        // --- Revenue จาก Registration (สมัครที่ชำระ/อนุมัติแล้ว ใช้ devicePrice เป็นมูลค่า) ---
        const regsPaid = await Registration.find({ status: { $in: ["paid", "approved"] } }).select("devicePrice").lean();
        const totalFromRegistrations = regsPaid.reduce((sum: number, r: any) => sum + (r.devicePrice || 0), 0);

        const totalCollected = totalFromPayments + totalFromRegistrations;

        // กำไรสุทธิประมาณการ: ยอดเก็บ - ต้นทุนประมาณการ 10%
        const estimatedCost = totalCollected * 0.1;
        const netProfit = Math.max(0, totalCollected - estimatedCost);

        // รายได้รายเดือน (12 เดือนปีปัจจุบัน: จาก Payment + จาก Registration ที่ approved ในเดือนนั้น)
        const regsForMonth = await Registration.find({ status: { $in: ["paid", "approved"] } }).select("devicePrice approvedAt createdAt").lean();
        const monthlyRevenue: number[] = [];
        for (let m = 1; m <= 12; m++) {
            const monthStart = new Date(currentYear, m - 1, 1);
            const monthEnd = new Date(currentYear, m, 0, 23, 59, 59);
            const paymentsInMonth = payments.filter((p: any) => {
                const d = new Date(p.paymentDate || p.createdAt);
                return d >= monthStart && d <= monthEnd;
            });
            const regsInMonth = regsForMonth.filter((r: any) => {
                const d = new Date(r.approvedAt || r.createdAt);
                return d >= monthStart && d <= monthEnd;
            });
            const paySum = paymentsInMonth.reduce((s: number, p: any) => s + (p.amount || 0), 0);
            const regSum = regsInMonth.reduce((s: number, r: any) => s + (r.devicePrice || 0), 0);
            monthlyRevenue.push(paySum + regSum);
        }
        const maxMonthly = Math.max(...monthlyRevenue, 1);
        const monthlyRevenuePercent = monthlyRevenue.map(v => Math.round((v / maxMonthly) * 100));

        // --- Claims (งานเคลมล่าสุด) ---
        const recentClaimsRaw = await Claim.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        const recentClaims = recentClaimsRaw.map((c: any) => ({
            device: c.deviceModel || c.imei || "—",
            type: c.consumedQuotaName || "เคลม",
            status: c.status === "completed" ? "เสร็จสมบูรณ์" : c.status === "rejected" ? "ปฏิเสธ" : "รอดำเนินการ",
        }));

        // --- Agent NPL ---
        const agents = await Agent.find({ isActive: true }).lean();
        const agentPerformance = await Promise.all(
            agents.map(async (agent: any) => {
                const agentLoans = await Loan.countDocuments({ agentId: agent._id });
                const agentNpl = await Loan.countDocuments({
                    agentId: agent._id,
                    status: { $in: ["warning", "critical"] },
                });
                const name = agent.name || agent.agentCode || "—";
                return {
                    agent: name,
                    loans: agentLoans,
                    npl: agentNpl,
                    rate: agentLoans > 0 ? ((agentNpl / agentLoans) * 100).toFixed(1) + "%" : "0%",
                    avatar: name.substring(0, 2).toUpperCase(),
                };
            })
        );

        // สถิติเพิ่มจาก Registration (ถ้าต้องการแสดงด้านสมัคร)
        const regCount = await Registration.countDocuments();
        const regApproved = await Registration.countDocuments({ status: "approved" });

        return NextResponse.json({
            success: true,
            stats: {
                netProfit: "฿" + Math.round(netProfit).toLocaleString(),
                totalCollected: "฿" + Math.round(totalCollected).toLocaleString(),
                nplValue: "฿" + Math.round(nplValueSum).toLocaleString(),
                activeLoansCount: activeLoans.length,
                regApproved,
            },
            monthlyRevenue: monthlyRevenuePercent,
            monthlyRevenueRaw: monthlyRevenue,
            agentPerformance,
            recentClaims,
            regCount,
            regApproved,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
