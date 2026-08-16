import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/admin-auth";
import { getErrorMessage } from "@/lib/buyback-api";
import { recordAdminLog } from "@/lib/admin-log";
import Branch from "@/models/Branch";

export async function GET() {
    try {
        await requireAdmin(["super_admin"]);
        const branches = await Branch.find({}).sort({ isActive: -1, name: 1 }).lean();
        return NextResponse.json({ branches });
    } catch (error) {
        const auth = authErrorResponse(error);
        return NextResponse.json({ error: auth?.message || getErrorMessage(error) }, { status: auth?.status || 500 });
    }
}

export async function POST(req: Request) {
    try {
        await requireAdmin(["super_admin"]);
        const body = await req.json();
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const location = typeof body.location === "string" ? body.location.trim() : "";
        if (!name || !location) return NextResponse.json({ error: "กรุณาระบุชื่อและที่ตั้งสาขา" }, { status: 400 });
        const branch = await Branch.create({ name, location, phone: String(body.phone || "").trim(), isActive: true });
        await recordAdminLog({ req, action: "create_branch", description: `เพิ่มสาขา ${name}`, targetId: branch._id.toString(), targetType: "Branch" });
        return NextResponse.json({ branch }, { status: 201 });
    } catch (error) {
        const auth = authErrorResponse(error);
        return NextResponse.json({ error: auth?.message || getErrorMessage(error) }, { status: auth?.status || 500 });
    }
}
