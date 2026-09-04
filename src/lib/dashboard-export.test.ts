import { describe, expect, it } from "vitest";
import { buildDashboardDetailedCsv, dashboardExportFilename, rowsToCsv, type DashboardDetailedExportData } from "./dashboard-export";

function reportFixture(): DashboardDetailedExportData {
    return {
        year: 2026,
        totals: {
            netProfit: 194763,
            totalCollected: 200000,
            loanPaymentRevenue: 5000,
            insuranceRevenue: 195000,
            insurancePackageCost: 90000,
            insuranceCommission: 10000,
            insuranceOtherExpenses: 227,
            insuranceTotalCost: 100227,
            insuranceProfit: 94773,
            activeLoanCount: 1,
            registrationCount: 40,
            approvedRegistrationCount: 33,
            portfolioCount: 1,
            portfolioSource: "นับสัญญาสินเชื่อที่สถานะไม่ใช่ closed",
        },
        monthlySources: [{
            month: "มกราคม",
            loanPayments: 5000,
            insuranceRevenue: 10000,
            total: 15000,
            paymentCount: 1,
            insuranceCount: 1,
        }],
        sales: [{
            recordId: "registration-1",
            soldAt: "2026-01-15T03:00:00.000Z",
            policyNumber: "POL-001",
            referenceNumber: "REF-001",
            customerName: "ลูกค้า ทดสอบ",
            idCard: "1234567890123",
            packageName: "แพ็ก A",
            agentName: "Agent A",
            agentCode: "AG001",
            branchName: "สำนักงานใหญ่",
            status: "สำเร็จ",
            originalSalePrice: 10000,
            recognizedRevenue: 10000,
            packageCost: 6000,
            agentCommission: 1000,
            otherExpenses: 200,
            totalCost: 7200,
            netProfit: 2800,
            accountingRule: "สำเร็จ: รายได้ - ต้นทุนรวม",
        }],
        payments: [{
            recordId: "payment-1",
            paidAt: "2026-01-16T03:00:00.000Z",
            receiptId: "REC-001",
            contractId: "LOAN-001",
            amount: 5000,
            paymentMethod: "transfer",
            recordedBy: "admin",
            note: "ชำระงวดแรก",
        }],
        activeLoans: [{
            recordId: "loan-1",
            contractId: "LOAN-001",
            customerName: "ลูกค้า ทดสอบ",
            deviceModel: "iPhone 17",
            imei: "123456789012345",
            loanType: "ผ่อนเครื่อง",
            status: "normal",
            loanAmount: 30000,
            paidInstallments: 1,
            totalInstallments: 12,
            nextPaymentDate: "2026-02-16T03:00:00.000Z",
        }],
        recentClaims: [{
            recordId: "claim-1",
            createdAt: "2026-01-17T03:00:00.000Z",
            policyNumber: "POL-001",
            customerName: "ลูกค้า ทดสอบ",
            device: "iPhone 17",
            imei: "123456789012345",
            type: "จอแตก",
            status: "รอดำเนินการ",
            createdBy: "admin",
        }],
    };
}

describe("dashboard detailed export", () => {
    it("explains every dashboard total and includes its source rows", () => {
        const csv = buildDashboardDetailedCsv(reportFixture(), new Date("2026-09-04T15:00:00.000Z"));

        expect(csv).toContain('"กำไรสุทธิจริง",194763,"max(0, ยอดรับชำระสินเชื่อ + กำไรสุทธิประกัน)"');
        expect(csv).toContain('"ยอดรับชำระสินเชื่อ",5000');
        expect(csv).toContain('"มกราคม",5000,10000,15000,1,1');
        expect(csv).toContain('"POL-001","REF-001","ลูกค้า ทดสอบ"');
        expect(csv).toContain('"REC-001","LOAN-001",5000');
        expect(csv).toContain('"LOAN-001","ลูกค้า ทดสอบ","iPhone 17"');
        expect(csv).toContain('"POL-001","ลูกค้า ทดสอบ","iPhone 17"');
    });

    it("escapes quotes, keeps numbers numeric and neutralizes spreadsheet formulas", () => {
        expect(rowsToCsv([["=SUM(1,1)", 'เครื่อง "ทดสอบ"', -250]])).toBe(
            '"\'=SUM(1,1)","เครื่อง ""ทดสอบ""",-250',
        );
    });

    it("uses the Bangkok calendar date in the filename", () => {
        expect(dashboardExportFilename(new Date("2026-09-04T18:30:00.000Z"))).toBe(
            "dashboard-report-2026-09-05.csv",
        );
    });
});
