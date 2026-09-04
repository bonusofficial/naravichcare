export type DashboardExportStats = {
    netProfit?: string;
    totalCollected?: string;
    activeLoansCount?: number;
    regApproved?: number;
};

export type DashboardExportClaim = {
    device: string;
    type: string;
    status: string;
};

export type DashboardExportData = {
    stats?: DashboardExportStats;
    monthlyRevenueRaw?: number[];
    recentClaims?: DashboardExportClaim[];
    regCount?: number;
    regApproved?: number;
};

const THAI_MONTHS = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
];

type CsvValue = string | number;

function escapeCsvValue(value: CsvValue): string {
    const raw = String(value);
    // Prevent spreadsheet programs from evaluating customer-entered text as a formula.
    const safe = typeof value === "string" && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
}

export function rowsToCsv(rows: CsvValue[][]): string {
    return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
}

export function buildDashboardCsv(data: DashboardExportData, exportedAt = new Date()): string {
    const stats = data.stats ?? {};
    const monthlyRevenue = data.monthlyRevenueRaw ?? [];
    const recentClaims = data.recentClaims ?? [];
    const activePortfolio = stats.activeLoansCount && stats.activeLoansCount > 0
        ? stats.activeLoansCount
        : (stats.regApproved ?? data.regApproved ?? 0);

    const rows: CsvValue[][] = [
        ["รายงานแดชบอร์ดสรุปการเงิน"],
        ["วันที่ส่งออก", exportedAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })],
        [],
        ["หัวข้อ", "ค่า"],
        ["กำไรสุทธิจริง", stats.netProfit ?? "฿0"],
        ["ยอดรับชำระสะสม", stats.totalCollected ?? "฿0"],
        ["พอร์ตสินเชื่อปกติ", activePortfolio],
        ["รายการสมัครทั้งหมด", data.regCount ?? 0],
        ["รายการที่อนุมัติ", data.regApproved ?? stats.regApproved ?? 0],
        [],
        ["รายได้รายเดือน"],
        ["เดือน", "รายได้ (บาท)"],
        ...THAI_MONTHS.map((month, index) => [month, monthlyRevenue[index] ?? 0] as CsvValue[]),
        [],
        ["งานเคลมล่าสุด"],
        ["อุปกรณ์", "ประเภท", "สถานะ"],
        ...(recentClaims.length > 0
            ? recentClaims.map((claim) => [claim.device, claim.type, claim.status] as CsvValue[])
            : [["ไม่มีรายการ", "", ""]]),
    ];

    return rowsToCsv(rows);
}

export function dashboardExportFilename(date = new Date()): string {
    const datePart = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);

    return `dashboard-report-${datePart}.csv`;
}
