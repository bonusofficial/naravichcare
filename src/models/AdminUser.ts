import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IAdminUser extends Document {
    username: string;
    password?: string;
    name: string;
    role: string;
    email: string;
    isActive: boolean;
    branchId?: mongoose.Types.ObjectId;
    createdAt: Date;
    comparePassword: (password: string) => Promise<boolean>;
}

const AdminUserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    name: { type: String, required: true },
    role: { type: String, required: true, default: "admin" },
    email: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: false, index: true },
    createdAt: { type: Date, default: Date.now },
});

AdminUserSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password as string, salt);
});

AdminUserSchema.methods.comparePassword = async function (password: string) {
    return bcrypt.compare(password, this.password);
};

// Ensure we use the latest schema with methods
const AdminUserModel = mongoose.models.AdminUser || mongoose.model<IAdminUser>("AdminUser", AdminUserSchema);

export default AdminUserModel;
