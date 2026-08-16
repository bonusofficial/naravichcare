import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { readHeroBannerAsset } from "@/lib/hero-banner-storage";
import HeroBanner from "@/models/HeroBanner";

type StoredAsset = { relativePath?: string; mimeType?: string; sha256?: string; version?: string };

export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
    try {
        const { kind } = await params;
        if (!(["heroImage", "badge2Icon"] as const).includes(kind as "heroImage" | "badge2Icon")) {
            return NextResponse.json({ error: "Invalid hero banner asset" }, { status: 400 });
        }
        await dbConnect();
        const banner = await HeroBanner.findOne().select(kind).lean();
        const asset = banner?.[kind as "heroImage" | "badge2Icon"] as StoredAsset | undefined;
        if (!asset?.relativePath) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        const requestedVersion = new URL(req.url).searchParams.get("v");
        if (!requestedVersion || requestedVersion !== asset.version) {
            return NextResponse.json({ error: "Asset version not found" }, { status: 404 });
        }
        const content = await readHeroBannerAsset(asset.relativePath);
        const headers: Record<string, string> = {
            "Content-Type": asset.mimeType || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
        };
        if (asset.sha256) headers.ETag = `"${asset.sha256}"`;
        return new NextResponse(new Uint8Array(content), {
            headers,
        });
    } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return NextResponse.json({ error: "Asset file not found" }, { status: 404 });
        }
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load asset" }, { status: 500 });
    }
}
