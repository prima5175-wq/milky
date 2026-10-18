"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { kDateTime } from "@/lib/format";
import type { Branch } from "@/lib/types";

type Props = Pick<Branch, "phase" | "open_at" | "priority_end_at" | "general_open_at" | "next_change_at" | "server_now"> & { slug: string; href: string };

// 신청 버튼. 단계(오픈 전 → 재원생 우대 → 쉬는 기간 → 전체 접수 → 마감)에 맞춰 안내하고,
// 시간은 항상 서버 시각 기준이라 휴대폰 시계가 틀려도 괜찮아요. 단계가 바뀌는 순간 새로고침 없이 바뀌어요.
export default function OpenGate({ slug, href, phase: initial, open_at, priority_end_at, general_open_at, next_change_at, server_now }: Props) {
  const router = useRouter();
  const [offset, setOffset] = useState(() => new Date(server_now).getTime() - Date.now());
  const [now, setNow] = useState<number | null>(null);
  const [phase, setPhase] = useState(initial);

  useEffect(() => { setOffset(new Date(server_now).getTime() - Date.now()); setPhase(initial); }, [server_now, initial]);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = next_change_at && now !== null ? new Date(next_change_at).getTime() - (now + offset) : null;
  const near = left !== null && left <= 60_000;

  // 단계가 바뀔 시각 1분 전부터는 서버에 다시 물어봐요
  useEffect(() => {
    if (!near) return;
    const t = setInterval(async () => {
      try {
        const j = await (await fetch(`/api/status/${slug}`, { cache: "no-store" })).json();
        if (j.server_now) setOffset(new Date(j.server_now).getTime() - Date.now());
        if (j.phase && j.phase !== phase) { setPhase(j.phase); router.refresh(); }
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [near, slug, phase, router]);

  const count = left !== null && left > 0 && left < 3600_000 ? (
    <p className="mt-1 font-bold tabular-nums text-pine">
      {String(Math.floor(left / 60000)).padStart(2, "0")}:{String(Math.floor((left % 60000) / 1000)).padStart(2, "0")} 남았어요
    </p>
  ) : null;
  const box = "rounded-xl bg-snow p-3 text-center text-[15px]";

  if (phase === "closed") return <div className={`${box} text-muted`}>신청이 마감되었어요.</div>;
  if (phase === "before" && !open_at) return <div className={`${box} text-muted`}>신청 일정은 곧 안내드려요.</div>;
  if (phase === "before") return (
    <div className={box}>
      <p>{priority_end_at ? "재원생 우대 신청은" : "신청은"} {kDateTime(open_at!)}에 열려요.</p>{count}
    </div>
  );
  if (phase === "paused") return (
    <div className={box}>
      <p>지금은 확정 문자를 보내는 기간이라 접수를 쉬어요.</p>
      <p className="font-bold">비재원생 신청은 {general_open_at ? kDateTime(general_open_at) : "곧"}에 열려요.</p>{count}
    </div>
  );
  return (
    <div className="space-y-1.5">
      {phase === "priority" && <p className="text-center text-sm text-muted">재원생 우대 신청 기간이에요{priority_end_at ? ` (${kDateTime(priority_end_at).replace(/ 오.*| 밤.*/, "")}까지)` : ""}</p>}
      <Link href={href} className="btn w-full">신청하기</Link>
    </div>
  );
}
