/**
 * Downscales an image in the browser before it is turned into a data URL.
 *
 * Registration uploads seven photos (six device angles plus the receipt) and used
 * to send each one as a raw base64 string. A modern phone camera produces ~3-5 MB
 * per shot, so the request grew past Node's ~16 MB buffer limit and the submit
 * failed with `The value of "offset" is out of range`. Resizing to a long edge of
 * 1600px at JPEG quality 0.8 keeps IMEI stickers and receipts readable while
 * bringing a full set well under the limit.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.8;

export function compressImageToDataUrl(
    file: File,
    maxEdge: number = MAX_EDGE,
    quality: number = QUALITY
): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const image = new Image();
            image.onerror = () => reject(new Error("ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ"));
            image.onload = () => {
                const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
                // Already small enough: keep the original rather than re-encoding it.
                if (scale === 1 && dataUrl.length < 1_500_000) {
                    resolve(dataUrl);
                    return;
                }
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(image.width * scale);
                canvas.height = Math.round(image.height * scale);
                const context = canvas.getContext("2d");
                if (!context) {
                    resolve(dataUrl);
                    return;
                }
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            image.src = dataUrl;
        };
        reader.readAsDataURL(file);
    });
}
