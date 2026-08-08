import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/admin-auth";
import { getErrorMessage } from "@/lib/buyback-api";

export async function GET() {
    try {
        const admin = await requireAdmin();
        return NextResponse.json({ user: admin });
    } catch (error) {
        const auth = authErrorResponse(error);
        return NextResponse.json({ error: auth?.message || getErrorMessage(error) }, { status: auth?.status || 500 });
    }
}
