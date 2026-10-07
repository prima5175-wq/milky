"use client";
import Link from "next/link";
import { Toki } from "./Toki";
import { useChildT } from "./useChildSettings";

export function TimeUp() {
  const { t, settings } = useChildT();
  return (
    <div className={settings.lowStimulus ? "low-stim min-h-screen" : "min-h-screen"} style={{ background: "var(--bg)" }}>
      <main className="mx-auto max-w-2xl space-y-6 p-8 text-center">
        <Toki size={120} label={t.mascot} />
        <h1 className="text-3xl font-bold">{t.timeUp.title}</h1>
        <p className="text-2xl">{t.timeUp.body}</p>
        <Link href="/child/stickers" className="block rounded-2xl bg-[var(--accent)] p-4 text-xl text-white">{t.timeUp.stickers}</Link>
      </main>
    </div>
  );
}
