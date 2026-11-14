import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import RepairJob from "@/models/RepairJob";

import { sendLineFlexMessage } from "@/lib/line-messaging";
import { recordAdminLog } from "@/lib/admin-log";
import { assertClaimEligible, ClaimEligibilityError } from "@/lib/claim-eligibility";
import { parseAdminPatch } from "@/lib/repair/admin-validation";
import { adminRepairErrorResponse } from "@/lib/repair/admin-route";
import { ADMIN_JOB_POPULATE, jobNotFound, requireRepairAccess, scopedJobFilter } from "@/lib/repair/branch-scope";
import { computeRepairCosts } from "@/lib/repair/costs";
import { transitionRepairJob } from "@/lib/repair/service";
import { REPAIR_OUTCOME } from "@/lib/repair/options";
import { statusLabelForOutcome } from "@/lib/repair/workflow";
import { assertActiveTechnician } from "@/lib/repair/technicians";

interface Context {
    params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Context) {
    try {
        const access = await requireRepairAccess(req, "view_repair_jobs");
        if (!access.ok) return access.error;

        await dbConnect();
        const { id } = await params;
        const filter = scopedJobFilter(access.scope, id);
        if (!filter) return jobNotFound();
        const job = await RepairJob.findOne(filter).populate(ADMIN_JOB_POPULATE);
        if (!job) return jobNotFound();

        return NextResponse.json(job);
    } catch (error) {
        console.error("Fetch Job Error:", error);
        return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
    }
}

