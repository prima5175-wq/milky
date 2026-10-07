"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useChildT } from "./useChildSettings";

export function StickerBoard() {
  const { t, settings } = useChildT();
  const [total, setTotal] = useState(0);
  const [missions, setMissions] = useState<Array<{ text: string; day: string }>>([]);
  useEffect(() => { fetch("/api/progress").then((r) => r.json()).then((j) => { setTotal(j.points ?? 0); setMissions(j.openMissions ?? []); }).catch(() => {}); }, []);
  return (
    <div className={settings.lowStimulus ? "low-stim min-h-screen" : "min-h-screen"} style={{ background: "var(--bg)" }}>
      <main className="mx-auto max-w-2xl p-6">
        <Link href="/child" className="text-lg underline">{t.back}</Link>
        <h1 className="my-4 text-2xl font-bold">{t.stickers.title(total)}</h1>
        {total === 0 ? <p className="text-lg">{t.stickers.none}</p> :
          <div className="flex flex-wrap gap-2 text-4xl" aria-label={t.stickers.starsAria(total)}>{Array.from({ length: total }, (_, i) => <span key={i}>⭐</span>)}</div>}
        <h2 className="mb-2 mt-8 text-xl font-bold">{t.stickers.pending}</h2>
        {missions.length === 0 ? <p className="text-lg">{t.stickers.noMissions}</p> :
          <ul className="space-y-2 text-lg">{missions.map((m) => <li key={m.text + m.day} className="rounded-2xl border-2 p-3">{m.text}</li>)}</ul>}
      </main>
    </div>
  );
}
