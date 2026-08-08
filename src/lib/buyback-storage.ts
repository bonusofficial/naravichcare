import { createHash, randomUUID } from "crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import sharp, { type Metadata } from "sharp";

export type SignatureSourceMode = "draw" | "upload";
export type BuybackImageKind = "customer-signature" | "employee-signature" | "payment-proof";

export interface StoredBuybackFile {
    relativePath: string;
    mimeType: string;
    bytes: number;
    sha256: string;
    sourceMode: SignatureSourceMode;
}

export class BuybackFileValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "BuybackFileValidationError";
    }
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;

export function getBuybackStorageRoot(): string {
    return path.resolve(process.env.BUYBACK_STORAGE_DIR || path.join(process.cwd(), ".data", "buybacks"));
}

export function resolveBuybackStoragePath(relativePath: string): string {
    if (!relativePath || path.isAbsolute(relativePath)) throw new Error("Invalid storage path");
    const root = getBuybackStorageRoot();
    const resolved = path.resolve(root, relativePath);
    if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("Storage path escapes configured root");
    return resolved;
}

async function ensureParent(relativePath: string) {
    await mkdir(path.dirname(resolveBuybackStoragePath(relativePath)), { recursive: true, mode: 0o750 });
}

export async function saveBuybackImage(
    file: File,
    buybackId: string,
    kind: BuybackImageKind,
    sourceMode: SignatureSourceMode
): Promise<StoredBuybackFile> {
    if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) throw new BuybackFileValidationError("ไฟล์รูปต้องมีขนาดไม่เกิน 10 MB");
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS });
    let metadata: Metadata;
    try {
        metadata = await image.metadata();
    } catch {
        throw new BuybackFileValidationError("ไฟล์ที่อัปโหลดไม่ใช่รูปภาพที่ถูกต้อง");
    }
    if (!metadata.format || !["jpeg", "png", "webp", "heif", "avif"].includes(metadata.format)) {
        throw new BuybackFileValidationError("รองรับเฉพาะไฟล์รูป JPEG, PNG, WebP, HEIC หรือ AVIF");
    }

    const isSignature = kind.endsWith("signature");
    const relativePath = path.posix.join(
        "images",
        buybackId,
        `${kind}-${randomUUID()}.${isSignature ? "png" : "webp"}`
    );
    let normalized: Buffer;
    try {
        normalized = isSignature
            ? await image.rotate().resize({ width: 1200, height: 600, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer()
            : await image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    } catch {
        throw new BuybackFileValidationError("ไม่สามารถประมวลผลไฟล์รูปที่อัปโหลดได้");
    }

    await ensureParent(relativePath);
    await writeFile(resolveBuybackStoragePath(relativePath), normalized, { mode: 0o640, flag: "wx" });
    return {
        relativePath,
        mimeType: isSignature ? "image/png" : "image/webp",
        bytes: normalized.byteLength,
        sha256: createHash("sha256").update(normalized).digest("hex"),
        sourceMode,
    };
}

export async function writeBuybackReceipt(buybackId: string, documentNumber: string, pdf: Uint8Array): Promise<string> {
    const safeDocumentNumber = documentNumber.replace(/[^A-Za-z0-9-]/g, "_");
    const relativePath = path.posix.join("receipts", buybackId, `${safeDocumentNumber}.pdf`);
    await ensureParent(relativePath);
    await writeFile(resolveBuybackStoragePath(relativePath), pdf, { mode: 0o640 });
    return relativePath;
}

export async function readBuybackFile(relativePath: string): Promise<Buffer> {
    return readFile(resolveBuybackStoragePath(relativePath));
}

export async function deleteBuybackFile(relativePath?: string | null): Promise<boolean> {
    if (!relativePath) return false;
    try {
        await unlink(resolveBuybackStoragePath(relativePath));
        return true;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
        throw error;
    }
}

export async function storedFileExists(relativePath?: string | null): Promise<boolean> {
    if (!relativePath) return false;
    try {
        await stat(resolveBuybackStoragePath(relativePath));
        return true;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
        throw error;
    }
}
