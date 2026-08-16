import mongoose from "mongoose";
import dotenv from "dotenv";
import { readdir, stat } from "fs/promises";
import path from "path";
import Buyback from "./src/models/Buyback";
import AdminLog from "./src/models/AdminLog";
import {
    deleteBuybackFile,
    getBuybackStorageRoot,
    resolveBuybackStoragePath,
} from "./src/lib/buyback-storage";

dotenv.config({ path: ".env.local" });
dotenv.config();

type StoredFile = { relativePath?: string; deletedAt?: Date };
type FileMap = Record<"customerSignature" | "employeeSignature" | "paymentProof", StoredFile | undefined>;

async function walkFiles(directory: string): Promise<string[]> {
    try {
        const entries = await readdir(directory, { withFileTypes: true });
        const nested = await Promise.all(entries.map(async (entry) => {
            const fullPath = path.join(directory, entry.name);
            return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
        }));
        return nested.flat();
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw error;
    }
}

async function run() {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
    await mongoose.connect(process.env.MONGODB_URI);
    const now = new Date();
    const expired = await Buyback.find({
        status: { $in: ["approved", "rejected"] },
        imageDeleteAt: { $lte: now },
        imagesDeletedAt: { $exists: false },
    });
    let deletedTransactionFiles = 0;

    for (const buyback of expired) {
        const files = buyback.files as unknown as FileMap;
        const update: Record<string, Date> = {};
        for (const key of ["customerSignature", "employeeSignature", "paymentProof"] as const) {
            const file = files[key];
            if (!file?.relativePath || file.deletedAt) continue;
            await deleteBuybackFile(file.relativePath);
            update[`files.${key}.deletedAt`] = now;
            deletedTransactionFiles += 1;
        }
        update.imagesDeletedAt = now;
        await Buyback.updateOne({ _id: buyback._id }, { $set: update });
        await AdminLog.create({
            adminName: "System",
            action: "delete_buyback_images",
            description: `ลบรูปซื้อคืนตามอายุ 35 วัน (${buyback._id})`,
            targetId: buyback._id.toString(),
            targetType: "Buyback",
            details: { imageDeleteAt: buyback.imageDeleteAt, deletedAt: now },
        });
    }

    const allBuybacks = await Buyback.find({}).select("files").lean();
    const referenced = new Set<string>();
    for (const buyback of allBuybacks) {
        const files = buyback.files as unknown as FileMap;
        for (const key of ["customerSignature", "employeeSignature", "paymentProof"] as const) {
            if (files[key]?.relativePath) referenced.add(files[key]!.relativePath!);
        }
    }
    const imageRoot = resolveBuybackStoragePath("images");
    const diskFiles = await walkFiles(imageRoot);
    const orphanCutoff = now.getTime() - 24 * 60 * 60 * 1000;
    let deletedOrphans = 0;
    for (const absolutePath of diskFiles) {
        const relativePath = path.relative(getBuybackStorageRoot(), absolutePath).split(path.sep).join("/");
        if (referenced.has(relativePath)) continue;
        const fileStat = await stat(absolutePath);
        if (fileStat.mtimeMs > orphanCutoff) continue;
        await deleteBuybackFile(relativePath);
        deletedOrphans += 1;
    }

    console.log(JSON.stringify({ scannedTransactions: expired.length, deletedTransactionFiles, deletedOrphans }));
}

run()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
