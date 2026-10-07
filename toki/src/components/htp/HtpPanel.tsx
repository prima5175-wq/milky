"use client";
import { useCallback, useEffect, useState } from "react";
import { KINDS, KIND_LABEL, type DrawingKind, type HtpRecord } from "@/lib/htp/store";
import { resizeToDataUrl } from "@/lib/htp/resize";
import { retestInfo } from "@/lib/assessments/retest";

const HTP_INTERVAL_MONTHS = 3; // 주기적으로 해 보도록 권장하는 간격 (센터가 바꿀 수 있게 후속 단계에서 설정화)
const today = () => new Date().toISOString().slice(0, 10);

/** 그림 검사 기록·비교. 앱은 해석하거나 점수를 매기지 않는다. 검사자가 관찰한 것을 기록하고 시점별로 나란히 볼 수 있게 돕는다. */
export function HtpPanel() {
  const [data, setData] = useState<{ records: HtpRecord[]; drawingConsent: boolean; checklist: string[] } | null>(null);
  const [date, setDate] = useState(today()); const [dur, setDur] = useState(""); const [note, setNote] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({}); const [images, setImages] = useState<Partial<Record<DrawingKind, string>>>({});
  const [errors, setErrors] = useState<string[]>([]); const [msg, setMsg] = useState("");
  const [a, setA] = useState(""), [b, setB] = useState("");
  const load = useCallback(() => { fetch("/api/htp").then((r) => r.json()).then(setData).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  if (!data) return null;

  const recs = data.records;
  const info = retestInfo(recs.map((r) => ({ id: r.id, childId: "x", catalogId: "htp", administeredOn: r.date, examinerName: r.examiner, phase: "follow_up" as const, scores: {} })), "htp", HTP_INTERVAL_MONTHS, today());
  const ra = recs.find((r) => r.id === (a || recs.at(-1)?.id)), rb = recs.find((r) => r.id === (b || recs[0]?.id));

  async function pick(kind: DrawingKind, f: File | undefined) {
    if (!f) { const { [kind]: _, ...rest } = images; setImages(rest); return; }
    try { setImages({ ...images, [kind]: await resizeToDataUrl(f) }); } catch { setErrors(["이미지를 읽지 못했어요 (jpg·png·webp)"]); }
  }
  async function save() {
    const r = await fetch("/api/htp", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, durationMin: dur === "" ? null : Number(dur), note, checklist: checks, images }) });
    const j = await r.json();
    if (!r.ok) { setErrors(j.errors ?? ["저장하지 못했어요"]); return; }
    setErrors([]); setMsg("기록했어요"); setNote(""); setDur(""); setChecks({}); setImages({}); load();
  }
  const Img = ({ r, k }: { r?: HtpRecord; k: DrawingKind }) => r?.images[k] ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={r.images[k]} alt={`${r.date} ${KIND_LABEL[k]} 그림`} className="w-full rounded border" /> : <div className="grid h-24 place-items-center rounded border text-xs opacity-50">그림 없음</div>;

  return (
    <section aria-label="그림 검사 기록" className="space-y-4 rounded-2xl border p-4">
      <h2 className="text-lg font-bold">그림 검사 기록 (HTP 등)</h2>
      <p className="rounded bg-sky-50 p-2 text-xs">이 앱은 그림을 해석하거나 점수를 매기지 않아요. 검사자가 관찰한 내용을 기록하고, 시점별로 나란히 볼 수 있도록 돕기만 해요.</p>
      {info.status !== "none" && <p className={`text-sm ${info.status === "overdue" ? "font-bold text-red-700" : ""}`}>{info.status === "overdue" ? "다음 그림 검사 시기가 지났어요" : info.status === "soon" ? "곧 다음 그림 검사 시기예요" : "다음 그림 검사 예정"} · 마지막 {info.lastOn} · 예정 {info.dueOn}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="text-sm">시행일<input type="date" className="w-full rounded border p-1" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="text-sm">소요 시간(분)<input type="number" className="w-full rounded border p-1" value={dur} onChange={(e) => setDur(e.target.value)} /></label>
      </div>
      <fieldset className="text-sm"><legend className="mb-1 font-medium">관찰 체크 (해당하는 것만)</legend>
        <div className="grid gap-1 sm:grid-cols-2">{data.checklist.map((c) => <label key={c}><input type="checkbox" checked={!!checks[c]} onChange={(e) => setChecks({ ...checks, [c]: e.target.checked })} /> {c}</label>)}</div></fieldset>
      <label className="block text-sm">관찰 메모<textarea className="w-full rounded border p-1" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>

      <div>
        <p className="mb-1 text-sm font-medium">그림 사진 (선택)</p>
        {!data.drawingConsent && <p role="note" className="mb-2 rounded bg-amber-50 p-2 text-xs">보호자의 “그림 파일 저장” 동의가 없어서 사진은 올릴 수 없어요. 관찰 기록은 가능해요.</p>}
        <div className="grid grid-cols-3 gap-2">{KINDS.map((k) => (
          <label key={k} className="text-xs">{KIND_LABEL[k]}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!data.drawingConsent} className="w-full text-xs" onChange={(e) => pick(k, e.target.files?.[0])} />{images[k] && <span className="text-emerald-700">✔ 준비됨</span>}</label>))}</div>
      </div>
      {errors.map((e) => <p key={e} role="alert" className="text-sm text-red-700">{e}</p>)}
      {msg && <p role="status" className="text-sm text-emerald-700">{msg}</p>}
      <button className="rounded-xl bg-[var(--accent)] px-5 py-2 text-white" onClick={save}>기록 저장</button>

      {recs.length >= 2 && (
        <div>
          <h3 className="mb-2 font-bold">시점 비교</h3>
          <div className="mb-2 flex flex-wrap gap-2 text-sm">
            <select aria-label="비교 시점 왼쪽" className="rounded border p-1" value={ra?.id} onChange={(e) => setA(e.target.value)}>{recs.map((r) => <option key={r.id} value={r.id}>{r.date}</option>)}</select>→
            <select aria-label="비교 시점 오른쪽" className="rounded border p-1" value={rb?.id} onChange={(e) => setB(e.target.value)}>{recs.map((r) => <option key={r.id} value={r.id}>{r.date}</option>)}</select>
          </div>
          {KINDS.map((k) => (<div key={k} className="mb-3"><p className="text-sm font-medium">{KIND_LABEL[k]}</p><div className="grid grid-cols-2 gap-2"><Img r={ra} k={k} /><Img r={rb} k={k} /></div></div>))}
          <div className="grid grid-cols-2 gap-2 text-xs">{[ra, rb].map((r, i) => <p key={i}>{r?.date}: {r?.note || "(메모 없음)"}</p>)}</div>
        </div>)}
      <h3 className="font-bold">기록 목록</h3>
      {recs.length === 0 ? <p className="text-sm opacity-60">아직 기록이 없어요.</p> :
        <ul className="space-y-1 text-sm">{recs.map((r) => <li key={r.id}><strong>{r.date}</strong> · {r.examiner}{r.durationMin != null ? ` · ${r.durationMin}분` : ""} · 그림 {Object.keys(r.images).length}장 · 체크 {Object.values(r.checklist).filter(Boolean).length}개{r.note ? ` · ${r.note}` : ""}</li>)}</ul>}
    </section>
  );
}
