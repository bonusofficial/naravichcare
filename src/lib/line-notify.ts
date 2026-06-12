export async function sendLineNotify(message: string) {
    const token = process.env.LINE_NOTIFY_TOKEN;
    
    if (!token) {
        console.warn("LINE_NOTIFY_TOKEN is not set. Skipping notification.");
        return { success: false, error: "Token not found" };
    }

    try {
        const res = await fetch("https://notify-api.line.me/api/notify", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Bearer ${token}`
            },
            body: new URLSearchParams({ message }).toString()
        });

        if (res.ok) {
            console.log("LINE Notification sent successfully!");
            return { success: true };
        } else {
            console.error("LINE Notify Error:", await res.text());
            return { success: false };
        }
    } catch (error) {
        console.error("LINE Notify Fetch Error:", error);
        return { success: false, error };
    }
}
