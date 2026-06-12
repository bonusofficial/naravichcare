"use client";
import { useRouter } from "next/navigation";
import { useRegister } from "../RegisterContext";
import { Upload, Camera, ArrowRight } from "lucide-react";

export default function Step5() {
    const router = useRouter();
    const { receiptImage, setReceiptImage } = useRegister();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setReceiptImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="w-full space-y-10 py-6">
            <div className="text-center space-y-6">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">อัพโหลดใบเสร็จการซื้อเครื่อง</h2>
            </div>

            {/* Upload Area */}
            <div className="max-w-[1000px] mx-auto">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="upload-receipt"
                />
                <label
                    htmlFor="upload-receipt"
                    className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-3xl transition-all cursor-pointer relative overflow-hidden group ${receiptImage
                            ? 'border-blue-500 bg-blue-50/50'
                            : 'border-slate-300 border-dashed hover:border-blue-400 bg-white hover:bg-slate-50'
                        }`}
                >
                    {receiptImage ? (
                        <>
                            <img
                                src={receiptImage}
                                alt="ใบเสร็จ"
                                className="w-full h-full object-contain p-4"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="text-white" size={40} />
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                <Upload className="text-slate-400" size={32} />
                            </div>
                            <span className="text-base font-black text-slate-900 uppercase">ใบเสร็จการซื้อเครื่อง</span>
                        </div>
                    )}
                </label>
            </div>

            {/* Navigation */}
            <div className="flex justify-center gap-4 pt-10">
                <button
                    onClick={() => router.back()}
                    className="px-12 py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl text-xl shadow-lg transition-all"
                >
                    ย้อนกลับ
                </button>
                <button
                    onClick={() => router.push("/register/step6")}
                    className={`px-12 py-4 font-black rounded-2xl text-xl shadow-lg transition-all flex items-center gap-3 ${receiptImage
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50'
                        }`}
                    disabled={!receiptImage}
                >
                    ต่อไป <ArrowRight size={24} />
                </button>
            </div>
        </div>
    );
}
