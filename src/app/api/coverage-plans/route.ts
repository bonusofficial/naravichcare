import { NextResponse } from "next/server"; // Re-sync schema
import dbConnect from "@/lib/mongodb";
import CoveragePlan from "@/models/CoveragePlan";

export async function GET() {
    try {
        await dbConnect();
        const plans = await CoveragePlan.find({}).sort({ order: 1 });
        return NextResponse.json(plans);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        const plan = await CoveragePlan.create(body);
        return NextResponse.json(plan, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
