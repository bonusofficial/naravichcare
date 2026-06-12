import mongoose, { Schema, Document } from "mongoose";

export interface IClaimPart {
    name: string;
    partNumber: string;
    qty: number;
    unitCost: number;
}

export interface IClaim extends Document {
    // Customer Info (from Registration)
    registrationId: mongoose.Types.ObjectId;
    customerName: string;
    idCard: string;
    imei: string;
    deviceModel: string;
    policyNumber: string;
    // Step 2: Void Check
    voidChecklist: { label: string; checked: boolean }[];
    preRepairNote: string;
    preRepairImages: string[];
    // Step 3: Deductible
    deductibleItem: string;
    deductibleDetail: string;
    deductibleAmount: number;
    paymentSlip: string;
    // Step 4: Parts
    parts: IClaimPart[];
    // Step 5: Post-repair
    postRepairNote: string;
    postRepairImages: string[];
    // Status
    status: "completed" | "pending" | "rejected";
    createdBy: string; // admin username
    createdAt: Date;
    updatedAt: Date;
}

const ClaimSchema: Schema = new Schema(
    {
        registrationId: { type: Schema.Types.ObjectId, ref: "Registration", required: false },
        customerName: { type: String },
        idCard: { type: String },
        imei: { type: String, required: true },
        brand: { type: String },
        deviceModel: { type: String },
        policyNumber: { type: String },
        voidChecklist: [{ label: String, checked: Boolean }],
        preRepairNote: { type: String },
        preRepairImages: [{ type: String }],
        deductibleItem: { type: String },
        deductibleDetail: { type: String },
        deductibleAmount: { type: Number, default: 0 },
        paymentSlip: { type: String },
        parts: [{
            name: String,
            partNumber: String,
            qty: { type: Number, default: 1 },
            unitCost: { type: Number, default: 0 }
        }],
        postRepairNote: { type: String },
        postRepairImages: [{ type: String }],
        status: { type: String, enum: ["completed", "pending", "rejected", "draft"], default: "draft" },
        currentStep: { type: Number, default: 1 },
        consumedQuotaName: { type: String }, // name of the quota being used
        createdBy: { type: String, default: "admin" },
    },
    { timestamps: true }
);

// Force clear cache to ensure updated schema is used
if (mongoose.models.Claim) {
    delete (mongoose.models as any).Claim;
}

export default mongoose.model<IClaim>("Claim", ClaimSchema);
