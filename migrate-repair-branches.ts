import mongoose from "mongoose";
import dotenv from "dotenv";
import Branch from "./src/models/Branch";
import RepairJob from "./src/models/RepairJob";

dotenv.config({ path: ".env.local" });
dotenv.config();

/**
 * Give every repair job without a branch its receiving branch.
 *
 *   npm run migrate:repair-branches                               # dry run, prints the plan
 *   npm run migrate:repair-branches -- --default-branch=<id>      # also use <id> for the rest
 *   npm run migrate:repair-branches -- --default-branch=<id> --apply
 *
 * POS jobs are matched through Branch.posBranchIds (by the POS branch id or
 * branch code they were sent with), so map POS branches on /admin/branches
 * first. Everything else goes to --default-branch. Jobs that already have a
 * branch are never touched, so the script is safe to re-run.
 */

interface JobRow {
    _id: mongoose.Types.ObjectId;
    jobId: string;
    source?: string;
    currentHolder?: unknown;
    integration?: { branchId?: string; branchCode?: string };
}

interface BranchRow {
    _id: mongoose.Types.ObjectId;
    name: string;
    posBranchIds?: string[];
}

async function run() {
    const apply = process.argv.includes("--apply");
    const defaultArg = process.argv.find((arg) => arg.startsWith("--default-branch="))?.split("=")[1];
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
    await mongoose.connect(process.env.MONGODB_URI);

    const branches = await Branch.find({}).select("name posBranchIds").lean<BranchRow[]>();
    const byPosKey = new Map<string, BranchRow>();
    for (const branch of branches) for (const key of branch.posBranchIds ?? []) byPosKey.set(key, branch);

    let fallback: BranchRow | null = null;
    if (defaultArg) {
        fallback = branches.find((branch) => String(branch._id) === defaultArg) ?? null;
        if (!fallback) throw new Error(`--default-branch ${defaultArg} is not a branch id`);
    }

    const jobs = await RepairJob.find({ $or: [{ branchId: { $exists: false } }, { branchId: null }] })
        .select("jobId source currentHolder integration.branchId integration.branchCode")
        .lean<JobRow[]>();

    const plan = new Map<string, { branch: BranchRow; jobs: JobRow[] }>();
    const unresolved: JobRow[] = [];
    for (const job of jobs) {
        const posKeys = job.source === "pos" ? [job.integration?.branchId, job.integration?.branchCode].filter(Boolean) as string[] : [];
        const branch = posKeys.map((key) => byPosKey.get(key)).find(Boolean) ?? fallback;
        if (!branch) {
            unresolved.push(job);
            continue;
        }
        const entry = plan.get(String(branch._id)) ?? { branch, jobs: [] };
        entry.jobs.push(job);
        plan.set(String(branch._id), entry);
    }

    console.log(`Jobs without a branch: ${jobs.length}`);
    for (const { branch, jobs: assigned } of plan.values()) {
        console.log(`  -> ${branch.name} (${branch._id}): ${assigned.length}`);
    }
    if (unresolved.length) {
        console.log(`  unresolved: ${unresolved.length} (map their POS branch or pass --default-branch=<id>)`);
        for (const job of unresolved.slice(0, 20)) {
            console.log(`     ${job.jobId} source=${job.source ?? "admin"} pos=${job.integration?.branchId ?? "-"}/${job.integration?.branchCode ?? "-"}`);
        }
    }

    if (!apply) {
        console.log("\nDry run. Re-run with --apply to write.");
    } else {
        let written = 0;
        for (const { branch, jobs: assigned } of plan.values()) {
            const operations = assigned.map((job) => ({
                updateOne: {
                    // Re-check the condition so a job assigned meanwhile is left alone.
                    filter: { _id: job._id, $or: [{ branchId: { $exists: false } }, { branchId: null }] },
                    update: {
                        $set: {
                            branchId: branch._id,
                            ...(job.currentHolder ? {} : { currentHolder: { kind: "branch" as const, label: branch.name, branchId: branch._id } }),
                        },
                    },
                },
            }));
            if (operations.length) written += (await RepairJob.bulkWrite(operations)).modifiedCount;
        }
        console.log(`\nUpdated ${written} jobs.`);
    }

    await mongoose.disconnect();
}

run().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
});
