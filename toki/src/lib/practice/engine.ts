import type { Level, Scenario } from "../scenarios/schema.ts";
import { classifyLevel, LEVEL_NAME, type DetectedLevel } from "./levels.ts";
import { detectSafety, SAFETY_MESSAGE, type SafetyCategory } from "../safety/keywords.ts";

export const MAX_TURNS = 3; // 한 시나리오는 최대 3번 주고받기. 끝없는 자유 대화는 허용하지 않는다.
export type InputMode = "choice" | "voice" | "text";

export interface PracticeInput { scenario: Scenario; targetLevel: Level; turnNo: number; text: string; mode: InputMode }
export interface PracticeOutput {
  friendReply: string;
  feedback: string;
  detectedLevel: DetectedLevel | null;
  safetyFlag: boolean;
  safetyCategory?: SafetyCategory;
}
/** AI(5단계)와 오프라인 구현이 같은 인터페이스를 쓴다. */
export interface PracticeEngine { respond(input: PracticeInput): Promise<PracticeOutput> }

const FRIEND: Record<DetectedLevel | 0, string> = {
  1: "응, 그치?", 2: "음~ 좋은 질문이야!", 3: "오, 그랬구나!", 4: "맞아, 그런 기분이었어!", 0: "응… 그렇구나.",
};
const PRAISE: Record<DetectedLevel, string> = {
  1: "친구 말에 반응해 줬네!", 2: "질문으로 이어 갔네!", 3: "네 이야기를 들려줬네!", 4: "친구 마음을 읽어 줬네!",
};
const LEVELS = ["1", "2", "3", "4"] as const;

/** 선택형 응답은 goodResponses 에 들어 있는지로 단계를 알 수 있다. */
export function levelOfChoice(s: Scenario, text: string): DetectedLevel | null {
  for (const lv of LEVELS) if (s.goodResponses[lv].includes(text)) return Number(lv) as DetectedLevel;
  return null;
}

/** 인터넷·AI 없이 동작하는 대체 구현. 짧고 따뜻하게, 고칠 점은 한 가지만. */
export const offlineEngine: PracticeEngine = {
  async respond({ scenario, targetLevel, text, mode }) {
    const safety = detectSafety(text);
    if (safety.flagged) return { friendReply: "", feedback: SAFETY_MESSAGE, detectedLevel: null, safetyFlag: true, safetyCategory: safety.category };

    const detected = mode === "choice" ? levelOfChoice(scenario, text) : classifyLevel(text);
    if (detected === null) {
      const example = scenario.goodResponses[String(targetLevel) as "1"][0];
      return { friendReply: FRIEND[0], feedback: `그럴 때도 있어. 이렇게 말하면 친구가 더 좋아할 수 있어: “${example}”`, detectedLevel: null, safetyFlag: false };
    }
    // 목표보다 낮은 응답에만 더 나은 예를 하나 보여준다. 목표 이상이면 칭찬만 하고 더 높은 단계를 강요하지 않는다.
    let feedback = PRAISE[detected];
    if (detected < targetLevel) {
      const example = scenario.goodResponses[String(targetLevel) as "1"][0];
      feedback += ` 다음엔 이렇게도 말해 볼까? “${example}” (${LEVEL_NAME[targetLevel]})`;
    }
    return { friendReply: FRIEND[detected], feedback, detectedLevel: detected, safetyFlag: false };
  },
};
