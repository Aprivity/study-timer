import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/flip-clock.css";
import { Header } from "@/components/layout/Header";
import { BackgroundLayer } from "@/components/background/BackgroundLayer";
import { BackgroundProvider } from "@/components/background/BackgroundProvider";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aprivity Focus",
  description: "安静、准确、可恢复的沉浸式学习倒计时",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${geist.variable} ${geistMono.variable}`}>
        <BackgroundProvider>
          <BackgroundLayer />
          <div className="app-content">
            <Header />
            {children}
          </div>
        </BackgroundProvider>
      </body>
    </html>
  );
}
