import mongoose, { Schema } from "mongoose";

const LegalPageSchema = new Schema(
    {
        slug: { type: String, required: true, unique: true }, // 'privacy' | 'terms'
        title: { type: String, required: true },
        content: { type: String, default: "" },
    },
    { timestamps: true }
);

const LegalPage = mongoose.models.LegalPage || mongoose.model("LegalPage", LegalPageSchema);
export default LegalPage;
