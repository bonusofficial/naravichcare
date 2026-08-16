export const BANGKOK_TIME_ZONE = "Asia/Bangkok";
export const BUYBACK_CONFIRMATION_VERSION = "temporary-a4-v1";
export const BUYBACK_CONFIRMATION_TEXT =
    "ข้าพเจ้าได้รับเงินคืนครบถ้วนตามจำนวนที่ระบุ และยินยอมให้สิทธิ์ตามแพ็กคุ้มครองสิ้นสุดลงนับจากวันที่ซื้อคืนสำเร็จ";

type DateParts = { year: number; month: number; day: number };

const bangkokDateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

export function bangkokDateParts(date: Date): DateParts {
    const parts = bangkokDateFormatter.formatToParts(date);
    const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
    return { year: read("year"), month: read("month"), day: read("day") };
}

function epochDay(parts: DateParts): number {
    return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000);
}

export function differenceInBangkokCalendarDays(later: Date, earlier: Date): number {
    return epochDay(bangkokDateParts(later)) - epochDay(bangkokDateParts(earlier));
}

export function addBangkokCalendarMonths(start: Date, months: number): Date {
    if (!Number.isInteger(months) || months < 1) throw new Error("Coverage duration must be a positive whole number of months");
    const source = bangkokDateParts(start);
    const monthIndex = source.month - 1 + months;
    const targetYear = source.year + Math.floor(monthIndex / 12);
    const targetMonthIndex = ((monthIndex % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
    const targetDay = Math.min(source.day, lastDay);
    return new Date(Date.UTC(targetYear, targetMonthIndex, targetDay) - 7 * 60 * 60 * 1000);
}

export function calculateCoverageSnapshot(start: Date, durationMonths: number) {
    const coverageEndAt = addBangkokCalendarMonths(start, durationMonths);
    const totalCoverageDays = differenceInBangkokCalendarDays(coverageEndAt, start);
    if (totalCoverageDays < 1) throw new Error("Coverage period must contain at least one day");
    return { coverageStartAt: start, coverageEndAt, totalCoverageDays };
}

export function calculateBuybackRecommendation(
    packagePriceSatang: number,
    totalCoverageDays: number,
    coverageEndAt: Date,
    transactionAt: Date
) {
    if (!Number.isSafeInteger(packagePriceSatang) || packagePriceSatang < 0) throw new Error("Invalid package price");
    if (!Number.isInteger(totalCoverageDays) || totalCoverageDays < 1) throw new Error("Invalid coverage duration");
    const rawRemainingDays = differenceInBangkokCalendarDays(coverageEndAt, transactionAt);
    const remainingCoverageDays = Math.max(0, Math.min(totalCoverageDays, rawRemainingDays));
    const recommendedAmountSatang = Math.round((packagePriceSatang * remainingCoverageDays) / totalCoverageDays);
    return { remainingCoverageDays, recommendedAmountSatang };
}

export function parseBahtToSatang(value: unknown): number | null {
    const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
    const [baht, fraction = ""] = text.split(".");
    const satang = Number(baht) * 100 + Number(fraction.padEnd(2, "0"));
    return Number.isSafeInteger(satang) ? satang : null;
}

export function formatSatang(satang: number): string {
    return (satang / 100).toFixed(2);
}

export function normalizeDigits(value: string): string {
    return value.replace(/\D/g, "");
}

export function normalizePolicyNumber(value: string): string {
    return value.trim().toUpperCase();
}

export function inferCoverageMonths(durationText: unknown): number | null {
    if (typeof durationText !== "string") return null;
    const match = durationText.trim().match(/^(?:\(|\s)*(\d+)\s*(ปี|เดือน)(?:\)|\s)*$/);
    if (!match) return null;
    const value = Number(match[1]);
    return match[2] === "ปี" ? value * 12 : value;
}

export function addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 86_400_000);
}
