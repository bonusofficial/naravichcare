import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Claim from "@/models/Claim";
import { recordAdminLog } from "@/lib/admin-log";
import { checkPermission } from "@/lib/check-permission";

// GET all claims
export async function GET(req: NextRequest) {
    try {
        const { authorized, user, error } = await checkPermission(req, "view_claims");
        if (!authorized) return error;

        await dbConnect();
        const claims = await Claim.find({}).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: claims });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST create new claim
export async function POST(req: NextRequest) {
    try {
        const { authorized, user, error } = await checkPermission(req, "create_claims");
        if (!authorized) return error;

        await dbConnect();
        const body = await req.json();
        const claim = await Claim.create(body);

        await recordAdminLog({
            req,
            action: "create_claim",
            description: `สร้างคำขอเคลมใหม่ ID: ${claim._id}`,
            targetId: claim._id.toString(),
            targetType: "Claim"
        });

        return NextResponse.json({ success: true, data: claim }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
// PUT update existing claim (for drafts)
export async function PUT(req: NextRequest) {
    try {
        const { authorized, user, error } = await checkPermission(req, "edit_claims");
        if (!authorized) return error;

        await dbConnect();
        const body = await req.json();
        const { _id, ...updateData } = body;
        if (!_id) return NextResponse.json({ error: "Missing Claim ID" }, { status: 400 });

        const claim = await Claim.findByIdAndUpdate(_id, updateData, { new: true });

        await recordAdminLog({
            req,
            action: "update_claim",
            description: `อัปเดตคำขอเคลม ID: ${_id}`,
            targetId: _id,
            targetType: "Claim",
            details: updateData
        });

        return NextResponse.json({ success: true, data: claim });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
// DELETE a claim
export async function DELETE(req: NextRequest) {
    try {
        const { authorized, user, error } = await checkPermission(req, "delete_claims");
        if (!authorized) return error;

        await dbConnect();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Missing Claim ID" }, { status: 400 });

        const claim = await Claim.findById(id);
        await Claim.findByIdAndDelete(id);

        await recordAdminLog({
            req,
            action: "delete_claim",
            description: `ลบคำขอเคลม ID: ${id}`,
            targetId: id,
            targetType: "Claim"
        });

        return NextResponse.json({ success: true, message: "Claim deleted" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
