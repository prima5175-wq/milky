"use client";
import { useEffect, useState } from "react";
import type { SafetyEvent } from "@/lib/safety/events";

const LABEL: Record<string, string> = {
  self_harm: "스스로 해치거나 사라지고 싶다는 말", abuse: "맞거나 다쳤다는 이야기", bullying: "괴롭힘·따돌림 이야기",
  secrecy: "비밀을 지키라고 했다는 이야기", model_flagged: "걱정되는 말 (AI 감지)",
};

/** 아동이 연습 중 걱정되는 말을 했을 때 어른에게 보여 주는 알림. ⚠ 데모: 로그인·권한 확인 없음. */
export function SafetyAlerts({ role }: { role: "guardian" | "therapist" }) {
  const [events, setEvents] = useState<SafetyEvent[] | null>(null);
  const load = () => fetch("/api/safety-events").then((r) => r.json()).then((j) => setEvents(j.events)).catch(() => setEvents([]));
  useEffect(() => { load(); }, []);
  async function handle(id: string) {
    await fetch("/api/safety-events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, by: role }) });
    load();
  }
  if (events === null) return null;
  const open = events.filter((e) => !e.handledAt), done = events.filter((e) => e.handledAt);
  if (events.length === 0) return <p className="text-sm opacity-60">확인할 안전 알림이 없어요.</p>;
  return (
    <section aria-label="안전 알림" className="space-y-3">
      {open.map((e) => (
        <div key={e.id} role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 p-4">
          <p className="font-bold">아이가 걱정되는 이야기를 했어요 · {LABEL[e.category] ?? e.category}</p>
          <p className="text-sm opacity-70">{new Date(e.createdAt).toLocaleString("ko-KR")} · 시나리오 {e.scenarioId}</p>
          <p className="mt-1 rounded bg-white p-2">“{e.excerpt}”</p>
          <p className="mt-2 text-sm">아이의 이야기를 차분히 끝까지 들어 주세요. 다그치거나 추궁하지 말고, 이야기해 줘서 고맙다고 말해 주세요. 아이가 위험하다고 느껴지면 즉시 112에 연락하고, 필요하면 전문가와 상의하세요.</p>
          <button className="mt-2 rounded bg-red-700 px-4 py-2 text-white" onClick={() => handle(e.id)}>확인했어요</button>
        </div>))}
      {done.length > 0 && <details><summary className="cursor-pointer text-sm">확인한 알림 {done.length}건</summary>
        <ul className="mt-1 text-sm">{done.map((e) => <li key={e.id}>{new Date(e.createdAt).toLocaleDateString("ko-KR")} · {LABEL[e.category] ?? e.category} ({e.handledBy === "therapist" ? "검사자" : "보호자"} 확인)</li>)}</ul></details>}
    </section>
  );
}
