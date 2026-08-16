import { readFile } from "fs/promises";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { formatSatang } from "@/lib/buyback";
import { readBuybackFile } from "@/lib/buyback-storage";

export interface BuybackReceiptData {
    documentNumber: string;
    completedAt: Date;
    customer: { fullName: string; idCard: string; imei: string; policyNumber: string; packageName: string };
    actualAmountSatang: number;
    payment: { method: "cash" | "transfer" | "cheque" | "other"; otherLabel?: string; reference?: string };
    confirmationText: string;
    branch: { name: string; location?: string };
    employeeName: string;
    customerSignaturePath: string;
    employeeSignaturePath: string;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 46;

function thaiDateTime(date: Date): string {
    return new Intl.DateTimeFormat("th-TH", {
        timeZone: "Asia/Bangkok",
        dateStyle: "long",
        timeStyle: "short",
    }).format(date);
}

function paymentLabel(data: BuybackReceiptData["payment"]): string {
    if (data.method === "cash") return "เงินสด";
    if (data.method === "transfer") return "โอนเงิน";
    if (data.method === "cheque") return "เช็ค";
    return `อื่น ๆ: ${data.otherLabel || "-"}`;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
            current = candidate;
            continue;
        }
        if (current) lines.push(current);
        current = word;
    }
    if (current) lines.push(current);
    return lines;
}

function drawLabelValue(
    page: PDFPage,
    fonts: { thai: PDFFont; thaiBold: PDFFont; latin: PDFFont },
    y: number,
    label: string,
    value: string,
    options?: { right?: boolean; valueLatin?: boolean }
) {
    const x = options?.right ? 318 : MARGIN;
    page.drawText(label, { x, y, size: 9, font: fonts.thaiBold, color: rgb(0.32, 0.38, 0.46) });
    page.drawText(value || "-", {
        x,
        y: y - 18,
        size: 11,
        font: options?.valueLatin ? fonts.latin : fonts.thai,
        color: rgb(0.08, 0.12, 0.18),
    });
}

