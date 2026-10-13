import { sendLinePortal } from "@/lib/line-portal";

export function sendLineNotify(message: string) {
    return sendLinePortal([{ type: "text", text: message }]);
}
