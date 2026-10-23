import { integrationRoute } from "@/lib/integration/http";
import { withRepairErrors } from "@/lib/integration/repair-route";
import { getPosRepairJob, toCostsDto } from "@/lib/repair/service";

export const dynamic = "force-dynamic";

export const GET = integrationRoute<{ id: string }>({ scope: "repair:read" }, async ({ params }) => {
    const job = await withRepairErrors(() => getPosRepairJob(params.id));
    return {
        status: 200,
        body: { id: String(job._id), reference: job.jobId, externalRef: job.externalRef ?? null, ...toCostsDto(job) },
    };
});
