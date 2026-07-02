import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tha Khlong AI Art Gallery - คลังสะสมผลงานศิลปะ AI",
  description: "นิทรรศการแสดงผลงานภาพวาดเวกเตอร์ SVG ที่สร้างสรรค์ผ่านคำสั่งภาษาไทย (Prompt) ของเด็กนักเรียน ร่วมกับปัญญาประดิษฐ์ Google Gemini AI และเชื่อมต่อซิงก์ข้อมูลแบบเรียลไทม์",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
