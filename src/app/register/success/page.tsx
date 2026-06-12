"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { Download, ChevronLeft, Printer, MessageCircle, Facebook, ExternalLink, CheckCircle2 } from "lucide-react";
import { useRegister } from "../RegisterContext";

export default function SuccessPage() {
    const { registrationResult } = useRegister();
    const [showCertificate, setShowCertificate] = useState(false);
    const certificateRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        window.print();
    };

    if (!registrationResult) {
        return (
            <div className="text-center py-20">
                <p className="text-xl font-bold text-gray-500">ไม่พบข้อมูลการสมัคร</p>
                <Link href="/register/step1" className="text-blue-600 underline mt-4 block">กลับไปหน้าแรก</Link>
            </div>
        );
    }

    if (showCertificate) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col items-center py-10 overflow-auto print:bg-white print:py-0">
                <div className="mb-6 flex gap-4 print:hidden">
                    <button
                        onClick={() => setShowCertificate(false)}
                        className="px-6 py-2 bg-white border border-slate-200 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
                    >
                        <ChevronLeft size={18} /> ย้อนกลับ
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
                    >
                        <Printer size={18} /> พิมพ์ใบรับรอง
                    </button>
                </div>

                <div
                    ref={certificateRef}
                    className="w-[800px] min-w-[800px] bg-white shadow-2xl overflow-hidden relative print:shadow-none print:w-full print:border-0 border-[16px] border-[#d4ae6e]/20"
                    style={{ aspectRatio: '1 / 1.414' }}
                >
                    <div className="absolute inset-4 border border-[#d4ae6e] pointer-events-none"></div>
                    <div className="p-12 space-y-8 relative">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h1 className="text-4xl font-black text-[#0c4a6e] tracking-tight uppercase italic flex items-center gap-2">
                                    CERTIFICATE <span className="text-[#d4ae6e]">นรวิชญ์ แคร์</span>
                                </h1>
                                <p className="text-[#d4ae6e] text-xs font-black tracking-[0.3em] uppercase">CERTIFICATE OF MOBILE INSURANCE</p>
                            </div>
                            <img src="/logo/logonavarich.png" alt="Logo" className="h-12 object-contain" />
                        </div>

                        <div className="space-y-4">
                            <div className="bg-[#0c4a6e] text-white px-4 py-1 inline-block text-[11px] font-black uppercase tracking-widest rounded-r-full">ข้อมูลผู้รับความคุ้มครอง</div>
                            <div className="grid grid-cols-2 gap-y-4 text-sm font-bold text-slate-700 px-2 mt-4">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">ชื่อ-นามสกุล</p>
                                    <p className="text-base text-[#0c4a6e] border-b border-slate-100 pb-1">{registrationResult.fullName || `${registrationResult.firstName} ${registrationResult.lastName}`}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">เบอร์โทรศัพท์</p>
                                    <p className="text-base text-[#0c4a6e] border-b border-slate-100 pb-1">{registrationResult.phone}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-[#0c4a6e] text-white px-4 py-1 inline-block text-[11px] font-black uppercase tracking-widest rounded-r-full">รายละเอียดอุปกรณ์</div>
                            <div className="grid grid-cols-3 gap-6 text-sm font-bold text-slate-700 px-2 mt-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">ยี่ห้อ/รุ่น</p>
                                    <p className="text-base text-[#0c4a6e] uppercase">{registrationResult.brand} {registrationResult.model}</p>
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">IMEI</p>
                                    <p className="text-base text-[#0c4a6e] tracking-widest">{registrationResult.imei}</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-12 grid grid-cols-2 gap-20">
                            <div className="text-center space-y-2 border-t border-slate-200 pt-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">ลงชื่อผู้รับความคุ้มครอง</p>
                                <p className="text-xs font-bold text-slate-700">({registrationResult.fullName || `${registrationResult.firstName} ${registrationResult.lastName}`})</p>
                            </div>
                            <div className="text-center space-y-2 border-t border-slate-200 pt-3 flex flex-col items-center">
                                <div className="h-6 italic font-serif text-blue-900 font-bold -mb-4">Naravich S.</div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">ลงชื่อผู้ให้ความคุ้มครอง</p>
                                <p className="text-xs font-bold text-slate-700">(Naravich Care Co., Ltd.)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="pt-4 text-center space-y-8 animate-in slide-in-from-bottom-5 duration-700 max-w-[800px] mx-auto pb-12">
            <div className="flex flex-col items-center gap-4 mb-2">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 className="text-blue-500 w-16 h-16" strokeWidth={1.5} />
                </div>
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight">ส่งข้อมูลการสมัครเรียบร้อย!</h2>
                <div className="bg-blue-600 text-white px-6 py-2 rounded-full font-black text-xl shadow-lg animate-pulse">
                    เลขอ้างอิงของคุณ: <span className="underline">{registrationResult.referenceNumber || registrationResult._id?.toString().slice(-6).toUpperCase()}</span>
                </div>
                <p className="text-slate-500 font-bold text-lg max-w-md">
                    กรุณาติดต่อเจ้าหน้าที่เพื่อแจ้งเลขอ้างอิงและดำเนินการชำระเงินเพื่อเปิดใช้งานความคุ้มครอง
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
                {/* LINE Admin */}
                <a
                    href="https://lin.ee/FtT3pJR"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-white border-2 border-slate-100 p-8 rounded-3xl flex flex-col items-center gap-4 hover:border-green-400 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1"
                >
                    <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
                        <MessageCircle size={48} className="text-green-500" />
                    </div>
                    <div className="text-center">
                        <h4 className="text-2xl font-black text-slate-800">แจ้งแอดมินทาง LINE</h4>
                        <p className="text-slate-400 font-bold">@naravichcare</p>
                    </div>
                    <div className="w-full py-3 bg-green-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 group-hover:bg-green-600 transition-colors">
                        ไปที่ LINE <ExternalLink size={18} />
                    </div>
                </a>

                {/* Facebook Admin */}
                <a
                    href="https://www.facebook.com/profile.php?id=100093365198954"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-white border-2 border-slate-100 p-8 rounded-3xl flex flex-col items-center gap-4 hover:border-blue-400 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1"
                >
                    <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <Facebook size={48} className="text-blue-600" />
                    </div>
                    <div className="text-center">
                        <h4 className="text-2xl font-black text-slate-800">แจ้งแอดมินทาง Facebook</h4>
                        <p className="text-slate-400 font-bold">Naravich Care Official</p>
                    </div>
                    <div className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 group-hover:bg-blue-700 transition-colors">
                        ไปที่ Facebook <ExternalLink size={18} />
                    </div>
                </a>
            </div>

            <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                <p className="text-lg text-slate-600 font-medium leading-relaxed">
                    เมื่อเจ้าหน้าที่ได้รับข้อมูลและยืนยันการชำระเงินแล้ว<br />
                    <span className="text-blue-600 font-black italic">ความคุ้มครองของท่านจะเริ่มทำงานทันที!</span>
                </p>
            </div>

            <div className="flex flex-col gap-4 max-w-md mx-auto">
                <Link
                    href="/"
                    className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl text-xl hover:bg-slate-800 transition-all text-center shadow-xl uppercase"
                >
                    กลับสู่หน้าหลัก
                </Link>
            </div>
        </div>
    );
}
