"use client";
import { type ChildUiSettings, SUBTITLE_CLASS } from "@/lib/child/settings";
import { messages, type Locale } from "@/lib/i18n";

export function SettingsPanel({ value, onChange }: { value: ChildUiSettings; onChange: (s: ChildUiSettings) => void }) {
  const t = messages[value.locale].child;
  const set = <K extends keyof ChildUiSettings>(k: K, v: ChildUiSettings[K]) => onChange({ ...value, [k]: v });
  const btn = (on: boolean) => `rounded-full border px-4 py-2 ${on ? "bg-[var(--accent)] text-white" : ""}`;
  return (
    <section aria-label={t.settings.aria} className="space-y-3 rounded-2xl border p-4 text-lg">
      <div className="flex flex-wrap items-center gap-2"><span className="w-28">{t.settings.calm}</span>
        <button className={btn(!value.lowStimulus)} onClick={() => set("lowStimulus", false)}>{t.settings.normal}</button>
        <button className={btn(value.lowStimulus)} onClick={() => set("lowStimulus", true)}>{t.settings.calmOn}</button></div>
      <div className="flex flex-wrap items-center gap-2"><span className="w-28">{t.settings.readAloud}</span>
        <button className={btn(value.readAloud)} onClick={() => set("readAloud", true)}>{t.settings.on}</button>
        <button className={btn(!value.readAloud)} onClick={() => set("readAloud", false)}>{t.settings.off}</button></div>
      <div className="flex flex-wrap items-center gap-2"><span className="w-28">{t.settings.size}</span>
        {(["m", "l", "xl"] as const).map((k) => <button key={k} className={`${btn(value.subtitleSize === k)} ${SUBTITLE_CLASS[k]}`} onClick={() => set("subtitleSize", k)}>{t.settings.sizeGlyph}</button>)}</div>
      <div className="flex flex-wrap items-center gap-2"><span className="w-28">{t.settings.rate}</span>
        {([[1, t.settings.rates.normal], [0.85, t.settings.rates.slow], [0.7, t.settings.rates.slower]] as const).map(([r, label]) => <button key={r} className={btn(value.speechRate === r)} onClick={() => set("speechRate", r)}>{label}</button>)}</div>
      <div className="flex flex-wrap items-center gap-2"><span className="w-28">{t.practice.modeAria}</span>
        {(["choice", "voice", "text"] as const).map((k) => <button key={k} className={btn(value.inputMode === k)} onClick={() => set("inputMode", k)}>{t.practice.modes[k]}</button>)}</div>
      <div className="flex flex-wrap items-center gap-2"><span className="w-28">{t.settings.language}</span>
        {(["ko", "en"] as Locale[]).map((l) => <button key={l} lang={l} className={btn(value.locale === l)} onClick={() => set("locale", l)}>{messages[l].child.langName}</button>)}</div>
    </section>
  );
}
