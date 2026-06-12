import mongoose, { Schema, model, models } from "mongoose";

const CoveragePlanSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Please provide a plan name"], // e.g., Naravich Care Plus
        },
        subTitle: {
            type: String,
            required: false, // e.g., (จอแตก+ตัวเครื่อง)
        },
        durationText: {
            type: String,
            required: true, // e.g., (1 ปี)
        },
        durationUnit: {
            type: String,
            required: true, // e.g., บาท / ปี
        },
        priceMultiplier: {
            type: Number,
            required: true, // e.g., 0.6 (multiplier for calculating price from device price)
        },
        highlights: {
            type: [String],
            default: [],
        },
        order: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        deviceType: {
            type: String,
            enum: ["iPhone", "iPad", "Smartphone", "Tablet"],
            required: [true, "Please specify device type (iPhone, iPad, Smartphone, Tablet)"],
            default: "Smartphone",
        },
        quotas: {
            type: [
                {
                    name: String, // e.g., 'จอแตก'
                    maxLimit: Number, // e.g., 2
                    icon: { type: String, default: "Monitor" }, // string for lucide icon
                }
            ],
            default: []
        }
    },
    {
        timestamps: true,
    }
);

const CoveragePlan = mongoose.models.CoveragePlan || mongoose.model("CoveragePlan", CoveragePlanSchema);

export default CoveragePlan;
