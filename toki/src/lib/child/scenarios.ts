// 서버 전용: 아동 화면에 내보낼 시나리오. 승인된 것만 나간다.
// 개발 확인용으로 TOKI_DEMO_APPROVE=1 이면 연령대별 일부를 '임시 승인' 표시로 내보낸다 (파일의 상태는 바뀌지 않음, 운영에서는 끈다).
import { loadSeedScenarios } from "../scenarios/load.ts";
import { visibleToChild } from "../scenarios/review.ts";
import { CHILD_AGE_TO_BAND, type Scenario } from "../scenarios/schema.ts";

export const isDemoApprove = () => process.env.TOKI_DEMO_APPROVE === "1";

export function scenariosForChild(childAgeBand: string): { scenarios: Scenario[]; demo: boolean } {
  const all = loadSeedScenarios();
  const approved = visibleToChild(all);
  const band = CHILD_AGE_TO_BAND[childAgeBand];
  let list = approved.filter((s) => s.ageBand === band);
  const demo = isDemoApprove();
  if (demo) {
    const seen = new Set<string>();
    const picks = all.filter((s) => s.ageBand === band && s.reviewStatus !== "approved" && !seen.has(s.setting) && seen.add(s.setting)).slice(0, 6);
    list = [...list, ...picks.map((s) => ({ ...s, reviewStatus: "approved" as const }))];
  }
  return { scenarios: list, demo };
}

export function findForChild(id: string, childAgeBand: string): Scenario | null {
  return scenariosForChild(childAgeBand).scenarios.find((s) => s.id === id) ?? null;
}
