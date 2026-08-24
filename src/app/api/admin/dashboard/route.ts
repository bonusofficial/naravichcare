import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { checkPermission } from "@/lib/check-permission";
import { buildProfitMatch, PROFIT_EFFECTIVE_STAGES } from "@/lib/profit-report";
import Loan from "@/models/Loan";
import Payment from "@/models/Payment";
import Claim from "@/models/Claim";
import Registration from "@/models/Registration";

export async function GET(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "view_dashboard");
        if (!authorized) return error;

        await dbConnect();

        const now = new Date();
        const currentYear = now.getFullYear();

        // --- Loans ---
        const allLoans = await Loan.find().lean();
        const activeLoans = allLoans.filter((loan) => loan.status !== "closed");

        // --- Payments (ยอดรับชำระจากสัญญา Loan) ---
        const payments = await Payment.find().lean();
        const totalFromPayments = payments.reduce((sum: number, payment) => sum + (payment.amount || 0), 0);

        // --- Revenue & profit จากประกัน ---
        // ใช้ค่าเบี้ยที่ล็อกไว้ (salePrice) และกำไรจริง (รายได้ - ต้นทุน - คอม) ผ่าน
        // logic เดียวกับหน้ารายงานกำไรและหน้าบัญชี เพื่อให้ทุกหน้าตรงกัน — ไม่ใช่
        // devicePrice (ราคาเครื่อง) และไม่ใช่การเดาต้นทุน 10% แบบเดิม
        const insuranceAgg = await Registration.aggregate([
            { $match: buildProfitMatch({}) },
            ...PROFIT_EFFECTIVE_STAGES,
            { $group: { _id: null, revenue: { $sum: "$effectiveRevenue" }, profit: { $sum: "$effectiveProfit" } } },
        ]);
        const insuranceRevenue = insuranceAgg[0]?.revenue || 0;
        const insuranceProfit = insuranceAgg[0]?.profit || 0;

        const totalCollected = totalFromPayments + insuranceRevenue;
        const netProfit = Math.max(0, totalFromPayments + insuranceProfit);

        // รายได้รายเดือน (12 เดือนปีปัจจุบัน: จาก Payment + จาก Registration ที่ approved ในเดือนนั้น)
        const regsForMonth = await Registration.find({ status: "approved" }).select("salePrice approvedAt createdAt").lean();
        const monthlyRevenue: number[] = [];
        for (let m = 1; m <= 12; m++) {
            const monthStart = new Date(currentYear, m - 1, 1);
            const monthEnd = new Date(currentYear, m, 0, 23, 59, 59);
            const paymentsInMonth = payments.filter((payment) => {
                const d = new Date(payment.paymentDate || payment.createdAt);
                return d >= monthStart && d <= monthEnd;
            });
            const regsInMonth = regsForMonth.filter((registration) => {
                const d = new Date(registration.approvedAt || registration.createdAt);
                return d >= monthStart && d <= monthEnd;
            });
            const paySum = paymentsInMonth.reduce((sum: number, payment) => sum + (payment.amount || 0), 0);
            const regSum = regsInMonth.reduce((sum: number, registration) => sum + (registration.salePrice || 0), 0);
            monthlyRevenue.push(paySum + regSum);
        }
        const maxMonthly = Math.max(...monthlyRevenue, 1);
        const monthlyRevenuePercent = monthlyRevenue.map(v => Math.round((v / maxMonthly) * 100));

        // --- Claims (งานเคลมล่าสุด) ---
        const recentClaimsRaw = await Claim.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        const recentClaims = recentClaimsRaw.map((claim) => ({
            device: claim.deviceModel || claim.imei || "—",
            type: claim.consumedQuotaName || "เคลม",
            status: claim.status === "completed" ? "เสร็จสมบูรณ์" : claim.status === "rejected" ? "ปฏิเสธ" : "รอดำเนินการ",
        }));

        // สถิติเพิ่มจาก Registration (ถ้าต้องการแสดงด้านสมัคร)
        const regCount = await Registration.countDocuments();
        const regApproved = await Registration.countDocuments({ status: "approved" });

        return NextResponse.json({
            success: true,
            stats: {
                netProfit: "฿" + Math.round(netProfit).toLocaleString(),
                totalCollected: "฿" + Math.round(totalCollected).toLocaleString(),
                activeLoansCount: activeLoans.length,
                regApproved,
            },
            monthlyRevenue: monthlyRevenuePercent,
            monthlyRevenueRaw: monthlyRevenue,
            recentClaims,
            regCount,
            regApproved,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load dashboard";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
