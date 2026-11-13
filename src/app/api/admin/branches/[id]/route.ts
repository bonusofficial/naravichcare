import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/admin-auth";
import { getErrorMessage } from "@/lib/buyback-api";
import { recordAdminLog } from "@/lib/admin-log";
import { parsePosBranchIds } from "@/lib/branches";
import { isDuplicateKeyError } from "@/lib/errors";
import AdminUser from "@/models/AdminUser";
import Branch from "@/models/Branch";
import RepairJob from "@/models/RepairJob";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin(["super_admin"]);
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        const body = await req.json();
        const update: Record<string, unknown> = {};
        if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
        if (typeof body.location === "string" && body.location.trim()) update.location = body.location.trim();
        if (typeof body.phone === "string") update.phone = body.phone.trim();
        if (typeof body.isActive === "boolean") update.isActive = body.isActive;
        const posBranchIds = parsePosBranchIds(body.posBranchIds);
        if (posBranchIds && !Array.isArray(posBranchIds)) return NextResponse.json({ error: posBranchIds.error }, { status: 400 });
        if (posBranchIds) update.posBranchIds = posBranchIds;
        const branch = await Branch.findByIdAndUpdate(id, { $set: update }, { returnDocument: "after", runValidators: true });
        if (!branch) return NextResponse.json({ error: "ไม่พบสาขา" }, { status: 404 });
        await recordAdminLog({ req, action: "update_branch", description: `แก้ไขสาขา ${branch.name}`, targetId: id, targetType: "Branch", details: update });
        return NextResponse.json({ branch });
    } catch (error) {
        if (isDuplicateKeyError(error)) return NextResponse.json({ error: "รหัสสาขาใน POS นี้ผูกกับสาขาอื่นแล้ว" }, { status: 409 });
        const auth = authErrorResponse(error);
        return NextResponse.json({ error: auth?.message || getErrorMessage(error) }, { status: auth?.status || 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdmin(["super_admin"]);
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        if (await AdminUser.exists({ $or: [{ branchId: id }, { branchIds: id }] })) return NextResponse.json({ error: "ยังมีบัญชีผู้ใช้ผูกกับสาขานี้ กรุณาปิดใช้งานสาขาแทน" }, { status: 409 });
        if (await RepairJob.exists({ branchId: id })) return NextResponse.json({ error: "สาขานี้มีงานซ่อมอยู่ กรุณาปิดใช้งานสาขาแทน" }, { status: 409 });
        const branch = await Branch.findByIdAndDelete(id);
        if (!branch) return NextResponse.json({ error: "ไม่พบสาขา" }, { status: 404 });
        await recordAdminLog({ req, action: "delete_branch", description: `ลบสาขา ${branch.name}`, targetId: id, targetType: "Branch" });
        return NextResponse.json({ success: true });
    } catch (error) {
        const auth = authErrorResponse(error);
        return NextResponse.json({ error: auth?.message || getErrorMessage(error) }, { status: auth?.status || 500 });
    }
}
