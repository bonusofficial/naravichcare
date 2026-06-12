import mongoose, { Schema, Document } from "mongoose";

export interface IInsurance extends Document {
    loanId: mongoose.Types.ObjectId;
    policyId: string;
    imei: string;
    startDate: Date;
    endDate: Date;
    quota: {
        screen: { total: number; used: number };
        water: { total: number; used: number };
        battery: { total: number; used: number };
    };
    status: "active" | "expired" | "cancelled";
    createdAt: Date;
    updatedAt: Date;
}

const InsuranceSchema: Schema = new Schema(
    {
        loanId: { type: Schema.Types.ObjectId, ref: "Loan", required: true },
        policyId: { type: String, required: true, unique: true },
        imei: { type: String, required: true },
        startDate: { type: Date, default: Date.now },
        endDate: { type: Date, required: true }, // Should be startDate + 36 months
        quota: {
            screen: { total: { type: Number, default: 2 }, used: { type: Number, default: 0 } },
            water: { total: { type: Number, default: 1 }, used: { type: Number, default: 0 } },
            battery: { total: { type: Number, default: 1 }, used: { type: Number, default: 0 } },
        },
        status: { type: String, enum: ["active", "expired", "cancelled"], default: "active" },
    },
    { timestamps: true }
);

export default mongoose.models.Insurance || mongoose.model<IInsurance>("Insurance", InsuranceSchema);
