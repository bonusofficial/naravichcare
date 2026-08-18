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
        imeiNormalized: { type: String, required: false, index: true },
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
        // The price quoted to the customer at step 3 (devicePrice × priceMultiplier).
        // Stored at registration time so the quote can never drift if the plan's
        // multiplier is edited later.
        packagePrice: {
            type: Number,
            required: false,
            default: 0,
        },
        images: {
            type: Object,
            required: false,
        },
        // Detailed Personal Info
        firstName: { type: String, required: false },
        lastName: { type: String, required: false },
        idCard: { type: String, required: false, index: true },
        idCardNormalized: { type: String, required: false, index: true },
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
        policyNumberNormalized: { type: String, required: false, index: true },
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
        // Coverage period. The buyback flow, claim search and /check-policy all
        // read these; the fe993d6 merge kept those call sites but dropped the
        // schema definitions, so every read silently returned undefined.
        coverageStatus: {
            type: String,
            enum: ["active", "expired", "bought_back"],
            required: false,
            index: true,
        },
        coverageSnapshot: {
            planId: { type: String, required: false },
            planName: { type: String, required: false },
            packagePriceSatang: { type: Number, required: false, min: 0 },
            // Set by the admin, not derived from the approval date, so a policy
            // that starts later than it was approved can be recorded correctly.
            coverageStartAt: { type: Date, required: false },
            coverageEndAt: { type: Date, required: false },
            totalCoverageDays: { type: Number, required: false, min: 1 },
            snapshottedAt: { type: Date, required: false },
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

// Pre-save hook to calculate profit automatically.
// Mongoose 9 no longer passes `next` into middleware — it awaits the returned
// value instead. Calling next() here threw "next is not a function" and broke
// every customer registration.
RegistrationSchema.pre("save", function (this: any) {
    if (this.salePrice !== undefined && this.packageCost !== undefined) {
        this.totalCost = (this.packageCost || 0) + (this.agentCommission || 0) + (this.otherExpenses || 0);
        this.netProfit = (this.salePrice || 0) - (this.totalCost || 0);
        this.profitMargin = (this.salePrice || 0) > 0 ? (((this.netProfit || 0) / (this.salePrice || 1)) * 100) : 0;
    }
});

const Registration = mongoose.models.Registration || mongoose.model("Registration", RegistrationSchema);
export default Registration;
