import mongoose, { Schema } from "mongoose";

const AssetSchema = new Schema(
    {
        relativePath: { type: String, required: true },
        mimeType: { type: String, enum: ["image/webp", "image/png"], required: true },
        bytes: { type: Number, required: true },
        sha256: { type: String, required: true },
        version: { type: String, required: true },
    },
    { _id: false }
);

const HeroBannerSchema = new Schema(
    {
        badge1Label: { type: String, default: "NARAVICH" },
        badge1Title: { type: String, default: "Mobile Care" },
        badge1Subtitle: { type: String, default: "บริการดูแลมือถือครบวงจร" },
        badge2Eyebrow: { type: String, default: "มั่นใจด้วยมาตรฐาน" },
        badge2Title: { type: String, default: "ระดับโลก" },
        badge2IconAlt: { type: String, default: "Apple Care" },
        heading1: { type: String, default: "มั่นใจด้วยมาตรฐาน" },
        heading2: { type: String, default: "ระดับโลก" },
        pillText: { type: String, default: "คุ้มครองอุบัติเหตุไม่จำกัดครั้ง คุ้มครองทั้งภายในและภายนอก" },
        subText: { type: String, default: "รับบริการที่ Apple Store และ Apple Service Provider ทั่วโลก" },
        priceMonthly: { type: String, default: "179.-" },
        priceMonthlyUnit: { type: String, default: "/เดือน*" },
        priceYearly: { type: String, default: "1,990.-" },
        priceYearlyUnit: { type: String, default: "/ปี*" },
        heroImageAlt: { type: String, default: "โทรศัพท์มือถือที่ได้รับความคุ้มครองจาก NaravichCare" },
        heroImagePosition: { type: String, enum: ["center", "top", "bottom", "left", "right"], default: "center" },
        heroImage: { type: AssetSchema, required: false },
        badge2Icon: { type: AssetSchema, required: false },
    },
    { timestamps: true }
);

const HeroBanner = mongoose.models.HeroBanner || mongoose.model("HeroBanner", HeroBannerSchema);
export default HeroBanner;
