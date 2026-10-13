export type LineMessage = {
    type: string;
    [key: string]: unknown;
};

export type LinePortalResult =
    | { success: true }
    | { success: false; error: string };

export async function sendLinePortal(messages: LineMessage[]): Promise<LinePortalResult> {
    const url = process.env.LINE_PORTAL_NOTIFY_URL?.trim();
    const token = process.env.LINE_PORTAL_API_TOKEN?.trim();

    if (!url || !token) {
        console.warn("LINE Portal is not configured. Skipping notification.");
        return { success: false, error: "LINE Portal is not configured" };
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ messages }),
            signal: AbortSignal.timeout(10_000),
        });

        await response.text();
        if (!response.ok) {
            console.error(`LINE Portal rejected the notification (${response.status}).`);
            return { success: false, error: `LINE Portal HTTP ${response.status}` };
        }

        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("LINE Portal request failed:", message);
        return { success: false, error: message };
    }
}
