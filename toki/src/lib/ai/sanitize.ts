import type { PracticeOutput } from "../practice/engine.ts";
import type { DetectedLevel } from "../practice/levels.ts";
import { SAFETY_MESSAGE } from "../safety/keywords.ts";
import type { AiReply } from "./schema.ts";

const BANNED = /틀렸|잘못했|잘못된|바보|멍청|못했어|한심|짜증나/;
const FRIEND_MAX = 80, FEEDBACK_MAX = 200;

/** AI 응답을 아동에게 보여도 되는지 검사한다. 통과하지 못하면 null → 호출자는 오프라인 엔진으로 대체한다. */
export function sanitizeAiReply(r: AiReply | null | undefined): PracticeOutput | null {
  if (!r || typeof r.safetyFlag !== "boolean") return null;
  if (r.safetyFlag) {
    // 모델이 위험 신호를 감지했다. 아이에게는 우리가 정한 고정 문구만 보여 준다.
    return { friendReply: "", feedback: SAFETY_MESSAGE, detectedLevel: null, safetyFlag: true, safetyCategory: "model_flagged" };
  }
  const friendReply = String(r.friendReply ?? "").trim(), feedback = String(r.feedback ?? "").trim();
  if (!friendReply || !feedback || friendReply.length > FRIEND_MAX || feedback.length > FEEDBACK_MAX) return null;
  if (BANNED.test(friendReply) || BANNED.test(feedback)) return null;
  const lv = Number.isInteger(r.detectedLevel) && r.detectedLevel >= 1 && r.detectedLevel <= 4 ? (r.detectedLevel as DetectedLevel) : null;
  return { friendReply, feedback, detectedLevel: lv, safetyFlag: false };
}
