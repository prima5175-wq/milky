import { describe, it, expect } from "vitest";
import { buildSeries, compare, overallChange } from "@/lib/assessments/series";
import { validateScores } from "@/lib/assessments/validate";
import { retestInfo, addMonths } from "@/lib/assessments/retest";
import { buildTimeline } from "@/lib/assessments/timeline";
import { GENERIC_SCORE_SCHEMA, type AssessmentRecord, type CatalogEntry } from "@/lib/assessments/types";

const rec = (id: string, date: string, scores: AssessmentRecord["scores"], extra: Partial<AssessmentRecord> = {}): AssessmentRecord => ({
  id, childId: "c1", catalogId: "k1", administeredOn: date, examinerName: "검사자", phase: "follow_up", scores, ...extra,
});

describe("buildSeries", () => {
  it("날짜순 정렬, 수정으로 대체된 기록과 숫자 아닌 값은 제외", () => {
    const rs = [rec("b", "2025-06-01", { standard: 90 }), rec("a", "2025-01-01", { standard: 80 }),
      rec("x", "2025-03-01", { standard: 99 }, { supersededBy: "b" }), rec("n", "2025-09-01", { standard: "" })];
    expect(buildSeries(rs, "k1", "standard").map((p) => p.value)).toEqual([80, 90]);
  });
  it("다른 검사의 기록은 섞이지 않는다", () => {
    expect(buildSeries([rec("a", "2025-01-01", { standard: 1 })], "k2", "standard")).toEqual([]);
  });
});

describe("compare", () => {
  const p = (v: number) => ({ date: "2025-01-01", value: v, recordId: "r", phase: "pre" as const });
  it("방향을 모르면 좋고 나쁨을 판정하지 않는다", () => expect(compare(p(80), p(90)).judgement).toBe("neutral"));
  it("높을수록 좋은 점수: 올라가면 better", () => expect(compare(p(80), p(90), { higherIsBetter: true }).judgement).toBe("better"));
  it("낮을수록 좋은 점수(문제행동): 올라가면 worse", () => expect(compare(p(60), p(70), { higherIsBetter: false }).judgement).toBe("worse"));
  it("같으면 same/neutral", () => expect(compare(p(5), p(5), { higherIsBetter: true })).toMatchObject({ direction: "same", judgement: "neutral", delta: 0 }));
  it("시점이 하나면 전체 변화 없음", () => expect(overallChange([p(1)])).toBeNull());
});

describe("validateScores", () => {
  it("범위 밖 값과 숫자 아닌 값을 거부", () => {
    const r = validateScores(GENERIC_SCORE_SCHEMA, { raw: "abc", percentile: "120" });
    expect(r.ok).toBe(false);
    expect(Object.keys(r.errors).sort()).toEqual(["percentile", "raw"]);
  });
  it("일부만 입력해도 통과", () => expect(validateScores(GENERIC_SCORE_SCHEMA, { standard: "85" })).toMatchObject({ ok: true, scores: { standard: 85 } }));
  it("전부 비면 오류", () => expect(validateScores(GENERIC_SCORE_SCHEMA, {}).ok).toBe(false));
});

describe("retest", () => {
  it("말일 보정", () => expect(addMonths("2025-01-31", 1)).toBe("2025-02-28"));
  it("연도 넘김", () => expect(addMonths("2025-11-15", 3)).toBe("2026-02-15"));
  const rs = [rec("a", "2025-01-10", { raw: 1 })];
  it("기한 지남", () => expect(retestInfo(rs, "k1", 6, "2025-09-01").status).toBe("overdue"));
  it("30일 이내", () => expect(retestInfo(rs, "k1", 6, "2025-06-20")).toMatchObject({ status: "soon", dueOn: "2025-07-10", daysLeft: 20 }));
  it("여유", () => expect(retestInfo(rs, "k1", 6, "2025-02-01").status).toBe("ok"));
  it("간격 없거나 기록 없으면 none", () => {
    expect(retestInfo(rs, "k1", undefined, "2025-02-01").status).toBe("none");
    expect(retestInfo([], "k1", 6, "2025-02-01").status).toBe("none");
  });
});

describe("timeline", () => {
  const cat: CatalogEntry[] = [{ id: "k1", nameKo: "검사", abbreviation: "KT", category: "언어", administration: "clinician", scoreSchema: GENERIC_SCORE_SCHEMA }];
  it("최신순으로 합치고 대체된 기록은 뺀다", () => {
    const t = buildTimeline([rec("a", "2025-01-01", { standard: 80 }), rec("o", "2025-02-01", { standard: 1 }, { supersededBy: "a" })], cat,
      [{ id: "n1", date: "2025-03-01", body: "눈맞춤 증가" }]);
    expect(t.map((e) => e.id)).toEqual(["n1", "a"]);
    expect(t[1].detail).toBe("표준점수 80");
  });
  it("점수 없는 검사도 관찰 메모를 보여준다", () => {
    const t = buildTimeline([rec("h", "2025-01-01", {}, { note: "사람 표정 있음" })], cat);
    expect(t[0].detail).toBe("사람 표정 있음");
  });
  it("점수와 메모를 함께 보여준다", () => {
    const t = buildTimeline([rec("h", "2025-01-01", { standard: 80 }, { note: "집중 좋음" })], cat);
    expect(t[0].detail).toBe("표준점수 80 — 집중 좋음");
  });
});
