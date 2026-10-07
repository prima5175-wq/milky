"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Toki } from "./Toki";
import { SettingsPanel } from "./SettingsPanel";
import { useChildSettings } from "./useChildSettings";
import { loadMissions } from "@/lib/child/progress";
import { SUBTITLE_CLASS } from "@/lib/child/settings";
import type { Scenario } from "@/lib/scenarios/schema";

export function ChildHome({ scenarios, nickname, demo }: { scenarios: Pick<Scenario, "id" | "setting" | "partnerLine">[]; nickname: string; demo: boolean }) {
  const [settings, setSettings] = useChildSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [doneToday, setDone] = useState<string[]>([]);
  useEffect(() => setDone(loadMissions().filter((m) => m.date === new Date().toISOString().slice(0, 10)).map((m) => m.scenarioId)), []);

  return (
    <div className={settings.lowStimulus ? "low-stim min-h-screen" : "min-h-screen"} style={{ background: "var(--bg)" }}>
      <main className="mx-auto max-w-2xl p-6">
        {demo && <p className="mb-4 rounded bg-yellow-100 p-2 text-sm">화면 확인용: 감수 전 시나리오를 임시로 보여 주는 중이에요. 실제 운영에서는 승인된 것만 나와요.</p>}
        <div className="flex items-center gap-4">
          <Toki size={96} />
          <p className={SUBTITLE_CLASS[settings.subtitleSize]}>안녕, {nickname}! 오늘도 친구 말을 같이 들어 볼까?</p>
        </div>
        <h1 className="mb-3 mt-8 text-2xl font-bold">오늘 연습</h1>
        {scenarios.length === 0 ? <p className="text-lg">오늘 연습할 이야기가 아직 없어요. 선생님께 말해 주세요.</p> : (
          <ul className="space-y-3">
            {scenarios.map((s, i) => (
              <li key={s.id}>
                <Link href={`/child/${s.id}`} className="flex items-center justify-between rounded-2xl border-2 p-5 text-xl">
                  <span>{i + 1}. {s.setting}</span><span>{doneToday.includes(s.id) ? "✔ 했어요" : "시작 ▶"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8 flex gap-3">
          <Link href="/child/stickers" className="rounded-2xl border-2 px-5 py-3 text-xl">스티커판</Link>
          <button className="rounded-2xl border-2 px-5 py-3 text-xl" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings}>화면 설정</button>
        </div>
        {showSettings && <div className="mt-4"><SettingsPanel value={settings} onChange={setSettings} /></div>}
        <p className="mt-10 text-sm opacity-70">친구와 진짜로 이야기해 보는 게 제일 중요해요. 오늘은 짧게 하고, 진짜 친구에게 해 보자!</p>
      </main>
    </div>
  );
}
