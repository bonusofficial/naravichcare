import { sendLinePortal } from "@/lib/line-portal";

type RepairJobForLine = {
    _id: unknown;
    jobId: string;
    brand: string;
    deviceModel: string;
};

export async function sendLineFlexMessage(job: RepairJobForLine, statusLabel: string, color: string) {

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
                        uri: `https://naravichcare.com/admin/repair/jobs/${job._id}`
                    },
                    style: "primary",
                    color: "#0F172A",
                    height: "sm"
                }
            ]
        }
    };

    return sendLinePortal([
        {
            type: "flex",
            altText: `อัปเดตงานซ่อม ${job.jobId}: ${statusLabel}`,
            contents: flexMessage,
        },
    ]);
}
