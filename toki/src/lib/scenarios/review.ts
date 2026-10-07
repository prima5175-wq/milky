import type { ReviewStatus, Scenario } from "./schema.ts";

/** 감수 흐름: 초안 → 전문가 검토 → 승인. 반려하거나 승인을 취소하면 초안으로 돌아간다. */
export const REVIEW_LABEL: Record<ReviewStatus, string> = { draft: "초안", expert_review: "전문가 검토", approved: "승인" };

const ALLOWED: Record<ReviewStatus, ReviewStatus[]> = {
  draft: ["expert_review"],
  expert_review: ["approved", "draft"],
  approved: ["draft"],
};

export interface TransitionInput { to: ReviewStatus; reviewerId?: string; note?: string; actorRole: "admin" | "therapist" | "guardian" }
export type TransitionResult = { ok: true; scenario: Scenario } | { ok: false; error: string };

export function transition(s: Scenario, input: TransitionInput): TransitionResult {
  if (input.actorRole !== "admin") return { ok: false, error: "관리자만 감수 상태를 바꿀 수 있어요" };
  if (!ALLOWED[s.reviewStatus].includes(input.to)) return { ok: false, error: `${REVIEW_LABEL[s.reviewStatus]} 에서 ${REVIEW_LABEL[input.to]} 로 바로 바꿀 수 없어요` };
  if (input.to === "approved" && !input.reviewerId) return { ok: false, error: "승인에는 검토자 정보가 필요해요" };
  if (input.to === "draft" && !input.note?.trim()) return { ok: false, error: "초안으로 되돌릴 때는 사유를 적어 주세요" };
  return { ok: true, scenario: { ...s, reviewStatus: input.to } };
}

/** 아동 화면에는 승인된 시나리오만 노출한다. (DB 의 RLS 정책과 이중으로 막는다) */
export const visibleToChild = (list: Scenario[]) => list.filter((s) => s.reviewStatus === "approved");
