"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SafetyAlerts } from "@/components/SafetyAlerts";

const KEY = "toki.guardianPin";
interface Overview {
  child: { nickname: string; ageBand: string }; points: number; dailyMinutes: number;
  openMissions: Array<{ id: string; text: string; day: string }>;
  summary: { lines: string[]; levelCounts: Record<string, number>; practiceCount: number };
  tips: Array<{ text: string }>; consents: Array<{ kind: string; label: string; granted: boolean }>;
}
const headers = (pin: string) => ({ "content-type": "application/json", "x-guardian-pin": pin });

export function GuardianApp() {
  const [pin, setPin] = useState<string | null>(null);
  const [input, setInput] = useState(""); const [err, setErr] = useState("");
  useEffect(() => { try { const p = sessionStorage.getItem(KEY); if (p) setPin(p); } catch { /* 무시 */ } }, []);

  async function enter() {
    const r = await fetch("/api/guardian/verify", { method: "POST", headers: headers(input) });
    if (r.ok) { try { sessionStorage.setItem(KEY, input); } catch { /* 무시 */ } setPin(input); setErr(""); }
    else setErr(r.status === 429 ? "잠시 후 다시 시도해 주세요 (여러 번 틀렸어요)" : "PIN이 맞지 않아요");
  }
  if (!pin) return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-2 text-2xl font-bold">보호자 확인</h1>
      <p className="mb-4 text-sm opacity-70">아이가 아닌 보호자만 들어올 수 있도록 PIN을 입력해 주세요.</p>
      <input aria-label="보호자 PIN" type="password" inputMode="numeric" className="w-full rounded border p-3 text-xl" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enter()} />
      {err && <p role="alert" className="mt-2 text-sm text-red-700">{err}</p>}
      <button className="mt-4 w-full rounded-xl bg-[var(--accent)] p-3 text-white" onClick={enter}>들어가기</button>
      <p className="mt-6 text-xs opacity-60">처음이신가요? <Link className="underline" href="/signup">가입하기</Link></p>
    </main>
  );
  return <Dashboard pin={pin} onLock={() => { try { sessionStorage.removeItem(KEY); } catch { /* 무시 */ } setPin(null); }} />;
}

