import type { Metadata } from "next";
import "./globals.css";
import { CookieConsent } from "@/components/layout/CookieConsent";

// Anuphan รองรับน้ำหนัก 100–700; @font-face มาจาก thai-web-fonts บน jsDelivr
const ANUPHAN_CSS = "https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@7/fonts/Anuphan/var/Anuphan%5Bwght%5D.css";

export const metadata: Metadata = {
  title: "NaravichCare",
  description: "บริการดูแลมือถือครบวงจร ตก แตก สูญหาย",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href={ANUPHAN_CSS} precedence="default" />
      </head>
      <body className="antialiased font-sans" suppressHydrationWarning>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
