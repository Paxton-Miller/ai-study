import type { Metadata } from "next";
import { Inter, Azeret_Mono } from "next/font/google";
import "./globals.css";

// 1. 核心正文字体：Inter (自带极佳的 OpenType 特性)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// 2. 代码/等宽字体：Azeret Mono
const azeretMono = Azeret_Mono({
  subsets: ["latin"],
  variable: "--font-azeret-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Copilot - Framer Design",
  description: "Production-grade UI inspired by Framer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      // 我们移除了本地字体的变量，缺失的字体会在 globals.css 中自动降级为系统无衬线字体
      className={`${inter.variable} ${azeretMono.variable}`}
    >
      <body className="antialiased bg-void text-white min-h-screen selection:bg-framer-blue selection:text-white">
        <main className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}