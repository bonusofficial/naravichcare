import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Registration from "@/models/Registration";

export async function POST(req: Request) {
    try {
        console.log("Connecting to DB...");
        await connectToDatabase();
        console.log("DB Connected.");

        const body = await req.json();
        console.log("Registration API received body:", JSON.stringify(body).substring(0, 1000));

        console.log("Attempting to create registration...");
        const registration = await Registration.create(body);
        console.log("Registration created successfully:", registration._id);

        return NextResponse.json(
            { message: "Registration created successfully", data: registration },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("CRITICAL REGISTRATION ERROR:", {
            name: error.name,
            message: error.message,
            stack: error.stack,
            errors: error.errors // for Mongoose ValidationError
        });

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors || {}).map((err: any) => err.message);
            return NextResponse.json(
                { message: "ข้อมูลไม่ครบถ้วน: " + messages.join(", "), error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error.message, error: error.message },
            { status: 500 }
        );
    }
}
