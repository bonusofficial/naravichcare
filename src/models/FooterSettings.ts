import mongoose, { Schema } from "mongoose";

const FooterLinkSchema = new Schema({
    label: { type: String, required: true },
    href: { type: String, required: true },
});

const FooterSettingsSchema = new Schema(
    {
        description: {
            type: String,
            default: "บริการดูแลมือถือครบวงจร ตก แตก สูญหาย\nคุ้มครองอุบัติเหตุ มอบความอุ่นใจในทุกการใช้งาน\nNaravichCare คู่คิดที่แท้จริงสำหรับอุปกรณ์ของคุณ",
        },
        menuTitle: { type: String, default: "เมนู" },
        menuItems: {
            type: [FooterLinkSchema],
            default: [
                { label: "หน้าแรก", href: "/" },
                { label: "ลงทะเบียนสมัคร", href: "/register" },
                { label: "ตรวจสอบกรมธรรม์", href: "/check-policy" },
                { label: "พอร์ทัลลูกค้า", href: "/portal" },
            ],
        },
        contactTitle: { type: String, default: "ติดต่อสอบถาม" },
        phoneDisplay: { type: String, default: "02-XXX-XXXX" },
        phoneHref: { type: String, default: "tel:+6602XXXXXXX" },
        emailDisplay: { type: String, default: "contact@naravichcare.com" },
        emailHref: { type: String, default: "mailto:contact@naravichcare.com" },
        copyrightText: { type: String, default: "NaravichCare. All rights reserved." },
        poweredByText: { type: String, default: "Naravich Group" },
    },
    { timestamps: true }
);

const FooterSettings = mongoose.models.FooterSettings || mongoose.model("FooterSettings", FooterSettingsSchema);
export default FooterSettings;
