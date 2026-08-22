import mongoose, { Schema } from "mongoose";

const ActorSchema = new Schema(
    {
        id: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
        username: { type: String, required: true },
        name: { type: String, required: true },
    },
    { _id: false }
);

const FileSchema = new Schema(
    {
        relativePath: { type: String, required: true },
        mimeType: { type: String, required: true },
        bytes: { type: Number, required: true },
        sha256: { type: String, required: true },
        sourceMode: { type: String, enum: ["draw", "upload"], required: true },
        deletedAt: { type: Date },
    },
    { _id: false }
);

const BuybackSchema = new Schema(
    {
        registrationId: { type: Schema.Types.ObjectId, ref: "Registration", required: true, index: true },
        status: {
            type: String,
            enum: ["pending_approval", "processing", "approved", "rejected"],
            default: "pending_approval",
            required: true,
            index: true,
        },
        customerSnapshot: {
            fullName: { type: String, required: true },
            idCard: { type: String, required: true },
            imei: { type: String, required: true },
            policyNumber: { type: String, required: true },
            packageName: { type: String, required: true },
            packagePriceSatang: { type: Number, required: true, min: 0 },
            coverageStartAt: { type: Date, required: true },
            coverageEndAt: { type: Date, required: true },
            totalCoverageDays: { type: Number, required: true, min: 1 },
        },
        transactionAt: { type: Date, required: true, default: Date.now, index: true },
        remainingCoverageDays: { type: Number, required: true, min: 1 },
        recommendedAmountSatang: { type: Number, required: true, min: 0 },
        actualAmountSatang: { type: Number, required: true, min: 0 },
        note: { type: String, default: "" },
        payment: {
            method: { type: String, enum: ["cash", "transfer", "cheque", "other"], required: true },
            otherLabel: { type: String, default: "" },
            reference: { type: String, default: "" },
        },
        confirmation: {
            version: { type: String, required: true },
            text: { type: String, required: true },
        },
        files: {
            customerSignature: { type: FileSchema, required: true },
            employeeSignature: { type: FileSchema, required: true },
            paymentProof: { type: FileSchema, required: false },
        },
        createdBy: { type: ActorSchema, required: true },
        branchSnapshot: {
            id: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
            name: { type: String, required: true },
            location: { type: String, default: "" },
        },
        approvedBy: { type: ActorSchema, required: false },
        rejectedBy: { type: ActorSchema, required: false },
        rejectionReason: { type: String, default: "" },
        documentNumber: { type: String, unique: true, sparse: true },
        receiptRelativePath: { type: String },
        completedAt: { type: Date },
        rejectedAt: { type: Date },
        terminalAt: { type: Date },
        imageDeleteAt: { type: Date, index: true },
        imagesDeletedAt: { type: Date },
        processingStartedAt: { type: Date },
        lastProcessingError: { type: String },
        statusHistory: [
            {
                status: { type: String, required: true },
                changedAt: { type: Date, required: true, default: Date.now },
                changedBy: { type: ActorSchema, required: true },
                note: { type: String, default: "" },
            },
        ],
    },
    { timestamps: true }
);

BuybackSchema.index({ "createdBy.id": 1, createdAt: -1 });
BuybackSchema.index({ "branchSnapshot.id": 1, createdAt: -1 });

// A registration may only have ONE live buyback at a time, but a rejected one
// must not block re-submitting. So the uniqueness is partial: it applies only to
// the still-open statuses, leaving rejected rows free to coexist with a new one.
BuybackSchema.index(
    { registrationId: 1 },
    {
        unique: true,
        partialFilterExpression: { status: { $in: ["pending_approval", "processing", "approved"] } },
    }
);

export default mongoose.models.Buyback || mongoose.model("Buyback", BuybackSchema);
