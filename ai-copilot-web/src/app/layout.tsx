import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Copilot - Framer Design",
  description: "Production-grade UI inspired by Awesome Design",
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
    >
      <body >
        <main className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}