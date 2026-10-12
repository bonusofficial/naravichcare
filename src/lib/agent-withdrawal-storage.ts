import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp, { type Metadata } from "sharp";
import { resolveBuybackStoragePath } from "@/lib/buyback-storage";

// Transfer slips share the private storage root configured for buybacks
// (BUYBACK_STORAGE_DIR), so production needs no extra directory. They live in
// their own folder because cleanup-buyback-images sweeps orphans in images/.
const SLIP_FOLDER = "agent-withdrawals";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;

export class SlipValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SlipValidationError";
    }
}

export async function saveWithdrawalSlip(file: File, withdrawalId: string): Promise<{ relativePath: string; mimeType: string }> {
    if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) throw new SlipValidationError("ไฟล์สลิปต้องมีขนาดไม่เกิน 10 MB");
    const image = sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS });
    let metadata: Metadata;
    try {
        metadata = await image.metadata();
    } catch {
        throw new SlipValidationError("ไฟล์ที่อัปโหลดไม่ใช่รูปภาพที่ถูกต้อง");
    }
    if (!metadata.format || !["jpeg", "png", "webp", "heif", "avif"].includes(metadata.format)) {
        throw new SlipValidationError("รองรับเฉพาะไฟล์รูป JPEG, PNG, WebP, HEIC หรือ AVIF");
    }

    let normalized: Buffer;
    try {
        normalized = await image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    } catch {
        throw new SlipValidationError("ไม่สามารถประมวลผลไฟล์สลิปได้");
    }

    const relativePath = path.posix.join(SLIP_FOLDER, withdrawalId, `slip-${randomUUID()}.webp`);
    const destination = resolveBuybackStoragePath(relativePath);
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o750 });
    await writeFile(destination, normalized, { mode: 0o640, flag: "wx" });
    return { relativePath, mimeType: "image/webp" };
}
