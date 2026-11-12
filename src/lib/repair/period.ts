/**
 * Report periods on Bangkok calendar days, shared by the repair dashboard API
 * and its page. Thailand has no daylight saving time, so a fixed UTC+7 offset
 * is exact. Pure functions with no server-only imports.
 */

export const REPORT_TIME_ZONE = "Asia/Bangkok";
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export class PeriodInputError extends Error {
    constructor(message: string, public readonly field: "from" | "to") {
        super(message);
        this.name = "PeriodInputError";
    }
}

export interface ReportPeriod {
    /** First instant included. */
    from: Date;
    /** Last instant included. */
    to: Date;
    /** Bangkok calendar day of `from`, YYYY-MM-DD. */
    fromDate: string;
    /** Bangkok calendar day of `to`, YYYY-MM-DD. */
    toDate: string;
}

/** Bangkok calendar day of an instant, as YYYY-MM-DD. */
export function bangkokDate(value: Date): string {
    return new Date(value.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

function isCalendarDay(value: string): boolean {
    const match = YMD.exec(value);
    if (!match) return false;
    const [, y, m, d] = match.map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** 00:00 Bangkok time on a YYYY-MM-DD day. */
export function bangkokStartOfDay(day: string): Date {
    return new Date(Date.parse(`${day}T00:00:00.000Z`) - BANGKOK_OFFSET_MS);
}

/** The last millisecond of a YYYY-MM-DD day in Bangkok time. */
export function bangkokEndOfDay(day: string): Date {
    return new Date(bangkokStartOfDay(day).getTime() + DAY_MS - 1);
}

/** First and last Bangkok day of the month containing `now`, shifted by `offset` months. */
export function bangkokMonthDays(now: Date = new Date(), offset = 0): { fromDate: string; toDate: string } {
    const [y, m] = bangkokDate(now).split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1 + offset, 1));
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
    return { fromDate: first.toISOString().slice(0, 10), toDate: last.toISOString().slice(0, 10) };
}

function parseBound(value: string, field: "from" | "to"): Date {
    const text = value.trim();
    if (isCalendarDay(text)) return field === "from" ? bangkokStartOfDay(text) : bangkokEndOfDay(text);
    // Anything else must be a full ISO timestamp with a time zone, used as is.
    if (/^\d{4}-\d{2}-\d{2}T.+(Z|[+-]\d{2}:\d{2})$/.test(text)) {
        const date = new Date(text);
        if (!Number.isNaN(date.getTime())) return date;
    }
    throw new PeriodInputError(`${field === "from" ? "วันเริ่มต้น" : "วันสิ้นสุด"}ไม่ถูกต้อง (ใช้รูปแบบ YYYY-MM-DD)`, field);
}

/**
 * The reporting period from `from`/`to` query values. A YYYY-MM-DD `from`
 * starts at 00:00 Bangkok time and a YYYY-MM-DD `to` includes that whole day.
 * Missing values default to the current Bangkok month.
 */
export function parseReportPeriod(input: { from?: string | null; to?: string | null }, now: Date = new Date()): ReportPeriod {
    const month = bangkokMonthDays(now);
    const from = input.from?.trim() ? parseBound(input.from, "from") : bangkokStartOfDay(month.fromDate);
    const to = input.to?.trim() ? parseBound(input.to, "to") : bangkokEndOfDay(month.toDate);
    if (from.getTime() > to.getTime()) throw new PeriodInputError("วันเริ่มต้นต้องไม่เกินวันสิ้นสุด", "to");
    return { from, to, fromDate: bangkokDate(from), toDate: bangkokDate(to) };
}
