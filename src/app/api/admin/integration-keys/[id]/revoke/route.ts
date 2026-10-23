import { NextRequest, NextResponse } from "next/server";
import { keyAdminErrorResponse, noStore, readJson, requireKeyManager, revokeKey } from "@/lib/integration/key-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const actor = await requireKeyManager(req);
        const { id } = await params;
        const result = await revokeKey(id, await readJson(req), actor, req);
        return noStore(NextResponse.json(result));
    } catch (error) {
        return keyAdminErrorResponse(error);
    }
}
