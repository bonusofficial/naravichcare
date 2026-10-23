import mongoose, { Schema, Document } from "mongoose";
import { REPAIR_STATUSES, type RepairStatus } from "@/lib/repair/status";
import { nextSequenceNumber, repairJobPrefix } from "@/lib/repair/sequence";

export type RepairOwnerType = "customer" | "store";
export type RepairSource = "admin" | "pos";

export interface RepairStatusHistoryEntry {
    status: string;
    changedBy: string;
    actorType?: "admin" | "integration" | "system";
    actorId?: string;
    changedAt: Date;
    note?: string;
}

/** Data received from an integration client (Web POS). */
export interface RepairIntegrationInfo {
    clientKeyId?: mongoose.Types.ObjectId;
    clientName?: string;
    idempotencyKey?: string;
    requestHash?: string;
    inventoryItemId?: string;
    productCode?: string;
    branchId?: string;
    branchCode?: string;
    imageUrls?: string[];
}

export interface IRepairJob extends Document {
    jobId: string;
    // Ownership: a customer's device, or shop stock sent from the POS
    ownerType: RepairOwnerType;
    source: RepairSource;
    externalRef?: string;
    integration?: RepairIntegrationInfo;
    // Customer & Device Info (customer is absent for ownerType "store")
    customer?: mongoose.Types.ObjectId | null;
    deviceType: string;
    brand: string;
    deviceModel: string;
    serialNumber?: string;
    imei?: string;
    color?: string;
    deviceCondition?: string;
    accessories?: string[];
    // Job Info
    jobType: "repair" | "claim";
    reportedSymptom: string;
    diagnosticResult?: string;
    internalNotes?: string;
    // Quotation (see src/lib/repair/costs.ts for the meaning of each field)
    laborCost?: number;
    partsCost?: number; // selling price of parts charged to the customer
    partsPurchaseCost?: number; // Cost to the shop
    totalPrice?: number; // laborCost + partsCost, always computed on the server
    costsVersion: number;
    costsUpdatedAt?: Date;
    quotationApproved?: "pending" | "approved" | "rejected";
    // Status & Assignment
    status: RepairStatus;
    assignedTechnician?: mongoose.Types.ObjectId;
    // Photos
    photosBefore?: string[];
    photosAfter?: string[];
    // Warranty
    warrantyStartDate?: Date;
    warrantyExpireDate?: Date;
    warrantyType?: string;
    voidStickerCode?: string;
    // Timeline
    statusHistory: RepairStatusHistoryEntry[];
    // Timestamps
    receivedAt: Date;
    repairCompletedAt?: Date | null; // entered ready_pickup
    handedOverAt?: Date | null; // entered completed (device returned)
    completedAt?: Date; // legacy: same moment as handedOverAt
    cancelledAt?: Date;
    cancelReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const RepairJobSchema: Schema = new Schema(
    {
        jobId: { type: String, unique: true },
        ownerType: { type: String, enum: ["customer", "store"], default: "customer" },
        source: { type: String, enum: ["admin", "pos"], default: "admin" },
        externalRef: { type: String },
        integration: {
            type: new Schema(
                {
                    clientKeyId: { type: Schema.Types.ObjectId, ref: "IntegrationApiKey" },
                    clientName: { type: String },
                    idempotencyKey: { type: String },
                    requestHash: { type: String },
                    inventoryItemId: { type: String },
                    productCode: { type: String },
                    branchId: { type: String },
                    branchCode: { type: String },
                    imageUrls: [{ type: String }],
                },
                { _id: false }
            ),
            default: undefined,
        },
        customer: {
            type: Schema.Types.ObjectId,
            ref: "RepairCustomer",
            // Shop stock from the POS has no customer; everything else still needs one.
            required: function (this: IRepairJob) {
                return this.ownerType !== "store";
            },
        },
        // Device
        deviceType: { type: String, required: true },
        brand: { type: String, required: true },
        deviceModel: { type: String, required: true },
        serialNumber: { type: String, default: "" },
        imei: { type: String, default: "" },
        color: { type: String, default: "" },
        deviceCondition: { type: String, default: "" },
        accessories: [{ type: String }],
        // Job
        jobType: { type: String, enum: ["repair", "claim"], default: "repair" },
        reportedSymptom: { type: String, required: true },
        diagnosticResult: { type: String, default: "" },
        internalNotes: { type: String, default: "" },
        // Quotation
        laborCost: { type: Number, default: 0 },
        partsCost: { type: Number, default: 0 },
        partsPurchaseCost: { type: Number, default: 0 },
        totalPrice: { type: Number, default: 0 },
        costsVersion: { type: Number, default: 1 },
        costsUpdatedAt: { type: Date },
        quotationApproved: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        // Status
        status: {
            type: String,
            enum: REPAIR_STATUSES,
            default: "pending",
        },
        assignedTechnician: { type: Schema.Types.ObjectId, ref: "AdminUser" },
        // Photos
        photosBefore: [{ type: String }],
        photosAfter: [{ type: String }],
        // Warranty
        warrantyStartDate: { type: Date },
        warrantyExpireDate: { type: Date },
        warrantyType: { type: String, default: "" },
        voidStickerCode: { type: String, default: "" },
        // Status Timeline
        statusHistory: [
            {
                status: { type: String },
                changedBy: { type: String },
                actorType: { type: String, enum: ["admin", "integration", "system"] },
                actorId: { type: String },
                changedAt: { type: Date, default: Date.now },
                note: { type: String, default: "" },
            },
        ],
        receivedAt: { type: Date, default: Date.now },
        repairCompletedAt: { type: Date },
        handedOverAt: { type: Date },
        completedAt: { type: Date },
        cancelledByBuybackId: { type: Schema.Types.ObjectId, ref: "Buyback" },
        cancelledAt: { type: Date },
        cancelReason: { type: String },
    },
    { timestamps: true }
);

// Auto-generate jobId
RepairJobSchema.pre("save", async function (this: IRepairJob) {
    if (this.isNew) {
        if (!this.jobId) {
            const prefix = repairJobPrefix();
            const next = await nextSequenceNumber({
                counterKey: `repair_job:${prefix}`,
                model: this.constructor as mongoose.Model<unknown>,
                field: "jobId",
                prefix,
            });
            this.jobId = `${prefix}${String(next).padStart(4, "0")}`;
        }

        // Auto-push first status into history if new
        if (this.statusHistory && this.statusHistory.length === 0) {
            this.statusHistory.push({
                status: "pending",
                changedBy: "system",
                actorType: "system",
                changedAt: new Date(),
                note: "สร้างใบรับซ่อม",
            });
        }
    }
});

// Auto-compute totalPrice
RepairJobSchema.pre("save", function (this: IRepairJob) {
    this.totalPrice = Math.round(((Number(this.laborCost) || 0) + (Number(this.partsCost) || 0)) * 100) / 100;
});

RepairJobSchema.index({ imei: 1 });
RepairJobSchema.index({ status: 1 });
RepairJobSchema.index({ "customer": 1 });
// One job per POS reference, and one per idempotency key, even under concurrent requests.
RepairJobSchema.index(
    { source: 1, externalRef: 1 },
    { unique: true, partialFilterExpression: { externalRef: { $type: "string" } } }
);
RepairJobSchema.index(
    { source: 1, "integration.idempotencyKey": 1 },
    { unique: true, partialFilterExpression: { "integration.idempotencyKey": { $type: "string" } } }
);
RepairJobSchema.index({ source: 1, createdAt: -1 });

const RepairJob =
    (mongoose.models.RepairJob as mongoose.Model<IRepairJob>) ||
    mongoose.model<IRepairJob>("RepairJob", RepairJobSchema);

export default RepairJob;
