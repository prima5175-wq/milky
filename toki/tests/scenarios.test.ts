import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { transition, visibleToChild } from "@/lib/scenarios/review";
import { suggestScenarios, validatePrescription } from "@/lib/scenarios/prescription";
import { validateAll } from "@/lib/scenarios/validate";
import type { Scenario } from "@/lib/scenarios/schema";

const mk = (id: string, over: Partial<Scenario> = {}): Scenario => ({
  id, setting: "급식실", ageBand: "초등 저학년", domain: ["담화 관리"], targetLevel: 2, situation: "s", partnerLine: `p-${id}`, partnerEmotion: "기쁨",
  awkwardExample: { line: "a", whyAwkward: "w" }, goodResponses: { "1": ["a1"], "2": ["a2"], "3": ["a3"], "4": ["a4"] },
  choiceOptions: ["a1", "a", "...", "a2"], mission: "m", media: { cartoon: null, videoAwkward: null, videoGood: null }, reviewStatus: "draft", ...over,
});

describe("감수 흐름", () => {
  it("초안 → 승인으로 바로 갈 수 없다", () => expect(transition(mk("a"), { to: "approved", reviewerId: "r", actorRole: "admin" }).ok).toBe(false));
  it("초안 → 검토 → 승인", () => {
    const r1 = transition(mk("a"), { to: "expert_review", actorRole: "admin" });
    expect(r1.ok && r1.scenario.reviewStatus).toBe("expert_review");
    if (!r1.ok) return;
    const r2 = transition(r1.scenario, { to: "approved", reviewerId: "prof", actorRole: "admin" });
    expect(r2.ok && r2.scenario.reviewStatus).toBe("approved");
  });
  it("승인에는 검토자가 필요하다", () => expect(transition(mk("a", { reviewStatus: "expert_review" }), { to: "approved", actorRole: "admin" }).ok).toBe(false));
  it("초안으로 되돌릴 때는 사유가 필요하다", () => {
    expect(transition(mk("a", { reviewStatus: "approved" }), { to: "draft", actorRole: "admin" }).ok).toBe(false);
    expect(transition(mk("a", { reviewStatus: "approved" }), { to: "draft", note: "표현 수정", actorRole: "admin" }).ok).toBe(true);
  });
  it("관리자가 아니면 바꿀 수 없다", () => {
    for (const role of ["therapist", "guardian"] as const)
      expect(transition(mk("a"), { to: "expert_review", actorRole: role }).ok).toBe(false);
  });
  it("아동 화면에는 승인된 것만", () => {
    const list = [mk("a"), mk("b", { reviewStatus: "expert_review" }), mk("c", { reviewStatus: "approved" })];
    expect(visibleToChild(list).map((s) => s.id)).toEqual(["c"]);
  });
});

describe("처방", () => {
  const base = { dailyMinutes: 15, dailyScenarios: 3, targetLevel: 2 as const, targetDomains: [] };
  it("정상값", () => expect(validatePrescription(base)).toEqual({ errors: [], warnings: [] }));
  it("범위 밖", () => expect(validatePrescription({ ...base, dailyMinutes: 3, dailyScenarios: 11 }).errors).toHaveLength(2));
  it("시간 대비 개수가 많으면 경고", () => expect(validatePrescription({ ...base, dailyMinutes: 5, dailyScenarios: 4 }).warnings).toHaveLength(1));
});

describe("후보 제안", () => {
  const child = { ageBand: "7-8", targetLevel: 2 as const, targetDomains: ["담화 관리" as const] };
  const all = [mk("a", { reviewStatus: "approved" }), mk("b"), mk("c", { reviewStatus: "approved", ageBand: "유아" }),
    mk("d", { reviewStatus: "approved", domain: ["의사소통 기능"], targetLevel: 4 }), mk("e", { reviewStatus: "approved" })];
  it("승인·연령 일치만, 점수순", () => expect(suggestScenarios(child, all).map((s) => s.scenario.id)).toEqual(["a", "e", "d"]));
  it("이미 배정된 것 제외", () => expect(suggestScenarios(child, all, ["a"]).map((s) => s.scenario.id)).toEqual(["e", "d"]));
  it("알 수 없는 연령대는 빈 목록", () => expect(suggestScenarios({ ...child, ageBand: "99" }, all)).toEqual([]));
});

describe("시드 시나리오 파일", () => {
  const dir = new URL("../content/scenarios/", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const list = files.flatMap((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")));
  it("모두 형식 검증을 통과하고 id 중복이 없다", () => expect(validateAll(list).errors).toEqual([]));
  it("전부 초안 상태다 (감수 전 노출 금지)", () => expect(list.every((s: Scenario) => s.reviewStatus === "draft")).toBe(true));
});
