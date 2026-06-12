import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import RepairJob from "@/models/RepairJob";

import { sendLineFlexMessage } from "@/lib/line-messaging";
import { recordAdminLog } from "@/lib/admin-log";

interface Context {
    params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: Context) {
    try {
        await dbConnect();
        const { id } = await params;
        const job = await RepairJob.findById(id).populate("customer").populate("assignedTechnician", "name username");

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        return NextResponse.json(job);
    } catch (error) {
        console.error("Fetch Job Error:", error);
        return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: Context) {
    try {
        await dbConnect();
        const { id } = await params;
        const data = await req.json();

        const currentJob = await RepairJob.findById(id).populate("customer");
        if (!currentJob) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        const getStatusLabel = (status: string) => {
            switch (status) {
                case "pending": return "รอตรวจเช็ก";
                case "checking": return "กำลังเช็กอาการ";
                case "quoted": return "เสนอราคาแล้ว";
                case "waiting_approval": return "รออนุมัติ";
                case "in_progress": return "กำลังซ่อม";
                case "waiting_parts": return "รออะไหล่";
                case "testing": return "ตรวจสอบงานซ่อม";
                case "ready_pickup": return "ซ่อมเสร็จ/รอรับคืน";
                case "completed": return "รับเครื่องคืนแล้ว";
                case "cancelled": return "ยกเลิก";
                default: return status;
            }
        };

        const getStatusColor = (status: string) => {
            switch (status) {
                case "completed": return "#10B981"; // emerald
                case "ready_pickup": return "#3B82F6"; // blue
                case "cancelled": return "#EF4444"; // red
                case "checking":
                case "quoted":
                case "waiting_approval": return "#F59E0B"; // amber
                default: return "#0F172A"; // slate-900
            }
        };

        // ADMIN ACTIVITY LOGGING
        const jobTitle = `${currentJob.jobId} (${currentJob.brand} ${currentJob.deviceModel})`;

        // 1. Log Status Changes
        if (data.status && data.status !== currentJob.status) {
            const historyItem = {
                status: data.status,
                changedBy: data.adminUsername || "admin",
                changedAt: new Date(),
                note: data.statusNote || "",
            };
            
            if (!currentJob.statusHistory) currentJob.statusHistory = [];
            currentJob.statusHistory.push(historyItem);
            
            if (data.status === "completed") {
                data.completedAt = new Date();
            }

            // LINE NOTIFICATION
            const adminUserId = process.env.LINE_ADMIN_USER_ID;
            if (adminUserId) {
                await sendLineFlexMessage(
                    adminUserId, 
                    currentJob, 
                    getStatusLabel(data.status), 
                    getStatusColor(data.status)
                );
            }

            // ACTIVITY LOG
            await recordAdminLog({
                req,
                action: "update_job_status",
                description: `เปลี่ยนสถานะงาน ${jobTitle} เป็น "${getStatusLabel(data.status)}"`,
                targetId: id,
                targetType: "RepairJob",
                details: { oldStatus: currentJob.status, newStatus: data.status, note: data.statusNote }
            });
        }

        // 2. Log Price Updates
        if (typeof data.totalPrice !== "undefined" && data.totalPrice !== currentJob.totalPrice) {
            await recordAdminLog({
                req,
                action: "update_job_price",
                description: `อัปเดตราคาเสนอซ่อมงาน ${jobTitle} เป็น ${data.totalPrice} บาท`,
                targetId: id,
                targetType: "RepairJob",
                details: { labor: data.laborCost, parts: data.partsCost, total: data.totalPrice }
            });
        }

        // 3. Log Photo Uploads
        if (data.photosBefore && data.photosBefore.length > (currentJob.photosBefore?.length || 0)) {
            await recordAdminLog({
                req,
                action: "upload_photo_before",
                description: `อัปโหลดรูปภาพ "ก่อนซ่อม" เพิ่มเติมในงาน ${jobTitle}`,
                targetId: id,
                targetType: "RepairJob"
            });
        }
        if (data.photosAfter && data.photosAfter.length > (currentJob.photosAfter?.length || 0)) {
            await recordAdminLog({
                req,
                action: "upload_photo_after",
                description: `อัปโหลดรูปภาพ "หลังซ่อม" เพิ่มเติมในงาน ${jobTitle}`,
                targetId: id,
                targetType: "RepairJob"
            });
        }

        // 4. Log Warranty Updates
        if (data.warrantyExpireDate && data.warrantyExpireDate !== currentJob.warrantyExpireDate) {
            await recordAdminLog({
                req,
                action: "update_warranty",
                description: `อัปเดตข้อมูลการรับประกันงาน ${jobTitle}`,
                targetId: id,
                targetType: "RepairJob",
                details: { expire: data.warrantyExpireDate, void: data.voidStickerCode }
            });
        }

        const updatedJob = await RepairJob.findByIdAndUpdate(id, data, { new: true })
            .populate("customer");

        return NextResponse.json(updatedJob);
    } catch (error: any) {
        console.error("Update Job Error:", error);
        return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: Context) {
    try {
        await dbConnect();
        const { id } = await params;
        await RepairJob.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
    }
}
