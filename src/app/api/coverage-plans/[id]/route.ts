import { NextResponse } from "next/server"; // Re-sync schema 2
import dbConnect from "@/lib/mongodb";
import CoveragePlan from "@/models/CoveragePlan";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        // 1. Try standard Mongoose findById
        let plan = await CoveragePlan.findById(id);

        // 2. Fallback: If not found but looks like a valid 24-char Hex ID, try direct MongoDB lookup
        if (!plan && /^[0-9a-fA-F]{24}$/.test(id)) {
            const { ObjectId } = require("mongodb");
            const rawPlan = await CoveragePlan.collection.findOne({ _id: new ObjectId(id) });
            if (rawPlan) plan = rawPlan;
        }

        if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        return NextResponse.json(plan);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await req.json();
        const plan = await CoveragePlan.findByIdAndUpdate(id, body, { new: true, runValidators: true });
        return NextResponse.json(plan);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        await CoveragePlan.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
