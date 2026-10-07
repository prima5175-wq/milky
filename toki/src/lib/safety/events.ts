// 안전 이벤트 저장소(데모: 서버 메모리). DB 연결 후에는 safety_events 테이블로 대체한다.
// ⚠ 서버 메모리라 서버가 재시작되면 사라지고, 서버리스에서는 인스턴스마다 따로 있다. 운영 전에 반드시 DB 로 옮길 것.
import type { SafetyCategory } from "./keywords.ts";

export interface SafetyEvent {
  id: string; childId: string; scenarioId: string; category: SafetyCategory;
  /** 어른이 상황을 파악하는 데 필요한 아이의 말(앞부분만). 마케팅 등 다른 용도로 쓰지 않는다. */
  excerpt: string; createdAt: string; handledAt: string | null; handledBy: string | null;
}

export class SafetyEventStore {
  private items: SafetyEvent[] = [];
  private seq = 0;
  add(e: Omit<SafetyEvent, "id" | "createdAt" | "handledAt" | "handledBy">, now = new Date()): SafetyEvent {
    const ev: SafetyEvent = { ...e, excerpt: e.excerpt.slice(0, 200), id: `se-${++this.seq}`, createdAt: now.toISOString(), handledAt: null, handledBy: null };
    this.items.push(ev);
    return ev;
  }
  list(childId: string, opts: { unhandledOnly?: boolean } = {}): SafetyEvent[] {
    return this.items.filter((x) => x.childId === childId && (!opts.unhandledOnly || !x.handledAt)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  markHandled(id: string, by: string, now = new Date()): boolean {
    const ev = this.items.find((x) => x.id === id);
    if (!ev || ev.handledAt) return false;
    ev.handledAt = now.toISOString(); ev.handledBy = by;
    return true;
  }
}
const g = globalThis as unknown as { __tokiSafety?: SafetyEventStore };
export const getSafetyStore = () => (g.__tokiSafety ??= new SafetyEventStore());
