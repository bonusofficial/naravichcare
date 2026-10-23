import mongoose, { Schema, Document } from "mongoose";
import { INTEGRATION_SCOPES } from "@/lib/integration/api-key";

/**
 * A machine-to-machine credential for /api/integration/v1.
 *
 * The plaintext key is shown to the super admin once and never stored: only
 * SHA-256 of the secret part lives in keyHash, which is excluded from queries
 * unless explicitly selected with "+keyHash".
 */
export interface IIntegrationApiKey extends Document {
    name: string;
    publicId: string;
    keyHash: string;
    keyPrefix: string;
    lastFour: string;
    scopes: string[];
    isActive: boolean;
    expiresAt?: Date | null;
    lastUsedAt?: Date | null;
    lastUsedIp?: string;
    createdBy: mongoose.Types.ObjectId;
    rotatedAt?: Date | null;
    rotatedBy?: mongoose.Types.ObjectId | null;
    rotationCount: number;
    revokedAt?: Date | null;
    revokedBy?: mongoose.Types.ObjectId | null;
    revokeReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const IntegrationApiKeySchema = new Schema<IIntegrationApiKey>(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        publicId: { type: String, required: true, unique: true },
        keyHash: { type: String, required: true, select: false },
        keyPrefix: { type: String, required: true },
        lastFour: { type: String, required: true },
        scopes: { type: [{ type: String, enum: INTEGRATION_SCOPES }], default: [] },
        isActive: { type: Boolean, default: true },
        expiresAt: { type: Date, default: null },
        lastUsedAt: { type: Date, default: null },
        lastUsedIp: { type: String, default: "" },
        createdBy: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
        rotatedAt: { type: Date, default: null },
        rotatedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
        rotationCount: { type: Number, default: 0 },
        revokedAt: { type: Date, default: null },
        revokedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
        revokeReason: { type: String, default: "", maxlength: 500 },
    },
    { timestamps: true }
);

IntegrationApiKeySchema.index({ isActive: 1, createdAt: -1 });

const IntegrationApiKey =
    (mongoose.models.IntegrationApiKey as mongoose.Model<IIntegrationApiKey>) ||
    mongoose.model<IIntegrationApiKey>("IntegrationApiKey", IntegrationApiKeySchema);

export default IntegrationApiKey;
