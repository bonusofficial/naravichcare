import mongoose, { Schema, model, models } from "mongoose";

const PackageSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Please provide a package name"],
        },
        title: {
            type: String,
            default: "ราคาเครื่อง",
        },
        range: {
            type: String,
            required: [true, "Please provide a price range"],
        },
        monthlyPrice: {
            type: Number,
            required: [true, "Please provide a monthly price"],
        },
        yearlyPrice: {
            type: Number,
            required: [true, "Please provide a yearly price"],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        order: {
            type: Number,
            default: 0,
        },
        highlights: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

const Package = models.Package || model("Package", PackageSchema);

export default Package;
