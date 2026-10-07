import { z } from "zod";
import type { PracticeEngine, PracticeOutput } from "../practice/engine.ts";
import { MAX_TURNS } from "../practice/engine.ts";
import { detectSafety, SAFETY_MESSAGE } from "../safety/keywords.ts";
import type { SafetyEventStore } from "../safety/events.ts";
import { dayOf, status, type UsageStore } from "../usage/limit.ts";
import type { Level, Scenario } from "../scenarios/schema.ts";

export const PracticeBody = z.object({
  scenarioId: z.string().min(1).max(40),
  turnNo: z.number().int().min(1).max(MAX_TURNS),
  text: z.string().min(1).max(200),
  mode: z.enum(["choice", "voice", "text"]),
});

export interface Deps {
  childId: string; targetLevel: Level; dailyMinutes: number;
  findScenario(id: string): Scenario | null;
  ai: PracticeEngine | null;            // 없으면 AI 미설정
  offline: PracticeEngine;              // AI 가 없거나 실패하면 항상 이것으로 계속한다
  usage: UsageStore; safety: SafetyEventStore; now?: Date;
}
export type Result =
  | { status: 200; body: PracticeOutput & { source: "ai" | "offline" | "safety" } }
  | { status: 400 | 404 | 429; body: { error: string } };

export async function handlePractice(raw: unknown, d: Deps): Promise<Result> {
  const parsed = PracticeBody.safeParse(raw);
  if (!parsed.success) return { status: 400, body: { error: "bad_request" } };
  const { scenarioId, turnNo, text, mode } = parsed.data;
  const now = d.now ?? new Date();

  const scenario = d.findScenario(scenarioId); // 아동에게 열려 있는(승인된) 시나리오만 찾아 준다
  if (!scenario) return { status: 404, body: { error: "not_found" } };

  if (status(d.usage.used(d.childId, dayOf(now)), d.dailyMinutes).reached) return { status: 429, body: { error: "limit_reached" } };

  const input = { scenario, targetLevel: d.targetLevel, turnNo, text, mode };
  const record = (category: NonNullable<PracticeOutput["safetyCategory"]>) =>
    d.safety.add({ childId: d.childId, scenarioId, category, excerpt: text }, now);

  // 안전 키워드는 어떤 경로보다 먼저. AI 설정·장애와 무관하게 항상 기록하고 중단한다.
  const kw = detectSafety(text);
  if (kw.flagged) {
    record(kw.category!);
    return { status: 200, body: { friendReply: "", feedback: SAFETY_MESSAGE, detectedLevel: null, safetyFlag: true, safetyCategory: kw.category, source: "safety" } };
  }

  if (d.ai) {
    try {
      const out = await d.ai.respond(input);
      if (out.safetyFlag) record(out.safetyCategory ?? "model_flagged");
      return { status: 200, body: { ...out, source: out.safetyFlag ? "safety" : "ai" } };
    } catch { /* AI 장애·거절·형식 오류: 아래 오프라인으로 계속 */ }
  }
  const out = await d.offline.respond(input);
  if (out.safetyFlag) record(out.safetyCategory ?? "model_flagged");
  return { status: 200, body: { ...out, source: out.safetyFlag ? "safety" : "offline" } };
}
