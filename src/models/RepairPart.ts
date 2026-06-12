import mongoose, { Schema, Document } from "mongoose";

export interface IRepairPart extends Document {
    partId: string;
    name: string;
    description?: string;
    costPrice: number;
    sellingPrice: number;
    stockQuantity: number;
    minimumStock: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const RepairPartSchema: Schema = new Schema(
    {
        partId: { type: String, unique: true },
        name: { type: String, required: true },
        description: { type: String, default: "" },
        costPrice: { type: Number, required: true, default: 0 },
        sellingPrice: { type: Number, required: true, default: 0 },
        stockQuantity: { type: Number, default: 0 },
        minimumStock: { type: Number, default: 5 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

RepairPartSchema.pre("save", async function (this: IRepairPart) {
    if (this.isNew && !this.partId) {
        const RepairPartModel = this.constructor as mongoose.Model<IRepairPart>;
        const count = await RepairPartModel.countDocuments();
        this.partId = `PART${String(count + 1).padStart(4, "0")}`;
    }
});

RepairPartSchema.index({ name: "text" });

const RepairPart =
    mongoose.models.RepairPart ||
    mongoose.model<IRepairPart>("RepairPart", RepairPartSchema);

export default RepairPart;
