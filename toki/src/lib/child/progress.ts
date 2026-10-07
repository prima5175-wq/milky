// 데모용 진행 기록(브라우저 저장). DB 연결 후에는 서버 기록으로 대체된다.
import { POINTS, practicePointsToday } from "../practice/rewards.ts";

export interface StickerEntry { id: string; reason: "practice" | "mission"; points: number; scenarioId: string; date: string }
export interface PendingMission { scenarioId: string; text: string; date: string }
const SK = "toki.stickers.v1", MK = "toki.missions.v1";
const today = () => new Date().toISOString().slice(0, 10);

function read<T>(key: string): T[] { try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; } }
function write(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* 무시 */ } }

export const loadStickers = () => read<StickerEntry>(SK);
export const loadMissions = () => read<PendingMission>(MK);

/** 연습을 마치면 작은 스티커 1개(하루 상한 있음), 미션은 보호자 확인 대기로 둔다. 미션 점수는 확인 후에만 준다. */
export function completePractice(scenarioId: string, missionText: string) {
  const stickers = loadStickers();
  const already = stickers.filter((s) => s.reason === "practice" && s.date === today()).length * POINTS.practiceDone;
  const pts = practicePointsToday(already);
  if (pts > 0) write(SK, [...stickers, { id: `${Date.now()}`, reason: "practice", points: pts, scenarioId, date: today() }]);
  const missions = loadMissions();
  if (!missions.some((m) => m.scenarioId === scenarioId && m.date === today())) write(MK, [...missions, { scenarioId, text: missionText, date: today() }]);
  return { earned: pts };
}
