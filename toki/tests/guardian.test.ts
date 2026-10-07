import { describe, it, expect } from "vitest";
import { ProgressStore } from "@/lib/progress/store";
import { weeklySummary } from "@/lib/progress/summary";
import { tipsFor } from "@/lib/progress/tips";
import { ConsentStore, validateSignup, type SignupInput } from "@/lib/consent/consent";
import { hashPin, verifyPin } from "@/lib/consent/pin";
import { HtpStore, validateHtp, MAX_IMAGE_BYTES } from "@/lib/htp/store";
import { ChildConfigStore } from "@/lib/server/stores";
import { POINTS } from "@/lib/practice/rewards";

const comp = (id: string, day = "2026-10-07", levels: Array<number | null> = [2, 2, 3]) => ({ childId: "c1", scenarioId: id, day, levels, modes: ["choice", "choice", "text"], missionText: `m-${id}` });

describe("ProgressStore", () => {
  it("연습을 마치면 작은 점수 + 미션이 열린다 (미션 점수는 아직 없음)", () => {
    const p = new ProgressStore(); const r = p.completePractice(comp("a"));
    expect(r).toMatchObject({ counted: true, practicePoints: 1 });
    expect(p.listMissions("c1", "open")).toHaveLength(1);
    expect(p.totalPoints("c1")).toBe(POINTS.practiceDone);
  });
  it("보호자가 확인하면 미션 점수(5)를 주고, 두 번은 주지 않는다", () => {
    const p = new ProgressStore(); const { missionId } = p.completePractice(comp("a"));
    expect(p.confirmMission(missionId!, "guardian")).toEqual({ ok: true, points: POINTS.missionConfirmed });
    expect(p.confirmMission(missionId!, "guardian").ok).toBe(false);
    expect(p.totalPoints("c1")).toBe(POINTS.practiceDone + POINTS.missionConfirmed);
  });
  it("미션 점수가 연습 점수보다 크다", () => expect(POINTS.missionConfirmed).toBeGreaterThan(POINTS.practiceDone));
  it("같은 날 같은 시나리오 반복으로 점수를 더 못 얻는다", () => {
    const p = new ProgressStore(); p.completePractice(comp("a"));
    const again = p.completePractice(comp("a"));
    expect(again).toMatchObject({ counted: false, practicePoints: 0 });
    expect(p.totalPoints("c1")).toBe(1); expect(p.listMissions("c1")).toHaveLength(1);
  });
  it("하루 연습 점수 상한(3)", () => {
    const p = new ProgressStore(); for (const id of ["a", "b", "c", "d", "e"]) p.completePractice(comp(id));
    expect(p.totalPoints("c1")).toBe(3);
  });
  it("없는 미션 확인은 실패, 범위 밖 단계는 null 로 저장", () => {
    const p = new ProgressStore(); expect(p.confirmMission("nope", "g").ok).toBe(false);
    p.completePractice(comp("a", "2026-10-07", [9, 0, 2, 4]));
    expect(p.sessions[0].levels).toEqual([null, null, 2]); // 최대 3개만
  });
  it("다른 아동 기록과 섞이지 않는다", () => {
    const p = new ProgressStore(); p.completePractice({ ...comp("a"), childId: "other" });
    expect(p.totalPoints("c1")).toBe(0); expect(p.listMissions("c1")).toEqual([]);
  });
});

describe("weeklySummary", () => {
  it("최근 7일만 센다", () => {
    const p = new ProgressStore();
    p.completePractice(comp("a", "2026-10-07", [2, 2, 3])); p.completePractice(comp("b", "2026-10-01", [4])); p.completePractice(comp("c", "2026-09-30", [1]));
    const s = weeklySummary("c1", p.sessions, p.missions, "2026-10-07");
    expect(s).toMatchObject({ from: "2026-10-01", practiceCount: 2, activeDays: 2, levelCounts: { 1: 0, 2: 2, 3: 1, 4: 1 } });
  });
  it("문장은 쉬운 말이고 진단·평가 표현이 없다", () => {
    const p = new ProgressStore(); const { missionId } = p.completePractice(comp("a")); p.confirmMission(missionId!, "g");
    p.completePractice(comp("b"));
    const text = weeklySummary("c1", p.sessions, p.missions, "2026-10-07").lines.join(" ");
    expect(text).toContain("확인해 주셨어요"); expect(text).toContain("기다리는 미션이 1개");
    expect(text).not.toMatch(/진단|치료|부족|문제|늦/);
  });
  it("기록이 없으면 안내", () => expect(weeklySummary("c1", [], [], "2026-10-07").lines[0]).toContain("아직"));
});

describe("tips", () => {
  it("공통 팁 + 목표 단계 팁", () => {
    const t = tipsFor(2); expect(t.some((x) => x.level === 0)).toBe(true); expect(t.some((x) => x.level === 2)).toBe(true); expect(t.some((x) => x.level === 4)).toBe(false);
  });
  it("진단·치료 표현이 없다", () => expect(tipsFor(3).map((t) => t.text).join(" ")).not.toMatch(/진단|치료/));
});

