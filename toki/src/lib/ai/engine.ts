import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { PracticeEngine, PracticeInput } from "../practice/engine.ts";
import { detectSafety, SAFETY_MESSAGE } from "../safety/keywords.ts";
import { buildSystemPrompt, buildUserMessage } from "./prompt.ts";
import { AiReplySchema, type AiReply } from "./schema.ts";
import { sanitizeAiReply } from "./sanitize.ts";

/** 테스트에서 가짜로 바꿀 수 있도록 필요한 부분만 정의한 클라이언트 모양 */
export interface ParseClient {
  messages: { parse(params: any): Promise<{ stop_reason: string | null; parsed_output: AiReply | null }> };
}
export class AiUnavailableError extends Error {}

export const DEFAULT_MODEL = "claude-opus-5-5";

export function createAiEngine(opts: { client: ParseClient; model?: string; maxTokens?: number }): PracticeEngine {
  const model = opts.model ?? DEFAULT_MODEL;
  return {
    async respond(input: PracticeInput) {
      // 1) 안전 키워드는 AI 호출 전에 먼저 검사한다. AI 가 실패해도 작동해야 한다.
      const safety = detectSafety(input.text);
      if (safety.flagged) return { friendReply: "", feedback: SAFETY_MESSAGE, detectedLevel: null, safetyFlag: true, safetyCategory: safety.category };

      let res;
      try {
        res = await opts.client.messages.parse({
          model,
          // 생각(thinking)도 max_tokens 에 포함되므로 짧은 JSON 응답에 비해 넉넉히 둔다.
          max_tokens: opts.maxTokens ?? 2000,
          system: buildSystemPrompt(input.scenario, input.targetLevel),
          messages: [{ role: "user", content: buildUserMessage(input.turnNo, input.text) }],
          // 짧은 대화 응답이므로 낮은 effort. Opus 5.5 는 thinking 을 끌 수 없어 effort 로 조절한다.
          output_config: { effort: "low", format: zodOutputFormat(AiReplySchema) },
        });
      } catch (e) {
        throw new AiUnavailableError(`AI 호출 실패: ${(e as Error).message}`);
      }
      if (res.stop_reason === "refusal") throw new AiUnavailableError("AI 가 응답을 거절함");
      const out = sanitizeAiReply(res.parsed_output);
      if (!out) throw new AiUnavailableError("AI 응답이 형식·안전 검사를 통과하지 못함");
      return out;
    },
  };
}
