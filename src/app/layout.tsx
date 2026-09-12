import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWAInit from "@/components/pwa-init";

export const metadata: Metadata = {
  title: "AVT 今日训练清单",
  description: "听损儿童AVT康复训练 — 每日训练助手",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AVT训练",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen bg-gray-50">
        <PWAInit />
        <main className="max-w-lg md:max-w-5xl mx-auto bg-white min-h-screen md:min-h-0 md:my-6 md:rounded-2xl md:shadow-lg pb-20 md:pb-6">
          {children}
        </main>
      </body>
    </html>
  );
}
