import mongoose, { Schema, Document } from "mongoose";

export interface IBranch extends Document {
    name: string;
    location: string;
    phone: string;
    isActive: boolean;
}

const BranchSchema: Schema = new Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    phone: { type: String },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Branch || mongoose.model<IBranch>("Branch", BranchSchema);
