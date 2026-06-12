import mongoose, { Schema } from "mongoose";

const ContactMethodSchema = new Schema({
    iconType: { type: String, enum: ["facebook", "line", "phone", "email"], default: "phone" },
    label: { type: String, required: true },
    desc: { type: String, required: true },
    href: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
});

const FloatingChatSchema = new Schema(
    {
        brandName: { type: String, default: "NaravichCare" },
        greetingText: { type: String, default: "สวัสดีค่ะ! ยินดีต้อนรับสู่ NaravichCare\nต้องการสอบถามบริการไหน เลือกได้เลยค่ะ" },
        footerText: { type: String, default: "Official Support Channel • Mon-Sun 09:00-18:00" },
        contacts: { type: [ContactMethodSchema], default: [] },
    },
    { timestamps: true }
);

const FloatingChat = mongoose.models.FloatingChat || mongoose.model("FloatingChat", FloatingChatSchema);
export default FloatingChat;
