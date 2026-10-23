/**
 * Refuse to run database tests against anything that could be a real
 * database. Called before any test module connects or deletes data.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "mongo", "mongodb"]);

export class UnsafeTestDatabaseError extends Error {}

export function testDatabaseName(uri: string): string | null {
    const match = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/.exec(uri);
    return match && match[1] ? decodeURIComponent(match[1]) : null;
}

function hostsOf(uri: string): string[] {
    const match = /^mongodb(?:\+srv)?:\/\/([^/?]+)/.exec(uri);
    if (!match) return [];
    const hostPart = match[1].includes("@") ? match[1].slice(match[1].lastIndexOf("@") + 1) : match[1];
    return hostPart.split(",").map((host) => {
        const trimmed = host.trim().toLowerCase();
        if (trimmed.startsWith("[")) return trimmed.slice(0, trimmed.indexOf("]") + 1);
        return trimmed.replace(/:\d+$/, "");
    });
}

export function assertSafeTestDatabaseUri(
    uri: string | undefined,
    context: { appUri?: string; nodeEnv?: string; allowRemote?: boolean } = {},
): string {
    if (!uri) throw new UnsafeTestDatabaseError("MONGODB_URI_TEST is not set");
    if (context.nodeEnv === "production") throw new UnsafeTestDatabaseError("Refusing to run database tests with NODE_ENV=production");
    if (!/^mongodb(\+srv)?:\/\//.test(uri)) throw new UnsafeTestDatabaseError("MONGODB_URI_TEST must be a mongodb:// URI");
    if (context.appUri && context.appUri === uri) throw new UnsafeTestDatabaseError("MONGODB_URI_TEST must not be the application database");

    const dbName = testDatabaseName(uri);
    if (!dbName || !/_test$/.test(dbName)) throw new UnsafeTestDatabaseError("Test database name must end with _test");
    if (/prod/i.test(dbName)) throw new UnsafeTestDatabaseError("Test database name looks like production");

    if (!context.allowRemote) {
        if (uri.startsWith("mongodb+srv://")) throw new UnsafeTestDatabaseError("Refusing mongodb+srv (remote cluster) for tests");
        const hosts = hostsOf(uri);
        if (!hosts.length || hosts.some((host) => !LOCAL_HOSTS.has(host))) {
            throw new UnsafeTestDatabaseError("Test database must be on localhost");
        }
    }
    return dbName;
}
