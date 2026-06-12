import mongoose, { Schema, Document } from "mongoose";

export interface ILoan extends Document {
    contractId: string;
    customerName: string;
    customerPhone: string;
    idCard: string;
    deviceModel: string;
    imei: string;
    serialNumber: string;
    loanAmount: number;
    interestRate: number; // e.g., 3 for 3%
    totalInstallments: number;
    paidInstallments: number;
    monthlyPayment: number;
    loanType: "ผ่อนเครื่อง" | "จำนำ iCloud";
    status: "normal" | "warning" | "critical" | "closed";
    agentId: mongoose.Types.ObjectId;
    branchId: mongoose.Types.ObjectId;
    idCardImage?: string; // URL or base64
    deviceImage?: string; // URL or base64
    notes?: string;
    startDate: Date;
    nextPaymentDate: Date;
    overdueDays: number;
    createdAt: Date;
    updatedAt: Date;
}

const LoanSchema: Schema = new Schema(
    {
        contractId: { type: String, required: true, unique: true },
        customerName: { type: String, required: true },
        customerPhone: { type: String, required: true },
        idCard: { type: String, required: true },
        deviceModel: { type: String, required: true },
        imei: { type: String, required: true, unique: true },
        serialNumber: { type: String },
        loanAmount: { type: Number, required: true },
        interestRate: { type: Number, default: 3 },
        totalInstallments: { type: Number, required: true },
        paidInstallments: { type: Number, default: 0 },
        monthlyPayment: { type: Number, required: true },
        loanType: { type: String, enum: ["ผ่อนเครื่อง", "จำนำ iCloud"], required: true },
        status: { type: String, enum: ["normal", "warning", "critical", "closed"], default: "normal" },
        agentId: { type: Schema.Types.ObjectId, ref: "Agent" },
        branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
        idCardImage: { type: String },
        deviceImage: { type: String },
        notes: { type: String },
        startDate: { type: Date, default: Date.now },
        nextPaymentDate: { type: Date },
        overdueDays: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export default mongoose.models.Loan || mongoose.model<ILoan>("Loan", LoanSchema);
