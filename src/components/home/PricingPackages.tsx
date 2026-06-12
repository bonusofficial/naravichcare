"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface IPackage {
    _id: string;
    title: string;
    range: string;
    monthlyPrice: number;
    yearlyPrice: number;
}

export function PricingPackages() {
    const [active, setActive] = useState(0);
    const [packages, setPackages] = useState<IPackage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const res = await fetch("/api/packages");
                const data = await res.json();
                if (Array.isArray(data)) {
                    setPackages(data);
                } else {
                    console.error("Packages API didn't return an array:", data);
                    setPackages([]);
                }
            } catch (error) {
                console.error("Failed to fetch packages:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPackages();
    }, []);

    if (loading) return null;
    if (packages.length === 0) return null;

    return (
        <section className="py-20 bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50">
            <div className="max-w-[1440px] mx-auto px-4 md:px-8">

                {/* Heading */}
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 text-center mb-12">
                    แพ็กเกจบริการ
                </h2>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {packages.map((plan) => (
                        <div
                            key={plan._id}
                            className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/40 hover:scale-[1.02] transition-transform duration-300 flex flex-col gap-6"
                        >
                            {/* Header */}
                            <div>
                                <h3 className="text-xl font-black text-gray-800 mb-0.5 leading-tight">{plan.title || "ราคาเครื่อง"}</h3>
                                <p className="text-lg font-bold text-gray-500">{plan.range}</p>
                            </div>

                            {/* Monthly */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-baseline gap-1.5 flex-wrap">
                                        <span className="text-[13px] font-bold text-gray-600">รายเดือน</span>
                                        <span className="text-3xl font-black text-gray-900">{plan.monthlyPrice.toLocaleString()}</span>
                                        <span className="text-[13px] font-bold text-gray-500">บาท</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold ml-14">ราคารวม VAT</p>
                                </div>
                                <Link href="/register" className="shrink-0 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-[13px] font-black px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-100 text-center">
                                    สมัครบริการ
                                </Link>
                            </div>

                            {/* Divider Line */}
                            <div className="h-px bg-gray-50 w-full" />

                            {/* Yearly */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-baseline gap-1.5 flex-wrap">
                                        <span className="text-[13px] font-bold text-gray-600">รายปี</span>
                                        <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">{plan.yearlyPrice.toLocaleString()}</span>
                                        <span className="text-[13px] font-bold text-gray-500">บาท</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold ml-14">ราคารวม VAT</p>
                                </div>
                                <Link href="/register" className="shrink-0 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-[13px] font-black px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-100 text-center">
                                    สมัครบริการ
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Dots */}
                {packages.length > 4 && (
                    <div className="flex justify-center gap-2 mt-8">
                        {Array.from({ length: Math.ceil(packages.length / 4) }).map((_, d) => (
                            <button
                                key={d}
                                onClick={() => setActive(d)}
                                className={`rounded-full transition-all ${active === d ? "w-6 h-2.5 bg-gradient-to-r from-blue-500 to-cyan-500" : "w-2.5 h-2.5 bg-gray-300"}`}
                            />
                        ))}
                    </div>
                )}

            </div>
        </section>
    );
}

