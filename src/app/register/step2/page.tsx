"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useRegister } from "../RegisterContext";

const phoneData: Record<string, string[]> = {
    Apple: [
        "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16",
        "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
        "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
        "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini",
        "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12",
        "iPhone 11", "iPhone SE (Gen 3)",
        "iPad Pro", "iPad Air", "iPad mini", "iPad",
        "Apple Watch Ultra", "Apple Watch Series (ทุกรุ่น)",
        "MacBook Pro", "MacBook Air"
    ],
    Samsung: [
        "Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S24 FE",
        "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23", "Galaxy S23 FE",
        "Galaxy S22 Ultra", "Galaxy S22+", "Galaxy S22",
        "Galaxy Z Fold6", "Galaxy Z Flip6",
        "Galaxy Z Fold5", "Galaxy Z Flip5",
        "Galaxy Z Fold4", "Galaxy Z Flip4",
        "Galaxy A55 5G", "Galaxy A35 5G", "Galaxy A25 5G", "Galaxy A15",
        "Galaxy A54 5G", "Galaxy A34 5G",
        "Galaxy Tab S9 Series", "Galaxy Tab S8 Series"
    ],
    Oppo: [
        "Find N3", "Find N3 Flip", "Find X7 Ultra", "Find X7",
        "Reno12 Pro 5G", "Reno12 5G", "Reno12 F 5G",
        "Reno11 Pro 5G", "Reno11 5G", "Reno11 F 5G",
        "A98 5G", "A79 5G", "A78", "A60", "A38"
    ],
    Vivo: [
        "X100 Pro 5G", "X100 5G", "X90 Pro 5G",
        "V30 Pro 5G", "V30 5G", "V30e 5G",
        "V29 5G", "V29e 5G",
        "Y100 5G", "Y36 5G", "Y27s"
    ],
    Xiaomi: [
        "14 Ultra", "14", "13T Pro", "13T",
        "Redmi Note 13 Pro+ 5G", "Redmi Note 13 Pro 5G", "Redmi Note 13",
        "Redmi 13C", "Redmi 12",
        "POCO F6 Pro", "POCO X6 Pro 5G", "POCO M6 Pro"
    ],
    Realme: [
        "12 Pro+ 5G", "12+ 5G", "12 5G",
        "11 Pro+ 5G", "11 Pro 5G", "11 5G",
        "C67", "C65", "C53", "Note 50"
    ],
    Huawei: [
        "Pura 70 Ultra", "Pura 70 Pro", "Pura 70",
        "Mate 60 Pro", "P60 Pro",
        "Nova 12 SE", "Nova 12i", "Nova 11 Pro"
    ],
    Honor: [
        "Magic6 Pro", "Magic V2",
        "200 Pro", "200", "90 5G",
        "X9b 5G", "X8b", "X7b"
    ]
};

