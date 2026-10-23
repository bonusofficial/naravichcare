import { NextRequest, NextResponse } from "next/server";
import { keyAdminErrorResponse, noStore, readJson, requireKeyManager, rotateKey } from "@/lib/integration/key-admin";

export const dynamic = "force-dynamic";

/** Issue a new secret for the key; the previous secret stops working immediately. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const actor = await requireKeyManager(req);
        const { id } = await params;
        const result = await rotateKey(id, await readJson(req, { optional: true }), actor, req);
        return noStore(NextResponse.json(result));
    } catch (error) {
        return keyAdminErrorResponse(error);
    }
}
