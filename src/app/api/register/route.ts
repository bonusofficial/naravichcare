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
    } catch (error) {
        // A Mongoose ValidationError also carries the per-field errors.
        const err = error as Error & { errors?: Record<string, { message: string }> };
        console.error("CRITICAL REGISTRATION ERROR:", {
            name: err.name,
            message: err.message,
            stack: err.stack,
            errors: err.errors // for Mongoose ValidationError
        });

        // Oversized payloads surface as a RangeError from Node's buffer handling
        // ("The value of \"offset\" is out of range"), which is meaningless to a
        // customer; tell them what to actually do instead.
        if (error instanceof RangeError || /offset|out of range/i.test(err.message || "")) {
            return NextResponse.json(
                { message: "ไฟล์รูปมีขนาดใหญ่เกินไป กรุณาถ่ายใหม่หรือเลือกรูปที่เล็กลง" },
                { status: 413 }
            );
        }

        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors || {}).map((fieldError) => fieldError.message);
            return NextResponse.json(
                { message: "ข้อมูลไม่ครบถ้วน: " + messages.join(", "), error: err.message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + err.message, error: err.message },
            { status: 500 }
        );
    }
}
