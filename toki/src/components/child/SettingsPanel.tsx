"use client";
import { type ChildUiSettings, SUBTITLE_CLASS } from "@/lib/child/settings";

export function SettingsPanel({ value, onChange }: { value: ChildUiSettings; onChange: (s: ChildUiSettings) => void }) {
  const set = <K extends keyof ChildUiSettings>(k: K, v: ChildUiSettings[K]) => onChange({ ...value, [k]: v });
  const btn = (on: boolean) => `rounded-full border px-4 py-2 ${on ? "bg-[var(--accent)] text-white" : ""}`;
  return (
    <section aria-label="화면 설정" className="space-y-3 rounded-2xl border p-4 text-lg">
      <div className="flex flex-wrap items-center gap-2"><span className="w-28">차분한 화면</span>
        <button className={btn(!value.lowStimulus)} onClick={() => set("lowStimulus", false)}>보통</button>
        <button className={btn(value.lowStimulus)} onClick={() => set("lowStimulus", true)}>차분하게</button></div>
      <div className="flex flex-wrap items-center gap-2"><span className="w-28">읽어주기</span>
        <button className={btn(value.readAloud)} onClick={() => set("readAloud", true)}>켜기</button>
        <button className={btn(!value.readAloud)} onClick={() => set("readAloud", false)}>끄기</button></div>
      <div className="flex flex-wrap items-center gap-2"><span className="w-28">글자 크기</span>
        {(["m", "l", "xl"] as const).map((k) => <button key={k} className={`${btn(value.subtitleSize === k)} ${SUBTITLE_CLASS[k]}`} onClick={() => set("subtitleSize", k)}>가</button>)}</div>
      <div className="flex flex-wrap items-center gap-2"><span className="w-28">말 속도</span>
        {([0.7, 0.85, 1] as const).map((r) => <button key={r} className={btn(value.speechRate === r)} onClick={() => set("speechRate", r)}>{r === 1 ? "보통" : r === 0.85 ? "천천히" : "아주 천천히"}</button>)}</div>
      <div className="flex flex-wrap items-center gap-2"><span className="w-28">답하는 방법</span>
        {([["choice", "고르기"], ["voice", "말하기"], ["text", "쓰기"]] as const).map(([k, label]) => <button key={k} className={btn(value.inputMode === k)} onClick={() => set("inputMode", k)}>{label}</button>)}</div>
    </section>
  );
}
