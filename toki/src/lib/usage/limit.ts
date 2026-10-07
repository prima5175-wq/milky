// 하루 사용 시간 제한. 기본 15분, 치료사·보호자가 조정(children.daily_minutes).
// 서버가 사용 시간을 기록하고, 제한을 넘으면 /api/practice 가 거절한다.
export const DEFAULT_DAILY_MINUTES = 15;
export const MAX_HEARTBEAT_SECONDS = 60; // 한 번에 올릴 수 있는 시간 상한 (조작·오류 방지)

export class UsageStore {
  private map = new Map<string, number>();
  private key = (childId: string, day: string) => `${childId}|${day}`;
  used(childId: string, day: string) { return this.map.get(this.key(childId, day)) ?? 0; }
  add(childId: string, day: string, seconds: number) {
    const s = Math.max(0, Math.min(MAX_HEARTBEAT_SECONDS, Math.floor(Number.isFinite(seconds) ? seconds : 0)));
    this.map.set(this.key(childId, day), this.used(childId, day) + s);
    return this.used(childId, day);
  }
}
export const dayOf = (d: Date) => d.toISOString().slice(0, 10);
export function status(used: number, limitMinutes: number) {
  const limit = limitMinutes * 60;
  return { used, limit, remaining: Math.max(0, limit - used), reached: used >= limit };
}
const g = globalThis as unknown as { __tokiUsage?: UsageStore };
export const getUsageStore = () => (g.__tokiUsage ??= new UsageStore());
