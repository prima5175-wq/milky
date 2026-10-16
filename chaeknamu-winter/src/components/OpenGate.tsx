"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { kDateTime } from "@/lib/format";

// 신청 버튼. 오픈 전에는 오픈 시각과 카운트다운을 보여주고, 오픈 순간 새로고침 없이 버튼이 열려요.
// 시간은 항상 서버 시각 기준으로 계산해요 (휴대폰 시계가 틀려도 괜찮아요).
export default function OpenGate({
  slug, openAt, serverNow, isOpen, href,
}: { slug: string; openAt: string | null; serverNow: string; isOpen: boolean; href: string }) {
  const router = useRouter();
  const [offset, setOffset] = useState(() => new Date(serverNow).getTime() - Date.now());
  const [now, setNow] = useState<number | null>(null);
  const [open, setOpen] = useState(isOpen);

  useEffect(() => {
    setOffset(new Date(serverNow).getTime() - Date.now());
    setOpen(isOpen);
  }, [serverNow, isOpen]);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = openAt && now !== null ? new Date(openAt).getTime() - (now + offset) : null;

  // 오픈 1분 전부터는 서버에 다시 물어봐요
  useEffect(() => {
    if (open || left === null || left > 60_000) return;
    const t = setInterval(async () => {
      try {
        const j = await (await fetch(`/api/status/${slug}`, { cache: "no-store" })).json();
        if (j.server_now) setOffset(new Date(j.server_now).getTime() - Date.now());
        if (j.is_open) { setOpen(true); router.refresh(); }
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [open, left === null || left > 60_000, slug, router]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!openAt && !open) {
    return <div className="rounded-xl bg-snow p-3 text-center text-[15px] text-muted">신청 일정은 곧 안내드려요.</div>;
  }
  if (!open && left !== null && left > 0) {
    const s = Math.floor(left / 1000);
    return (
      <div className="rounded-xl bg-snow p-3 text-center">
        <p className="text-[15px] text-ink">신청은 {kDateTime(openAt!)}에 열려요.</p>
        {s < 3600 && (
          <p className="mt-1 font-bold tabular-nums text-pine">
            {String(Math.floor(s / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")} 남았어요
          </p>
        )}
      </div>
    );
  }
  return <Link href={href} className="btn w-full">신청하기</Link>;
}
