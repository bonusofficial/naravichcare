"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";

interface HeroBannerData {
    badge1Label: string;
    badge1Title: string;
    badge1Subtitle: string;
    badge2Eyebrow: string;
    badge2Title: string;
    heading1: string;
    heading2: string;
    pillText: string;
    subText: string;
    priceMonthly: string;
    priceMonthlyUnit: string;
    priceYearly: string;
    priceYearlyUnit: string;
}

const DEFAULT: HeroBannerData = {
    badge1Label: "NARAVICH",
    badge1Title: "Mobile Care",
    badge1Subtitle: "บริการดูแลมือถือครบวงจร",
    badge2Eyebrow: "มั่นใจด้วยมาตรฐาน",
    badge2Title: "ระดับโลก",
    heading1: "มั่นใจด้วยมาตรฐาน",
    heading2: "ระดับโลก",
    pillText: "คุ้มครองอุบัติเหตุไม่จำกัดครั้ง คุ้มครองทั้งภายในและภายนอก",
    subText: "รับบริการที่ Apple Store และ Apple Service Provider ทั่วโลก",
    priceMonthly: "179.-",
    priceMonthlyUnit: "/เดือน*",
    priceYearly: "1,990.-",
    priceYearlyUnit: "/ปี*",
};

export function HeroBanner() {
    const [d, setD] = useState<HeroBannerData>(DEFAULT);

    useEffect(() => {
        fetch("/api/admin/hero-banner")
            .then(r => r.json())
            .then(res => { if (res.success) setD({ ...DEFAULT, ...res.data }); })
            .catch(() => {});
    }, []);

    return (
        <section className="relative bg-white overflow-hidden">
            <div className="flex flex-col lg:flex-row min-h-[420px]">

                {/* LEFT: Image */}
                <div className="relative w-full lg:w-1/2 min-h-[300px] lg:min-h-[420px]">
                    <Image
                        src="/iphone/iphone.jpg"
                        alt="iPhone"
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover object-center"
                        priority
                    />
                </div>

                {/* RIGHT: Content */}
                <div className="w-full lg:w-1/2 flex items-center px-8 md:px-14 py-8 lg:py-10">
                    <div className="w-full max-w-xl">

                        {/* Top Badges */}
                        <div className="flex flex-wrap gap-4 mb-6">

                            {/* Naravich Badge */}
                            <div className="flex items-center gap-3 bg-white px-5 py-4 rounded-3xl border border-gray-100 shadow-sm flex-1 min-w-[190px]">
                                <div className="w-10 h-10 flex items-center justify-center bg-purple-50 text-purple-600 rounded-xl shrink-0">
                                    <ShieldCheck size={22} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-purple-600 uppercase tracking-[0.15em] leading-none mb-1">{d.badge1Label}</p>
                                    <p className="text-base font-black text-gray-900 leading-tight">{d.badge1Title}</p>
                                    <p className="text-[9px] text-purple-400 font-semibold mt-0.5">{d.badge1Subtitle}</p>
                                </div>
                            </div>

                            {/* Apple Care Badge */}
                            <div className="flex items-center gap-3 bg-white px-5 py-4 rounded-3xl border border-gray-100 shadow-sm flex-1 min-w-[190px]">
                                <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl shrink-0">
                                    <svg viewBox="0 0 814 1000" className="w-5 h-5 fill-current text-gray-800">
                                        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.3 134.4-317 267.1-317 70.5 0 129.2 46.4 173.4 46.4 42.7 0 109.2-49.4 188.2-49.4 30.5 0 130.6 5.8 198.6 67.8zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[9px] text-gray-400 font-semibold leading-none mb-1">{d.badge2Eyebrow}</p>
                                    <p className="text-base font-black text-gray-900 leading-tight">{d.badge2Title}</p>
                                </div>
                            </div>
                        </div>

                        {/* Main Heading */}
                        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-5 leading-[1.15]">
                            {d.heading1}<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">{d.heading2}</span>
                        </h1>

                        {/* Protection Pill */}
                        <div className="bg-gradient-to-r from-cyan-400 to-purple-600 text-white rounded-full px-6 py-2.5 font-bold text-sm inline-block mb-3 shadow-lg shadow-purple-100">
                            {d.pillText}
                        </div>

                        <p className="text-sm font-semibold text-gray-500 mb-6">{d.subText}</p>

                        {/* Price Cards */}
                        <div className="flex bg-white rounded-2xl border border-pink-200 overflow-hidden shadow-md">
                            <div className="flex-1 px-6 py-5">
                                <p className="text-xs font-semibold text-gray-500 mb-1">เริ่มเพียง</p>
                                <div className="flex items-baseline gap-0.5">
                                    <span className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                                        {d.priceMonthly}
                                    </span>
                                    <span className="text-xs font-bold text-gray-400 ml-1">{d.priceMonthlyUnit}</span>
                                </div>
                            </div>

                            <div className="w-px bg-gradient-to-b from-pink-300 to-purple-400 my-3" />

                            <div className="flex-1 px-6 py-5">
                                <p className="text-xs font-semibold text-gray-500 mb-1">เริ่มเพียง</p>
                                <div className="flex items-baseline gap-0.5">
                                    <span className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                                        {d.priceYearly}
                                    </span>
                                    <span className="text-xs font-bold text-gray-400 ml-1">{d.priceYearlyUnit}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </section>
    );
}