export async function generateBuybackReceiptPdf(data: BuybackReceiptData): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const fontRoot = path.join(process.cwd(), "node_modules", "@expo-google-fonts", "noto-sans-thai");
    const [thaiBytes, thaiBoldBytes] = await Promise.all([
        readFile(path.join(fontRoot, "400Regular", "NotoSansThai_400Regular.ttf")),
        readFile(path.join(fontRoot, "700Bold", "NotoSansThai_700Bold.ttf")),
    ]);
    const [thai, thaiBold, latin, latinBold] = await Promise.all([
        pdf.embedFont(thaiBytes, { subset: true }),
        pdf.embedFont(thaiBoldBytes, { subset: true }),
        pdf.embedFont(StandardFonts.Helvetica),
        pdf.embedFont(StandardFonts.HelveticaBold),
    ]);
    const fonts = { thai, thaiBold, latin };
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 12, width: PAGE_WIDTH, height: 12, color: rgb(0.12, 0.36, 0.82) });
    page.drawText("ใบรับคืนเงินแพ็กคุ้มครอง", { x: MARGIN, y: 774, size: 22, font: thaiBold, color: rgb(0.08, 0.15, 0.28) });
    page.drawText("PROTECTION PACKAGE BUYBACK RECEIPT", { x: MARGIN, y: 755, size: 8, font: latinBold, color: rgb(0.34, 0.43, 0.56) });
    page.drawText(data.documentNumber, { x: 410, y: 776, size: 12, font: latinBold, color: rgb(0.12, 0.36, 0.82) });
    page.drawText(thaiDateTime(data.completedAt), { x: 355, y: 756, size: 9, font: thai, color: rgb(0.34, 0.43, 0.56) });
    page.drawLine({ start: { x: MARGIN, y: 734 }, end: { x: PAGE_WIDTH - MARGIN, y: 734 }, thickness: 1, color: rgb(0.86, 0.89, 0.93) });

    page.drawText("ข้อมูลลูกค้าและแพ็กคุ้มครอง", { x: MARGIN, y: 708, size: 13, font: thaiBold, color: rgb(0.12, 0.36, 0.82) });
    drawLabelValue(page, fonts, 678, "ชื่อ-นามสกุลลูกค้า", data.customer.fullName);
    drawLabelValue(page, fonts, 678, "เลขบัตรประชาชน", data.customer.idCard, { right: true, valueLatin: true });
    drawLabelValue(page, fonts, 630, "เลขที่แพ็กคุ้มครอง", data.customer.policyNumber, { valueLatin: true });
    drawLabelValue(page, fonts, 630, "IMEI", data.customer.imei, { right: true, valueLatin: true });
    drawLabelValue(page, fonts, 582, "ชื่อแพ็กคุ้มครอง", data.customer.packageName);
    drawLabelValue(page, fonts, 582, "ชื่อสาขา", data.branch.name, { right: true });

    page.drawRectangle({ x: MARGIN, y: 470, width: PAGE_WIDTH - MARGIN * 2, height: 78, color: rgb(0.94, 0.97, 1), borderColor: rgb(0.75, 0.84, 0.98), borderWidth: 1 });
    page.drawText("จำนวนเงินที่คืนจริง", { x: 64, y: 519, size: 10, font: thaiBold, color: rgb(0.24, 0.34, 0.48) });
    page.drawText(`${Number(formatSatang(data.actualAmountSatang)).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท`, { x: 64, y: 488, size: 20, font: thaiBold, color: rgb(0.05, 0.34, 0.72) });
    page.drawText("ช่องทางคืนเงิน", { x: 330, y: 519, size: 10, font: thaiBold, color: rgb(0.24, 0.34, 0.48) });
    page.drawText(paymentLabel(data.payment), { x: 330, y: 495, size: 12, font: thai, color: rgb(0.08, 0.12, 0.18) });
    page.drawText(`เลขอ้างอิง: ${data.payment.reference || "-"}`, { x: 330, y: 478, size: 8, font: thai, color: rgb(0.34, 0.43, 0.56) });

    page.drawText("ข้อความยืนยัน", { x: MARGIN, y: 437, size: 11, font: thaiBold, color: rgb(0.12, 0.36, 0.82) });
    const confirmationLines = wrapText(data.confirmationText, thai, 10, PAGE_WIDTH - MARGIN * 2);
    confirmationLines.slice(0, 4).forEach((line, index) => {
        page.drawText(line, { x: MARGIN, y: 416 - index * 17, size: 10, font: thai, color: rgb(0.16, 0.21, 0.29) });
    });

    const [customerSignature, employeeSignature] = await Promise.all([
        pdf.embedPng(await readBuybackFile(data.customerSignaturePath)),
        pdf.embedPng(await readBuybackFile(data.employeeSignaturePath)),
    ]);
    const signatureY = 235;
    page.drawRectangle({ x: MARGIN, y: signatureY, width: 232, height: 116, borderColor: rgb(0.82, 0.86, 0.91), borderWidth: 1 });
    page.drawRectangle({ x: 318, y: signatureY, width: 232, height: 116, borderColor: rgb(0.82, 0.86, 0.91), borderWidth: 1 });
    page.drawImage(customerSignature, { x: 72, y: signatureY + 30, width: 180, height: 70 });
    page.drawImage(employeeSignature, { x: 344, y: signatureY + 30, width: 180, height: 70 });
    page.drawText("ลายเซ็นลูกค้า", { x: 126, y: signatureY + 12, size: 9, font: thaiBold, color: rgb(0.24, 0.30, 0.40) });
    page.drawText("ลายเซ็นพนักงาน", { x: 394, y: signatureY + 12, size: 9, font: thaiBold, color: rgb(0.24, 0.30, 0.40) });
    page.drawText(data.customer.fullName, { x: 98, y: signatureY - 18, size: 9, font: thai, color: rgb(0.24, 0.30, 0.40) });
    page.drawText(data.employeeName, { x: 370, y: signatureY - 18, size: 9, font: thai, color: rgb(0.24, 0.30, 0.40) });

    page.drawLine({ start: { x: MARGIN, y: 116 }, end: { x: PAGE_WIDTH - MARGIN, y: 116 }, thickness: 1, color: rgb(0.86, 0.89, 0.93) });
    page.drawText(`สาขา ${data.branch.name}${data.branch.location ? ` - ${data.branch.location}` : ""}`, { x: MARGIN, y: 94, size: 8, font: thai, color: rgb(0.40, 0.47, 0.57) });
    page.drawText("เอกสารฉบับชั่วคราว - Template version 1", { x: 374, y: 94, size: 7, font: thai, color: rgb(0.55, 0.60, 0.68) });

    pdf.setTitle(`ใบรับคืนเงิน ${data.documentNumber}`);
    pdf.setSubject("Protection package buyback receipt");
    pdf.setCreationDate(data.completedAt);
    return pdf.save();
}
