import mongoose, { Schema, Document } from "mongoose";

export interface IRepairJob extends Document {
    jobId: string;
    // Customer & Device Info
    customer: mongoose.Types.ObjectId;
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
    // Quotation
    laborCost?: number;
    partsCost?: number;
    partsPurchaseCost?: number; // Cost to the shop
    totalPrice?: number;
    quotationApproved?: "pending" | "approved" | "rejected";
    // Status & Assignment
    status:
        | "pending"
        | "checking"
        | "quoted"
        | "waiting_approval"
        | "in_progress"
        | "waiting_parts"
        | "testing"
        | "ready_pickup"
        | "completed"
        | "cancelled";
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
    statusHistory: {
        status: string;
        changedBy: string;
        changedAt: Date;
        note?: string;
    }[];
    // Timestamps
    receivedAt: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const RepairJobSchema: Schema = new Schema(
    {
        jobId: { type: String, unique: true },
        customer: { type: Schema.Types.ObjectId, ref: "RepairCustomer", required: true },
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
        quotationApproved: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        // Status
        status: {
            type: String,
            enum: [
                "pending",
                "checking",
                "quoted",
                "waiting_approval",
                "in_progress",
                "waiting_parts",
                "testing",
                "ready_pickup",
                "completed",
                "cancelled",
            ],
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
                changedAt: { type: Date, default: Date.now },
                note: { type: String, default: "" },
            },
        ],
        receivedAt: { type: Date, default: Date.now },
        completedAt: { type: Date },
    },
    { timestamps: true }
);

// Auto-generate jobId
RepairJobSchema.pre("save", async function (this: IRepairJob) {
    if (this.isNew) {
        if (!this.jobId) {
            const RepairJobModel = this.constructor as mongoose.Model<IRepairJob>;
            const count = await RepairJobModel.countDocuments();
            const now = new Date();
            const yy = String(now.getFullYear()).slice(-2);
            const mm = String(now.getMonth() + 1).padStart(2, "0");
            this.jobId = `JOB${yy}${mm}-${String(count + 1).padStart(4, "0")}`;
        }
        
        // Auto-push first status into history if new
        if (this.statusHistory && this.statusHistory.length === 0) {
            this.statusHistory.push({
                status: "pending",
                changedBy: "system",
                changedAt: new Date(),
                note: "สร้างใบรับซ่อม",
            });
        }
    }
});

// Auto-compute totalPrice
RepairJobSchema.pre("save", function (this: IRepairJob) {
    this.totalPrice = (Number(this.laborCost) || 0) + (Number(this.partsCost) || 0);
});

RepairJobSchema.index({ imei: 1 });
RepairJobSchema.index({ status: 1 });
RepairJobSchema.index({ "customer": 1 });

const RepairJob =
    mongoose.models.RepairJob ||
    mongoose.model<IRepairJob>("RepairJob", RepairJobSchema);

export default RepairJob;