export default function Step2() {
    const router = useRouter();
    const { brand, setBrand, model, setModel, devicePrice, setDevicePrice, setDeviceType } = useRegister();

    // State to toggle manual input
    const [isCustomBrand, setIsCustomBrand] = useState(false);
    const [isCustomModel, setIsCustomModel] = useState(false);

    const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === "อื่นๆ") {
            setIsCustomBrand(true);
            setBrand("");
            setModel("");
        } else {
            setIsCustomBrand(false);
            setBrand(val);
            setIsCustomModel(false); // Reset custom model when brand changes
            setModel("");
        }
    };

    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === "อื่นๆ") {
            setIsCustomModel(true);
            setModel("");
        } else {
            setIsCustomModel(false);
            setModel(val);
        }
    };

    const handleNext = () => {
        // Logic to determine deviceType
        let identifiedType = "Smartphone";
        const m = model.toLowerCase();
        const b = brand.toLowerCase();

        if (b === "apple") {
            if (m.includes("iphone")) identifiedType = "iPhone";
            else if (m.includes("ipad")) identifiedType = "iPad";
        } else {
            // Check for tablets from other brands
            if (m.includes("tab") || m.includes("pad")) identifiedType = "Tablet";
        }

        setDeviceType(identifiedType);
        router.push("/register/step3");
    };

    const availableModels = phoneData[brand] || [];

    return (
        <div className="w-full max-w-[600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-slate-800">รายละเอียดอุปกรณ์</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">ข้อมูลสำหรับคำนวณเบี้ยประกัน</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">

                {/* Brand */}
                <div className="space-y-3">
                    <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">ยี่ห้อ (Brand)</label>
                    {!isCustomBrand ? (
                        <select
                            className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-blue-500 focus:outline-none transition-colors text-slate-800 font-bold bg-slate-50 appearance-none cursor-pointer"
                            value={brand && phoneData[brand] ? brand : (brand ? "อื่นๆ" : "")}
                            onChange={handleBrandChange}
                        >
                            <option value="">เลือกยี่ห้อของคุณ</option>
                            {Object.keys(phoneData).map((b) => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                            <option value="อื่นๆ" className="font-bold text-blue-600">ยี่ห้ออื่นๆ (พิมพ์ระบุเอง)</option>
                        </select>
                    ) : (
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="พิมพ์ยี่ห้อของคุณ..."
                                className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-blue-500 focus:outline-none transition-colors text-slate-800 font-bold bg-slate-50"
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                                autoFocus
                            />
                            <button
                                onClick={() => { setIsCustomBrand(false); setBrand(""); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-400 hover:text-blue-500"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    )}
                </div>

                {/* Model */}
                <div className="space-y-3">
                    <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">รุ่น (Model)</label>
                    {(!isCustomModel && !isCustomBrand && brand && availableModels.length > 0) ? (
                        <select
                            className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-blue-500 focus:outline-none transition-colors text-slate-800 font-bold bg-slate-50 appearance-none cursor-pointer disabled:opacity-50"
                            value={model && availableModels.includes(model) ? model : (model ? "อื่นๆ" : "")}
                            disabled={!brand}
                            onChange={handleModelChange}
                        >
                            <option value="">เลือกรุ่น</option>
                            {availableModels.map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                            <option value="อื่นๆ" className="font-bold text-blue-600">รุ่นอื่นๆ หรือหาไม่เจอ (พิมพ์ระบุเอง)</option>
                        </select>
                    ) : (
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={!brand ? "กรุณาเลือกหรือระบุยี่ห้อก่อน" : "พิมพ์รุ่นอุปกรณ์ของคุณ..."}
                                className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-blue-500 focus:outline-none transition-colors text-slate-800 font-bold bg-slate-50 disabled:opacity-50"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                disabled={!brand}
                                autoFocus={isCustomModel || isCustomBrand}
                            />
                            {(isCustomModel && !isCustomBrand && availableModels.length > 0) && (
                                <button
                                    onClick={() => { setIsCustomModel(false); setModel(""); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-400 hover:text-blue-500"
                                >
                                    ยกเลิก
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="py-2 border-t border-slate-50"></div>

                {/* Price */}
                <div className="space-y-3">
                    <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">ราคาเครื่องโดยประมาณ (บาท)</label>
                    <input
                        type="number"
                        placeholder="เช่น 35000"
                        className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-blue-500 focus:outline-none transition-colors text-slate-800 font-bold text-xl bg-slate-50"
                        value={devicePrice}
                        onChange={(e) => setDevicePrice(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400 font-bold italic ml-2">หมายเหตุ: ราคาเครื่องจะถูกนำไปคำนวณแพ็กเกจในหน้าถัดไป</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
                <button
                    onClick={() => router.back()}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold py-5 rounded-2xl text-lg transition-all uppercase tracking-widest"
                >
                    ย้อนกลับ
                </button>
                <button
                    onClick={handleNext}
                    className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black py-5 rounded-2xl text-lg transition-all shadow-xl shadow-slate-200 disabled:opacity-20 disabled:hover:bg-slate-900 uppercase tracking-widest flex items-center justify-center gap-2"
                    disabled={!brand || !model || !devicePrice}
                >
                    ต่อไป
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </button>
            </div>
        </div>
    );
}
