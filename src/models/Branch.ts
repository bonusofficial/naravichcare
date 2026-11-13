import mongoose, { Schema, Document } from "mongoose";

export interface IBranch extends Document {
    name: string;
    location: string;
    phone: string;
    isActive: boolean;
    /** Branch ids the Web POS sends for this branch, so POS repair jobs land here. */
    posBranchIds: string[];
}

const BranchSchema: Schema = new Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    phone: { type: String },
    isActive: { type: Boolean, default: true },
    posBranchIds: { type: [String], default: [] },
}, { timestamps: true });

// One POS branch id maps to at most one branch (multikey unique index).
BranchSchema.index({ posBranchIds: 1 }, { unique: true, partialFilterExpression: { posBranchIds: { $type: "string" } } });

export default mongoose.models.Branch || mongoose.model<IBranch>("Branch", BranchSchema);
