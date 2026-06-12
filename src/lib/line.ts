export async function sendLineNotify(message: string) {
    const token = process.env.LINE_NOTIFY_TOKEN;
    if (!token) {
        console.warn("LINE_NOTIFY_TOKEN is not set");
        return;
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
        return await res.json();
    } catch (err) {
        console.error("Line Notify Error:", err);
    }
}
