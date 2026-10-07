"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadMissions, loadStickers, type PendingMission, type StickerEntry } from "@/lib/child/progress";
import { useChildSettings } from "./useChildSettings";

export function StickerBoard() {
  const [settings] = useChildSettings();
  const [stickers, setStickers] = useState<StickerEntry[]>([]);
  const [missions, setMissions] = useState<PendingMission[]>([]);
  useEffect(() => { setStickers(loadStickers()); setMissions(loadMissions()); }, []);
  const total = stickers.reduce((n, s) => n + s.points, 0);
  return (
    <div className={settings.lowStimulus ? "low-stim min-h-screen" : "min-h-screen"} style={{ background: "var(--bg)" }}>
      <main className="mx-auto max-w-2xl p-6">
        <Link href="/child" className="text-lg underline">← 처음으로</Link>
        <h1 className="my-4 text-2xl font-bold">내 스티커판 ({total}개)</h1>
        {total === 0 ? <p className="text-lg">아직 스티커가 없어요. 연습하고 미션을 해 보자!</p> :
          <div className="flex flex-wrap gap-2 text-4xl" aria-label={`스티커 ${total}개`}>{Array.from({ length: total }, (_, i) => <span key={i}>⭐</span>)}</div>}
        <h2 className="mb-2 mt-8 text-xl font-bold">어른이 확인해 줄 미션</h2>
        {missions.length === 0 ? <p className="text-lg">지금은 없어요.</p> :
          <ul className="space-y-2 text-lg">{missions.map((m) => <li key={m.scenarioId + m.date} className="rounded-2xl border-2 p-3">{m.text}</li>)}</ul>}
      </main>
    </div>
  );
}
