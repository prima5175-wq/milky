"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { kDateTime } from "@/lib/format";

// 신청 버튼. 오픈 전에는 오픈 시각과 카운트다운을 보여주고, 오픈 순간 새로고침 없이 버튼이 열려요.
// (4단계에서 서버 시각과 오차를 맞추도록 바꿔요)
export default function OpenGate({ openAt, href }: { openAt: string | null; href: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!openAt) {
    return <div className="rounded-xl bg-snow p-3 text-center text-[15px] text-muted">신청 일정은 곧 안내드려요.</div>;
  }
  const left = new Date(openAt).getTime() - (now ?? 0);
  if (now !== null && left > 0) {
    const s = Math.floor(left / 1000);
    const showCount = s < 3600;
    return (
      <div className="rounded-xl bg-snow p-3 text-center">
        <p className="text-[15px] text-ink">신청은 {kDateTime(openAt)}에 열려요.</p>
        {showCount && (
          <p className="mt-1 font-bold tabular-nums text-pine">
            {String(Math.floor(s / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")} 남았어요
          </p>
        )}
      </div>
    );
  }
  return (
    <Link href={href} className="btn w-full">
      신청하기
    </Link>
  );
}
