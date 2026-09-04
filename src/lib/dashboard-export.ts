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

export type DashboardMonthlySource = {
    month: string;
    loanPayments: number;
    insuranceRevenue: number;
    total: number;
    paymentCount: number;
    insuranceCount: number;
};

export type DashboardSaleSource = {
    recordId: string;
    soldAt?: Date | string | null;
    policyNumber: string;
    referenceNumber: string;
    customerName: string;
    idCard: string;
    packageName: string;
    agentName: string;
    agentCode: string;
    branchName: string;
    status: string;
    originalSalePrice: number;
    recognizedRevenue: number;
    packageCost: number;
    agentCommission: number;
    otherExpenses: number;
    totalCost: number;
    netProfit: number;
    accountingRule: string;
};

export type DashboardPaymentSource = {
    recordId: string;
    paidAt?: Date | string | null;
    receiptId: string;
    contractId: string;
    amount: number;
    paymentMethod: string;
    recordedBy: string;
    note: string;
};

export type DashboardLoanSource = {
    recordId: string;
    contractId: string;
    customerName: string;
    deviceModel: string;
    imei: string;
    loanType: string;
    status: string;
    loanAmount: number;
    paidInstallments: number;
    totalInstallments: number;
    nextPaymentDate?: Date | string | null;
};

export type DashboardClaimSource = {
    recordId: string;
    createdAt?: Date | string | null;
    policyNumber: string;
    customerName: string;
    device: string;
    imei: string;
    type: string;
    status: string;
    createdBy: string;
};

export type DashboardDetailedExportData = {
    year: number;
    totals: {
        netProfit: number;
        totalCollected: number;
        loanPaymentRevenue: number;
        insuranceRevenue: number;
        insurancePackageCost: number;
        insuranceCommission: number;
        insuranceOtherExpenses: number;
        insuranceTotalCost: number;
        insuranceProfit: number;
        activeLoanCount: number;
        registrationCount: number;
        approvedRegistrationCount: number;
        portfolioCount: number;
        portfolioSource: string;
    };
    monthlySources: DashboardMonthlySource[];
    sales: DashboardSaleSource[];
    payments: DashboardPaymentSource[];
    activeLoans: DashboardLoanSource[];
    recentClaims: DashboardClaimSource[];
};

type CsvValue = string | number;

function escapeCsvValue(value: CsvValue): string {
    if (typeof value === "number") {
        return Number.isFinite(value) ? String(value) : "0";
    }

    // Prevent spreadsheet programs from evaluating customer-entered text as a formula.
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
}

export function rowsToCsv(rows: CsvValue[][]): string {
    return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
}

function formatBangkokDate(value?: Date | string | null): string {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
}

