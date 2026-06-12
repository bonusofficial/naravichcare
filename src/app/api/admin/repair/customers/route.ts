import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import RepairCustomer from "@/models/RepairCustomer";
import { recordAdminLog } from "@/lib/admin-log";

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q");
        const phone = searchParams.get("phone");

        let filter: any = {};
        if (phone) {
            filter.phone = phone;
        } else if (query) {
            filter = {
                $or: [
                    { firstName: { $regex: query, $options: "i" } },
                    { lastName: { $regex: query, $options: "i" } },
                    { phone: { $regex: query, $options: "i" } },
                ],
            };
        }

        const customers = await RepairCustomer.find(filter).sort({ createdAt: -1 }).limit(50);
        return NextResponse.json(customers);
    } catch (error) {
        console.error("Fetch Customers Error:", error);
        return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await dbConnect();
        const data = await req.json();
        
        // Basic validation
        if (!data.firstName || !data.lastName || !data.phone) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const customer = await RepairCustomer.create(data);

        // LOGGING
        await recordAdminLog({
            req,
            action: "create_customer",
            description: `ลงทะเบียนลูกค้าใหม่ชื่อ "${customer.firstName} ${customer.lastName}" (${customer.phone})`,
            targetId: customer._id.toString(),
            targetType: "RepairCustomer"
        });

        return NextResponse.json(customer, { status: 201 });
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "Customer already exists" }, { status: 400 });
        }
        console.error("Create Customer Error:", error);
        return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        await dbConnect();
        const data = await req.json();
        const { id, ...updateData } = data;

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const currentCustomer = await RepairCustomer.findById(id);
        if (!currentCustomer) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const updated = await RepairCustomer.findByIdAndUpdate(id, updateData, { new: true });

        // LOGGING
        await recordAdminLog({
            req,
            action: "update_customer",
            description: `แก้ไขข้อมูลลูกค้า "${currentCustomer.firstName} ${currentCustomer.lastName}" (${currentCustomer.phone})`,
            targetId: id,
            targetType: "RepairCustomer",
            details: { before: currentCustomer, after: updated }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
