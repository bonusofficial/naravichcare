import mongoose, { Schema } from "mongoose";

const TermsItemSchema = new Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
});

const TermsPageSchema = new Schema(
    {
        items: [TermsItemSchema],
    },
    { timestamps: true }
);

const TermsPage = mongoose.models.TermsPage || mongoose.model("TermsPage", TermsPageSchema);
export default TermsPage;
