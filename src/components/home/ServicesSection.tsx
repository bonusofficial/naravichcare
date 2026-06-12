import Image from "next/image";
import { ShieldCheck } from "lucide-react";

function AppleLogo() {
    return (
        <svg viewBox="0 0 814 1000" className="w-9 h-9 fill-current text-gray-800">
            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.3 134.4-317 267.1-317 70.5 0 129.2 46.4 173.4 46.4 42.7 0 109.2-49.4 188.2-49.4 30.5 0 130.6 5.8 198.6 67.8zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
        </svg>
    );
}

function MobileCareLogoBig() {
    return (
        <div className="flex items-center gap-4 text-red-500">
            <div className="w-16 h-16 border-2 border-current rounded-2xl flex items-center justify-center shrink-0">
                <ShieldCheck size={30} />
            </div>
            <div className="leading-none">
                <p className="text-[11px] font-semibold opacity-70">Naravich</p>
                <p className="text-2xl font-black leading-tight">Mobile</p>
                <p className="text-2xl font-black leading-tight">Care</p>
                <p className="text-[11px] font-semibold opacity-60 mt-1">บริการดูแลมือถือครบวงจร</p>
            </div>
        </div>
    );
}

export function ServicesSection() {
    return (
        <section className="py-20 bg-[#FAF9FB]">
            <div className="max-w-5xl mx-auto px-4 md:px-8">

                {/* Heading */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-black mb-2">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                            บริการดูแลมือถือ
                        </span>
                    </h2>
                    <p className="text-2xl md:text-3xl font-black text-gray-800">
                        ตก แตก สูญหาย
                    </p>
                </div>

                {/* Cards */}
                <div className="grid md:grid-cols-2 gap-6">

                    {/* Card 1 — Naravich + Apple Care */}
                    <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 rounded-3xl p-10 border border-pink-100 shadow-sm flex flex-col justify-between min-h-[260px]">
                        <div className="flex items-center gap-6">
                            <MobileCareLogoBig />

                            {/* Divider */}
                            <div className="w-px h-20 bg-gray-300 mx-2 shrink-0" />

                            {/* Apple Care */}
                            <div className="flex flex-col items-center text-gray-700 gap-1">
                                <AppleLogo />
                                <p className="text-[11px] font-semibold text-gray-500 text-center leading-tight mt-1">Apple Care<br />Services</p>
                            </div>
                        </div>

                        <p className="text-base font-bold text-gray-700 mt-8">
                            Naravich Mobile Care | Apple Care Service
                        </p>
                    </div>

                    {/* Card 2 — Standard */}
                    <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-h-[260px]">
                        <div>
                            <MobileCareLogoBig />
                        </div>

                        <p className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 mt-8">
                            แพ็กเกจ Standard
                        </p>
                    </div>

                </div>
            </div>
        </section>
    );
}
