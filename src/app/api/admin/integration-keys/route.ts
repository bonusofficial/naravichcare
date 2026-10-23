import { NextRequest, NextResponse } from "next/server";
import { createKey, keyAdminErrorResponse, listKeys, noStore, readJson, requireKeyManager } from "@/lib/integration/key-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        await requireKeyManager(req);
        return noStore(NextResponse.json({ keys: await listKeys() }));
    } catch (error) {
        return keyAdminErrorResponse(error);
    }
}

/** Create a key. The plaintext key is in this response only and is never retrievable again. */
export async function POST(req: NextRequest) {
    try {
        const actor = await requireKeyManager(req);
        const result = await createKey(await readJson(req), actor, req);
        return noStore(NextResponse.json(result, { status: 201 }));
    } catch (error) {
        return keyAdminErrorResponse(error);
    }
}
