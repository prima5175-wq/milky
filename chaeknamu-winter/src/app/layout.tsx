import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const serif = Noto_Serif_KR({
  weight: ["700", "900"],
  variable: "--font-noto-serif",
  display: "swap",
  preload: false,
});
const sans = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "책나무 강남서초지사 · 2027 겨울방학특강",
  description: "몰입독서반 안내와 신청",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
