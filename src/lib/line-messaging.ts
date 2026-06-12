export async function sendLineFlexMessage(to: string, job: any, statusLabel: string, color: string) {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!token) {
        console.warn("LINE_CHANNEL_ACCESS_TOKEN is not set. Skipping Flex Message.");
        return { success: false, error: "Token not found" };
    }

    // Design Flex Message
    const flexMessage = {
        type: "bubble",
        header: {
            type: "box",
            layout: "vertical",
            contents: [
                {
                    type: "text",
                    text: "NAVAVICH CARE 👋",
                    weight: "bold",
                    color: "#FFFFFF",
                    size: "sm"
                }
            ],
            backgroundColor: "#0F172A",
            paddingAll: "lg"
        },
        body: {
            type: "box",
            layout: "vertical",
            contents: [
                {
                    type: "text",
                    text: "อัปเดตสถานะงานซ่อม",
                    weight: "bold",
                    size: "xl",
                    margin: "md"
                },
                {
                    type: "box",
                    layout: "vertical",
                    margin: "lg",
                    spacing: "sm",
                    contents: [
                        {
                            type: "box",
                            layout: "baseline",
                            spacing: "sm",
                            contents: [
                                {
                                    type: "text",
                                    text: "เลขที่งาน:",
                                    color: "#aaaaaa",
                                    size: "sm",
                                    flex: 1
                                },
                                {
                                    type: "text",
                                    text: job.jobId,
                                    wrap: true,
                                    color: "#666666",
                                    size: "sm",
                                    flex: 4,
                                    weight: "bold"
                                }
                            ]
                        },
                        {
                            type: "box",
                            layout: "baseline",
                            spacing: "sm",
                            contents: [
                                {
                                    type: "text",
                                    text: "เครื่อง:",
                                    color: "#aaaaaa",
                                    size: "sm",
                                    flex: 1
                                },
                                {
                                    type: "text",
                                    text: `${job.brand} ${job.deviceModel}`,
                                    wrap: true,
                                    color: "#666666",
                                    size: "sm",
                                    flex: 4,
                                    weight: "bold"
                                }
                            ]
                        }
                    ]
                },
                {
                    type: "box",
                    layout: "vertical",
                    margin: "xxl",
                    contents: [
                        {
                            type: "box",
                            layout: "vertical",
                            backgroundColor: color,
                            cornerRadius: "xl",
                            paddingAll: "lg",
                            contents: [
                                {
                                    type: "text",
                                    text: statusLabel,
                                    color: "#FFFFFF",
                                    align: "center",
                                    weight: "bold",
                                    size: "lg"
                                }
                            ]
                        }
                    ]
                },
                {
                    type: "box",
                    layout: "vertical",
                    margin: "xxl",
                    contents: [
                        {
                            type: "text",
                            text: "ขอบคุณที่ใช้บริการกับเราครับ",
                            size: "xs",
                            color: "#aaaaaa",
                            align: "center"
                        }
                    ]
                }
            ]
        },
        footer: {
            type: "box",
            layout: "vertical",
            contents: [
                {
                    type: "button",
                    action: {
                        type: "uri",
                        label: "ตรวจสถานะออนไลน์",
                        uri: `http://localhost:3001/admin/repair/jobs/${job._id}`
                    },
                    style: "primary",
                    color: "#0F172A",
                    height: "sm"
                }
            ]
        }
    };

    try {
        const res = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                to: to,
                messages: [
                    {
                        type: "flex",
                        altText: `อัปเดตงานซ่อม ${job.jobId}: ${statusLabel}`,
                        contents: flexMessage
                    }
                ]
            })
        });

        if (res.ok) {
            console.log("LINE Flex Message sent successfully!");
            return { success: true };
        } else {
            console.error("LINE Messaging API Error:", await res.text());
            return { success: false };
        }
    } catch (error) {
        console.error("LINE Messaging API Fetch Error:", error);
        return { success: false, error };
    }
}
