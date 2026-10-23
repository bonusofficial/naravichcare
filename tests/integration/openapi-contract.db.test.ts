import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import mongoose from "mongoose";
import { expect, it } from "vitest";
import { GET as searchRoute, POST as createRoute } from "@/app/api/integration/v1/repair-jobs/route";
import { GET as getRoute } from "@/app/api/integration/v1/repair-jobs/[id]/route";
import { GET as costsRoute } from "@/app/api/integration/v1/repair-jobs/[id]/costs/route";
import { INTEGRATION_ERROR_CODES } from "@/lib/integration/errors";
import { CREATE_FIELDS } from "@/lib/repair/integration-validation";
import { POS_STATUS_MAP, REPAIR_STATUSES } from "@/lib/repair/status";
import { apiRequest, describeDb, insertApiKey, noParams, params, posPayload } from "../helpers/db";

// js-yaml and ajv are already in the dev tree (via eslint); loaded untyped so
// the spec check needs no new dependency.
const nodeRequire = createRequire(import.meta.url);
const yaml = nodeRequire("js-yaml") as { load(text: string): unknown };
type ValidateFn = ((data: unknown) => boolean) & { errors?: unknown };
const Ajv = nodeRequire("ajv") as new (options: Record<string, unknown>) => {
    addSchema(schema: unknown, key: string): void;
    compile(schema: unknown): ValidateFn;
};

interface Spec {
    paths: Record<string, Record<string, unknown>>;
    components: { schemas: Record<string, { properties?: Record<string, unknown>; enum?: string[]; required?: string[] }> };
}

const spec = yaml.load(readFileSync(path.resolve("docs/openapi/repair-integration-v1.yaml"), "utf8")) as Spec;
const schemas = spec.components.schemas;
const ajv = new Ajv({ allErrors: true, validateSchema: false });
ajv.addSchema(spec, "openapi");
const validator = (name: string) => ajv.compile({ $ref: `openapi#/components/schemas/${name}` });

function expectValid(name: string, data: unknown) {
    const validate = validator(name);
    const ok = validate(data);
    expect(validate.errors ?? null, `${name}: ${JSON.stringify(validate.errors)}`).toBeNull();
    expect(ok).toBe(true);
}

/** Every route.ts under the integration API, as "METHOD /path". */
function implementedOperations(): string[] {
    const root = path.resolve("src/app/api/integration/v1");
    const out: string[] = [];
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir)) {
            const full = path.join(dir, entry);
            if (statSync(full).isDirectory()) walk(full);
            else if (entry === "route.ts") {
                const route = "/" + path.relative(root, dir).split(path.sep).join("/").replace(/\[(\w+)\]/g, "{$1}");
                for (const method of readFileSync(full, "utf8").matchAll(/export const (GET|POST|PUT|PATCH|DELETE)\b/g)) {
                    out.push(`${method[1]} ${route}`);
                }
            }
        }
    };
    walk(root);
    return out.sort();
}

function documentedOperations(): string[] {
    return Object.entries(spec.paths)
        .flatMap(([route, item]) => Object.keys(item).filter((k) => k !== "parameters").map((method) => `${method.toUpperCase()} ${route}`))
        .sort();
}

it("documents exactly the implemented operations", () => {
    expect(documentedOperations()).toEqual(implementedOperations());
});

it("documents the same enums and request fields as the code", () => {
    const errorCodes = (schemas.Error.properties!.error as { properties: { code: { enum: string[] } } }).properties.code.enum;
    expect([...errorCodes].sort()).toEqual([...INTEGRATION_ERROR_CODES].sort());
    expect(schemas.RepairStatus.enum).toEqual([...REPAIR_STATUSES]);
    expect([...schemas.PosStatus.enum!].sort()).toEqual([...new Set(Object.values(POS_STATUS_MAP))].sort());
    expect(Object.keys(schemas.CreateRepairJobRequest.properties!).sort()).toEqual([...CREATE_FIELDS].sort());
});

describeDb("OpenAPI response schemas", () => {
    it("match real responses", async () => {
        const { apiKey } = await insertApiKey();
        const created = await createRoute(apiRequest("/api/integration/v1/repair-jobs", { method: "POST", apiKey, body: posPayload() }), noParams);
        const job = await created.json() as { id: string };
        expectValid("RepairJob", job);

        const read = await getRoute(apiRequest(`/api/integration/v1/repair-jobs/${job.id}`, { apiKey }), params({ id: job.id }));
        expectValid("RepairJob", await read.json());

        const page = await searchRoute(apiRequest("/api/integration/v1/repair-jobs?limit=5", { apiKey }), noParams);
        expectValid("RepairJobPage", await page.json());

        const costs = await (await costsRoute(apiRequest(`/api/integration/v1/repair-jobs/${job.id}/costs`, { apiKey }), params({ id: job.id }))).json();
        expectValid("RepairCosts", costs);

        const missing = new mongoose.Types.ObjectId().toString();
        expectValid("Error", await (await getRoute(apiRequest(`/api/integration/v1/repair-jobs/${missing}`, { apiKey }), params({ id: missing }))).json());
        expectValid("Error", await (await createRoute(apiRequest("/api/integration/v1/repair-jobs", { method: "POST", apiKey, body: { reference: "x" } }), noParams)).json());
        expectValid("Error", await (await searchRoute(apiRequest("/api/integration/v1/repair-jobs"), noParams)).json());

        // The documented request example is accepted by the API.
        const example = (((spec.paths["/repair-jobs"].post as { requestBody: { content: { "application/json": { examples: { currentPos: { value: unknown } } } } } })
            .requestBody.content["application/json"].examples.currentPos.value));
        expectValid("CreateRepairJobRequest", example);
        const fromExample = await createRoute(apiRequest("/api/integration/v1/repair-jobs", { method: "POST", apiKey, body: example }), noParams);
        expect(fromExample.status).toBe(201);
    });
});
