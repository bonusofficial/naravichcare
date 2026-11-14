/** Repair job as the admin API returns it to the admin pages (customer populated). */

import type {
    ApprovalChannel, ApprovalDecision, DataBackupStatus, HolderKind, MovementType,
    PaymentKind, PaymentMethod, QcOverall, QcResult, RepairOutcome,
} from "./options";

/** branchId as the admin API returns it: populated with the branch name. */
export interface RepairBranchRef {
    _id: string;
    name: string;
    location?: string;
    phone?: string;
}

export interface RepairDataBackupView {
    status: DataBackupStatus;
    recordedBy: string;
    recordedAt: string;
}

export interface RepairHolderView {
    kind: HolderKind;
    label: string;
    branchId?: string | null;
}

export interface RepairMovementView {
    _id: string;
    type: MovementType;
    fromLabel: string;
    toKind: HolderKind;
    toLabel: string;
    toBranchId?: string | null;
    vendorName?: string;
    sentBy: string;
    receivedBy?: string;
    sentAt: string;
    returnedAt?: string | null;
    returnReceivedBy?: string;
    actualCost?: number | null;
    note?: string;
    recordedBy: string;
    recordedAt: string;
}

export interface RepairPaymentView {
    _id: string;
    kind: PaymentKind;
    amount: number;
    method: PaymentMethod;
    receivedAt: string;
    receiptNo: string;
    recordedBy: string;
    note?: string;
    voidedAt?: string | null;
    voidedBy?: string;
    voidReason?: string;
}

export interface RepairQuoteApprovalView {
    _id: string;
    round: number;
    laborCost: number;
    partsCost: number;
    totalPrice: number;
    costsVersion: number;
    decision: ApprovalDecision;
    channel: ApprovalChannel;
    approverName: string;
    decidedAt: string;
    recordedBy: string;
    note?: string;
}

export interface RepairQcCheckView {
    _id: string;
    items: { key: string; result: QcResult }[];
    overall: QcOverall;
    note?: string;
    checkedBy: string;
    checkedAt: string;
}

export interface RepairHandoverView {
    receiverName: string;
    receiverPhone?: string;
    receiverRelation?: string;
    handedOverBy: string;
    handedOverAt: string;
    note?: string;
}

export interface RepairCustomerView {
    _id: string;
    customerId?: string;
    firstName: string;
    lastName: string;
    phone: string;
    lineId?: string;
}

/** assignedTechnician as the admin API returns it (populated). */
export interface RepairTechnicianRef {
    _id: string;
    name?: string;
    username: string;
}

export interface RepairStatusHistoryView {
    status: string;
    changedBy?: string;
    actorType?: string;
    changedAt?: string;
    note?: string;
}

export interface RepairJobView {
    _id: string;
    jobId: string;
    jobType: "repair" | "claim";
    status: string;
    ownerType?: "customer" | "store";
    source?: "admin" | "pos";
    externalRef?: string;
    integration?: {
        inventoryItemId?: string;
        productCode?: string;
        branchId?: string;
        branchCode?: string;
        clientName?: string;
        imageUrls?: string[];
    };
    /** Absent for store-owned jobs from the POS. */
    customer?: RepairCustomerView | null;
    deviceType?: string;
    brand: string;
    deviceModel: string;
    imei?: string;
    serialNumber?: string;
    color?: string;
    deviceCondition?: string;
    accessories?: string[];
    reportedSymptom: string;
    /** Inspection result written by the technician; shown on the quotation. */
    diagnosticResult?: string;
    /** Staff only; never printed on customer documents. */
    internalNotes?: string;
    assignedTechnician?: RepairTechnicianRef | null;
    receivedAt: string;
    laborCost?: number;
    partsCost?: number;
    partsPurchaseCost?: number;
    totalPrice: number;
    warrantyStartDate?: string;
    warrantyExpireDate?: string;
    voidStickerCode?: string;
    photosBefore?: string[];
    photosAfter?: string[];
    statusHistory?: RepairStatusHistoryView[];
    costsVersion?: number;
    quotationApproved?: "pending" | "approved" | "rejected";
    // Multi-branch repair records
    /** Populated by the admin API; null for jobs not yet assigned to a branch. */
    branchId?: RepairBranchRef | null;
    appointmentDate?: string | null;
    dataBackup?: RepairDataBackupView;
    currentHolder?: RepairHolderView;
    movements?: RepairMovementView[];
    payments?: RepairPaymentView[];
    quoteApprovals?: RepairQuoteApprovalView[];
    qcChecks?: RepairQcCheckView[];
    outcome?: RepairOutcome;
    handover?: RepairHandoverView;
    repairCompletedAt?: string | null;
    handedOverAt?: string | null;
    cancelledAt?: string | null;
    cancelReason?: string;
}

/** Which document the job page prints. paymentId picks one receipt. */
export interface RepairPrintRequest {
    mode: "intake" | "quote" | "receipt" | "handover";
    paymentId?: string;
}

/** Props every job-detail section component receives. */
export interface RepairJobSectionProps {
    job: RepairJobView;
    /** Call with the job the API returned after a change, so the page re-renders. */
    onChanged: (job: RepairJobView) => void;
    /** Print a document for this job (the page owns the print area). */
    onPrint: (request: RepairPrintRequest) => void;
}
