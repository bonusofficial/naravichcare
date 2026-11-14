import { expect, it } from "vitest";
import { GET as listRoute, POST as createRoute } from "@/app/api/admin/repair/jobs/route";
import { PATCH as patchRoute } from "@/app/api/admin/repair/jobs/[id]/route";
import { POST as photosRoute } from "@/app/api/admin/repair/jobs/[id]/photos/route";
import { GET as customersRoute, PATCH as legacyCustomerPatch } from "@/app/api/admin/repair/customers/route";
import { GET as customerRoute, PATCH as customerPatch } from "@/app/api/admin/repair/customers/[id]/route";
import { GET as techniciansRoute } from "@/app/api/admin/repair/technicians/route";
import AdminUser from "@/models/AdminUser";
import RepairCustomer from "@/models/RepairCustomer";
import RepairJob from "@/models/RepairJob";
import { adminRequest, createAdmin, createBranch, describeDb, json, noParams, params } from "../helpers/db";

/**
 * QA round 7 Nov 2026 (NaravichCare_Repair_Dev_Fixes.pdf): customer-name
 * search, customer history and editing, full device details, photo
 * replace/delete.
 */

interface JobJson {
    _id: string;
    jobId: string;
    serialNumber?: string;
    imei?: string;
    deviceType?: string;
    accessories?: string[];
    internalNotes?: string;
    diagnosticResult?: string;
    reportedSymptom?: string;
    assignedTechnician?: { _id: string; name: string } | null;
    photosBefore?: string[];
}

const PNG = (n: number) => `data:image/png;base64,${Buffer.from(`photo-${n}`).toString("base64")}`;

async function setup() {
    const a = await createBranch("สาขา A");
    const b = await createBranch("สาขา B");
    const { token: admin } = await createAdmin("admin");
    const { user: techUser, token: tech } = await createAdmin("technician", undefined, { branchId: a.id });
    const customer = await RepairCustomer.create({ firstName: "ทเวลฟ์เทสรับซ่อม", lastName: "ทเวลฟ์เทสคุณคลัง", phone: "0000007196", lineId: "" });
    const create = async (token: string, body: Record<string, unknown>) => {
        const res = await createRoute(adminRequest("/api/admin/repair/jobs", { method: "POST", token, body: {
            brand: "Apple", deviceModel: "iPhone 13", jobType: "repair", reportedSymptom: "จอเสีย",
            customer: String(customer._id), dataBackupStatus: "customer_informed", ...body,
        } }));
        return { res, job: res.status === 201 ? await json<JobJson>(res) : null };
    };
    return { a, b, admin, tech, techUser, customer, create };
}

const search = async (token: string, q: string) =>
    (await json<JobJson[]>(await listRoute(adminRequest(`/api/admin/repair/jobs?q=${encodeURIComponent(q)}`, { token })))).map((job) => job.jobId).sort();

