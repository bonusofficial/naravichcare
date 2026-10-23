import { randomBytes } from "node:crypto";
import dotenv from "dotenv";
import { assertSafeTestDatabaseUri, UnsafeTestDatabaseError } from "./helpers/db-guard";

// Test-only settings live in .env.test.local (gitignored). The app's own
// .env.local is deliberately not loaded, so its MONGODB_URI is never used.
dotenv.config({ path: ".env.test.local", quiet: true });

const appUri = process.env.MONGODB_URI;
const testUri = process.env.MONGODB_URI_TEST;

if (testUri) {
    try {
        assertSafeTestDatabaseUri(testUri, {
            appUri,
            nodeEnv: process.env.NODE_ENV,
            allowRemote: process.env.ALLOW_REMOTE_TEST_DB === "true",
        });
    } catch (error) {
        // Stop the whole run rather than risk touching a real database.
        if (error instanceof UnsafeTestDatabaseError) {
            console.error(`\n[tests] ${error.message}. Aborting.\n`);
            process.exit(1);
        }
        throw error;
    }
    process.env.MONGODB_URI = testUri;
} else {
    // Pure unit tests still import modules that read MONGODB_URI at load time.
    // Point them at a port nothing listens on so nothing real can be reached.
    process.env.MONGODB_URI = "mongodb://127.0.0.1:9/unset_test";
}

process.env.JWT_SECRET = randomBytes(32).toString("hex");
process.env.INTEGRATION_API_LOG = "off";
process.env.INTEGRATION_API_RATE_LIMIT = "100000";
process.env.INTEGRATION_API_IP_RATE_LIMIT = "100000";
process.env.INTEGRATION_API_RATE_WINDOW_SECONDS = "60";
delete process.env.INTEGRATION_API_ALLOW_HTTP;
delete process.env.INTEGRATION_POS_ASSET_BASE_URL;
