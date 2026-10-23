import { IntegrationError } from "@/lib/integration/errors";
import { integrationRoute } from "@/lib/integration/http";
import { unwrap, withRepairErrors } from "@/lib/integration/repair-route";
import {
    IDEMPOTENCY_KEY_PATTERN,
    validateCreatePayload,
    validateSearchQuery,
} from "@/lib/repair/integration-validation";
import { createIntegrationRepairJob, searchPosRepairJobs, toIntegrationDto } from "@/lib/repair/service";

export const dynamic = "force-dynamic";

/** Create a repair job from the Web POS. Safe to retry: see Idempotency-Key. */
export const POST = integrationRoute({ scope: "repair:write", body: "required" }, async ({ req, body, client, requestId }) => {
    const headerKey = req.headers.get("idempotency-key");
    if (headerKey !== null && !IDEMPOTENCY_KEY_PATTERN.test(headerKey)) {
        throw new IntegrationError("VALIDATION_ERROR", 400, "Invalid Idempotency-Key header", [
            { field: "Idempotency-Key", message: "must be 8-128 characters of A-Z a-z 0-9 . _ : -" },
        ]);
    }
    const input = unwrap(validateCreatePayload(body));
    const { job, replayed } = await withRepairErrors(() =>
        createIntegrationRepairJob({ input, client, idempotencyKey: headerKey, requestId, req }),
    );
    return {
        status: replayed ? 200 : 201,
        body: toIntegrationDto(job),
        headers: replayed ? { "Idempotent-Replayed": "true" } : undefined,
    };
});

/** Exact-match lookup by externalRef and/or IMEI, paginated. */
export const GET = integrationRoute({ scope: "repair:read" }, async ({ req }) => {
    const query = unwrap(validateSearchQuery(req.nextUrl.searchParams));
    return { status: 200, body: await searchPosRepairJobs(query) };
});
