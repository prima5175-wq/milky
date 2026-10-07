"use client";
import { useMemo, useState } from "react";
import { DOMAINS, type Domain, type Level, type Scenario } from "@/lib/scenarios/schema";
import { suggestScenarios, validatePrescription, MINUTES_PER_SCENARIO } from "@/lib/scenarios/prescription";

export function PrescriptionForm({ ageBand, scenarios }: { ageBand: string; scenarios: Scenario[] }) {
  const [minutes, setMinutes] = useState(15), [count, setCount] = useState(3), [level, setLevel] = useState<Level>(2);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const check = validatePrescription({ dailyMinutes: minutes, dailyScenarios: count, targetLevel: level, targetDomains: domains });
  const suggestions = useMemo(() => suggestScenarios({ ageBand, targetLevel: level, targetDomains: domains }, scenarios, assigned).slice(0, 8), [ageBand, level, domains, scenarios, assigned]);
  const toggle = (d: Domain) => setDomains((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]));
  const num = (v: string) => (v === "" ? NaN : Number(v));

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-sm">하루 연습 시간(분)<input type="number" className="w-full rounded border p-1" value={Number.isNaN(minutes) ? "" : minutes} onChange={(e) => { setMinutes(num(e.target.value)); setSaved(false); }} /></label>
        <label className="text-sm">하루 시나리오 개수<input type="number" className="w-full rounded border p-1" value={Number.isNaN(count) ? "" : count} onChange={(e) => { setCount(num(e.target.value)); setSaved(false); }} /></label>
        <label className="text-sm">목표 단계
          <select className="w-full rounded border p-1" value={level} onChange={(e) => setLevel(+e.target.value as Level)}>
            <option value={1}>1 반응하기</option><option value={2}>2 질문하기</option><option value={3}>3 내 경험 연결하기</option><option value={4}>4 감정 읽어주기</option>
          </select>
        </label>
      </section>
      <fieldset className="text-sm"><legend className="mb-1 font-medium">목표 영역</legend>
        <div className="flex flex-wrap gap-3">{DOMAINS.map((d) => <label key={d}><input type="checkbox" checked={domains.includes(d)} onChange={() => toggle(d)} /> {d}</label>)}</div>
      </fieldset>
      {check.errors.map((e) => <p key={e} role="alert" className="text-sm text-red-700">{e}</p>)}
      {check.warnings.map((w) => <p key={w} className="text-sm text-amber-700">{w} (시나리오 1개 약 {MINUTES_PER_SCENARIO}분 기준)</p>)}

      <section>
        <h2 className="mb-1 text-lg font-bold">배정된 시나리오 ({assigned.length})</h2>
        {assigned.length === 0 ? <p className="text-sm opacity-60">아래 후보에서 골라 배정하세요.</p> :
          <ul className="text-sm">{assigned.map((id) => <li key={id}>{id} <button className="underline" onClick={() => { setAssigned((a) => a.filter((x) => x !== id)); setSaved(false); }}>빼기</button></li>)}</ul>}
      </section>

      <section>
        <h2 className="mb-1 text-lg font-bold">후보 (앱 제안 · 최종 선택은 검사자)</h2>
        {suggestions.length === 0
          ? <p className="text-sm opacity-60">배정할 수 있는 시나리오가 없어요. 이 연령대의 <strong>승인된</strong> 시나리오가 필요합니다. (감수 전 시나리오는 제안되지 않아요)</p>
          : <ul className="space-y-2">{suggestions.map(({ scenario: s, reasons }) => (
              <li key={s.id} className="flex items-start justify-between gap-2 rounded-xl border p-3 text-sm">
                <span><strong>“{s.partnerLine}”</strong><br /><span className="opacity-70">{s.setting} · {s.targetLevel}단계 · {reasons.join(" · ")}</span></span>
                <button className="shrink-0 rounded bg-[var(--accent)] px-3 py-1 text-white" onClick={() => { setAssigned((a) => [...a, s.id]); setSaved(false); }}>배정</button>
              </li>))}</ul>}
      </section>

      <button disabled={check.errors.length > 0} className="rounded-xl bg-[var(--accent)] px-5 py-2 text-white disabled:opacity-40" onClick={() => setSaved(true)}>처방 저장</button>
      {saved && <p className="text-sm text-green-700">저장했어요. (데모: 이 화면에서만 반영됩니다. 변경 이력은 DB 연결 시 기록됩니다.)</p>}
    </div>
  );
}
