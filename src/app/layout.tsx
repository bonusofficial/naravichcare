import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/components/layout/CookieConsent";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

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
      <body className={`${notoSansThai.variable} antialiased font-sans`} suppressHydrationWarning>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
