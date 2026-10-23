import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    test: {
        environment: "node",
        setupFiles: ["./tests/setup.ts"],
        // Database suites share one test database and clear it between tests.
        fileParallelism: false,
        testTimeout: 20_000,
        hookTimeout: 30_000,
    },
});