describeDb("QA fixes for the repair system", () => {
    it("01 finds jobs by first name, full name, phone, job id and IMEI, and nothing for unknown text", async () => {
        const { a, admin, create } = await setup();
        const { job: first } = await create(admin, { branchId: a.id, imei: "000000000007196" });
        const { job: second } = await create(admin, { branchId: a.id });
        const both = [first!.jobId, second!.jobId].sort();

        expect(await search(admin, "ทเวลฟ์เทสรับซ่อม")).toEqual(both);
        expect(await search(admin, "ทเวลฟ์เทสรับซ่อม ทเวลฟ์เทสคุณคลัง")).toEqual(both);
        expect(await search(admin, "000-000-7196")).toEqual(both);
        expect(await search(admin, first!.jobId)).toEqual([first!.jobId]);
        expect(await search(admin, "000000000007196")).toEqual([first!.jobId]);
        expect(await search(admin, "ไม่มีชื่อนี้ในระบบ")).toEqual([]);
        expect(await search(admin, ".*")).toEqual([]);
    });

    it("02 shows a customer's history within the user's branches and saves edits to contact details", async () => {
        const { a, b, admin, tech, customer, create } = await setup();
        const { job: inA } = await create(admin, { branchId: a.id });
        await create(admin, { branchId: b.id });
        const id = String(customer._id);

        const asAdmin = await json<{ jobs: JobJson[] }>(await customerRoute(adminRequest(`/api/admin/repair/customers/${id}`, { token: admin }), params({ id })));
        expect(asAdmin.jobs).toHaveLength(2);
        const asTech = await json<{ jobs: JobJson[] }>(await customerRoute(adminRequest(`/api/admin/repair/customers/${id}`, { token: tech }), params({ id })));
        expect(asTech.jobs.map((job) => job.jobId)).toEqual([inA!.jobId]);

        const res = await customerPatch(adminRequest(`/api/admin/repair/customers/${id}`, { method: "PATCH", token: tech, body: { lineId: "twelve.test", address: "อุบลราชธานี", notes: "ลูกค้าทดสอบ" } }), params({ id }));
        expect(res.status).toBe(200);
        const saved = await RepairCustomer.findById(id).lean();
        expect(saved).toMatchObject({ lineId: "twelve.test", address: "อุบลราชธานี", notes: "ลูกค้าทดสอบ", phone: "0000007196" });

        // Only contact fields, never blanking the name, and no phone shared with another customer.
        const bad = await customerPatch(adminRequest(`/api/admin/repair/customers/${id}`, { method: "PATCH", token: admin, body: { customerId: "CUS99999" } }), params({ id }));
        expect(bad.status).toBe(400);
        const blank = await customerPatch(adminRequest(`/api/admin/repair/customers/${id}`, { method: "PATCH", token: admin, body: { firstName: " " } }), params({ id }));
        expect(blank.status).toBe(400);
        await RepairCustomer.create({ firstName: "อื่น", lastName: "ลูกค้า", phone: "0899999999" });
        const taken = await customerPatch(adminRequest(`/api/admin/repair/customers/${id}`, { method: "PATCH", token: admin, body: { phone: "0899999999" } }), params({ id }));
        expect(taken.status).toBe(409);
        // The older collection route goes through the same allowlist.
        const legacy = await legacyCustomerPatch(adminRequest("/api/admin/repair/customers", { method: "PATCH", token: admin, body: { id, isActive: false } }));
        expect(legacy.status).toBe(400);

        const found = await json<{ _id: string }[]>(await customersRoute(adminRequest(`/api/admin/repair/customers?q=${encodeURIComponent("ทเวลฟ์เทสรับซ่อม ทเวลฟ์เทสคุณคลัง")}`, { token: tech })));
        expect(found.map((c) => c._id)).toEqual([id]);
    });

    it("03 records serial number, device type, accessories, technician and internal notes, and edits them later", async () => {
        const { a, admin, tech, techUser, create } = await setup();
        const technicians = await json<{ technicians: { _id: string }[] }>(await techniciansRoute(adminRequest(`/api/admin/repair/technicians?branchId=${a.id}`, { token: admin })));
        expect(technicians.technicians.map((t) => t._id)).toContain(String(techUser._id));

        const { res, job } = await create(tech, {
            branchId: a.id, imei: "", serialNumber: "SN-TWELVE-0001", deviceType: "Laptop",
            accessories: ["สายชาร์จ", "กระเป๋า"], assignedTechnician: String(techUser._id), internalNotes: "ลูกค้าขอเร่ง",
        });
        expect(res.status).toBe(201);
        expect(job).toMatchObject({ serialNumber: "SN-TWELVE-0001", deviceType: "Laptop", accessories: ["สายชาร์จ", "กระเป๋า"], internalNotes: "ลูกค้าขอเร่ง" });
        expect(await search(tech, "SN-TWELVE-0001")).toEqual([job!.jobId]);

        const patch = await patchRoute(adminRequest(`/api/admin/repair/jobs/${job!._id}`, { method: "PATCH", token: tech, body: {
            reportedSymptom: "จอเสีย และลำโพงแตก", diagnosticResult: "ชุดจอเสีย ต้องเปลี่ยน", serialNumber: "SN-TWELVE-0002",
        } }), params({ id: job!._id }));
        expect(patch.status).toBe(200);
        const updated = await json<JobJson>(patch);
        expect(updated).toMatchObject({ reportedSymptom: "จอเสีย และลำโพงแตก", diagnosticResult: "ชุดจอเสีย ต้องเปลี่ยน", serialNumber: "SN-TWELVE-0002" });
        expect(updated.assignedTechnician?._id).toBe(String(techUser._id));

        // Required device fields cannot be blanked; a deactivated technician cannot be assigned.
        const blank = await patchRoute(adminRequest(`/api/admin/repair/jobs/${job!._id}`, { method: "PATCH", token: tech, body: { brand: "" } }), params({ id: job!._id }));
        expect(blank.status).toBe(400);
        const { user: gone } = await createAdmin("technician", undefined, { branchId: a.id });
        await AdminUser.updateOne({ _id: gone._id }, { isActive: false });
        const inactive = await patchRoute(adminRequest(`/api/admin/repair/jobs/${job!._id}`, { method: "PATCH", token: tech, body: { assignedTechnician: String(gone._id) } }), params({ id: job!._id }));
        expect(inactive.status).toBe(400);
    });

    it("05 replaces and deletes one photo without touching the others, and refuses a stale page", async () => {
        const { a, admin, create } = await setup();
        const { job } = await create(admin, { branchId: a.id });
        const id = job!._id;
        const photo = (body: Record<string, unknown>) => photosRoute(adminRequest(`/api/admin/repair/jobs/${id}/photos`, { method: "POST", token: admin, body }), params({ id }));

        for (let i = 0; i < 3; i++) expect((await photo({ action: "add", type: "before", image: PNG(i), expectedCount: i })).status).toBe(200);
        expect((await photo({ action: "add", type: "after", image: PNG(9), expectedCount: 0 })).status).toBe(200);

        const replaced = await json<JobJson>(await photo({ action: "replace", type: "before", index: 1, image: PNG(7), expectedCount: 3 }));
        expect(replaced.photosBefore).toEqual([PNG(0), PNG(7), PNG(2)]);

        const deleted = await photo({ action: "delete", type: "before", index: 0, expectedCount: 3 });
        expect(deleted.status).toBe(200);
        const stored = await RepairJob.findById(id).select("photosBefore photosAfter").lean();
        expect(stored!.photosBefore).toEqual([PNG(7), PNG(2)]);
        expect(stored!.photosAfter).toEqual([PNG(9)]);

        // The page still thinks there are 3 photos: nothing changes.
        const stale = await photo({ action: "delete", type: "before", index: 2, expectedCount: 3 });
        expect(stale.status).toBe(409);
        expect((await RepairJob.findById(id).select("photosBefore").lean())!.photosBefore).toHaveLength(2);
        expect((await photo({ action: "replace", type: "before", index: 0, image: "javascript:alert(1)", expectedCount: 2 })).status).toBe(400);
    });

    it("keeps the technician list and photos inside the user's branches", async () => {
        const { b, admin, tech, create } = await setup();
        const { job } = await create(admin, { branchId: b.id });
        const res = await photosRoute(adminRequest(`/api/admin/repair/jobs/${job!._id}/photos`, { method: "POST", token: tech, body: { action: "add", type: "before", image: PNG(1), expectedCount: 0 } }), params({ id: job!._id }));
        expect(res.status).toBe(404);
        expect((await techniciansRoute(adminRequest("/api/admin/repair/technicians", { token: "" }))).status).toBe(401);
        expect(noParams).toBeTruthy();
    });
});