describe("signup / consent", () => {
  const ok: SignupInput = { guardianName: "김보호", email: "a@b.co", pin: "1234", childNickname: "토토", ageBand: "7-8", isLegalGuardian: true, consents: { service: true } };
  it("정상", () => expect(validateSignup(ok).ok).toBe(true));
  it.each([
    ["서비스 동의 없음", { consents: {} }, "service"], ["법정대리인 아님", { isLegalGuardian: false }, "isLegalGuardian"],
    ["PIN 형식", { pin: "12" }, "pin"], ["이메일", { email: "x" }, "email"], ["연령대", { ageBand: "13" }, "ageBand"], ["별명 없음", { childNickname: " " }, "childNickname"],
  ])("%s → 거부", (_n, over, key) => { const r = validateSignup({ ...ok, ...(over as object) }); expect(r.ok).toBe(false); expect(r.errors[key as string]).toBeTruthy(); });
  it("선택 동의는 기본적으로 없다 (음성·그림·연구)", () => {
    const c = new ConsentStore(); c.grant("c", "service");
    expect(c.has("c", "service")).toBe(true);
    for (const k of ["voice_storage", "drawing_storage", "research"] as const) expect(c.has("c", k)).toBe(false);
  });
  it("철회하면 동의가 사라지고 기록은 남는다", () => {
    const c = new ConsentStore(); c.grant("c", "drawing_storage");
    expect(c.revoke("c", "drawing_storage")).toBe(true); expect(c.has("c", "drawing_storage")).toBe(false);
    expect(c.recs[0].revokedAt).toBeTruthy(); expect(c.revoke("c", "drawing_storage")).toBe(false);
  });
  it("다른 아동의 동의와 섞이지 않는다", () => { const c = new ConsentStore(); c.grant("a", "service"); expect(c.has("b", "service")).toBe(false); });
  it("PIN: 해시로 저장하고 맞는 값만 통과", () => {
    const h = hashPin("1234"); expect(h).not.toContain("1234"); expect(verifyPin("1234", h)).toBe(true); expect(verifyPin("1235", h)).toBe(false); expect(verifyPin("", h)).toBe(false);
    expect(hashPin("1234")).not.toBe(h); // 솔트
  });
});

describe("HTP", () => {
  const png = "data:image/png;base64," + Buffer.from("x".repeat(100)).toString("base64");
  it("동의 없이는 그림을 저장할 수 없지만 기록은 된다", () => {
    expect(validateHtp({ date: "2026-10-07", images: { house: png } }, false)[0]).toContain("동의");
    expect(validateHtp({ date: "2026-10-07", note: "관찰" }, false)).toEqual([]);
  });
  it("동의가 있으면 통과", () => expect(validateHtp({ date: "2026-10-07", images: { house: png } }, true)).toEqual([]));
  it.each([
    ["날짜", { date: "2026/10/07" }], ["시간 범위", { date: "2026-10-07", durationMin: 999 }],
    ["이미지 형식(svg)", { date: "2026-10-07", images: { house: "data:image/svg+xml;base64,AAAA" } }],
    ["알 수 없는 종류", { date: "2026-10-07", images: { cat: png } }],
    ["큰 이미지", { date: "2026-10-07", images: { tree: "data:image/png;base64," + "A".repeat(Math.ceil((MAX_IMAGE_BYTES + 10) * 4 / 3)) } }],
  ])("%s → 거부", (_n, i) => expect(validateHtp(i as any, true).length).toBeGreaterThan(0));
  it("최신순 목록, 동의 철회 시 그림만 삭제하고 기록은 남긴다", () => {
    const s = new HtpStore();
    s.add({ childId: "c", date: "2026-01-01", examiner: "e", durationMin: 10, checklist: {}, note: "n1", images: { house: png } });
    s.add({ childId: "c", date: "2026-04-01", examiner: "e", durationMin: null, checklist: {}, note: "n2", images: { tree: png, person: png } });
    expect(s.list("c").map((r) => r.date)).toEqual(["2026-04-01", "2026-01-01"]);
    expect(s.purgeImages("c")).toBe(3);
    expect(s.list("c")).toHaveLength(2); expect(s.list("c").every((r) => Object.keys(r.images).length === 0)).toBe(true);
    expect(s.list("c")[0].note).toBe("n2");
  });
});

describe("ChildConfigStore (처방)", () => {
  it("기본값 → 저장 → 변경 이력", () => {
    const c = new ChildConfigStore(); expect(c.get("x")).toMatchObject({ dailyMinutes: 15, dailyScenarios: 3 });
    expect(c.set("x", { dailyMinutes: 20, dailyScenarios: 4, targetLevel: 3, targetDomains: ["담화 관리"] }).ok).toBe(true);
    expect(c.get("x")).toMatchObject({ dailyMinutes: 20, targetLevel: 3 }); expect(c.history).toHaveLength(1);
  });
  it("잘못된 값은 저장하지 않는다", () => {
    const c = new ChildConfigStore(); const r = c.set("x", { dailyMinutes: 1, dailyScenarios: 3, targetLevel: 2, targetDomains: [] });
    expect(r.ok).toBe(false); expect(c.get("x").dailyMinutes).toBe(15); expect(c.history).toHaveLength(0);
  });
});

import { GuardianStore, MAX_PIN_FAILS, PIN_LOCK_MS } from "@/lib/server/stores";
describe("GuardianStore PIN 잠금", () => {
  it("맞는 PIN 통과, 틀리면 wrong, 연속 5번 틀리면 잠김, 잠긴 동안은 맞는 PIN도 거부, 시간이 지나면 풀림", () => {
    const g = new GuardianStore(); const t0 = 1_000_000;
    expect(g.check("1234", t0)).toBe("ok");
    for (let i = 1; i < MAX_PIN_FAILS; i++) expect(g.check("0000", t0)).toBe("wrong");
    expect(g.check("0000", t0)).toBe("locked");
    expect(g.check("1234", t0 + 1000)).toBe("locked");
    expect(g.check("1234", t0 + PIN_LOCK_MS + 1)).toBe("ok");
  });
  it("맞는 PIN 을 입력하면 실패 횟수가 초기화된다", () => {
    const g = new GuardianStore(); for (let i = 0; i < MAX_PIN_FAILS - 1; i++) g.check("0000");
    expect(g.check("1234")).toBe("ok"); expect(g.check("0000")).toBe("wrong");
  });
});
