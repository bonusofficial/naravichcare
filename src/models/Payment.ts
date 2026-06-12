import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
    loanId: mongoose.Types.ObjectId;
    contractId: string;
    amount: number;
    installmentNumber: number;
    paymentDate: Date;
    paymentMethod: "cash" | "transfer" | "other";
    recordedBy: string; // Admin unique username
    receiptId: string;
    note?: string;
}

const PaymentSchema: Schema = new Schema(
    {
        loanId: { type: Schema.Types.ObjectId, ref: "Loan", required: true },
        contractId: { type: String, required: true },
        amount: { type: Number, required: true },
        installmentNumber: { type: Number, required: true },
        paymentDate: { type: Date, default: Date.now },
        paymentMethod: { type: String, enum: ["cash", "transfer", "other"], default: "transfer" },
        recordedBy: { type: String, required: true },
        receiptId: { type: String, required: true, unique: true },
        note: { type: String },
    },
    { timestamps: true }
);

export default mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
