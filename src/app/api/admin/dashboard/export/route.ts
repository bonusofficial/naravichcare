import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { checkPermission } from "@/lib/check-permission";
import { buildProfitMatch, PROFIT_EFFECTIVE_STAGES } from "@/lib/profit-report";
import { buildDashboardDetailedCsv, dashboardExportFilename, type DashboardDetailedExportData } from "@/lib/dashboard-export";
import Agent from "@/models/Agent";
import Branch from "@/models/Branch";
import Claim from "@/models/Claim";
import CoveragePlan from "@/models/CoveragePlan";
import Loan from "@/models/Loan";
import Package from "@/models/Package";
import Payment from "@/models/Payment";
import Registration from "@/models/Registration";

const THAI_MONTHS = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

type NamedRecord = { _id: unknown; name?: string };
type AgentRecord = { agentCode: string; name?: string };
type RawPayment = {
    _id: unknown;
    paymentDate?: Date;
    createdAt?: Date;
    receiptId?: string;
    contractId?: string;
    amount?: number;
    paymentMethod?: string;
    recordedBy?: string;
    note?: string;
};
type RawSale = {
    _id: unknown;
    approvedAt?: Date;
    createdAt?: Date;
    policyNumber?: string;
    referenceNumber?: string;
    firstName?: string;
    lastName?: string;
    idCard?: string;
    packageType?: string;
    agentCode?: string;
    branchId?: unknown;
    status: string;
    isCancelled?: boolean;
    isRefunded?: boolean;
    originalSalePrice?: number;
    recognizedRevenue?: number;
    packageCost?: number;
    agentCommission?: number;
    otherExpenses?: number;
    totalCost?: number;
    netProfit?: number;
};
type RawLoan = {
    _id: unknown;
    contractId?: string;
    customerName?: string;
    deviceModel?: string;
    imei?: string;
    loanType?: string;
    status?: string;
    loanAmount?: number;
    paidInstallments?: number;
    totalInstallments?: number;
    nextPaymentDate?: Date;
};
type RawClaim = {
    _id: unknown;
    createdAt?: Date;
    policyNumber?: string;
    customerName?: string;
    deviceModel?: string;
    imei?: string;
    consumedQuotaName?: string;
    status: string;
    createdBy?: string;
};

function asNumber(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function recordId(value: unknown): string {
    return value && typeof value === "object" && "toString" in value ? String(value) : "";
}

function bangkokYearMonth(value: unknown): { year: number; month: number } | null {
    if (!value) return null;
    const date = new Date(value as string | number | Date);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "numeric",
    }).formatToParts(date);
    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    return Number.isFinite(year) && Number.isFinite(month) ? { year, month } : null;
}

function claimStatus(status: string): string {
    if (status === "completed") return "เสร็จสมบูรณ์";
    if (status === "rejected") return "ปฏิเสธ";
    if (status === "draft") return "ฉบับร่าง";
    return "รอดำเนินการ";
}

function saleStatus(status: string, isCancelled: boolean, isRefunded: boolean): string {
    if (isRefunded || status === "refunded") return "คืนเงิน";
    if (isCancelled || status === "cancelled") return "ยกเลิก";
    return status === "approved" ? "สำเร็จ" : status;
}

