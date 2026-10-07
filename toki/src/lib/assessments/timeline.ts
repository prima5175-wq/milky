import type { AssessmentRecord, CatalogEntry } from "./types";

export type TimelineEvent =
  | { type: "assessment"; date: string; title: string; detail: string; id: string }
  | { type: "note"; date: string; title: string; detail: string; id: string }
  | { type: "practice"; date: string; title: string; detail: string; id: string };

export interface NoteLike { id: string; date: string; body: string }
export interface PracticeSummary { id: string; date: string; scenarioTitle: string; level: number | null }

const PHASE = { pre: "사전", follow_up: "추적", post: "사후" } as const;

/** 검사·회기 메모·연습을 한 줄 타임라인으로 합친다 (최신순). */
export function buildTimeline(
  records: AssessmentRecord[], catalog: CatalogEntry[], notes: NoteLike[] = [], practices: PracticeSummary[] = [],
): TimelineEvent[] {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const events: TimelineEvent[] = [
    ...records.filter((r) => !r.supersededBy).map((r): TimelineEvent => {
      const c = byId.get(r.catalogId);
      const labels = new Map((c?.scoreSchema ?? []).map((f) => [f.key, f.label]));
      const scoreText = Object.entries(r.scores).map(([k, v]) => `${labels.get(k) ?? k} ${v}`).join(" · ");
      const detail = [scoreText, r.note].filter(Boolean).join(" — "); // 점수 없는 검사(HTP 등)도 관찰 메모를 보여준다
      return { type: "assessment", date: r.administeredOn, id: r.id, title: `${c?.abbreviation ?? c?.nameKo ?? "검사"} (${PHASE[r.phase]})`, detail };
    }),
    ...notes.map((n): TimelineEvent => ({ type: "note", date: n.date, id: n.id, title: "회기 메모", detail: n.body })),
    ...practices.map((p): TimelineEvent => ({ type: "practice", date: p.date, id: p.id, title: `연습: ${p.scenarioTitle}`, detail: p.level ? `응답 ${p.level}단계` : "" })),
  ];
  return events.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
