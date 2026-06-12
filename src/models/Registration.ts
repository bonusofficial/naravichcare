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

const Registration = mongoose.models.Registration || mongoose.model("Registration", RegistrationSchema);
export default Registration;
