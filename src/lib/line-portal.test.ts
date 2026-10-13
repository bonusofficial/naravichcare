import { afterEach, describe, expect, it, vi } from "vitest";
import { sendLinePortal } from "./line-portal";

const originalUrl = process.env.LINE_PORTAL_NOTIFY_URL;
const originalToken = process.env.LINE_PORTAL_API_TOKEN;

afterEach(() => {
    vi.unstubAllGlobals();
    if (originalUrl === undefined) delete process.env.LINE_PORTAL_NOTIFY_URL;
    else process.env.LINE_PORTAL_NOTIFY_URL = originalUrl;
    if (originalToken === undefined) delete process.env.LINE_PORTAL_API_TOKEN;
    else process.env.LINE_PORTAL_API_TOKEN = originalToken;
});

describe("sendLinePortal", () => {
    it("sends messages to the configured portal without a destination ID", async () => {
        process.env.LINE_PORTAL_NOTIFY_URL = "https://line-portal.example/notify/site";
        process.env.LINE_PORTAL_API_TOKEN = "secret";
        const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);

        const result = await sendLinePortal([{ type: "text", text: "hello" }]);

        expect(result).toEqual({ success: true });
        const [url, request] = fetchMock.mock.calls[0];
        expect(url).toBe("https://line-portal.example/notify/site");
        expect(request.headers.Authorization).toBe("Bearer secret");
        expect(JSON.parse(request.body)).toEqual({ messages: [{ type: "text", text: "hello" }] });
    });

    it("does not send when the portal configuration is missing", async () => {
        delete process.env.LINE_PORTAL_NOTIFY_URL;
        delete process.env.LINE_PORTAL_API_TOKEN;
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        await expect(sendLinePortal([{ type: "text", text: "hello" }])).resolves.toEqual({
            success: false,
            error: "LINE Portal is not configured",
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
