/** Repair job as the admin API returns it to the admin pages (customer populated). */

export interface RepairCustomerView {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
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
    reportedSymptom: string;
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
}
