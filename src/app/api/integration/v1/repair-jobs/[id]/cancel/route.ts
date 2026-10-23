import { integrationRoute } from "@/lib/integration/http";
import { unwrap, withRepairErrors } from "@/lib/integration/repair-route";
import { validateCancelPayload } from "@/lib/repair/integration-validation";
import { cancelPosRepairJob, toIntegrationDto } from "@/lib/repair/service";

export const dynamic = "force-dynamic";

/** Cancel a job that has not finished repair yet. Repeating it is a no-op. */
export const POST = integrationRoute<{ id: string }>({ scope: "repair:cancel", body: "required" }, async ({ req, body, params, client, requestId }) => {
    const { reason } = unwrap(validateCancelPayload(body));
    const { job } = await withRepairErrors(() => cancelPosRepairJob({ id: params.id, reason, client, requestId, req }));
    return { status: 200, body: toIntegrationDto(job) };
});
