import { describe, expect, it } from "vitest";
import { buildDashboardCsv, dashboardExportFilename, rowsToCsv } from "./dashboard-export";

describe("dashboard export", () => {
    it("exports dashboard totals, all twelve months and recent claims", () => {
        const csv = buildDashboardCsv({
            stats: {
                netProfit: "฿194,763",
                totalCollected: "฿194,763",
                activeLoansCount: 0,
                regApproved: 33,
            },
            monthlyRevenueRaw: [100, 200],
            regCount: 40,
            regApproved: 33,
            recentClaims: [{ device: "iPhone 17", type: "จอแตก", status: "รอดำเนินการ" }],
        }, new Date("2026-09-04T15:00:00.000Z"));

        expect(csv).toContain('"กำไรสุทธิจริง","฿194,763"');
        expect(csv).toContain('"พอร์ตสินเชื่อปกติ","33"');
        expect(csv).toContain('"มกราคม","100"');
        expect(csv).toContain('"ธันวาคม","0"');
        expect(csv).toContain('"iPhone 17","จอแตก","รอดำเนินการ"');
    });

    it("escapes quotes and neutralizes spreadsheet formulas in text", () => {
        expect(rowsToCsv([["=SUM(1,1)", 'เครื่อง "ทดสอบ"', -250]])).toBe(
            '"\'=SUM(1,1)","เครื่อง ""ทดสอบ""","-250"',
        );
    });

    it("uses the Bangkok calendar date in the filename", () => {
        expect(dashboardExportFilename(new Date("2026-09-04T18:30:00.000Z"))).toBe(
            "dashboard-report-2026-09-05.csv",
        );
    });
});
