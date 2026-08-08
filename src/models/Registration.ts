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
            enum: ["pending", "paid", "approved", "rejected"],
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
        coverageStatus: {
            type: String,
            enum: ["active", "expired", "bought_back"],
            required: false,
        },
        coverageSnapshot: {
            planId: { type: mongoose.Schema.Types.ObjectId, ref: "CoveragePlan" },
            planName: { type: String },
            priceMultiplier: { type: Number },
            packagePriceSatang: { type: Number, min: 0 },
            coverageStartAt: { type: Date },
            coverageEndAt: { type: Date },
            totalCoverageDays: { type: Number, min: 1 },
            durationMonths: { type: Number, min: 1 },
            snapshottedAt: { type: Date },
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

RegistrationSchema.pre("save", function () {
    this.imeiNormalized = typeof this.imei === "string" ? this.imei.replace(/\D/g, "") : undefined;
    this.idCardNormalized = typeof this.idCard === "string" ? this.idCard.replace(/\D/g, "") : undefined;
    this.policyNumberNormalized = typeof this.policyNumber === "string" ? this.policyNumber.trim().toUpperCase() : undefined;
});

const Registration = mongoose.models.Registration || mongoose.model("Registration", RegistrationSchema);
export default Registration;
