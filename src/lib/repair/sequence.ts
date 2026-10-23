import type { Model } from "mongoose";
import Counter from "@/models/Counter";

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Atomically allocate the next number for a document code such as
 * "JOB2610-0001".
 *
 * Numbers used to come from countDocuments()+1, which hands the same number
 * to two concurrent requests. A Counter document with $inc cannot. The first
 * time a counter key is used it is seeded with the highest number already in
 * the collection ($max never lowers it, so concurrent seeding is harmless).
 */
export async function nextSequenceNumber(options: {
    counterKey: string;
    model: Model<unknown>;
    field: string;
    prefix: string;
}): Promise<number> {
    const { counterKey, model, field, prefix } = options;
    const exists = await Counter.exists({ key: counterKey });
    if (!exists) {
        const pattern = new RegExp(`^${escapeRegex(prefix)}(\\d+)$`);
        const rows = await model
            .find({ [field]: { $regex: `^${escapeRegex(prefix)}\\d+$` } })
            .select({ [field]: 1, _id: 0 })
            .lean<Record<string, string>[]>();
        const highest = rows.reduce((max, row) => {
            const match = pattern.exec(String(row[field] ?? ""));
            return match ? Math.max(max, Number(match[1])) : max;
        }, 0);
        await Counter.updateOne({ key: counterKey }, { $max: { value: highest } }, { upsert: true });
    }
    const counter = await Counter.findOneAndUpdate(
        { key: counterKey },
        { $inc: { value: 1 } },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );
    return counter.value as number;
}

export function repairJobPrefix(date = new Date()): string {
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `JOB${yy}${mm}-`;
}
