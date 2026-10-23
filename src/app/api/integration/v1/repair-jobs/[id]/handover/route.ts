import { integrationRoute } from "@/lib/integration/http";
import { unwrap, withRepairErrors } from "@/lib/integration/repair-route";
import { validateHandoverPayload } from "@/lib/repair/integration-validation";
import { handoverPosRepairJob, toIntegrationDto } from "@/lib/repair/service";

export const dynamic = "force-dynamic";

/** The POS confirms it has the device back. Repeating it is a no-op. */
export const POST = integrationRoute<{ id: string }>({ scope: "repair:handover", body: "optional" }, async ({ req, body, params, client, requestId }) => {
    const { note } = unwrap(validateHandoverPayload(body));
    const { job } = await withRepairErrors(() => handoverPosRepairJob({ id: params.id, note, client, requestId, req }));
    return { status: 200, body: toIntegrationDto(job) };
});
