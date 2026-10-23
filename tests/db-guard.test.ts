import { describe, expect, it } from "vitest";
import { assertSafeTestDatabaseUri, UnsafeTestDatabaseError } from "./helpers/db-guard";

describe("test database guard", () => {
    it("accepts a local *_test database", () => {
        expect(assertSafeTestDatabaseUri("mongodb://u:p@127.0.0.1:27017/navarichcare_test?authSource=admin")).toBe("navarichcare_test");
        expect(assertSafeTestDatabaseUri("mongodb://localhost/app_test")).toBe("app_test");
    });

    it.each([
        [undefined, "not set"],
        ["mongodb://u:p@localhost:27017/navarichcare?authSource=admin", "_test"],
        ["mongodb://localhost:27017/", "_test"],
        ["mongodb+srv://u:p@cluster0.example.mongodb.net/app_test", "remote"],
        ["mongodb://u:p@db.example.com:27017/app_test", "localhost"],
        ["mongodb://localhost,db.example.com/app_test", "localhost"],
        ["mongodb://localhost/prod_test", "production"],
        ["postgres://localhost/app_test", "mongodb://"],
    ])("rejects %s", (uri, message) => {
        expect(() => assertSafeTestDatabaseUri(uri)).toThrow(UnsafeTestDatabaseError);
        expect(() => assertSafeTestDatabaseUri(uri)).toThrow(new RegExp(message, "i"));
    });

    it("rejects the application database URI and NODE_ENV=production", () => {
        const uri = "mongodb://localhost/app_test";
        expect(() => assertSafeTestDatabaseUri(uri, { appUri: uri })).toThrow(/application database/);
        expect(() => assertSafeTestDatabaseUri(uri, { nodeEnv: "production" })).toThrow(/production/);
    });
});
