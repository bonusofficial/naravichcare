import mongoose from "mongoose";

const RegistrationSchema = new mongoose.Schema(
    {
        phone: {
            type: String,
            required: [true, "Please provide a phone number"],
        },
        imei: {
            type: String,
            required: [true, "Please provide an IMEI"],
            index: true,
        },
        brand: {
            type: String,
            required: [true, "Please provide a device brand"],
        },
        model: {
            type: String,
            required: [true, "Please provide a device model"],
        },
        devicePrice: {
            type: Number,
            required: false,
        },
        deviceType: {
            type: String,
            required: false, // iPhone, iPad, Smartphone, Tablet
        },
        packageType: {
            type: String,
            required: false,
        },
        images: {
            type: Object,
            required: false,
        },
        // Detailed Personal Info
        firstName: { type: String, required: false },
        lastName: { type: String, required: false },
        idCard: { type: String, required: false, index: true },
        email: { type: String, required: false },
        // Detailed Address Info
        postCode: { type: String, required: false },
        province: { type: String, required: false },
        district: { type: String, required: false },
        subDistrict: { type: String, required: false },
        addressDetails: { type: String, required: false },
        status: {
            type: String,
            enum: ["pending", "paid", "approved", "rejected", "cancelled", "refunded"],
            default: "pending",
        },
        paymentReceipt: {
            type: String,
            required: false,
        },
        policyNumber: {
            type: String,
            required: false,
        },
        referenceNumber: {
            type: String,
            required: false,
        },
        agentCode: {
            type: String,
            required: false,
            index: true,
        },
        approvedAt: {
            type: Date,
            required: false,
        },
        // Profit calculation fields
        salePrice: {
            type: Number,
            required: false,
            default: 0,
        },
        packageCost: {
            type: Number,
            required: false,
            default: 0,
        },
        agentCommission: {
            type: Number,
            required: false,
            default: 0,
        },
        otherExpenses: {
            type: Number,
            required: false,
            default: 0,
        },
        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: false,
        },
        totalCost: {
            type: Number,
            required: false,
            default: 0,
        },
        netProfit: {
            type: Number,
            required: false,
            default: 0,
        },
        profitMargin: {
            type: Number,
            required: false,
            default: 0,
        },
        // Cancellation/Refund fields
        isCancelled: {
            type: Boolean,
            default: false,
        },
        isRefunded: {
            type: Boolean,
            default: false,
        },
        refundedAt: {
            type: Date,
            required: false,
        },
        cancellationReason: {
            type: String,
            required: false,
        },
        createdAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Pre-save hook to calculate profit automatically
RegistrationSchema.pre("save", function (this: any, next: any) {
    if (this.salePrice !== undefined && this.packageCost !== undefined) {
        this.totalCost = (this.packageCost || 0) + (this.agentCommission || 0) + (this.otherExpenses || 0);
        this.netProfit = (this.salePrice || 0) - (this.totalCost || 0);
        this.profitMargin = (this.salePrice || 0) > 0 ? (((this.netProfit || 0) / (this.salePrice || 1)) * 100) : 0;
    }
    next();
});

const Registration = mongoose.models.Registration || mongoose.model("Registration", RegistrationSchema);
export default Registration;
