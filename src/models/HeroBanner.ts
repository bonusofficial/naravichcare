import mongoose, { Schema } from "mongoose";

const HeroBannerSchema = new Schema(
    {
        badge1Label: { type: String, default: "NARAVICH" },
        badge1Title: { type: String, default: "Mobile Care" },
        badge1Subtitle: { type: String, default: "บริการดูแลมือถือครบวงจร" },
        badge2Eyebrow: { type: String, default: "มั่นใจด้วยมาตรฐาน" },
        badge2Title: { type: String, default: "ระดับโลก" },
        heading1: { type: String, default: "มั่นใจด้วยมาตรฐาน" },
        heading2: { type: String, default: "ระดับโลก" },
        pillText: { type: String, default: "คุ้มครองอุบัติเหตุไม่จำกัดครั้ง คุ้มครองทั้งภายในและภายนอก" },
        subText: { type: String, default: "รับบริการที่ Apple Store และ Apple Service Provider ทั่วโลก" },
        priceMonthly: { type: String, default: "179.-" },
        priceMonthlyUnit: { type: String, default: "/เดือน*" },
        priceYearly: { type: String, default: "1,990.-" },
        priceYearlyUnit: { type: String, default: "/ปี*" },
    },
    { timestamps: true }
);

const HeroBanner = mongoose.models.HeroBanner || mongoose.model("HeroBanner", HeroBannerSchema);
export default HeroBanner;
