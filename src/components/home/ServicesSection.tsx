import Image from "next/image";
import { ShieldCheck } from "lucide-react";

function PartnerLogo() {
    return (
        <Image
            src="/logo/logo.png"
            alt="NaravichCare"
            width={72}
            height={72}
            className="w-16 h-16 object-contain"
        />
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

                            {/* Partner logo */}
                            <div className="flex flex-col items-center text-gray-700 gap-1">
                                <PartnerLogo />
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
