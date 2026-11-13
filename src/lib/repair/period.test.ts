import { describe, expect, it } from "vitest";
import { bangkokDate, bangkokMonthDays, parseReportPeriod, PeriodInputError } from "./period";

describe("report periods in Bangkok time", () => {
    it("defaults to the current Bangkok month, whole days", () => {
        // 2026-11-30 20:00 UTC is already 1 December in Bangkok.
        const period = parseReportPeriod({}, new Date("2026-11-30T20:00:00.000Z"));
        expect(period.fromDate).toBe("2026-12-01");
        expect(period.toDate).toBe("2026-12-31");
        expect(period.from.toISOString()).toBe("2026-11-30T17:00:00.000Z");
        expect(period.to.toISOString()).toBe("2026-12-31T16:59:59.999Z");
    });

    it("treats a YYYY-MM-DD end date as the whole day", () => {
        const period = parseReportPeriod({ from: "2026-11-01", to: "2026-11-01" });
        expect(period.from.toISOString()).toBe("2026-10-31T17:00:00.000Z");
        expect(period.to.toISOString()).toBe("2026-11-01T16:59:59.999Z");
    });

    it("accepts full ISO timestamps as given", () => {
        const period = parseReportPeriod({ from: "2026-11-01T00:00:00Z", to: "2026-11-02T12:00:00+07:00" });
        expect(period.from.toISOString()).toBe("2026-11-01T00:00:00.000Z");
        expect(period.to.toISOString()).toBe("2026-11-02T05:00:00.000Z");
    });

    it("rejects bad dates and reversed ranges", () => {
        expect(() => parseReportPeriod({ from: "2026-02-30" })).toThrow(PeriodInputError);
        expect(() => parseReportPeriod({ to: "13/11/2026" })).toThrow(PeriodInputError);
        expect(() => parseReportPeriod({ from: "2026-11-01T00:00:00" })).toThrow(PeriodInputError);
        expect(() => parseReportPeriod({ from: "2026-11-10", to: "2026-11-09" })).toThrow(PeriodInputError);
    });

    it("finds month boundaries across years", () => {
        expect(bangkokMonthDays(new Date("2026-01-15T00:00:00Z"), -1)).toEqual({ fromDate: "2025-12-01", toDate: "2025-12-31" });
        expect(bangkokMonthDays(new Date("2028-02-10T00:00:00Z"))).toEqual({ fromDate: "2028-02-01", toDate: "2028-02-29" });
        expect(bangkokDate(new Date("2026-10-31T17:00:00.000Z"))).toBe("2026-11-01");
    });
});
