import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import Link from "next/link";
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
      <body>
        {process.env.NEXT_PUBLIC_DEMO_MODE && (
          <div className="bg-gold px-3 py-2 text-center text-[13px] text-ink">
            <b>체험용 화면이에요.</b> 입력한 내용은 저장되지 않고 가끔 초기화돼요. 실제 이름·연락처는 넣지 마세요.
            <nav className="mt-1.5 flex flex-wrap items-center justify-center gap-x-1 gap-y-1 font-bold">
              <span className="text-ink/60">학부모</span>
              <Link href="/" className="rounded-full bg-white px-3 py-1">첫 화면</Link>
              <Link href="/daechi" className="rounded-full bg-white px-3 py-1">대치점</Link>
              <Link href="/dogok" className="rounded-full bg-white px-3 py-1">도곡</Link>
              <Link href="/guryong" className="rounded-full bg-white px-3 py-1">구룡</Link>
              <Link href="/check" className="rounded-full bg-white px-3 py-1">신청 조회</Link>
              <span className="ml-2 text-ink/60">관리자</span>
              {/* eslint-disable @next/next/no-html-link-for-pages */}
              <a href="/demo/login/owner" className="rounded-full bg-ink px-3 py-1 text-white">원장</a>
              <a href="/demo/login/branch" className="rounded-full bg-ink px-3 py-1 text-white">지점 관리자</a>
              <a href="/demo/login/teacher" className="rounded-full bg-ink px-3 py-1 text-white">강사</a>
              {/* eslint-enable @next/next/no-html-link-for-pages */}
            </nav>
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