/** Fields whose changes are logged as "update_job_details". */
const DETAIL_FIELDS = [
    "deviceType", "brand", "deviceModel", "serialNumber", "imei", "color", "deviceCondition", "accessories",
    "reportedSymptom", "diagnosticResult", "internalNotes", "assignedTechnician",
] as const;

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
        const access = await requireRepairAccess(req, "edit_repair_jobs");
        if (!access.ok) return access.error;
        const { actor } = access;

        await dbConnect();
        const { id } = await params;
        const filter = scopedJobFilter(access.scope, id);
        if (!filter) return jobNotFound();
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }
        const input = parseAdminPatch(body);

        const currentJob = await RepairJob.findOne(filter).select("-photosBefore -photosAfter").lean();
        if (!currentJob) return jobNotFound();
        // Photos are large inline images; only their counts are needed to log uploads.
        const [photoCounts] = await RepairJob.aggregate<{ photosBefore: number; photosAfter: number }>([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },
            { $project: { photosBefore: { $size: { $ifNull: ["$photosBefore", []] } }, photosAfter: { $size: { $ifNull: ["$photosAfter", []] } } } },
        ]);
        const previousPhotoCounts = photoCounts ?? { photosBefore: 0, photosAfter: 0 };
        if (currentJob.jobType === "claim") await assertClaimEligible({ imei: currentJob.imei });
        // A claim moved to another IMEI must be eligible under that IMEI too.
        if (currentJob.jobType === "claim" && typeof input.set.imei === "string" && input.set.imei !== currentJob.imei) {
            await assertClaimEligible({ imei: input.set.imei });
        }
        if (typeof input.set.assignedTechnician === "string") await assertActiveTechnician(input.set.assignedTechnician);

        // The actor is whoever holds the verified session, never a name the client sends.
        const logActor = { id: actor.id, name: actor.name };
        const jobTitle = `${currentJob.jobId} (${currentJob.brand} ${currentJob.deviceModel})`;
        const statusChanged = input.status !== undefined && input.status !== currentJob.status;
        // The outcome is chosen when the job enters ready_pickup; it cannot be swapped afterwards.
        if (!statusChanged && input.outcome && input.outcome !== (currentJob.outcome ?? "repaired")) {
            return NextResponse.json({
                error: `งานนี้บันทึกผลเป็น "${REPAIR_OUTCOME.labels[currentJob.outcome ?? "repaired"]}" แล้ว หากต้องการเปลี่ยน ให้ส่งกลับไป "กำลังซ่อม" ก่อน`,
                code: "INVALID_STATUS_TRANSITION",
            }, { status: 409 });
        }

        // Totals are always derived on the server from the three cost inputs.
        const set: Record<string, unknown> = { ...input.set };
        const backupChanged = input.dataBackupStatus !== undefined && input.dataBackupStatus !== currentJob.dataBackup?.status;
        if (backupChanged) {
            set.dataBackup = { status: input.dataBackupStatus, recordedBy: actor.name, recordedById: actor.id, recordedAt: new Date() };
        }
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
                    // A new price needs a new approval round.
                    quotationApproved: "pending",
                });
                // $inc on a missing field would start at 1 and match an approval of version 1.
                if (currentJob.costsVersion == null) set.costsVersion = 2;
                else inc.costsVersion = 1;
            }
        }

        if (statusChanged) {
            await transitionRepairJob(currentJob, input.status!, actor, input.statusNote, { set, inc, outcome: input.outcome });
        } else if (Object.keys(set).length) {
            await RepairJob.updateOne({ _id: id }, { $set: set, ...(Object.keys(inc).length ? { $inc: inc } : {}) }, { runValidators: true });
        }

        const updatedJob = await RepairJob.findById(id).populate(ADMIN_JOB_POPULATE);
        const newStatusLabel = statusChanged ? statusLabelForOutcome(input.status!, updatedJob?.outcome) : "";

        // ADMIN ACTIVITY LOGGING
        // 1. Log Status Changes
        if (statusChanged) {
            try {
                // The populated job carries the customer's contact details and the branch.
                await sendLineFlexMessage(updatedJob ?? currentJob, newStatusLabel, getStatusColor(input.status!));
            } catch (lineError) {
                console.error("LINE notify failed:", lineError instanceof Error ? lineError.message : lineError);
            }

            await recordAdminLog({
                req,
                actor: logActor,
                action: "update_job_status",
                description: `เปลี่ยนสถานะงาน ${jobTitle} เป็น "${newStatusLabel}"`,
                targetId: id,
                targetType: "RepairJob",
                details: { oldStatus: currentJob.status, newStatus: input.status, outcome: updatedJob?.outcome, note: input.statusNote }
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

        // 4. Log appointment and device-data changes
        if (input.set.appointmentDate !== undefined || backupChanged) {
            await recordAdminLog({
                req,
                actor: logActor,
                action: "update_job_intake",
                description: `อัปเดตวันนัด/สถานะข้อมูลในเครื่อง งาน ${jobTitle}`,
                targetId: id,
                targetType: "RepairJob",
                details: { appointmentDate: input.set.appointmentDate, dataBackupStatus: backupChanged ? input.dataBackupStatus : undefined },
            });
        }

        // 5. Log Warranty Updates
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

        // 6. Log device details, technician, inspection result and internal notes
        const before = currentJob as unknown as Record<string, unknown>;
        const detailFields = DETAIL_FIELDS.filter((field) => input.set[field] !== undefined
            && String(input.set[field] ?? "") !== String(before[field] ?? ""));
        if (detailFields.length) {
            await recordAdminLog({
                req,
                actor: logActor,
                action: "update_job_details",
                description: `แก้ไขข้อมูลเครื่อง/ผลตรวจ งาน ${jobTitle}`,
                targetId: id,
                targetType: "RepairJob",
                details: Object.fromEntries(detailFields.map((field) => [field, { before: before[field], after: input.set[field] }])),
            });
        }

        return NextResponse.json(updatedJob);
    } catch (error: unknown) {
        const handled = adminRepairErrorResponse(error);
        if (handled) return handled;
        console.error("Update Job Error:", error);
        return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: Context) {
    try {
        const access = await requireRepairAccess(req, "delete_repair_jobs");
        if (!access.ok) return access.error;
        const { user } = access;

        await dbConnect();
        const { id } = await params;
        const filter = scopedJobFilter(access.scope, id);
        if (!filter) return jobNotFound();
        const job = await RepairJob.findOne(filter).select("jobId jobType imei source externalRef").lean();
        if (!job) return jobNotFound();
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
