import mongoose, { Schema, Document } from "mongoose";

export interface IRepairCustomer extends Document {
    customerId: string;
    firstName: string;
    lastName: string;
    phone: string;
    lineId?: string;
    address?: string;
    notes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const RepairCustomerSchema: Schema = new Schema(
    {
        customerId: { type: String, unique: true },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        phone: { type: String, required: true },
        lineId: { type: String, default: "" },
        address: { type: String, default: "" },
        notes: { type: String, default: "" },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Auto-generate customerId before saving
RepairCustomerSchema.pre("save", async function (this: IRepairCustomer) {
    if (this.isNew && !this.customerId) {
        const RepairCustomerModel = this.constructor as mongoose.Model<IRepairCustomer>;
        const count = await RepairCustomerModel.countDocuments();
        this.customerId = `CUS${String(count + 1).padStart(5, "0")}`;
    }
});

// Index for fast search
RepairCustomerSchema.index({ phone: 1 });
RepairCustomerSchema.index({ firstName: "text", lastName: "text", phone: "text" });

const RepairCustomer =
    mongoose.models.RepairCustomer ||
    mongoose.model<IRepairCustomer>("RepairCustomer", RepairCustomerSchema);

export default RepairCustomer;
