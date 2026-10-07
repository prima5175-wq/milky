// 화면 확인용 가상 데이터입니다. 실제 아동·검사 결과가 아닙니다.
import { GENERIC_SCORE_SCHEMA, type AssessmentRecord, type CatalogEntry } from "./types";
import type { AssessmentRepository } from "./repository";

const catalog: CatalogEntry[] = [
  { id: "demo-lang", nameKo: "(예시) 언어 검사", abbreviation: "예시-언어", category: "언어", administration: "clinician",
    scoreSchema: GENERIC_SCORE_SCHEMA.map((f) => ({ ...f, higherIsBetter: true })), retestIntervalMonths: 6 },
  { id: "demo-behav", nameKo: "(예시) 행동 평정", abbreviation: "예시-행동", category: "정서·행동", administration: "parent_rating",
    scoreSchema: [{ key: "t", label: "T점수", kind: "t_score", min: 20, max: 100, higherIsBetter: false }], retestIntervalMonths: 3 },
  { id: "demo-htp", nameKo: "집-나무-사람 (HTP)", abbreviation: "HTP", category: "투사·그림", administration: "drawing",
    scoreSchema: [], retestIntervalMonths: 3 },
];

const r = (id: string, catalogId: string, d: string, scores: AssessmentRecord["scores"], phase: AssessmentRecord["phase"] = "follow_up"): AssessmentRecord =>
  ({ id, childId: "demo-1", catalogId, administeredOn: d, examinerName: "예시 검사자", phase, scores });

const records: AssessmentRecord[] = [
  r("r1", "demo-lang", "2024-03-05", { raw: 41, standard: 78, percentile: 7 }, "pre"),
  r("r2", "demo-lang", "2024-09-10", { raw: 49, standard: 84, percentile: 14 }),
  r("r3", "demo-lang", "2025-03-12", { raw: 57, standard: 91, percentile: 27 }),
  r("r4", "demo-behav", "2024-03-05", { t: 68 }, "pre"),
  r("r5", "demo-behav", "2024-09-10", { t: 64 }),
  r("r6", "demo-behav", "2025-03-12", { t: 59 }),
  r("r7", "demo-htp", "2024-03-05", {}, "pre"),
];

export const demoRepository: AssessmentRepository = {
  listChildren: async () => [{ id: "demo-1", nickname: "예시 아동", ageBand: "7-8" }],
  getChild: async (id) => (id === "demo-1" ? { id, nickname: "예시 아동", ageBand: "7-8" } : null),
  listCatalog: async () => catalog,
  listRecords: async (childId) => records.filter((x) => x.childId === childId),
  listNotes: async () => [{ id: "n1", date: "2025-03-12", body: "(예시) 눈맞춤과 주고받기가 늘었다는 보호자 보고" }],
};
