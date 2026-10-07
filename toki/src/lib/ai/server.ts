// 서버 전용. ANTHROPIC_API_KEY 가 있을 때만 AI 엔진을 만든다. 키는 브라우저에 절대 내려가지 않는다.
import Anthropic from "@anthropic-ai/sdk";
import type { PracticeEngine } from "../practice/engine.ts";
import { createAiEngine, DEFAULT_MODEL, type ParseClient } from "./engine.ts";

let cached: PracticeEngine | null | undefined;
export function getAiEngine(): PracticeEngine | null {
  if (cached !== undefined) return cached;
  if (!process.env.ANTHROPIC_API_KEY) return (cached = null);
  const client = new Anthropic({ maxRetries: 1, timeout: 20_000 }) as unknown as ParseClient; // 아이가 기다리므로 짧게
  return (cached = createAiEngine({ client, model: process.env.TOKI_AI_MODEL || DEFAULT_MODEL }));
}
