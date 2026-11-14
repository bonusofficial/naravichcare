/**
 * Choice lists for the multi-branch repair features, shared by the RepairJob
 * model, the admin API validators and the admin pages. Keep this file free of
 * server-only imports so client components can use it.
 */

function labelled<const T extends readonly string[]>(values: T, labels: Record<T[number], string>) {
    return { values, labels, is: (value: unknown): value is T[number] => typeof value === "string" && values.includes(value) };
}

// --- Data on the customer's device (recorded at intake) ---------------------
export const DATA_BACKUP_STATUSES = ["backed_up", "customer_informed", "customer_declined"] as const;
export type DataBackupStatus = (typeof DATA_BACKUP_STATUSES)[number];
export const DATA_BACKUP = labelled(DATA_BACKUP_STATUSES, {
    backed_up: "สำรองข้อมูลแล้ว",
    customer_informed: "แจ้งให้ลูกค้าสำรองเองแล้ว",
    customer_declined: "ลูกค้ายืนยันว่าไม่ต้องการเก็บข้อมูล",
});

// --- Who has the device right now, and how it moved -------------------------
export const HOLDER_KINDS = ["branch", "technician", "external", "customer"] as const;
export type HolderKind = (typeof HOLDER_KINDS)[number];
export const HOLDER = labelled(HOLDER_KINDS, {
    branch: "สาขา",
    technician: "ช่าง",
    external: "ร้านซ่อมภายนอก",
    customer: "ลูกค้า",
});

export const MOVEMENT_TYPES = ["transfer", "external_repair"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];
export const MOVEMENT = labelled(MOVEMENT_TYPES, {
    transfer: "ส่งต่อภายใน",
    external_repair: "ส่งซ่อมภายนอก",
});

// --- Money received against a job --------------------------------------------
export const PAYMENT_KINDS = ["deposit", "payment", "refund"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];
export const PAYMENT_KIND = labelled(PAYMENT_KINDS, {
    deposit: "มัดจำ",
    payment: "ชำระเงิน",
    refund: "คืนเงิน",
});

export const PAYMENT_METHODS = ["cash", "transfer", "card", "qr", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD = labelled(PAYMENT_METHODS, {
    cash: "เงินสด",
    transfer: "โอนเงิน",
    card: "บัตร",
    qr: "QR พร้อมเพย์",
    other: "อื่น ๆ",
});

// --- Customer approval of each quotation round ---------------------------------
export const APPROVAL_DECISIONS = ["approved", "rejected"] as const;
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];
export const APPROVAL_DECISION = labelled(APPROVAL_DECISIONS, {
    approved: "อนุมัติ",
    rejected: "ไม่อนุมัติ",
});

export const APPROVAL_CHANNELS = ["in_store", "phone", "line", "other"] as const;
export type ApprovalChannel = (typeof APPROVAL_CHANNELS)[number];
export const APPROVAL_CHANNEL = labelled(APPROVAL_CHANNELS, {
    in_store: "หน้าร้าน",
    phone: "โทรศัพท์",
    line: "LINE",
    other: "อื่น ๆ",
});

// --- QC before the device goes back -----------------------------------------
export const QC_RESULTS = ["pass", "fail", "na"] as const;
export type QcResult = (typeof QC_RESULTS)[number];
export const QC_RESULT = labelled(QC_RESULTS, {
    pass: "ผ่าน",
    fail: "ไม่ผ่าน",
    na: "ไม่เกี่ยวข้อง",
});

export const QC_OVERALL_RESULTS = ["pass", "fail"] as const;
export type QcOverall = (typeof QC_OVERALL_RESULTS)[number];

/** Fixed checklist. Add items at the end; keys are stored on each QC record. */
export const QC_CHECKLIST = [
    { key: "screen", label: "หน้าจอแสดงผล" },
    { key: "touch", label: "ระบบสัมผัส" },
    { key: "camera", label: "กล้องหน้า/หลัง" },
    { key: "speaker", label: "ลำโพง" },
    { key: "microphone", label: "ไมโครโฟน" },
    { key: "charging", label: "การชาร์จ" },
    { key: "buttons", label: "ปุ่มกด" },
    { key: "wireless", label: "WiFi / Bluetooth" },
    { key: "biometrics", label: "สแกนใบหน้า/ลายนิ้วมือ" },
] as const;
export type QcItemKey = (typeof QC_CHECKLIST)[number]["key"];
export const QC_ITEM_KEYS: readonly QcItemKey[] = QC_CHECKLIST.map((item) => item.key);

// --- How the job ended ----------------------------------------------------
export const REPAIR_OUTCOMES = ["repaired", "not_repaired"] as const;
export type RepairOutcome = (typeof REPAIR_OUTCOMES)[number];
export const REPAIR_OUTCOME = labelled(REPAIR_OUTCOMES, {
    repaired: "ซ่อมเสร็จ",
    not_repaired: "ไม่ซ่อม (ลูกค้าปฏิเสธ/ซ่อมไม่ได้)",
});

// --- Device received at intake -------------------------------------------------
/** Stored as the English value ("Smartphone" was the only value before this list). */
export const DEVICE_TYPES = ["Smartphone", "Tablet", "Laptop", "Smartwatch", "Other"] as const;
export const DEVICE_TYPE_LABELS: Record<string, string> = {
    Smartphone: "สมาร์ทโฟน",
    Tablet: "แท็บเล็ต",
    Laptop: "โน้ตบุ๊ก",
    Smartwatch: "สมาร์ทวอทช์",
    Other: "อื่น ๆ",
};
/** Thai label for a stored device type; values the POS sent are shown as they are. */
export const deviceTypeLabel = (value?: string | null) => (value ? DEVICE_TYPE_LABELS[value] ?? value : "-");

/** Common items left with the device. Stored as these labels; staff may add others. */
export const ACCESSORY_OPTIONS = [
    "ซิมการ์ด/ถาดซิม",
    "เมมโมรี่การ์ด",
    "เคส",
    "ฟิล์ม/กระจกกันรอย",
    "สายชาร์จ",
    "หัวชาร์จ",
    "กล่อง",
    "ปากกา",
] as const;
