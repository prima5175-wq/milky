import type { PracticeEngine, PracticeOutput } from "./engine.ts";

export class LimitReachedError extends Error {}

/** 서버(/api/practice)를 통해 AI 친구와 대화한다. 서버가 AI 연결·안전 검사·시간 제한을 맡는다. 실패하면 호출자가 오프라인 엔진으로 대체한다. */
export const remoteEngine: PracticeEngine = {
  async respond(input) {
    const res = await fetch("/api/practice", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: input.scenario.id, turnNo: input.turnNo, text: input.text, mode: input.mode }),
    });
    if (res.status === 429) throw new LimitReachedError();
    if (!res.ok) throw new Error(`practice ${res.status}`);
    const j = await res.json();
    return { friendReply: j.friendReply, feedback: j.feedback, detectedLevel: j.detectedLevel, safetyFlag: j.safetyFlag, safetyCategory: j.safetyCategory } as PracticeOutput;
  },
};
