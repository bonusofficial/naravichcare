import mongoose, { Schema, Document } from "mongoose";

export interface IAgent extends Document {
    agentCode: string;
    name: string; // ชื่อร้าน หรือ ชื่อบริษัท
    contactPerson: string; // ชื่อผู้ติดต่อหลัก
    phone: string;
    email: string;
    address: string;
    taxId: string; // เลขประจำตัวผู้เสียภาษี หรือ บัตรประชาชน
    bankName: string; // ชื่อธนาคาร (สำหรับจ่ายค่าคอม)
    bankAccount: string; // เลขบัญชี
    bankAccountName: string; // ชื่อบัญชี
    commissionRate: number;
    isActive: boolean;
}

const AgentSchema: Schema = new Schema({
    agentCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    contactPerson: { type: String, default: "" },
    phone: { type: String, required: true },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    taxId: { type: String, default: "" },
    bankName: { type: String, default: "" },
    bankAccount: { type: String, default: "" },
    bankAccountName: { type: String, default: "" },
    commissionRate: { type: Number, default: 5 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Agent || mongoose.model<IAgent>("Agent", AgentSchema);
