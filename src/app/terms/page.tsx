"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft, Loader2, FileText } from "lucide-react";

export default function TermsPage() {
    const [title, setTitle] = useState("เงื่อนไขการใช้บริการ");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/legal/terms")
            .then(r => r.json())
            .then(d => {
                if (d.success && d.data) {
                    setTitle(d.data.title || "เงื่อนไขการใช้บริการ");
                    setContent(d.data.content || "");
                }
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Header />
            <main className="flex-grow py-12 md:py-16">
                <div className="max-w-3xl mx-auto px-4 md:px-8">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-8">
                        <ArrowLeft size={16} /> กลับหน้าแรก
                    </Link>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 size={40} className="animate-spin text-blue-500" />
                            <p className="text-sm font-bold text-slate-400">กำลังโหลด...</p>
                        </div>
                    ) : (
                        <article className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-br from-purple-600 to-purple-800 px-8 py-10 text-white">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                        <FileText size={24} />
                                    </div>
                                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">{title}</h1>
                                </div>
                                <p className="text-purple-100 text-sm font-medium">NaravichCare</p>
                            </div>
                            <div className="p-8 md:p-10">
                                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-line">
                                    {content || "ยังไม่มีเนื้อหา — แก้ไขได้จากหลังบ้าน"}
                                </div>
                            </div>
                        </article>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
