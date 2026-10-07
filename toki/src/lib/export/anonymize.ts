// 연구용 익명화 내보내기. 보호자가 '연구 활용'에 동의한 아동만 내보낸다.
// 내보내지 않는 것: 이름·별명, 아동 id, 정확한 날짜, 검사자 이름, 메모·아이가 한 말 같은 자유 글(개인정보가 섞일 수 있어서), 그림.
// 내보내는 것: 가명(HMAC), 연령대, 첫 기록 이후 몇 주째인지, 시나리오 id, 응답 단계, 미션 상태, 검사 점수.
import { createHmac } from "node:crypto";
import type { AssessmentRecord } from "../assessments/types.ts";
import type { MissionRec, SessionRec } from "../progress/store.ts";

export const HEADER = ["pid", "age_band", "week", "record_type", "item", "field", "value"];
export const MIN_SALT_LENGTH = 16;

/** 같은 아동은 같은 가명, 소금(salt)이 다르면 전혀 다른 가명. 소금 없이는 가명에서 아동을 되짚을 수 없다. */
export const pseudonym = (childId: string, salt: string) => createHmac("sha256", salt).update(childId).digest("hex").slice(0, 12);

/** CSV 한 칸. 쉼표·따옴표·줄바꿈은 따옴표로 감싸고, 엑셀이 수식으로 실행할 수 있는 문자열(= + - @)은 앞에 '를 붙인다. */
export function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  let s = v.replace(/\r?\n/g, " ");
  if (/^[=+\-@\t]/.test(s)) s = "'" + s;
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const dayNum = (iso: string) => Math.floor(Date.parse(iso + "T00:00:00Z") / 86400000);

export type ExportResult = { ok: true; csv: string; rows: number } | { ok: false; error: "no_research_consent" | "salt_missing" };

export function buildResearchCsv(i: {
  childId: string; ageBand: string; salt: string | undefined; researchConsent: boolean;
  sessions: SessionRec[]; missions: MissionRec[]; assessments: AssessmentRecord[];
}): ExportResult {
  if (!i.researchConsent) return { ok: false, error: "no_research_consent" };
  if (!i.salt || i.salt.length < MIN_SALT_LENGTH) return { ok: false, error: "salt_missing" };
  const pid = pseudonym(i.childId, i.salt);
  const ss = i.sessions.filter((s) => s.childId === i.childId), ms = i.missions.filter((m) => m.childId === i.childId);
  const as = i.assessments.filter((a) => a.childId === i.childId && !a.supersededBy);
  const days = [...ss.map((s) => s.day), ...ms.map((m) => m.day), ...as.map((a) => a.administeredOn)];
  if (days.length === 0) return { ok: true, csv: HEADER.join(",") + "\n", rows: 0 };
  const first = Math.min(...days.map(dayNum)), week = (d: string) => Math.floor((dayNum(d) - first) / 7);
  const rows: Array<Array<string | number | null>> = [];
  for (const s of ss) s.levels.forEach((l, k) => { rows.push([pid, i.ageBand, week(s.day), "practice", s.scenarioId, `turn${k + 1}_level`, l]); rows.push([pid, i.ageBand, week(s.day), "practice", s.scenarioId, `turn${k + 1}_mode`, s.modes[k] ?? ""]); });
  for (const m of ms) rows.push([pid, i.ageBand, week(m.day), "mission", m.scenarioId, "status", m.status]);
  for (const a of as) {
    rows.push([pid, i.ageBand, week(a.administeredOn), "assessment", a.catalogId, "phase", a.phase]);
    for (const [k, v] of Object.entries(a.scores)) rows.push([pid, i.ageBand, week(a.administeredOn), "assessment", a.catalogId, k, v]);
  }
  rows.sort((a, b) => Number(a[2]) - Number(b[2]));
  return { ok: true, csv: [HEADER, ...rows].map((r) => r.map((c) => cell(c as string | number | null)).join(",")).join("\n") + "\n", rows: rows.length };
}
