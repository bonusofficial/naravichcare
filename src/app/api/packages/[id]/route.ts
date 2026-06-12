import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Package from "@/models/Package";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const body = await req.json();
        const updatedPackage = await Package.findByIdAndUpdate(id, body, { new: true });
        return NextResponse.json(updatedPackage);
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to update package", error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();
        const { id } = await params;
        await Package.findByIdAndDelete(id);
        return NextResponse.json({ message: "Package deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to delete package", error: error.message }, { status: 500 });
    }
}
