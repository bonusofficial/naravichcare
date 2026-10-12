import mongoose, { Schema, Document } from "mongoose";

export type WithdrawalStatus = "pending" | "paid" | "rejected";

export interface IAgentWithdrawal extends Document {
    agentId: mongoose.Types.ObjectId;
    agentCode: string;
    amount: number;
    status: WithdrawalStatus;
    bankName: string;
    bankAccount: string;
    bankAccountName: string;
    slip?: { relativePath?: string; mimeType?: string };
    note: string;
    processedBy?: mongoose.Types.ObjectId;
    processedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AgentWithdrawalSchema: Schema = new Schema({
    agentId: { type: Schema.Types.ObjectId, ref: "Agent", required: true },
    agentCode: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    status: { type: String, enum: ["pending", "paid", "rejected"], default: "pending", index: true },
    // Where the money goes, snapshotted when the agent asks so a later edit to
    // the agent's bank details cannot redirect a request already in the queue.
    bankName: { type: String, default: "" },
    bankAccount: { type: String, default: "" },
    bankAccountName: { type: String, default: "" },
    slip: {
        relativePath: { type: String },
        mimeType: { type: String },
    },
    // Transfer note when paid, or the reason shown to the agent when rejected.
    note: { type: String, default: "" },
    processedBy: { type: Schema.Types.ObjectId, ref: "AdminUser" },
    processedAt: { type: Date },
}, { timestamps: true });

AgentWithdrawalSchema.index({ agentId: 1, createdAt: -1 });
// One open request per agent. Besides blocking double-submits, this stops two
// requests from racing past the balance check together.
AgentWithdrawalSchema.index(
    { agentId: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: "pending" } }
);

export default mongoose.models.AgentWithdrawal || mongoose.model<IAgentWithdrawal>("AgentWithdrawal", AgentWithdrawalSchema);
