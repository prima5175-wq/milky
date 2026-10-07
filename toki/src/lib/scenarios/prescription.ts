import { CHILD_AGE_TO_BAND, type Domain, type Level, type Scenario } from "./schema.ts";
import { visibleToChild } from "./review.ts";

export interface Prescription {
  dailyMinutes: number;      // 하루 연습 시간(분)
  dailyScenarios: number;    // 하루 시나리오 개수
  targetLevel: Level;
  targetDomains: Domain[];
}

/** 시나리오 1개에 걸리는 평균 시간(분). 실제 사용 데이터가 쌓이면 조정한다. (가정값) */
export const MINUTES_PER_SCENARIO = 3;
export const LIMITS = { minutes: { min: 5, max: 60 }, scenarios: { min: 1, max: 10 } } as const;

export function validatePrescription(p: Prescription): { errors: string[]; warnings: string[] } {
  const errors: string[] = [], warnings: string[] = [];
  const { minutes, scenarios } = LIMITS;
  if (!Number.isInteger(p.dailyMinutes) || p.dailyMinutes < minutes.min || p.dailyMinutes > minutes.max) errors.push(`연습 시간은 ${minutes.min}~${minutes.max}분이에요`);
  if (!Number.isInteger(p.dailyScenarios) || p.dailyScenarios < scenarios.min || p.dailyScenarios > scenarios.max) errors.push(`시나리오는 하루 ${scenarios.min}~${scenarios.max}개예요`);
  if (![1, 2, 3, 4].includes(p.targetLevel)) errors.push("목표 단계는 1~4예요");
  if (!errors.length && p.dailyScenarios * MINUTES_PER_SCENARIO > p.dailyMinutes)
    warnings.push(`시나리오 ${p.dailyScenarios}개는 약 ${p.dailyScenarios * MINUTES_PER_SCENARIO}분이 걸려서 설정한 ${p.dailyMinutes}분을 넘을 수 있어요`);
  return { errors, warnings };
}

export interface Suggestion { scenario: Scenario; score: number; reasons: string[] }

/**
 * 후보 시나리오 제안. 앱은 제안만 하고, 배정은 검사자가 확정한다.
 * 조건: 승인된 것만 / 연령대 일치 / 이미 배정된 것 제외. 영역 일치와 목표 단계 근접도로 점수를 매긴다.
 */
export function suggestScenarios(child: { ageBand: string } & Pick<Prescription, "targetLevel" | "targetDomains">, all: Scenario[], assignedIds: string[] = []): Suggestion[] {
  const band = CHILD_AGE_TO_BAND[child.ageBand];
  if (!band) return [];
  const taken = new Set(assignedIds);
  return visibleToChild(all)
    .filter((s) => s.ageBand === band && !taken.has(s.id))
    .map((s) => {
      const reasons: string[] = [];
      let score = 0;
      const hit = s.domain.filter((d) => child.targetDomains.includes(d));
      if (hit.length) { score += 2 * hit.length; reasons.push(`목표 영역: ${hit.join(", ")}`); }
      else if (child.targetDomains.length) score -= 1;
      const gap = Math.abs(s.targetLevel - child.targetLevel);
      score += 3 - Math.min(gap, 3);
      reasons.push(gap === 0 ? "목표 단계와 같음" : `목표 단계와 ${gap}단계 차이`);
      return { scenario: s, score, reasons };
    })
    .sort((a, b) => b.score - a.score || a.scenario.id.localeCompare(b.scenario.id));
}
