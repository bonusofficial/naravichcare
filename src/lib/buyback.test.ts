import { describe, expect, it } from "vitest";
import {
    addBangkokCalendarMonths,
    calculateBuybackRecommendation,
    calculateCoverageSnapshot,
    differenceInBangkokCalendarDays,
    inferCoverageMonths,
    parseBahtToSatang,
} from "./buyback";

describe("buyback calculation", () => {
    it("uses Bangkok calendar days and returns the full amount on the coverage start day", () => {
        const start = new Date("2026-01-01T03:00:00.000Z");
        const snapshot = calculateCoverageSnapshot(start, 12);
        expect(snapshot.totalCoverageDays).toBe(365);
        expect(calculateBuybackRecommendation(120_000, snapshot.totalCoverageDays, snapshot.coverageEndAt, start)).toEqual({
            remainingCoverageDays: 365,
            recommendedAmountSatang: 120_000,
        });
    });

    it("handles leap years using calendar dates", () => {
        const start = new Date("2027-03-01T01:00:00.000Z");
        const end = addBangkokCalendarMonths(start, 12);
        expect(differenceInBangkokCalendarDays(end, start)).toBe(366);
    });

    it("returns zero on and after the expiration date", () => {
        const start = new Date("2026-01-01T00:00:00.000Z");
        const snapshot = calculateCoverageSnapshot(start, 1);
        expect(calculateBuybackRecommendation(10_000, snapshot.totalCoverageDays, snapshot.coverageEndAt, snapshot.coverageEndAt)).toEqual({
            remainingCoverageDays: 0,
            recommendedAmountSatang: 0,
        });
    });

    it("rounds half up to one satang", () => {
        expect(calculateBuybackRecommendation(101, 2, new Date("2026-01-03T00:00:00Z"), new Date("2026-01-02T00:00:00Z")).recommendedAmountSatang).toBe(51);
    });

    it("parses baht safely and rejects more than two decimals", () => {
        expect(parseBahtToSatang("1234.5")).toBe(123450);
        expect(parseBahtToSatang("0")).toBe(0);
        expect(parseBahtToSatang("1.999")).toBeNull();
        expect(parseBahtToSatang("-1")).toBeNull();
    });

    it("infers only exact Thai year and month formats", () => {
        expect(inferCoverageMonths("(1 ปี)")).toBe(12);
        expect(inferCoverageMonths("12 เดือน")).toBe(12);
        expect(inferCoverageMonths("ประมาณหนึ่งปี")).toBeNull();
    });
});
