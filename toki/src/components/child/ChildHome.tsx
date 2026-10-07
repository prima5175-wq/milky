"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Toki } from "./Toki";
import { SettingsPanel } from "./SettingsPanel";
import { useChildT } from "./useChildSettings";
import { warmOffline } from "@/components/RegisterSW";
import { SUBTITLE_CLASS } from "@/lib/child/settings";
import type { Scenario } from "@/lib/scenarios/schema";

export function ChildHome({ scenarios, nickname, demo }: { scenarios: Pick<Scenario, "id" | "setting" | "partnerLine">[]; nickname: string; demo: boolean }) {
  const { t, settings, update } = useChildT();
  const [showSettings, setShowSettings] = useState(false);
  const [doneToday, setDone] = useState<string[]>([]);
  const [timeUp, setTimeUp] = useState(false);
  useEffect(() => { warmOffline(["/child", "/child/stickers", ...scenarios.map((s) => `/child/${s.id}`)]); }, [scenarios]);
  useEffect(() => { fetch("/api/usage").then((r) => r.json()).then((j) => setTimeUp(!!j.reached)).catch(() => {}); }, []);
  useEffect(() => { fetch("/api/progress").then((r) => r.json()).then((j) => setDone(j.doneToday ?? [])).catch(() => {}); }, []);

  return (
    <div className={settings.lowStimulus ? "low-stim min-h-screen" : "min-h-screen"} style={{ background: "var(--bg)" }} lang={settings.locale}>
      <main className="mx-auto max-w-2xl p-6">
        {demo && <p className="mb-4 rounded bg-yellow-100 p-2 text-sm">{t.home.demo}</p>}
        <div className="flex items-center gap-4">
          <Toki size={96} label={t.mascot} />
          <p className={SUBTITLE_CLASS[settings.subtitleSize]}>{t.home.hello(nickname)}</p>
        </div>
        {timeUp && <p role="status" className="mt-6 rounded-2xl border-2 p-4 text-xl">{t.home.timeUp}</p>}
        <h1 className="mb-3 mt-8 text-2xl font-bold">{t.home.today}</h1>
        {scenarios.length === 0 ? <p className="text-lg">{t.home.empty}</p> : (
          <ul className="space-y-3">
            {scenarios.map((s, i) => (
              <li key={s.id}>
                <Link href={`/child/${s.id}`} aria-disabled={timeUp} tabIndex={timeUp ? -1 : 0} className={`flex items-center justify-between rounded-2xl border-2 p-5 text-xl ${timeUp ? "pointer-events-none opacity-40" : ""}`}>
                  <span>{i + 1}. {s.setting}</span><span>{doneToday.includes(s.id) ? t.home.done : t.home.start}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8 flex gap-3">
          <Link href="/child/stickers" className="rounded-2xl border-2 px-5 py-3 text-xl">{t.home.stickers}</Link>
          <button className="rounded-2xl border-2 px-5 py-3 text-xl" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings}>{t.home.settings}</button>
        </div>
        {showSettings && <div className="mt-4"><SettingsPanel value={settings} onChange={update} /></div>}
        <p className="mt-10 text-sm opacity-70">{t.home.note}</p>
        {t.home.contentNote && <p className="mt-2 text-sm opacity-70">{t.home.contentNote}</p>}
      </main>
    </div>
  );
}
