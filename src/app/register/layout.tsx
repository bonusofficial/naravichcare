"use client";

import Image from "next/image";
import Link from "next/link";
import { RegisterProvider } from "./RegisterContext";

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
    return (
        <RegisterProvider>
            <div className="min-h-screen bg-white flex flex-col items-center">
                <div className="w-full py-6 flex justify-center border-b border-gray-100">
                    <Link href="/">
                        <Image
                            src="/logo/logonavarich.png"
                            alt="NaravichCare Logo"
                            width={180}
                            height={48}
                            className="h-10 w-auto object-contain"
                        />
                    </Link>
                </div>
                <main className="w-full max-w-[1200px] px-6 py-12 flex flex-col items-center">
                    <div className="text-center mb-12">
                        <h1 className="text-[40px] font-black tracking-tight flex flex-col items-center">
                            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent uppercase text-center">
                                สมัครบริการ Naravich Care
                            </span>
                            <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-cyan-300 mt-2 rounded-full" />
                        </h1>
                    </div>
                    <div className="w-full">
                        {children}
                    </div>
                </main>
            </div>
        </RegisterProvider>
    );
}
