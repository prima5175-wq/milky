import type { AssessmentRecord, ScoreField } from "./types";

export interface SeriesPoint { date: string; value: number; recordId: string; phase: AssessmentRecord["phase"] }

/** 수정으로 대체된 기록은 빼고, 날짜순으로 한 점수 항목의 추이를 만든다. */
export function buildSeries(records: AssessmentRecord[], catalogId: string, key: string): SeriesPoint[] {
  return records
    .filter((r) => r.catalogId === catalogId && !r.supersededBy)
    .flatMap((r) => {
      const v = r.scores[key];
      const n = typeof v === "number" ? v : v === undefined || v === "" ? NaN : Number(v);
      return Number.isFinite(n) ? [{ date: r.administeredOn, value: n, recordId: r.id, phase: r.phase }] : [];
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.recordId.localeCompare(b.recordId));
}

export type Direction = "up" | "down" | "same";
export type Judgement = "better" | "worse" | "neutral";

export interface Change { from: SeriesPoint; to: SeriesPoint; delta: number; direction: Direction; judgement: Judgement }

/** 두 시점 비교. 점수 방향(높을수록 좋은지)을 모르면 좋고 나쁨을 판정하지 않는다. */
export function compare(from: SeriesPoint, to: SeriesPoint, field?: Pick<ScoreField, "higherIsBetter">): Change {
  const delta = Math.round((to.value - from.value) * 100) / 100;
  const direction: Direction = delta > 0 ? "up" : delta < 0 ? "down" : "same";
  let judgement: Judgement = "neutral";
  if (direction !== "same" && field?.higherIsBetter !== undefined) {
    const improved = field.higherIsBetter ? direction === "up" : direction === "down";
    judgement = improved ? "better" : "worse";
  }
  return { from, to, delta, direction, judgement };
}

/** 첫 시점 대비 마지막 시점의 변화 */
export function overallChange(series: SeriesPoint[], field?: Pick<ScoreField, "higherIsBetter">): Change | null {
  return series.length < 2 ? null : compare(series[0], series[series.length - 1], field);
}
