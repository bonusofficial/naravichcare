import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IAdminUser extends Document {
    username: string;
    password?: string;
    name: string;
    role: "super_admin" | "admin" | "viewer" | "technician" | "staff";
    email: string;
    isActive: boolean;
    createdAt: Date;
    comparePassword: (password: string) => Promise<boolean>;
}

const AdminUserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["super_admin", "admin", "viewer", "technician", "staff"], default: "admin" },
    email: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

AdminUserSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password as string, salt);
    } catch (error: any) {
        throw error;
    }
});

AdminUserSchema.methods.comparePassword = async function (password: string) {
    return bcrypt.compare(password, this.password);
};

// Ensure we use the latest schema with methods
const AdminUserModel = mongoose.models.AdminUser || mongoose.model<IAdminUser>("AdminUser", AdminUserSchema);

export default AdminUserModel;
