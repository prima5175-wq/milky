// 보호자용 주간 요약. 진단·평가 표현 없이 "무엇을 했는지"만 쉬운 말로 알려 준다.
import type { MissionRec, SessionRec } from "./store.ts";
import { LEVEL_NAME, type DetectedLevel } from "../practice/levels.ts";

export interface WeeklySummary {
  from: string; to: string; practiceCount: number; activeDays: number;
  levelCounts: Record<1 | 2 | 3 | 4, number>; noLevel: number;
  missionsDone: number; missionsOpen: number; lines: string[];
}
const addDays = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

export function weeklySummary(childId: string, sessions: SessionRec[], missions: MissionRec[], today: string): WeeklySummary {
  const from = addDays(today, -6);
  const inWeek = (d: string) => d >= from && d <= today;
  const ss = sessions.filter((s) => s.childId === childId && inWeek(s.day));
  const ms = missions.filter((m) => m.childId === childId && inWeek(m.day));
  const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0 } as WeeklySummary["levelCounts"];
  let noLevel = 0;
  for (const s of ss) for (const l of s.levels) (l === 1 || l === 2 || l === 3 || l === 4) ? levelCounts[l]++ : noLevel++;
  const done = ms.filter((m) => m.status === "done").length, open = ms.length - done;
  const lines: string[] = [];
  if (ss.length === 0) lines.push("이번 주에는 아직 연습한 이야기가 없어요.");
  else {
    lines.push(`이번 주에 ${new Set(ss.map((s) => s.day)).size}일 동안 ${ss.length}개의 이야기를 연습했어요.`);
    const top = ([1, 2, 3, 4] as DetectedLevel[]).reduce((a, b) => (levelCounts[b] > levelCounts[a] ? b : a), 1 as DetectedLevel);
    if (levelCounts[top] > 0) lines.push(`가장 많이 한 말은 “${LEVEL_NAME[top]}”(${top}단계)였어요.`);
  }
  lines.push(done > 0 ? `실제 생활에서 해 본 미션을 ${done}개 확인해 주셨어요. 🎉` : "실제 생활 미션은 아직 확인된 게 없어요.");
  if (open > 0) lines.push(`확인을 기다리는 미션이 ${open}개 있어요.`);
  return { from, to: today, practiceCount: ss.length, activeDays: new Set(ss.map((s) => s.day)).size, levelCounts, noLevel, missionsDone: done, missionsOpen: open, lines };
}
