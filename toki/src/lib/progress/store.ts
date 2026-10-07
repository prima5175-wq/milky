// 연습 완료·미션·스티커 기록(데모: 서버 메모리). DB 연결 후 practice_sessions / missions / stickers 테이블로 대체한다.
// 점수는 항상 서버가 정한다. 브라우저가 점수를 보낼 수 없다.
import { DAILY_PRACTICE_POINT_CAP, POINTS } from "../practice/rewards.ts";

export interface SessionRec { id: string; childId: string; scenarioId: string; day: string; levels: Array<number | null>; modes: string[] }
export interface MissionRec { id: string; childId: string; scenarioId: string; text: string; day: string; status: "open" | "done"; confirmedAt: string | null; confirmedBy: string | null }
export interface StickerRec { id: string; childId: string; reason: "practice" | "mission"; points: number; day: string; refId: string }

export class ProgressStore {
  sessions: SessionRec[] = []; missions: MissionRec[] = []; stickers: StickerRec[] = [];
  private seq = 0;
  private id = (p: string) => `${p}-${++this.seq}`;

  /** 연습 마침. 같은 날 같은 시나리오는 한 번만 인정(반복해서 점수만 모으는 것 방지). */
  completePractice(i: { childId: string; scenarioId: string; day: string; levels: Array<number | null>; modes: string[]; missionText: string }) {
    const dup = this.sessions.some((s) => s.childId === i.childId && s.scenarioId === i.scenarioId && s.day === i.day);
    if (dup) return { counted: false, practicePoints: 0, missionId: this.missions.find((m) => m.childId === i.childId && m.scenarioId === i.scenarioId && m.day === i.day)?.id ?? null };
    const levels = i.levels.slice(0, 3).map((l) => (Number.isInteger(l) && (l as number) >= 1 && (l as number) <= 4 ? l : null));
    this.sessions.push({ id: this.id("ses"), childId: i.childId, scenarioId: i.scenarioId, day: i.day, levels, modes: i.modes.slice(0, 3).map(String) });
    const earnedToday = this.stickers.filter((s) => s.childId === i.childId && s.reason === "practice" && s.day === i.day).reduce((n, s) => n + s.points, 0);
    const practicePoints = Math.max(0, Math.min(POINTS.practiceDone, DAILY_PRACTICE_POINT_CAP - earnedToday));
    if (practicePoints > 0) this.stickers.push({ id: this.id("stk"), childId: i.childId, reason: "practice", points: practicePoints, day: i.day, refId: i.scenarioId });
    const m: MissionRec = { id: this.id("mis"), childId: i.childId, scenarioId: i.scenarioId, text: i.missionText, day: i.day, status: "open", confirmedAt: null, confirmedBy: null };
    this.missions.push(m);
    return { counted: true, practicePoints, missionId: m.id };
  }

  /** 보호자가 실제 생활에서 해 봤다고 확인하면 미션 점수를 준다 (한 번만). */
  confirmMission(missionId: string, by: string, now = new Date()): { ok: boolean; points: number } {
    const m = this.missions.find((x) => x.id === missionId);
    if (!m || m.status !== "open") return { ok: false, points: 0 };
    m.status = "done"; m.confirmedAt = now.toISOString(); m.confirmedBy = by;
    this.stickers.push({ id: this.id("stk"), childId: m.childId, reason: "mission", points: POINTS.missionConfirmed, day: m.day, refId: m.id });
    return { ok: true, points: POINTS.missionConfirmed };
  }
  listMissions(childId: string, status?: MissionRec["status"]) { return this.missions.filter((m) => m.childId === childId && (!status || m.status === status)); }
  doneScenarioIds(childId: string, day: string) { return this.sessions.filter((x) => x.childId === childId && x.day === day).map((x) => x.scenarioId); }
  totalPoints(childId: string) { return this.stickers.filter((s) => s.childId === childId).reduce((n, s) => n + s.points, 0); }
}
const g = globalThis as unknown as { __tokiProgress?: ProgressStore };
export const getProgressStore = () => (g.__tokiProgress ??= new ProgressStore());
