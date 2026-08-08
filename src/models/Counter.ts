import mongoose, { Schema } from "mongoose";

const CounterSchema = new Schema(
    {
        key: { type: String, required: true, unique: true },
        value: { type: Number, required: true, default: 0 },
    },
    { timestamps: true }
);

export default mongoose.models.Counter || mongoose.model("Counter", CounterSchema);
