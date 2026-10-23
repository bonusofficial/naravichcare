import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import RepairJob from "@/models/RepairJob";

import { sendLineFlexMessage } from "@/lib/line-messaging";
import { recordAdminLog } from "@/lib/admin-log";
import { checkPermission } from "@/lib/check-permission";
import { assertClaimEligible, ClaimEligibilityError } from "@/lib/claim-eligibility";
import { AdminValidationError, parseAdminPatch } from "@/lib/repair/admin-validation";
import { computeRepairCosts } from "@/lib/repair/costs";
import { RepairWorkflowError, transitionRepairJob, type RepairActor } from "@/lib/repair/service";
import { canTransition, repairStatusLabel } from "@/lib/repair/status";

interface Context {
    params: Promise<{ id: string }>;
}

function workflowErrorResponse(error: unknown): NextResponse | null {
    if (error instanceof AdminValidationError) return NextResponse.json({ error: error.message, code: "VALIDATION_ERROR", fields: error.fields }, { status: 400 });
    if (error instanceof RepairWorkflowError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    if (error instanceof ClaimEligibilityError) return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    return null;
}

export async function GET(req: NextRequest, { params }: Context) {
    try {
        const { authorized, error } = await checkPermission(req, "view_repair_jobs");
        if (!authorized) return error;

        await dbConnect();
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Job not found" }, { status: 404 });
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

export async function PATCH(req: NextRequest, { params }: Context) {
    try {
        const { authorized, error, user } = await checkPermission(req, "edit_repair_jobs");
        if (!authorized) return error;

        await dbConnect();
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Job not found" }, { status: 404 });
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }
        const input = parseAdminPatch(body);

        const currentJob = await RepairJob.findById(id).select("-photosBefore -photosAfter").lean();
        if (!currentJob) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }
        // Photos are large inline images; only their counts are needed to log uploads.
        const [photoCounts] = await RepairJob.aggregate<{ photosBefore: number; photosAfter: number }>([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },
            { $project: { photosBefore: { $size: { $ifNull: ["$photosBefore", []] } }, photosAfter: { $size: { $ifNull: ["$photosAfter", []] } } } },
        ]);
        const previousPhotoCounts = photoCounts ?? { photosBefore: 0, photosAfter: 0 };
        if (currentJob.jobType === "claim") await assertClaimEligible({ imei: currentJob.imei });

        // The actor is whoever holds the verified session, never a name the client sends.
        const actor: RepairActor = { type: "admin", id: String(user._id), name: user.username };
        const logActor = { id: actor.id, name: actor.name };
        const jobTitle = `${currentJob.jobId} (${currentJob.brand} ${currentJob.deviceModel})`;
        const statusChanged = input.status !== undefined && input.status !== currentJob.status;
        if (statusChanged && !canTransition(currentJob.status, input.status!)) {
            return NextResponse.json({
                error: `ไม่สามารถเปลี่ยนสถานะจาก "${repairStatusLabel(currentJob.status)}" เป็น "${repairStatusLabel(input.status!)}" ได้`,
                code: "INVALID_STATUS_TRANSITION",
            }, { status: 409 });
        }

        // Totals are always derived on the server from the three cost inputs.
        const set: Record<string, unknown> = { ...input.set };
        const inc: Record<string, number> = {};
        let costsChanged = false;
        if (input.costs) {
            const next = {
                laborCost: input.costs.laborCost ?? currentJob.laborCost ?? 0,
                partsCost: input.costs.partsCost ?? currentJob.partsCost ?? 0,
                partsPurchaseCost: input.costs.partsPurchaseCost ?? currentJob.partsPurchaseCost ?? 0,
            };
            costsChanged = next.laborCost !== (currentJob.laborCost ?? 0)
                || next.partsCost !== (currentJob.partsCost ?? 0)
                || next.partsPurchaseCost !== (currentJob.partsPurchaseCost ?? 0);
            if (costsChanged) {
                Object.assign(set, next, {
                    totalPrice: computeRepairCosts(next).customerChargeTotal,
                    costsUpdatedAt: new Date(),
                });
                inc.costsVersion = 1;
            }
        }

        if (statusChanged) {
            await transitionRepairJob(currentJob, input.status!, actor, input.statusNote, { set, inc });
        } else if (Object.keys(set).length) {
            await RepairJob.updateOne({ _id: id }, { $set: set, ...(Object.keys(inc).length ? { $inc: inc } : {}) }, { runValidators: true });
        }

        const updatedJob = await RepairJob.findById(id).populate("customer").populate("assignedTechnician", "name username");

        // ADMIN ACTIVITY LOGGING
        // 1. Log Status Changes
        if (statusChanged) {
            try {
                await sendLineFlexMessage(currentJob, repairStatusLabel(input.status!), getStatusColor(input.status!));
            } catch (lineError) {
                console.error("LINE notify failed:", lineError instanceof Error ? lineError.message : lineError);
            }

            await recordAdminLog({
                req,
                actor: logActor,
                action: "update_job_status",
                description: `เปลี่ยนสถานะงาน ${jobTitle} เป็น "${repairStatusLabel(input.status!)}"`,
                targetId: id,
                targetType: "RepairJob",
                details: { oldStatus: currentJob.status, newStatus: input.status, note: input.statusNote }
            });
        }

        // 2. Log Price Updates
        if (costsChanged) {
            await recordAdminLog({
                req,
                actor: logActor,
                action: "update_job_price",
                description: `อัปเดตราคาเสนอซ่อมงาน ${jobTitle} เป็น ${updatedJob?.totalPrice} บาท`,
                targetId: id,
                targetType: "RepairJob",
                details: { labor: updatedJob?.laborCost, parts: updatedJob?.partsCost, partsPurchaseCost: updatedJob?.partsPurchaseCost, total: updatedJob?.totalPrice }
            });
        }

        // 3. Log Photo Uploads
        for (const [field, label, action] of [["photosBefore", "ก่อนซ่อม", "upload_photo_before"], ["photosAfter", "หลังซ่อม", "upload_photo_after"]] as const) {
            const photos = input.set[field] as string[] | undefined;
            if (photos && photos.length > previousPhotoCounts[field]) {
                await recordAdminLog({
                    req,
                    actor: logActor,
                    action,
                    description: `อัปโหลดรูปภาพ "${label}" เพิ่มเติมในงาน ${jobTitle}`,
                    targetId: id,
                    targetType: "RepairJob"
                });
            }
        }

        // 4. Log Warranty Updates
        if (input.set.warrantyExpireDate !== undefined || input.set.voidStickerCode !== undefined) {
            await recordAdminLog({
                req,
                actor: logActor,
                action: "update_warranty",
                description: `อัปเดตข้อมูลการรับประกันงาน ${jobTitle}`,
                targetId: id,
                targetType: "RepairJob",
                details: { expire: input.set.warrantyExpireDate, void: input.set.voidStickerCode }
            });
        }

        return NextResponse.json(updatedJob);
    } catch (error: unknown) {
        const handled = workflowErrorResponse(error);
        if (handled) return handled;
        console.error("Update Job Error:", error);
        return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: Context) {
    try {
        const { authorized, error, user } = await checkPermission(req, "delete_repair_jobs");
        if (!authorized) return error;

        await dbConnect();
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Job not found" }, { status: 404 });
        const job = await RepairJob.findById(id).select("jobId jobType imei source externalRef").lean();
        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
        // The POS tracks these jobs by id; deleting one would orphan its record there.
        if (job.source === "pos") {
            return NextResponse.json({
                error: "งานที่ส่งมาจาก Web POS ลบไม่ได้ ให้เปลี่ยนสถานะเป็น \"ยกเลิก\" แทน",
                code: "INTEGRATION_JOB_DELETE_FORBIDDEN",
            }, { status: 409 });
        }
        if (job.jobType === "claim") await assertClaimEligible({ imei: job.imei });
        await RepairJob.findByIdAndDelete(id);
        await recordAdminLog({
            req,
            actor: { id: String(user._id), name: user.username },
            action: "delete_repair_job",
            description: `ลบงานซ่อม ${job.jobId}`,
            targetId: id,
            targetType: "RepairJob",
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof ClaimEligibilityError) return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
        return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
    }
}
