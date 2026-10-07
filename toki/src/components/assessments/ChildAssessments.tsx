"use client";
import { useMemo, useState } from "react";
import type { AssessmentRecord, CatalogEntry } from "@/lib/assessments/types";
import { GENERIC_SCORE_SCHEMA } from "@/lib/assessments/types";
import { buildSeries, overallChange, compare } from "@/lib/assessments/series";
import { retestInfo } from "@/lib/assessments/retest";
import { buildTimeline, type NoteLike } from "@/lib/assessments/timeline";
import { validateScores } from "@/lib/assessments/validate";
import { TrendChart } from "./TrendChart";
import { downloadReport } from "@/lib/report/download";

const STATUS = { none: "", ok: "예정 여유", soon: "곧 재검 시기", overdue: "재검 시기 지남" } as const;
const JUDGE = { better: "↑ 좋아짐", worse: "↓ 주의", neutral: "변화" } as const;
const today = () => new Date().toISOString().slice(0, 10);

export function ChildAssessments(props: { childId: string; catalog: CatalogEntry[]; initialRecords: AssessmentRecord[]; notes: NoteLike[] }) {
  const [records, setRecords] = useState(props.initialRecords);
  const [catalogId, setCatalogId] = useState(props.catalog[0]?.id ?? "");
  const entry = props.catalog.find((c) => c.id === catalogId);
  const schema = entry && entry.scoreSchema.length ? entry.scoreSchema : entry?.administration === "drawing" ? [] : GENERIC_SCORE_SCHEMA;
  const [fieldKey, setFieldKey] = useState<string>("");
  const field = schema.find((f) => f.key === fieldKey) ?? schema[0];
  const series = useMemo(() => (field ? buildSeries(records, catalogId, field.key) : []), [records, catalogId, field]);
  const change = overallChange(series, field);
  const retest = retestInfo(records, catalogId, entry?.retestIntervalMonths, today());
  const timeline = useMemo(() => buildTimeline(records, props.catalog, props.notes), [records, props.catalog, props.notes]);

  const [form, setForm] = useState<Record<string, string>>({});
  const [date, setDate] = useState(today());
  const [phase, setPhase] = useState<AssessmentRecord["phase"]>("follow_up");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reportMsg, setReportMsg] = useState("");
  // 비교 시점은 선택 전까지 '처음 → 최근'이 기본값 (null)
  const [pickA, setA] = useState<number | null>(null), [pickB, setB] = useState<number | null>(null);
  const last = Math.max(series.length - 1, 0);
  const a = Math.min(pickA ?? 0, last), b = Math.min(pickB ?? last, last);

  function save() {
    // 그림 검사(HTP 등)는 점수 없이 시행 기록과 관찰 메모만 남긴다. 해석·자동 채점 없음.
    const v = schema.length ? validateScores(schema, form) : { ok: true, errors: {}, scores: {} };
    setErrors(v.errors);
    if (!v.ok) return;
    setRecords((rs) => [...rs, { id: `local-${Date.now()}`, childId: props.childId, catalogId, administeredOn: date,
      examinerName: "나", phase, scores: v.scores, note: note || undefined }]);
    setForm({}); setNote("");
  }

  const pa = series[a], pb = series[b];
  const cmp = pa && pb && pa !== pb ? compare(pa, pb, field) : null;

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button className="rounded-xl border px-4 py-2 text-sm" onClick={async () => { setReportMsg("만드는 중…"); const r = await downloadReport({ records }); setReportMsg(r.ok ? "보고서를 내려받았어요" : r.error ?? ""); }}>보호자 상담용 보고서 (PDF)</button>
          {reportMsg && <span role="status" className="text-sm">{reportMsg}</span>}
        </div>
        <label className="block text-sm font-medium">검사 선택
          <select className="ml-2 rounded border p-1" value={catalogId} onChange={(e) => { setCatalogId(e.target.value); setFieldKey(""); setForm({}); setA(null); setB(null); }}>
            {props.catalog.map((c) => <option key={c.id} value={c.id}>{c.abbreviation ?? c.nameKo} · {c.category}</option>)}
          </select>
        </label>
        {retest.status !== "none" && (
          <p className={`mt-2 text-sm ${retest.status === "overdue" ? "font-bold text-red-700" : ""}`}>
            {STATUS[retest.status]} · 마지막 {retest.lastOn} · 다음 예정 {retest.dueOn}
          </p>
        )}
      </section>

      {schema.length > 0 && (
        <section>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">변화 추이</h2>
            {schema.length > 1 && (
              <select aria-label="점수 항목" className="rounded border p-1 text-sm" value={field?.key} onChange={(e) => setFieldKey(e.target.value)}>
                {schema.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            )}
          </div>
          <TrendChart points={series} label={field?.label ?? ""} />
          {change && (
            <p className="text-sm">처음 {change.from.value} → 최근 {change.to.value} ({change.delta > 0 ? "+" : ""}{change.delta}) · {JUDGE[change.judgement]}</p>
          )}
          {series.length >= 2 && (
            <p className="mt-3 text-sm">두 시점 비교:
              <select aria-label="비교 시점 1" className="mx-1 rounded border p-1" value={a} onChange={(e) => setA(+e.target.value)}>{series.map((p, i) => <option key={p.recordId} value={i}>{p.date}</option>)}</select>→
              <select aria-label="비교 시점 2" className="mx-1 rounded border p-1" value={b} onChange={(e) => setB(+e.target.value)}>{series.map((p, i) => <option key={p.recordId} value={i}>{p.date}</option>)}</select>
              {cmp && <span> {cmp.from.value} → {cmp.to.value} ({cmp.delta > 0 ? "+" : ""}{cmp.delta})</span>}
            </p>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-bold">{entry?.administration === "drawing" ? "시행 기록 입력" : "점수 입력"}</h2>
        <p className="mb-2 text-xs opacity-70">외부 검사는 문항 없이 결과 점수만 입력합니다. 해석은 검사자가 합니다.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="text-sm">시행일<input type="date" className="w-full rounded border p-1" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="text-sm">시점
            <select className="w-full rounded border p-1" value={phase} onChange={(e) => setPhase(e.target.value as typeof phase)}>
              <option value="pre">사전</option><option value="follow_up">추적</option><option value="post">사후</option>
            </select>
          </label>
          {schema.map((f) => (
            <label key={f.key} className="text-sm">{f.label}
              <input inputMode="decimal" className="w-full rounded border p-1" value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              {errors[f.key] && <span role="alert" className="text-xs text-red-700">{errors[f.key]}</span>}
            </label>
          ))}
        </div>
        <label className="mt-3 block text-sm">관찰 메모<textarea className="w-full rounded border p-1" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        {errors._form && <p role="alert" className="text-sm text-red-700">{errors._form}</p>}
        <button className="mt-3 rounded-xl bg-[var(--accent)] px-5 py-2 text-white" onClick={save}>기록 저장</button>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">타임라인</h2>
        <ol className="space-y-2 border-l-2 pl-4">
          {timeline.map((e) => (
            <li key={e.id}><span className="text-xs opacity-60">{e.date}</span> <strong>{e.title}</strong>{e.detail && <div className="text-sm">{e.detail}</div>}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
