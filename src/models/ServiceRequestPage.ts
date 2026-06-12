import mongoose, { Schema } from "mongoose";

const ServiceRowSchema = new Schema({
    request: { type: String, required: true },
    delivery: { type: String, required: true },
    area: { type: String, required: true },
    shade: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
});

const ServiceRequestPageSchema = new Schema(
    {
        title: { type: String, default: "เปลี่ยนเครื่อง รับเครื่องทดแทน หรือการซ่อมแซมเครื่อง" },
        subtitle: { type: String, default: "SERVICE REQUEST" },
        columns: {
            type: [String],
            default: [
                "รับคำขอใช้บริการ",
                "ระยะเวลาในการจัดส่ง",
                "พื้นที่ให้บริการเข้ารับ/จัดส่งอุปกรณ์โทรศัพท์เคลื่อนที่"
            ]
        },
        rows: [ServiceRowSchema],
        footer: { type: String, default: "ในรับรองสิทธิการรับบริการ ระยะจัดส่งไปยัง email ลูกค้า ภายใน 7 วันทำการ" }
    },
    { timestamps: true }
);

const ServiceRequestPage = mongoose.models.ServiceRequestPage || mongoose.model("ServiceRequestPage", ServiceRequestPageSchema);
export default ServiceRequestPage;
