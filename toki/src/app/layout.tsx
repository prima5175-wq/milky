import "./globals.css";
import type { Viewport } from "next";
import { t } from "@/lib/i18n";
import { RegisterSW } from "@/components/RegisterSW";

export const metadata = { title: t().app.name, description: t().app.tagline, icons: { apple: "/icons/apple-touch-icon.png" }, appleWebApp: { capable: true, title: "토키", statusBarStyle: "default" as const } };
export const viewport: Viewport = { themeColor: "#6c63ff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}<RegisterSW /></body>
    </html>
  );
}
