"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Phone, Mail } from "lucide-react";

interface FooterLink {
    label: string;
    href: string;
}

interface FooterData {
    description: string;
    menuTitle: string;
    menuItems: FooterLink[];
    contactTitle: string;
    phoneDisplay: string;
    phoneHref: string;
    emailDisplay: string;
    emailHref: string;
    copyrightText: string;
    poweredByText: string;
}

const DEFAULT: FooterData = {
    description: "บริการดูแลมือถือครบวงจร ตก แตก สูญหาย\nคุ้มครองอุบัติเหตุ มอบความอุ่นใจในทุกการใช้งาน\nNaravichCare คู่คิดที่แท้จริงสำหรับอุปกรณ์ของคุณ",
    menuTitle: "เมนู",
    menuItems: [
        { label: "หน้าแรก", href: "/" },
        { label: "ลงทะเบียนสมัคร", href: "/register" },
        { label: "ตรวจสอบกรมธรรม์", href: "/check-policy" },
        { label: "พอร์ทัลลูกค้า", href: "/portal" },
    ],
    contactTitle: "ติดต่อสอบถาม",
    phoneDisplay: "02-XXX-XXXX",
    phoneHref: "tel:+6602XXXXXXX",
    emailDisplay: "contact@naravichcare.com",
    emailHref: "mailto:contact@naravichcare.com",
    copyrightText: "NaravichCare. All rights reserved.",
    poweredByText: "Naravich Group",
};

export function Footer() {
    const [d, setD] = useState<FooterData>(DEFAULT);

    useEffect(() => {
        fetch("/api/footer")
            .then(r => r.json())
            .then(res => {
                if (res.success && res.data) {
                    setD({
                        ...DEFAULT,
                        ...res.data,
                        menuItems: res.data.menuItems?.length ? res.data.menuItems : DEFAULT.menuItems,
                    });
                }
            })
            .catch(() => {});
    }, []);

    return (
        <footer className="bg-[#0A0A0B] text-gray-400 pt-24 pb-12 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-20">

                    {/* Brand Section */}
                    <div className="lg:col-span-5">
                        <div className="mb-8">
                            <Image
                                src="/logo/logonavarich.png"
                                alt="NaravichCare"
                                width={180}
                                height={60}
                                className="brightness-0 invert object-contain"
                            />
                        </div>
                        <p className="text-base text-gray-500 leading-relaxed mb-8 max-w-sm whitespace-pre-line">
                            {d.description}
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="lg:col-span-3">
                        <h4 className="text-white font-bold text-lg mb-7">{d.menuTitle}</h4>
                        <ul className="space-y-4">
                            {d.menuItems.map((item, i) => (
                                <li key={i}>
                                    <Link href={item.href} className="text-sm hover:text-blue-400 transition-colors flex items-center group">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500/0 group-hover:bg-blue-500 mr-0 transition-all group-hover:mr-2"></span>
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="lg:col-span-4">
                        <h4 className="text-white font-bold text-lg mb-7">{d.contactTitle}</h4>
                        <div className="space-y-5">
                            <a href={d.phoneHref} className="flex items-center gap-4 group cursor-pointer">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                    <Phone size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">โทรศัพท์</p>
                                    <p className="text-sm text-gray-200 font-bold tracking-wide">{d.phoneDisplay}</p>
                                </div>
                            </a>
                            <a href={d.emailHref} className="flex items-center gap-4 group cursor-pointer">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-all">
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">อีเมล</p>
                                    <p className="text-sm text-gray-200 font-bold">{d.emailDisplay}</p>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>

                <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-8">
                        <p className="text-xs text-gray-600 font-medium tracking-wide">
                            © {new Date().getFullYear()} {d.copyrightText}
                        </p>
                        <div className="flex gap-6">
                            <Link href="/privacy" className="text-xs text-gray-600 hover:text-white transition-colors">นโยบายความเป็นส่วนตัว</Link>
                            <Link href="/terms" className="text-xs text-gray-600 hover:text-white transition-colors">เงื่อนไขการใช้บริการ</Link>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <p className="text-[10px] text-gray-700 font-bold uppercase tracking-widest">Powered by</p>
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 bg-white/10 rounded flex items-center justify-center overflow-hidden">
                                <Image src="/logo/logonavarich.png" alt="Mini Logo" width={10} height={10} className="brightness-0 invert opacity-50" />
                            </div>
                            <span className="text-xs text-gray-500 font-black tracking-tight">{d.poweredByText}</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
