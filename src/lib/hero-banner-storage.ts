import { createHash, randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import sharp, { type Metadata, type Sharp } from "sharp";

export type HeroBannerAssetKind = "heroImage" | "badge2Icon";

export interface StoredHeroBannerAsset {
    relativePath: string;
    mimeType: "image/webp" | "image/png";
    bytes: number;
    sha256: string;
    version: string;
}

export class HeroBannerImageValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "HeroBannerImageValidationError";
    }
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;

export function getHeroBannerStorageRoot(): string {
    return path.resolve(process.env.HERO_BANNER_STORAGE_DIR || path.join(process.cwd(), ".data", "hero-banner"));
}

export function resolveHeroBannerStoragePath(relativePath: string): string {
    if (!relativePath || path.isAbsolute(relativePath)) throw new Error("Invalid hero banner storage path");
    const root = getHeroBannerStorageRoot();
    const resolved = path.resolve(root, relativePath);
    if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("Hero banner path escapes configured root");
    return resolved;
}

async function decodeMetadata(input: Buffer): Promise<{ image: Sharp; metadata: Metadata }> {
    const image = sharp(input, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS });
    try {
        return { image, metadata: await image.metadata() };
    } catch {
        throw new HeroBannerImageValidationError("ไฟล์ที่อัปโหลดไม่ใช่รูปภาพที่ถูกต้อง");
    }
}

export async function saveHeroBannerAsset(file: File, kind: HeroBannerAssetKind): Promise<StoredHeroBannerAsset> {
    if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) {
        throw new HeroBannerImageValidationError("ไฟล์รูปต้องมีขนาดไม่เกิน 10 MB");
    }
    const input = Buffer.from(await file.arrayBuffer());
    const { image, metadata } = await decodeMetadata(input);
    if (!metadata.format || !["jpeg", "png", "webp", "heif", "avif"].includes(metadata.format)) {
        throw new HeroBannerImageValidationError("รองรับเฉพาะไฟล์ JPEG, PNG, WebP, HEIC หรือ AVIF");
    }

    let normalized: Buffer;
    try {
        normalized = kind === "heroImage"
            ? await image.rotate().resize({ width: 2400, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer()
            : await image.rotate().resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
    } catch {
        throw new HeroBannerImageValidationError("ไม่สามารถประมวลผลไฟล์รูปที่อัปโหลดได้");
    }

    const version = randomUUID();
    const extension = kind === "heroImage" ? "webp" : "png";
    const relativePath = path.posix.join("images", `${kind}-${version}.${extension}`);
    const destination = resolveHeroBannerStoragePath(relativePath);
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o750 });
    await writeFile(destination, normalized, { mode: 0o640, flag: "wx" });
    return {
        relativePath,
        mimeType: kind === "heroImage" ? "image/webp" : "image/png",
        bytes: normalized.byteLength,
        sha256: createHash("sha256").update(normalized).digest("hex"),
        version,
    };
}

export function readHeroBannerAsset(relativePath: string): Promise<Buffer> {
    return readFile(resolveHeroBannerStoragePath(relativePath));
}

export async function deleteHeroBannerAsset(relativePath?: string | null): Promise<boolean> {
    if (!relativePath) return false;
    try {
        await unlink(resolveHeroBannerStoragePath(relativePath));
        return true;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
        throw error;
    }
}
