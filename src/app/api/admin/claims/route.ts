import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Claim from "@/models/Claim";
import { assertClaimEligible, ClaimEligibilityError } from "@/lib/claim-eligibility";

// GET all claims
export async function GET() {
    try {
        await dbConnect();
        const claims = await Claim.find({}).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: claims });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST create new claim
export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        await assertClaimEligible({ registrationId: body.registrationId?.toString(), imei: body.imei });
        const claim = await Claim.create(body);
        return NextResponse.json({ success: true, data: claim }, { status: 201 });
    } catch (error: any) {
        if (error instanceof ClaimEligibilityError) return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
// PUT update existing claim (for drafts)
export async function PUT(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        const { _id, ...updateData } = body;
        if (!_id) return NextResponse.json({ error: "Missing Claim ID" }, { status: 400 });

        const existingClaim = await Claim.findById(_id).select("registrationId imei").lean();
        if (!existingClaim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
        await assertClaimEligible({ registrationId: existingClaim.registrationId?.toString(), imei: existingClaim.imei });

        const claim = await Claim.findByIdAndUpdate(_id, updateData, { new: true });
        return NextResponse.json({ success: true, data: claim });
    } catch (error: any) {
        if (error instanceof ClaimEligibilityError) return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
// DELETE a claim
export async function DELETE(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Missing Claim ID" }, { status: 400 });

        const existingClaim = await Claim.findById(id).select("registrationId imei").lean();
        if (!existingClaim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
        await assertClaimEligible({ registrationId: existingClaim.registrationId?.toString(), imei: existingClaim.imei });

        await Claim.findByIdAndDelete(id);
        return NextResponse.json({ success: true, message: "Claim deleted" });
    } catch (error: any) {
        if (error instanceof ClaimEligibilityError) return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
