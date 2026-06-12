"use client";
import { useRouter } from "next/navigation";
import { useRegister } from "../RegisterContext";
import { Upload, Camera, ArrowLeft, ArrowRight, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

export default function Step4() {
    const router = useRouter();
    const { deviceImages, setDeviceImages } = useRegister();

    const uploadSteps = [
        { key: 'front', label: 'ด้านหน้า' },
        { key: 'back', label: 'ด้านหลัง' },
        { key: 'left', label: 'ด้านซ้าย' },
        { key: 'right', label: 'ด้านขวา' },
        { key: 'top', label: 'ด้านบน' },
        { key: 'bottom', label: 'ด้านล่าง' }
    ];

    const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setDeviceImages(key, reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const isAllUploaded = Object.values(deviceImages).every(img => img !== null);

    return (
        <div className="w-full space-y-10 py-6">
            <div className="text-center space-y-6">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">ตัวอย่างรูปภาพที่ต้องอัปโหลด</h2>

                {/* Sample Icons Row */}
                <div className="flex justify-center flex-wrap gap-4 px-4 overflow-x-auto pb-4 no-scrollbar">
                    {uploadSteps.map((s) => (
                        <div key={s.key} className="flex flex-col items-center gap-2">
                            <div className="w-16 h-24 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center p-2">
                                <ImageIcon className="text-slate-300" size={32} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
                        </div>
                    ))}
                </div>

                <h3 className="text-cyan-500 font-black text-lg uppercase tracking-wider">คำแนะนำสำหรับการถ่ายภาพ</h3>
            </div>

            {/* Upload Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {uploadSteps.map((s) => (
                    <div key={s.key} className="relative group">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(s.key, e)}
                            className="hidden"
                            id={`upload-${s.key}`}
                        />
                        <label
                            htmlFor={`upload-${s.key}`}
                            className={`flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-3xl transition-all cursor-pointer relative overflow-hidden ${deviceImages[s.key]
                                    ? 'border-blue-500 bg-blue-50/50'
                                    : 'border-slate-300 border-dashed hover:border-blue-400 bg-white hover:bg-slate-50'
                                }`}
                        >
                            {deviceImages[s.key] ? (
                                <>
                                    <img
                                        src={deviceImages[s.key] as string}
                                        alt={s.label}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="text-white" size={32} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <Upload className="text-slate-400" size={24} />
                                    </div>
                                    <span className="text-sm font-black text-slate-900">{s.label}</span>
                                </>
                            )}
                        </label>
                    </div>
                ))}
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
                    onClick={() => router.push("/register/step5")}
                    className={`px-12 py-4 font-black rounded-2xl text-xl shadow-lg transition-all flex items-center gap-3 ${isAllUploaded
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50'
                        }`}
                    disabled={!isAllUploaded}
                >
                    ต่อไป <ArrowRight size={24} />
                </button>
            </div>
        </div>
    );
}
