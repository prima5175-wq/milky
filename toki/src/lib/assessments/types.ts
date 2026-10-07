// 검사 카탈로그·기록 타입. 외부 검사는 문항 없이 점수만 다룬다.
export type ScoreKind = "raw" | "standard" | "t_score" | "percentile" | "scaled" | "category" | "number";

export interface ScoreField {
  key: string;
  label: string;
  kind: ScoreKind;
  min?: number;
  max?: number;
  /** 높을수록 좋은 점수인지. 모르면 생략 → 변화 방향을 좋고 나쁨으로 표시하지 않는다. */
  higherIsBetter?: boolean;
}

export interface CatalogEntry {
  id: string;
  nameKo: string;
  abbreviation?: string;
  category: string;
  administration: "clinician" | "parent_rating" | "teacher_rating" | "self_report" | "drawing";
  scoreSchema: ScoreField[];
  retestIntervalMonths?: number;
}

export interface AssessmentRecord {
  id: string;
  childId: string;
  catalogId: string;
  administeredOn: string; // YYYY-MM-DD
  examinerName: string;
  phase: "pre" | "follow_up" | "post";
  scores: Record<string, number | string>;
  note?: string;
  supersededBy?: string | null;
}

/** 점수 양식이 비어 있는 검사에 쓰는 기본 입력 양식 (교수님 감수 전 임시) */
export const GENERIC_SCORE_SCHEMA: ScoreField[] = [
  { key: "raw", label: "원점수", kind: "raw" },
  { key: "standard", label: "표준점수", kind: "standard" },
  { key: "percentile", label: "백분위", kind: "percentile", min: 0, max: 100 },
];
