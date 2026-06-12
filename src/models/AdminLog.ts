import mongoose from "mongoose";

const AdminLogSchema = new mongoose.Schema(
    {
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminUser",
            required: false, // Optional if we want to support system logs
        },
        adminName: {
            type: String,
            required: true,
        },
        action: {
            type: String,
            required: true, // e.g., "approve_registration", "delete_agent"
        },
        description: {
            type: String,
            required: true, // e.g., "Approved registration #123456"
        },
        targetId: {
            type: String, // ID of the object being acted upon (registration ID, agent ID, etc.)
            required: false,
        },
        targetType: {
            type: String, // e.g., "Registration", "Agent", "Loan"
            required: false,
        },
        details: {
            type: mongoose.Schema.Types.Mixed, // Any additional data (old values, new values, etc.)
            required: false,
        },
        ipAddress: {
            type: String,
            required: false,
        },
        userAgent: {
            type: String,
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

const AdminLog = mongoose.models.AdminLog || mongoose.model("AdminLog", AdminLogSchema);

export default AdminLog;
