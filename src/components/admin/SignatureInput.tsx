"use client";
/* eslint-disable @next/next/no-img-element -- previews use local object URLs and canvas data */

import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine, Upload } from "lucide-react";

export type SignatureMode = "draw" | "upload";

export function SignatureInput({
    label,
    onChange,
}: {
    label: string;
    onChange: (file: File | null, mode: SignatureMode) => void;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const [mode, setMode] = useState<SignatureMode>("draw");
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
    };

    const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        drawingRef.current = true;
        canvas.setPointerCapture(event.pointerId);
        const context = canvas.getContext("2d");
        const p = point(event);
        context?.beginPath();
        context?.moveTo(p.x, p.y);
    };

    const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return;
        const context = canvasRef.current?.getContext("2d");
        const p = point(event);
        if (!context) return;
        context.strokeStyle = "#0f172a";
        context.lineWidth = 3;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineTo(p.x, p.y);
        context.stroke();
    };

    const finish = () => {
        if (!drawingRef.current) return;
        drawingRef.current = false;
        canvasRef.current?.toBlob((blob) => {
            onChange(blob ? new File([blob], "signature.png", { type: "image/png" }) : null, "draw");
        }, "image/png");
    };

    const clear = () => {
        const canvas = canvasRef.current;
        canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        onChange(null, mode);
    };

    const switchMode = (nextMode: SignatureMode) => {
        clear();
        setMode(nextMode);
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="text-sm font-black text-slate-700">{label}</label>
                <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-bold sm:flex">
                    <button type="button" onClick={() => switchMode("draw")} className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 sm:px-3 ${mode === "draw" ? "bg-white text-blue-600 shadow" : "text-slate-400"}`}><PenLine size={13} /> เซ็นบนจอ</button>
                    <button type="button" onClick={() => switchMode("upload")} className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 sm:px-3 ${mode === "upload" ? "bg-white text-blue-600 shadow" : "text-slate-400"}`}><Upload size={13} /> อัปโหลด</button>
                </div>
            </div>
            {mode === "draw" ? (
                <canvas
                    ref={canvasRef}
                    width={720}
                    height={240}
                    onPointerDown={start}
                    onPointerMove={move}
                    onPointerUp={finish}
                    onPointerCancel={finish}
                    className="h-40 w-full touch-none rounded-2xl border-2 border-dashed border-slate-200 bg-white"
                />
            ) : (
                <label className="flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-white">
                    {preview ? <img src={preview} alt={label} className="h-full w-full object-contain" /> : <span className="flex items-center gap-2 text-sm font-bold text-slate-400"><Upload size={18} /> เลือกรูปลายเซ็น</span>}
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/avif"
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            if (preview) URL.revokeObjectURL(preview);
                            setPreview(file ? URL.createObjectURL(file) : null);
                            onChange(file, "upload");
                        }}
                    />
                </label>
            )}
            <button type="button" onClick={clear} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-red-500"><Eraser size={13} /> ล้างลายเซ็น</button>
        </div>
    );
}
