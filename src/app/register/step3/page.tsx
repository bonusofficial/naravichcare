"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useRegister } from "../RegisterContext";

export default function Step3() {
    const router = useRouter();
    const { devicePrice, deviceType, packageType, setPackageType } = useRegister();
    const [packages, setPackages] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const priceNum = Number(devicePrice) || 0;

    React.useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await fetch("/api/coverage-plans");
                const data = await res.json();

                // Filter by isActive AND deviceType
                // If deviceType is null/empty, we default to Smartphone for backward compatibility
                const currentType = deviceType || "Smartphone";
                setPackages(data.filter((p: any) => p.isActive && p.deviceType === currentType));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, [deviceType]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">กำลังดึงข้อมูลแผน...</p>
        </div>
    );

    return (
        <div className="w-full space-y-12">
            <h2 className="text-2xl font-bold text-gray-800 text-center">เลือกแพ็กเกจความคุ้มครอง</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                {packages.map((pkg) => (
                    <div
                        key={pkg._id}
                        className={`rounded-3xl border-2 transition-all flex flex-col overflow-hidden relative shadow-sm ${packageType === pkg._id ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-100 hover:border-blue-200'}`}
                    >
                        {/* Header Gradient */}
                        <div className="bg-gradient-to-r from-blue-700 to-cyan-500 py-3 px-4 text-center">
                            <p className="text-[10px] font-black text-white/80 uppercase tracking-widest leading-tight">ราคาเครื่อง</p>
                            <p className="text-xs font-black text-white uppercase tracking-tight"> {priceNum === 0 ? "ไม่ได้ระบุ" : `มากกว่า ${priceNum.toLocaleString()} บาท`}</p>
                        </div>

                        {/* Price Bar */}
                        <div className="bg-cyan-50 py-3 text-center border-b border-cyan-100">
                            <p className="text-xl font-black text-slate-800">
                                {(priceNum * pkg.priceMultiplier).toLocaleString(undefined, { minimumFractionDigits: 0 })} {pkg.durationUnit}
                            </p>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-1 space-y-5">
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-slate-900 leading-tight">
                                    {pkg.name}<br />{pkg.subTitle} {pkg.durationText}
                                </h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">คำนวณจากราคาเครื่องจริง</p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-wider">ไฮไลท์</p>
                                <ul className="space-y-2 list-none">
                                    {(pkg.highlights || []).map((h: string, i: number) => (
                                        <li key={i} className="text-[10px] font-bold text-slate-500 leading-relaxed flex gap-2">
                                            <span className="text-blue-500">•</span>
                                            {h}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="p-6 pt-0 flex flex-col items-center">
                            <button
                                onClick={() => setPackageType(pkg._id)}
                                className={`w-full py-3 rounded-full text-sm font-black text-white transition-all transform active:scale-95 shadow-md ${packageType === pkg._id ? 'bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-500' : 'bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-700 hover:to-cyan-500'}`}
                            >
                                {packageType === pkg._id ? 'เลือกแล้ว' : 'เลือก'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-12 max-w-[600px] mx-auto w-full">
                <button
                    onClick={() => router.back()}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold py-4 rounded-2xl text-xl transition-all"
                >
                    ย้อนกลับ
                </button>
                <button
                    onClick={() => router.push("/register/step4")}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl text-xl transition-all shadow-xl disabled:opacity-20"
                    disabled={!packageType}
                >
                    ต่อไป
                </button>
            </div>
        </div>
    );
}
