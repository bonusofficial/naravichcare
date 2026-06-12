"use client";

import React, { useEffect, useState } from "react";
import { MessageCircle, X, Phone, MessageSquare, Facebook, ChevronRight, Mail } from "lucide-react";
import Image from "next/image";

type IconType = "facebook" | "line" | "phone" | "email";

interface ContactMethod {
    iconType: IconType;
    label: string;
    desc: string;
    href: string;
    isActive: boolean;
}

interface FloatingChatData {
    brandName: string;
    greetingText: string;
    footerText: string;
    contacts: ContactMethod[];
}

const DEFAULT: FloatingChatData = {
    brandName: "NaravichCare",
    greetingText: "สวัสดีค่ะ! ยินดีต้อนรับสู่ NaravichCare\nต้องการสอบถามบริการไหน เลือกได้เลยค่ะ",
    footerText: "Official Support Channel • Mon-Sun 09:00-18:00",
    contacts: [
        { iconType: "facebook", label: "Chat with us", desc: "Facebook Messenger", href: "https://m.me/naravichcare", isActive: true },
        { iconType: "line", label: "Add friend", desc: "@naravichcare", href: "https://line.me/ti/p/naravichcare", isActive: true },
        { iconType: "phone", label: "Call Support", desc: "02-XXX-XXXX", href: "tel:+66XXXXXXXXX", isActive: true },
    ],
};

function ContactIcon({ type }: { type: IconType }) {
    if (type === "facebook") return <Facebook size={18} className="text-[#0084FF]" />;
    if (type === "line") return <MessageSquare size={18} className="text-[#06C755]" />;
    if (type === "email") return <Mail size={18} className="text-orange-500" />;
    return <Phone size={18} className="text-blue-600" />;
}

export function FloatingChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [d, setD] = useState<FloatingChatData>(DEFAULT);

    useEffect(() => {
        fetch("/api/admin/floating-chat")
            .then(r => r.json())
            .then(res => {
                if (res.success) setD({ ...DEFAULT, ...res.data, contacts: res.data.contacts ?? DEFAULT.contacts });
            })
            .catch(() => {});
    }, []);

    const activeContacts = d.contacts.filter(c => c.isActive);

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">

            {/* Chat Window */}
            {isOpen && (
                <div className="mb-6 w-[320px] md:w-[360px] bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-10 zoom-in-95 duration-500 origin-bottom-right">

                    {/* Header */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 pt-10 text-white relative">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20 transition-colors"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 rounded-xl bg-white p-2 shadow-lg">
                                <Image
                                    src="/logo/logonavarich.png"
                                    alt="Logo"
                                    width={40}
                                    height={40}
                                    className="object-contain"
                                />
                            </div>
                            <div>
                                <h3 className="font-black text-xl leading-tight">{d.brandName}</h3>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                    <span className="text-xs font-semibold text-blue-100 opacity-80 uppercase tracking-wider">Online Now</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-blue-50/70 font-medium leading-relaxed whitespace-pre-line">
                            {d.greetingText}
                        </p>
                    </div>

                    {/* Contact List */}
                    <div className="p-6 space-y-3 bg-gray-50/50">
                        {activeContacts.map((method, index) => (
                            <a
                                key={index}
                                href={method.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 transition-all group"
                                style={{
                                    animation: `slide-up 0.4s ease-out forwards ${index * 0.1 + 0.2}s`,
                                    opacity: 0
                                }}
                            >
                                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center transition-colors group-hover:bg-blue-50">
                                    <ContactIcon type={method.iconType} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{method.desc}</p>
                                    <p className="text-sm font-black text-gray-800">{method.label}</p>
                                </div>
                                <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                            </a>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-5 bg-white text-center border-t border-gray-50">
                        <p className="text-[11px] text-gray-400 font-medium">{d.footerText}</p>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_15px_35px_-5px_rgba(37,99,235,0.4)] transition-all duration-500 relative group animate-bounce-slow
                    ${isOpen ? "bg-white text-gray-800 rotate-90 scale-90" : "bg-blue-600 text-white hover:scale-110 active:scale-95"}
                `}
            >
                {isOpen ? (
                    <X size={24} />
                ) : (
                    <>
                        <div className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-20"></div>
                        <MessageCircle size={28} className="relative z-10 group-hover:rotate-12 transition-transform" />
                    </>
                )}
            </button>

            <style jsx>{`
                @keyframes slide-up {
                    from { transform: translateY(15px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 4s infinite;
                }
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
            `}</style>
        </div>
    );
}