export async function GET(req: NextRequest) {
    try {
        const { authorized, error } = await checkPermission(req, "view_dashboard");
        if (!authorized) return error;

        await dbConnect();
        const exportedAt = new Date();
        const year = bangkokYearMonth(exportedAt)?.year ?? exportedAt.getFullYear();

        const [loans, payments, sales, recentClaims, packages, plans, agents, branches, registrationCount, approvedRegistrationCount] = await Promise.all([
            Loan.find().sort({ createdAt: -1 }).lean(),
            Payment.find().sort({ paymentDate: -1, createdAt: -1 }).lean(),
            Registration.aggregate([
                { $match: buildProfitMatch({}) },
                ...PROFIT_EFFECTIVE_STAGES,
                { $sort: { approvedAt: -1, createdAt: -1 } },
                {
                    $project: {
                        approvedAt: 1,
                        createdAt: 1,
                        policyNumber: 1,
                        referenceNumber: 1,
                        firstName: 1,
                        lastName: 1,
                        idCard: 1,
                        packageType: 1,
                        agentCode: 1,
                        branchId: 1,
                        status: 1,
                        isCancelled: 1,
                        isRefunded: 1,
                        originalSalePrice: { $ifNull: ["$salePrice", 0] },
                        recognizedRevenue: "$effectiveRevenue",
                        packageCost: "$effectivePackageCost",
                        agentCommission: "$effectiveCommission",
                        otherExpenses: "$effectiveOtherExpenses",
                        totalCost: "$effectiveTotalCost",
                        netProfit: "$effectiveProfit",
                    },
                },
            ]),
            Claim.find().sort({ createdAt: -1 }).limit(5).lean(),
            Package.find({}).select("name").lean(),
            CoveragePlan.find({}).select("name").lean(),
            Agent.find({}).select("agentCode name").lean(),
            Branch.find({}).select("name").lean(),
            Registration.countDocuments(),
            Registration.countDocuments({ status: "approved" }),
        ]);

        const packageRecords = [...packages, ...plans] as unknown as NamedRecord[];
        const agentRecords = agents as unknown as AgentRecord[];
        const branchRecords = branches as unknown as NamedRecord[];
        const rawPayments = payments as unknown as RawPayment[];
        const rawSales = sales as RawSale[];
        const rawLoans = loans as unknown as RawLoan[];
        const rawClaims = recentClaims as unknown as RawClaim[];

        const packageMap = packageRecords.reduce<Record<string, string>>((map, item) => {
            map[String(item._id)] = item.name || "ไม่ระบุ";
            return map;
        }, {});
        const agentMap = agentRecords.reduce<Record<string, string>>((map, item) => {
            map[item.agentCode] = item.name || item.agentCode;
            return map;
        }, {});
        const branchMap = branchRecords.reduce<Record<string, string>>((map, item) => {
            map[String(item._id)] = item.name || "ไม่ระบุ";
            return map;
        }, {});

        const paymentRows = rawPayments.map((payment) => ({
            recordId: recordId(payment._id),
            paidAt: payment.paymentDate || payment.createdAt,
            receiptId: payment.receiptId || "—",
            contractId: payment.contractId || "—",
            amount: asNumber(payment.amount),
            paymentMethod: payment.paymentMethod || "ไม่ระบุ",
            recordedBy: payment.recordedBy || "ไม่ระบุ",
            note: payment.note || "",
        }));

        const saleRows = rawSales.map((sale) => {
            const isVoid = Boolean(sale.isCancelled || sale.isRefunded);
            const agentCode = sale.agentCode || "";
            return {
                recordId: recordId(sale._id),
                soldAt: sale.approvedAt || sale.createdAt,
                policyNumber: sale.policyNumber || "—",
                referenceNumber: sale.referenceNumber || "—",
                customerName: [sale.firstName, sale.lastName].filter(Boolean).join(" ") || "ไม่ระบุ",
                idCard: sale.idCard || "—",
                packageName: packageMap[String(sale.packageType)] || sale.packageType || "ไม่ระบุ",
                agentName: agentMap[agentCode] || agentCode || "ไม่ระบุ",
                agentCode: agentCode || "—",
                branchName: branchMap[String(sale.branchId)] || "ไม่ระบุ",
                status: saleStatus(sale.status, Boolean(sale.isCancelled), Boolean(sale.isRefunded)),
                rawStatus: sale.status,
                originalSalePrice: asNumber(sale.originalSalePrice),
                recognizedRevenue: asNumber(sale.recognizedRevenue),
                packageCost: asNumber(sale.packageCost),
                agentCommission: asNumber(sale.agentCommission),
                otherExpenses: asNumber(sale.otherExpenses),
                totalCost: asNumber(sale.totalCost),
                netProfit: asNumber(sale.netProfit),
                accountingRule: isVoid
                    ? "ยกเลิก/คืนเงิน: รายได้และค่าคอมเป็น 0 แต่ยังนับต้นทุนแพ็กและค่าใช้จ่ายอื่น"
                    : "สำเร็จ: รายได้ - (ต้นทุนแพ็ก + ค่าคอม + ค่าใช้จ่ายอื่น)",
            };
        });

        const loanPaymentRevenue = paymentRows.reduce((sum, row) => sum + row.amount, 0);
        const sumSales = (key: "recognizedRevenue" | "packageCost" | "agentCommission" | "otherExpenses" | "totalCost" | "netProfit") =>
            saleRows.reduce((sum, row) => sum + row[key], 0);
        const insuranceRevenue = sumSales("recognizedRevenue");
        const insurancePackageCost = sumSales("packageCost");
        const insuranceCommission = sumSales("agentCommission");
        const insuranceOtherExpenses = sumSales("otherExpenses");
        const insuranceTotalCost = sumSales("totalCost");
        const insuranceProfit = sumSales("netProfit");
        const activeLoans = rawLoans.filter((loan) => loan.status !== "closed");
        const portfolioCount = activeLoans.length > 0 ? activeLoans.length : approvedRegistrationCount;

        const monthlySources = THAI_MONTHS.map((month, index) => {
            const monthNumber = index + 1;
            const monthPayments = paymentRows.filter((row) => {
                const value = bangkokYearMonth(row.paidAt);
                return value?.year === year && value.month === monthNumber;
            });
            const monthSales = saleRows.filter((row) => {
                const value = bangkokYearMonth(row.soldAt);
                return row.rawStatus === "approved" && value?.year === year && value.month === monthNumber;
            });
            const loanPayments = monthPayments.reduce((sum, row) => sum + row.amount, 0);
            const monthlyInsuranceRevenue = monthSales.reduce((sum, row) => sum + row.originalSalePrice, 0);
            return {
                month,
                loanPayments,
                insuranceRevenue: monthlyInsuranceRevenue,
                total: loanPayments + monthlyInsuranceRevenue,
                paymentCount: monthPayments.length,
                insuranceCount: monthSales.length,
            };
        });

        const report: DashboardDetailedExportData = {
            year,
            totals: {
                netProfit: Math.max(0, loanPaymentRevenue + insuranceProfit),
                totalCollected: loanPaymentRevenue + insuranceRevenue,
                loanPaymentRevenue,
                insuranceRevenue,
                insurancePackageCost,
                insuranceCommission,
                insuranceOtherExpenses,
                insuranceTotalCost,
                insuranceProfit,
                activeLoanCount: activeLoans.length,
                registrationCount,
                approvedRegistrationCount,
                portfolioCount,
                portfolioSource: activeLoans.length > 0
                    ? "นับสัญญาสินเชื่อที่สถานะไม่ใช่ closed"
                    : "ไม่มีสินเชื่อที่ยังเปิดอยู่ จึงแสดงจำนวนรายการสมัครที่อนุมัติ",
            },
            monthlySources,
            sales: saleRows,
            payments: paymentRows,
            activeLoans: activeLoans.map((loan) => ({
                recordId: recordId(loan._id),
                contractId: loan.contractId || "—",
                customerName: loan.customerName || "ไม่ระบุ",
                deviceModel: loan.deviceModel || "—",
                imei: loan.imei || "—",
                loanType: loan.loanType || "ไม่ระบุ",
                status: loan.status || "ไม่ระบุ",
                loanAmount: asNumber(loan.loanAmount),
                paidInstallments: asNumber(loan.paidInstallments),
                totalInstallments: asNumber(loan.totalInstallments),
                nextPaymentDate: loan.nextPaymentDate,
            })),
            recentClaims: rawClaims.map((claim) => ({
                recordId: recordId(claim._id),
                createdAt: claim.createdAt,
                policyNumber: claim.policyNumber || "—",
                customerName: claim.customerName || "ไม่ระบุ",
                device: claim.deviceModel || claim.imei || "—",
                imei: claim.imei || "—",
                type: claim.consumedQuotaName || "เคลม",
                status: claimStatus(claim.status),
                createdBy: claim.createdBy || "ไม่ระบุ",
            })),
        };

        const csv = buildDashboardDetailedCsv(report, exportedAt);
        return new NextResponse(`\uFEFF${csv}`, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${dashboardExportFilename(exportedAt)}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to export dashboard";
        console.error("Dashboard export failed:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
