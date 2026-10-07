// 보호자 상담용 진도 보고서 데이터. 화면에서 보던 기록을 그대로 정리하며, 해석이나 평가 문장은 만들지 않는다.
import type { AssessmentRecord, CatalogEntry, ScoreField } from "../assessments/types.ts";
import { buildSeries, overallChange, type SeriesPoint } from "../assessments/series.ts";
import type { MissionRec, SessionRec } from "../progress/store.ts";
import type { HtpRecord } from "../htp/store.ts";
import { DEFAULT_CHECKLIST } from "../htp/store.ts";

export interface ReportSeries { field: ScoreField; points: SeriesPoint[]; changeText: string | null }
export interface ReportAssessment { name: string; category: string; fields: ScoreField[]; records: AssessmentRecord[]; series: ReportSeries[] }
export interface ReportData {
  child: { nickname: string; ageBand: string }; generatedOn: string; periodFrom: string; periodTo: string;
  assessments: ReportAssessment[]; drawingAssessments: Array<{ name: string; dates: string[] }>;
  practice: { count: number; activeDays: number; levelCounts: Record<1 | 2 | 3 | 4, number>; noLevel: number; missionsDone: number; missionsOpen: number };
  notes: Array<{ date: string; body: string }>;
  htp: Array<{ date: string; durationMin: number | null; checked: string[]; note: string; images: HtpRecord["images"] }>;
}

const addDays = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

export function buildReportData(i: {
  child: { id: string; nickname: string; ageBand: string }; today: string; periodDays?: number;
  catalog: CatalogEntry[]; records: AssessmentRecord[]; sessions: SessionRec[]; missions: MissionRec[];
  notes: Array<{ date: string; body: string }>; htp: HtpRecord[]; includeImages: boolean;
}): ReportData {
  const from = addDays(i.today, -((i.periodDays ?? 30) - 1));
  const live = i.records.filter((r) => !r.supersededBy);
  const assessments: ReportAssessment[] = [], drawingAssessments: ReportData["drawingAssessments"] = [];
  for (const c of i.catalog) {
    const recs = live.filter((r) => r.catalogId === c.id).sort((a, b) => a.administeredOn.localeCompare(b.administeredOn));
    if (recs.length === 0) continue;
    if (c.administration === "drawing" || c.scoreSchema.length === 0) { drawingAssessments.push({ name: c.nameKo, dates: recs.map((r) => r.administeredOn) }); continue; }
    const series: ReportSeries[] = c.scoreSchema.map((f) => {
      const points = buildSeries(recs, c.id, f.key); const ch = overallChange(points, f);
      return { field: f, points, changeText: ch ? `처음 ${ch.from.value} → 최근 ${ch.to.value} (${ch.delta > 0 ? "+" : ""}${ch.delta})` : null };
    });
    assessments.push({ name: c.nameKo, category: c.category, fields: c.scoreSchema, records: recs, series });
  }
  const ss = i.sessions.filter((s) => s.childId === i.child.id && s.day >= from && s.day <= i.today);
  const ms = i.missions.filter((m) => m.childId === i.child.id && m.day >= from && m.day <= i.today);
  const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<1 | 2 | 3 | 4, number>; let noLevel = 0;
  for (const s of ss) for (const l of s.levels) (l === 1 || l === 2 || l === 3 || l === 4) ? levelCounts[l]++ : noLevel++;
  const done = ms.filter((m) => m.status === "done").length;
  return {
    child: { nickname: i.child.nickname, ageBand: i.child.ageBand }, generatedOn: i.today, periodFrom: from, periodTo: i.today,
    assessments, drawingAssessments,
    practice: { count: ss.length, activeDays: new Set(ss.map((s) => s.day)).size, levelCounts, noLevel, missionsDone: done, missionsOpen: ms.length - done },
    notes: [...i.notes].sort((a, b) => b.date.localeCompare(a.date)),
    htp: i.htp.map((h) => ({ date: h.date, durationMin: h.durationMin, checked: DEFAULT_CHECKLIST.filter((k) => h.checklist[k]), note: h.note, images: i.includeImages ? h.images : {} })),
  };
}
