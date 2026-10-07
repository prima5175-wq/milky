// 아동 화면의 진행 기록 전송. 점수는 서버가 정한다. 연결이 안 되면 브라우저에 보관했다가 나중에 보낸다.
export interface CompletePayload { scenarioId: string; levels: Array<number | null>; modes: string[] }
const KEY = "toki.pendingProgress.v1";
const read = (): CompletePayload[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };
const write = (v: CompletePayload[]) => { try { v.length ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch { /* 무시 */ } };

async function send(p: CompletePayload): Promise<{ ok: boolean; earned: number }> {
  try {
    const r = await fetch("/api/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(p) });
    if (!r.ok) return { ok: r.status >= 400 && r.status < 500, earned: 0 }; // 4xx 는 다시 보내도 소용없으니 버린다
    const j = await r.json(); return { ok: true, earned: j.earned ?? 0 };
  } catch { return { ok: false, earned: 0 }; }
}
export async function completePractice(p: CompletePayload): Promise<{ earned: number; queued: boolean }> {
  const r = await send(p);
  if (!r.ok) { write([...read(), p]); return { earned: 0, queued: true }; }
  return { earned: r.earned, queued: false };
}
export async function flushPendingProgress() {
  const rest: CompletePayload[] = [];
  for (const p of read()) { const r = await send(p); if (!r.ok) rest.push(p); }
  write(rest);
}
