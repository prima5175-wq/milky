import { describe, it, expect } from "vitest";
import { classifyLevel } from "@/lib/practice/levels";
import { offlineEngine, levelOfChoice, MAX_TURNS } from "@/lib/practice/engine";
import { buildChoices } from "@/lib/practice/choices";
import { detectSafety } from "@/lib/safety/keywords";
import { POINTS, practicePointsToday, DAILY_PRACTICE_POINT_CAP } from "@/lib/practice/rewards";
import type { Scenario } from "@/lib/scenarios/schema";

const S: Scenario = {
  id: "lun-001", setting: "급식실", ageBand: "초등 저학년", domain: ["담화 관리"], targetLevel: 2, situation: "s", partnerLine: "오늘 돈가스 진짜 맛있다!", partnerEmotion: "기쁨",
  awkwardExample: { line: "나 어제 게임 레벨 올렸어.", whyAwkward: "w" },
  goodResponses: { "1": ["맞아, 진짜 맛있다!"], "2": ["너 돈가스 좋아해?"], "3": ["나도 돈가스 제일 좋아해. 소스 많이 찍어 먹어."], "4": ["너 엄청 신나 보인다! 좋아하는 반찬 나왔구나."] },
  choiceOptions: ["맞아, 진짜 맛있다!", "나 어제 게임 레벨 올렸어.", "...", "너 돈가스 좋아해?"], mission: "m",
  media: { cartoon: null, videoAwkward: null, videoGood: null }, reviewStatus: "approved",
};

describe("classifyLevel", () => {
  it.each([
    ["맞아, 진짜 맛있다!", 1], ["너 돈가스 좋아해?", 2], ["뭐 탔어", 2], ["나도 작년에 갔는데 바이킹 무서웠어.", 3],
    ["신났겠다! 또 가고 싶지?", 4], ["속상했구나", 4], ["응", 1],
  ])("%s → %s단계", (t, lv) => expect(classifyLevel(t)).toBe(lv));
  it("빈 응답·점만 있으면 null", () => { expect(classifyLevel("")).toBeNull(); expect(classifyLevel("...")).toBeNull(); });
});

describe("offlineEngine", () => {
  const base = { scenario: S, targetLevel: 2 as const, turnNo: 1 };
  it("선택형: 단계를 알아내고 목표보다 낮으면 더 나은 예를 한 개 보여준다", async () => {
    const r = await offlineEngine.respond({ ...base, text: "맞아, 진짜 맛있다!", mode: "choice" });
    expect(r.detectedLevel).toBe(1);
    expect(r.feedback).toContain("너 돈가스 좋아해?");
  });
  it("목표 이상이면 칭찬만 하고 더 높은 단계를 강요하지 않는다", async () => {
    const r = await offlineEngine.respond({ ...base, targetLevel: 1, text: "너 돈가스 좋아해?", mode: "choice" });
    expect(r.detectedLevel).toBe(2);
    expect(r.feedback).not.toContain("다음엔");
  });
  it("어색한 응답에는 '틀렸어'라고 하지 않고 예시를 준다", async () => {
    const r = await offlineEngine.respond({ ...base, text: "나 어제 게임 레벨 올렸어.", mode: "choice" });
    expect(r.detectedLevel).toBeNull();
    expect(r.feedback).not.toMatch(/틀렸|잘못/);
    expect(r.feedback).toContain("너 돈가스 좋아해?");
  });
  it("자유 입력도 분류한다", async () => {
    expect((await offlineEngine.respond({ ...base, text: "너 돈가스 좋아해?", mode: "text" })).detectedLevel).toBe(2);
  });
  it("안전 키워드면 연습을 멈추고 어른에게 알리도록 안내한다", async () => {
    const r = await offlineEngine.respond({ ...base, text: "친구가 나를 계속 괴롭혀", mode: "voice" });
    expect(r).toMatchObject({ safetyFlag: true, safetyCategory: "bullying", detectedLevel: null });
    expect(r.feedback).toContain("어른에게");
  });
  it("최대 3번", () => expect(MAX_TURNS).toBe(3));
  it("levelOfChoice", () => { expect(levelOfChoice(S, "너 돈가스 좋아해?")).toBe(2); expect(levelOfChoice(S, "...")).toBeNull(); });
});

describe("buildChoices", () => {
  it("1번째는 기본 선택지 4개를 섞어서", () => {
    const c = buildChoices(S, 1, [], 2);
    expect([...c].sort()).toEqual([...S.choiceOptions].sort());
  });
  it("같은 입력이면 같은 순서", () => expect(buildChoices(S, 1, [], 2)).toEqual(buildChoices(S, 1, [], 2)));
  it("2·3번째는 4개·중복 없음·이미 쓴 좋은 응답 제외·좋은 응답 포함", () => {
    for (const turn of [2, 3]) {
      const used = turn === 2 ? ["맞아, 진짜 맛있다!"] : ["맞아, 진짜 맛있다!", "너 돈가스 좋아해?"];
      const c = buildChoices(S, turn, used, 2);
      expect(c).toHaveLength(4);
      expect(new Set(c).size).toBe(4);
      used.forEach((u) => expect(c).not.toContain(u));
      expect(c.some((x) => Object.values(S.goodResponses).flat().includes(x))).toBe(true);
    }
  });
});

describe("detectSafety", () => {
  it.each(["죽고 싶어", "죽 고 싶 어", "친구가 나를 따돌려", "아빠가 때렸어", "이건 비밀이라고 했어"])("%s → 감지", (t) => expect(detectSafety(t).flagged).toBe(true));
  it.each(["오늘 돈가스 맛있다", "나도 놀이공원 갔어", "게임에서 졌어", "너 좋아하는 반찬 뭐야?"])("%s → 정상", (t) => expect(detectSafety(t).flagged).toBe(false));
});

describe("rewards", () => {
  it("미션이 연습보다 크다", () => expect(POINTS.missionConfirmed).toBeGreaterThan(POINTS.practiceDone));
  it("하루 연습 점수 상한", () => { expect(practicePointsToday(0)).toBe(1); expect(practicePointsToday(DAILY_PRACTICE_POINT_CAP)).toBe(0); });
});
