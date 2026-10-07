import { describe, it, expect } from "vitest";
import { buildResearchCsv, cell, pseudonym, HEADER } from "@/lib/export/anonymize";
import { ProgressStore } from "@/lib/progress/store";
import type { AssessmentRecord } from "@/lib/assessments/types";

const SALT = "test-salt-0123456789";
const rec = (id: string, d: string, scores: AssessmentRecord["scores"], over: Partial<AssessmentRecord> = {}): AssessmentRecord => ({ id, childId: "child-secret-id", catalogId: "k1", administeredOn: d, examinerName: "김검사자", phase: "pre", scores, note: "아이 이름은 철수", ...over });
function input(over = {}) {
  const p = new ProgressStore();
  p.completePractice({ childId: "child-secret-id", scenarioId: "lun-001", day: "2026-10-07", levels: [1, 2, null], modes: ["choice", "text", "choice"], missionText: "철수에게 인사하기" });
  p.completePractice({ childId: "other-child", scenarioId: "zzz-999", day: "2026-10-07", levels: [4], modes: ["choice"], missionText: "x" });
  return { childId: "child-secret-id", ageBand: "7-8", salt: SALT, researchConsent: true, sessions: p.sessions, missions: p.missions,
    assessments: [rec("a", "2026-09-23", { standard: 78, percentile: 7 }), rec("b", "2026-10-07", { standard: 91 }, { phase: "follow_up" }), rec("c", "2026-10-01", { standard: 1 }, { supersededBy: "b" })], ...over };
}
const ok = (i: ReturnType<typeof input>) => { const r = buildResearchCsv(i); if (!r.ok) throw new Error(r.error); return r.csv; };

describe("연구용 익명화 CSV", () => {
  it("동의가 없으면 만들지 않는다", () => expect(buildResearchCsv(input({ researchConsent: false }))).toEqual({ ok: false, error: "no_research_consent" }));
  it("소금이 없거나 짧으면 만들지 않는다", () => {
    for (const salt of [undefined, "", "short"]) expect(buildResearchCsv(input({ salt }))).toEqual({ ok: false, error: "salt_missing" });
  });
  it("아동 식별 정보가 하나도 없다 (id·검사자 이름·메모·미션 글·정확한 날짜)", () => {
    const csv = ok(input());
    for (const secret of ["child-secret-id", "김검사자", "철수", "아이 이름", "인사하기", "2026-10-07", "2026-09-23", "2026-10"]) expect(csv, secret).not.toContain(secret);
    expect(csv).not.toContain("other-child"); expect(csv).not.toContain("zzz-999"); // 다른 아동 기록은 섞이지 않는다
  });
  it("머리글과 열 개수, 가명 일관성", () => {
    const lines = ok(input()).trim().split("\n"); expect(lines[0]).toBe(HEADER.join(","));
    expect(lines.every((l) => l.split(",").length === HEADER.length)).toBe(true);
    const pids = new Set(lines.slice(1).map((l) => l.split(",")[0])); expect([...pids]).toEqual([pseudonym("child-secret-id", SALT)]);
  });
  it("가명은 같은 소금이면 같고 소금이 다르면 완전히 다르다", () => {
    expect(pseudonym("a", SALT)).toBe(pseudonym("a", SALT)); expect(pseudonym("a", SALT)).not.toBe(pseudonym("a", SALT + "x")); expect(pseudonym("a", SALT)).not.toBe(pseudonym("b", SALT));
    expect(pseudonym("a", SALT)).toMatch(/^[0-9a-f]{12}$/);
  });
  it("정확한 날짜 대신 첫 기록 이후 몇 주째인지만 쓴다", () => {
    const rows = ok(input()).trim().split("\n").slice(1).map((l) => l.split(","));
    const wk = (item: string, field: string) => rows.find((r) => r[4] === item && r[5] === field)![2];
    expect(wk("lun-001", "turn1_level")).toBe("2"); // 9/23 → 10/7 = 14일 = 2주
    expect(rows.find((r) => r[3] === "assessment" && r[5] === "phase" && r[6] === "pre")![2]).toBe("0");
  });
  it("내용: 응답 단계, 모드, 미션 상태, 검사 점수. 수정으로 대체된 기록은 제외", () => {
    const csv = ok(input());
    expect(csv).toContain("practice,lun-001,turn2_level,2"); expect(csv).toContain("practice,lun-001,turn3_level,\n"); // 분류되지 않은 응답은 빈 칸 expect(csv).toContain("mission,lun-001,status,open");
    expect(csv).toContain("assessment,k1,standard,78"); expect(csv).toContain("assessment,k1,standard,91"); expect(csv).not.toContain("assessment,k1,standard,1\n"); // 수정으로 대체된 기록(standard 1)은 빠진다
  });
  it("기록이 없으면 머리글만", () => expect(ok(input({ sessions: [], missions: [], assessments: [] }))).toBe(HEADER.join(",") + "\n"));
});

describe("cell (CSV 안전)", () => {
  it.each([["a,b", '"a,b"'], ['say "hi"', '"say ""hi"""'], ["줄\n바꿈", "줄 바꿈"], ["=1+1", "'=1+1"], ["+cmd", "'+cmd"], ["-1+2", "'-1+2"], ["@SUM(A1)", "'@SUM(A1)"], ["정상", "정상"]])("%j → %j", (i, o) => expect(cell(i)).toBe(o));
  it("숫자는 그대로(음수 포함), 빈 값은 빈 칸", () => { expect(cell(-3)).toBe("-3"); expect(cell(null)).toBe(""); expect(cell(undefined)).toBe(""); });
});
