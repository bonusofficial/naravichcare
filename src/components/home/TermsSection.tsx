"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface TermItem {
    title: string;
    content: string;
    isActive: boolean;
}

const FALLBACK_TERMS: TermItem[] = [
    {
        title: "เงื่อนไขการสมัครแพ็กเกจ",
        content: `• ต้องสมัครภายใน 30 วันนับจากวันที่ซื้ออุปกรณ์\n• อุปกรณ์ต้องอยู่ในสภาพที่ดีก่อนสมัคร ไม่มีรอยแตก หน้าจอเสียหาย หรือน้ำเข้า`,
        isActive: true,
    },
];

export function TermsSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [terms, setTerms] = useState<TermItem[]>([]);

    useEffect(() => {
        fetch("/api/admin/terms")
            .then(r => r.json())
            .then(d => {
                if (d.success && d.data?.items?.length > 0) {
                    setTerms(d.data.items.filter((t: TermItem) => t.isActive));
                } else {
                    setTerms(FALLBACK_TERMS);
                }
            })
            .catch(() => setTerms(FALLBACK_TERMS));
    }, []);

    return (
        <section id="terms" className="py-20 bg-gradient-to-br from-slate-50 to-blue-50/30">
            <div className="max-w-7xl mx-auto px-4 md:px-8">

                {/* Heading */}
                <div className="mb-12">
                    <p className="text-sm font-black uppercase tracking-widest text-blue-500 mb-2">Legal</p>
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900">
                        เงื่อนไขและข้อตกลง<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">การให้บริการ</span>
                    </h2>
                </div>

                {/* Accordion Cards */}
                <div className="space-y-3">
                    {terms.map((term, i) => {
                        const isOpen = openIndex === i;
                        return (
                            <div
                                key={i}
                                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isOpen
                                    ? "border-blue-200 bg-white shadow-lg shadow-blue-50"
                                    : "border-gray-100 bg-white hover:border-blue-100 hover:shadow-sm"
                                    }`}
                            >
                                <button
                                    className="w-full flex items-center justify-between px-6 py-5 text-left"
                                    onClick={() => setOpenIndex(isOpen ? null : i)}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-colors ${isOpen ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
                                            }`}>
                                            {i + 1}
                                        </span>
                                        <span className={`text-base md:text-lg font-bold transition-colors ${isOpen ? "text-blue-600" : "text-gray-800"}`}>
                                            {term.title}
                                        </span>
                                    </div>
                                    <ChevronDown
                                        size={18}
                                        className={`shrink-0 transition-all duration-300 ${isOpen ? "rotate-180 text-blue-500" : "text-gray-400"}`}
                                    />
                                </button>

                                {/* Content */}
                                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                                    <div className="px-6 pb-6 pl-[4.25rem]">
                                        <div className="h-px bg-blue-50 mb-4" />
                                        <p className="text-sm md:text-base text-gray-600 leading-relaxed whitespace-pre-line">
                                            {term.content}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
}
