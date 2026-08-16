import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/admin-auth";
import { BUYBACK_ROLES, getErrorMessage } from "@/lib/buyback-api";
import { readBuybackFile } from "@/lib/buyback-storage";
import Buyback from "@/models/Buyback";

type StoredFileView = { relativePath?: string; mimeType?: string; deletedAt?: string | Date };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
    try {
        await requireAdmin(BUYBACK_ROLES);
        const { id, kind } = await params;
        if (!mongoose.isValidObjectId(id) || !["customerSignature", "employeeSignature", "paymentProof"].includes(kind)) {
            return NextResponse.json({ error: "Invalid file request" }, { status: 400 });
        }
        const buyback = await Buyback.findById(id).select("files").lean();
        if (!buyback) return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
        const files = buyback.files as unknown as Record<string, StoredFileView | undefined>;
        const file = files[kind];
        if (!file?.relativePath) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 404 });
        if (file.deletedAt) return NextResponse.json({ error: "ไฟล์ถูกลบตามนโยบายแล้ว" }, { status: 410 });
        const content = await readBuybackFile(file.relativePath);
        return new NextResponse(new Uint8Array(content), {
            headers: {
                "Content-Type": file.mimeType || "application/octet-stream",
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        const auth = authErrorResponse(error);
        return NextResponse.json({ error: auth?.message || getErrorMessage(error) }, { status: auth?.status || 500 });
    }
}
