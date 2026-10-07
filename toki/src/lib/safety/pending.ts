// 오프라인 중 감지된 안전 이벤트는 브라우저에 보관했다가 연결되면 서버로 보낸다. (어른에게 알림이 가야 하므로)
const KEY = "toki.pendingSafety.v1";
export interface PendingSafety { scenarioId: string; category: string; excerpt: string }
const read = (): PendingSafety[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };
export function queueSafety(e: PendingSafety) { try { localStorage.setItem(KEY, JSON.stringify([...read(), e])); } catch { /* 무시 */ } }
export async function flushPendingSafety() {
  const items = read();
  if (items.length === 0) return;
  try {
    const res = await fetch("/api/safety-events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reports: items }) });
    if (res.ok) localStorage.removeItem(KEY);
  } catch { /* 다음에 다시 시도 */ }
}