function Dashboard({ pin, onLock }: { pin: string; onLock: () => void }) {
  const [o, setO] = useState<Overview | null>(null);
  const [msg, setMsg] = useState(""); const [minutes, setMinutes] = useState(15);
  const load = useCallback(async () => {
    const r = await fetch("/api/guardian/overview", { headers: headers(pin) });
    if (r.status === 401) return onLock();
    const j = await r.json(); setO(j); setMinutes(j.dailyMinutes);
  }, [pin, onLock]);
  useEffect(() => { load(); }, [load]);

  async function confirmMission(id: string) {
    const r = await fetch("/api/guardian/missions", { method: "POST", headers: headers(pin), body: JSON.stringify({ id }) });
    setMsg(r.ok ? "확인했어요! 아이에게 스티커 5개가 갔어요 🎉" : "이미 확인했거나 찾을 수 없는 미션이에요"); load();
  }
  async function toggleConsent(kind: string, grant: boolean) {
    if (!grant && !window.confirm(kind === "service" ? "서비스 동의를 철회하면 아이 화면이 닫혀요. 계속할까요?" : kind === "drawing_storage" ? "그림 저장 동의를 철회하면 저장된 그림 파일이 모두 삭제돼요. 계속할까요?" : "동의를 철회할까요?")) return;
    const r = await fetch("/api/consent", { method: "POST", headers: headers(pin), body: JSON.stringify({ kind, grant }) });
    const j = await r.json(); setMsg(grant ? "동의했어요" : j.purgedImages ? `철회했어요 (그림 ${j.purgedImages}개 삭제)` : "철회했어요"); load();
  }
  async function saveMinutes() {
    const cur = await (await fetch("/api/child-config")).json();
    const r = await fetch("/api/child-config", { method: "POST", headers: headers(pin), body: JSON.stringify({ ...cur, dailyMinutes: minutes }) });
    const j = await r.json(); setMsg(r.ok ? "연습 시간을 바꿨어요" : (j.errors ?? ["저장하지 못했어요"]).join(" ")); load();
  }
  if (!o) return <main className="p-6">불러오는 중…</main>;
  const sec = "rounded-2xl border p-4";
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <p className="rounded bg-yellow-100 p-2 text-sm">화면 확인용입니다. PIN은 같은 기기에서 아이가 들어오지 못하게 하는 간이 장치이며 실제 로그인은 아직 연결되지 않았어요.</p>
      <header className="flex items-center justify-between"><h1 className="text-2xl font-bold">{o.child.nickname} 보호자 화면</h1><button className="text-sm underline" onClick={onLock}>잠그기</button></header>
      {msg && <p role="status" className="rounded bg-emerald-50 p-2 text-sm">{msg}</p>}

      <section className={sec}><h2 className="mb-2 text-lg font-bold">안전 알림</h2><SafetyAlerts role="guardian" /></section>

      <section className={sec} aria-label="오늘의 미션">
        <h2 className="mb-1 text-lg font-bold">확인해 주세요 · 실제 생활 미션</h2>
        <p className="mb-2 text-sm opacity-70">아이가 실제로 해 봤다면 확인해 주세요. 확인하면 스티커 5개를 받아요. (앱 안 연습은 1개)</p>
        {o.openMissions.length === 0 ? <p className="text-sm">지금 확인할 미션이 없어요.</p> : (
          <ul className="space-y-2">{o.openMissions.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 rounded-xl border p-3"><span>{m.text}<br /><span className="text-xs opacity-60">{m.day}</span></span>
              <button className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-2 text-white" onClick={() => confirmMission(m.id)}>해 봤어요 ✔</button></li>))}</ul>)}
        <p className="mt-2 text-sm">모은 스티커: <strong>{o.points}</strong>개</p>
      </section>

      <section className={sec} aria-label="주간 요약"><h2 className="mb-2 text-lg font-bold">이번 주 요약</h2>
        <ul className="list-inside list-disc space-y-1">{o.summary.lines.map((l) => <li key={l}>{l}</li>)}</ul></section>

      <section className={sec} aria-label="대화 팁"><h2 className="mb-2 text-lg font-bold">집에서 해 볼 수 있는 대화 팁</h2>
        <ul className="list-inside list-disc space-y-1">{o.tips.map((t) => <li key={t.text}>{t.text}</li>)}</ul></section>

      <section className={sec} aria-label="연습 시간"><h2 className="mb-2 text-lg font-bold">하루 연습 시간</h2>
        <label className="text-sm">분 (5~60)<input type="number" className="ml-2 w-20 rounded border p-1" value={Number.isNaN(minutes) ? "" : minutes} onChange={(e) => setMinutes(e.target.value === "" ? NaN : Number(e.target.value))} /></label>
        <button className="ml-3 rounded-lg border px-3 py-1" onClick={saveMinutes}>저장</button></section>

      <section className={sec} aria-label="동의 관리"><h2 className="mb-2 text-lg font-bold">동의 관리</h2>
        <ul className="space-y-2">{o.consents.map((c) => (
          <li key={c.kind} className="flex items-center justify-between gap-2 text-sm"><span>{c.label}</span>
            <button className="shrink-0 rounded border px-3 py-1" onClick={() => toggleConsent(c.kind, !c.granted)}>{c.granted ? "동의함 · 철회하기" : "동의하기"}</button></li>))}</ul>
        <p className="mt-2 text-xs opacity-70"><Link className="underline" href="/legal/privacy">개인정보처리방침</Link> · <Link className="underline" href="/legal/terms">이용약관</Link> (초안)</p></section>
    </main>
  );
}