export function buildDashboardDetailedCsv(
    data: DashboardDetailedExportData,
    exportedAt = new Date(),
): string {
    const { totals } = data;
    const rows: CsvValue[][] = [
        ["รายงานแดชบอร์ดสรุปการเงินแบบตรวจสอบที่มา"],
        ["วันที่ส่งออก", formatBangkokDate(exportedAt)],
        ["ปีของกราฟรายเดือน", data.year],
        [],
        ["1. สรุปตัวเลขบนแดชบอร์ดและที่มา"],
        ["หัวข้อ", "ยอด/จำนวน", "สูตรที่ใช้", "แหล่งข้อมูล", "จำนวนรายการต้นทาง"],
        [
            "กำไรสุทธิจริง",
            totals.netProfit,
            "max(0, ยอดรับชำระสินเชื่อ + กำไรสุทธิประกัน)",
            "Payment.amount + Registration (รายได้ที่รับรู้ - ต้นทุนรวม)",
            data.payments.length + data.sales.length,
        ],
        [
            "ยอดรับชำระสะสม",
            totals.totalCollected,
            "ยอดรับชำระสินเชื่อ + รายได้ประกันที่รับรู้",
            "Payment.amount + Registration.salePrice ตามสถานะ",
            data.payments.length + data.sales.length,
        ],
        [
            "พอร์ตสินเชื่อปกติ",
            totals.portfolioCount,
            totals.portfolioSource,
            totals.activeLoanCount > 0 ? "Loan.status != closed" : "Registration.status = approved",
            totals.portfolioCount,
        ],
        ["รายการสมัครทั้งหมด", totals.registrationCount, "นับ Registration ทุกสถานะ", "Registration", totals.registrationCount],
        ["รายการสมัครที่อนุมัติ", totals.approvedRegistrationCount, "นับ status = approved", "Registration", totals.approvedRegistrationCount],
        [],
        ["2. องค์ประกอบยอดการเงิน"],
        ["องค์ประกอบ", "ยอด (บาท)", "วิธีรวม", "แหล่งข้อมูล", "จำนวนรายการ"],
        ["ยอดรับชำระสินเชื่อ", totals.loanPaymentRevenue, "ผลรวม amount", "Payment", data.payments.length],
        ["รายได้ประกันที่รับรู้", totals.insuranceRevenue, "ผลรวมรายได้หลังใช้กฎสถานะ", "Registration", data.sales.length],
        ["ต้นทุนแพ็กประกัน", totals.insurancePackageCost, "ผลรวม packageCost", "Registration", data.sales.length],
        ["ค่าคอมมิชชั่นเอเจนต์", totals.insuranceCommission, "ผลรวม agentCommission หลังใช้กฎสถานะ", "Registration", data.sales.length],
        ["ค่าใช้จ่ายอื่น", totals.insuranceOtherExpenses, "ผลรวม otherExpenses", "Registration", data.sales.length],
        ["ต้นทุนประกันรวม", totals.insuranceTotalCost, "ต้นทุนแพ็ก + คอมมิชชั่น + ค่าใช้จ่ายอื่น", "Registration", data.sales.length],
        ["กำไรสุทธิประกัน", totals.insuranceProfit, "รายได้ประกันที่รับรู้ - ต้นทุนประกันรวม", "Registration", data.sales.length],
        [],
        [`3. รายได้รายเดือน ปี ${data.year}`],
        ["เดือน", "รับชำระสินเชื่อ (บาท)", "ขายประกันที่อนุมัติ (บาท)", "รวม (บาท)", "จำนวนการชำระ", "จำนวนรายการประกัน"],
        ...data.monthlySources.map((month) => [
            month.month,
            month.loanPayments,
            month.insuranceRevenue,
            month.total,
            month.paymentCount,
            month.insuranceCount,
        ]),
        [],
        ["4. รายละเอียดการขายประกันที่ใช้คำนวณ"],
        [
            "วันที่ขาย", "เลขกรมธรรม์", "เลขอ้างอิง", "ชื่อลูกค้า", "เลขบัตรประชาชน",
            "แพ็กประกัน", "เอเจนต์", "รหัสเอเจนต์", "สาขา", "สถานะ",
            "ราคาขายเดิม", "รายได้ที่รับรู้", "ต้นทุนแพ็ก", "ค่าคอมมิชชั่น", "ค่าใช้จ่ายอื่น",
            "ต้นทุนรวม", "กำไร/ขาดทุน", "กฎบัญชีที่ใช้", "Registration ID",
        ],
        ...(data.sales.length > 0 ? data.sales.map((sale) => [
            formatBangkokDate(sale.soldAt),
            sale.policyNumber,
            sale.referenceNumber,
            sale.customerName,
            sale.idCard,
            sale.packageName,
            sale.agentName,
            sale.agentCode,
            sale.branchName,
            sale.status,
            sale.originalSalePrice,
            sale.recognizedRevenue,
            sale.packageCost,
            sale.agentCommission,
            sale.otherExpenses,
            sale.totalCost,
            sale.netProfit,
            sale.accountingRule,
            sale.recordId,
        ]) : [["ไม่มีรายการ"]]),
        [],
        ["5. รายละเอียดการรับชำระสินเชื่อที่ใช้คำนวณ"],
        ["วันที่รับชำระ", "เลขที่ใบเสร็จ", "เลขที่สัญญา", "ยอดรับชำระ (บาท)", "ช่องทาง", "ผู้บันทึก", "หมายเหตุ", "Payment ID"],
        ...(data.payments.length > 0 ? data.payments.map((payment) => [
            formatBangkokDate(payment.paidAt),
            payment.receiptId,
            payment.contractId,
            payment.amount,
            payment.paymentMethod,
            payment.recordedBy,
            payment.note,
            payment.recordId,
        ]) : [["ไม่มีรายการ"]]),
        [],
        ["6. รายละเอียดพอร์ตสินเชื่อที่ยังไม่ปิด"],
        ["เลขที่สัญญา", "ลูกค้า", "อุปกรณ์", "IMEI", "ประเภทสินเชื่อ", "สถานะ", "วงเงิน", "ชำระแล้ว (งวด)", "ทั้งหมด (งวด)", "กำหนดชำระถัดไป", "Loan ID"],
        ...(data.activeLoans.length > 0 ? data.activeLoans.map((loan) => [
            loan.contractId,
            loan.customerName,
            loan.deviceModel,
            loan.imei,
            loan.loanType,
            loan.status,
            loan.loanAmount,
            loan.paidInstallments,
            loan.totalInstallments,
            formatBangkokDate(loan.nextPaymentDate),
            loan.recordId,
        ]) : [["ไม่มีรายการ"]]),
        [],
        ["7. งานเคลมล่าสุดที่แสดงบนแดชบอร์ด"],
        ["วันที่", "เลขกรมธรรม์", "ลูกค้า", "อุปกรณ์", "IMEI", "ประเภทเคลม", "สถานะ", "ผู้สร้าง", "Claim ID"],
        ...(data.recentClaims.length > 0 ? data.recentClaims.map((claim) => [
            formatBangkokDate(claim.createdAt),
            claim.policyNumber,
            claim.customerName,
            claim.device,
            claim.imei,
            claim.type,
            claim.status,
            claim.createdBy,
            claim.recordId,
        ]) : [["ไม่มีรายการ"]]),
    ];

    return rowsToCsv(rows);
}

export function dashboardExportFilename(date = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";

    return `dashboard-report-${part("year")}-${part("month")}-${part("day")}.csv`;
}
