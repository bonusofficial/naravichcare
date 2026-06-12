import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Agent from "@/models/Agent";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await context.params;
        const body = await req.json();

        // Update the agent
        const updatedAgent = await Agent.findByIdAndUpdate(id, body, { new: true });

        if (!updatedAgent) {
            return NextResponse.json({ error: "ไม่พบข้อมูลตัวแทน" }, { status: 404 });
        }

        return NextResponse.json({ success: true, agent: updatedAgent });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await context.params;

        const deletedAgent = await Agent.findByIdAndDelete(id);

        if (!deletedAgent) {
            return NextResponse.json({ error: "ไม่พบข้อมูลตัวแทน" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "ลบตัวแทนสำเร็จ" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
