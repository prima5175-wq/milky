import { describe, it, expect } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildReportData } from "@/lib/report/data";
import { renderReportPdf } from "@/lib/report/pdf";
import { loadFonts } from "@/lib/report/fonts";
import { demoRepository } from "@/lib/assessments/demo";
import { ProgressStore } from "@/lib/progress/store";
import type { HtpRecord } from "@/lib/htp/store";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
async function sample(over: Partial<Parameters<typeof buildReportData>[0]> = {}) {
  const p = new ProgressStore();
  p.completePractice({ childId: "demo-1", scenarioId: "a", day: "2026-10-07", levels: [1, 2, 4], modes: ["choice", "choice", "text"], missionText: "m" });
  const { missionId } = p.completePractice({ childId: "demo-1", scenarioId: "b", day: "2026-10-06", levels: [2, null], modes: ["choice", "choice"], missionText: "m2" });
  p.confirmMission(missionId!, "g");
  const htp: HtpRecord[] = [
    { id: "h1", childId: "demo-1", date: "2026-07-01", examiner: "e", durationMin: 14, checklist: { "지우개를 썼다": true }, note: "첫 기록", images: { house: png } },
    { id: "h2", childId: "demo-1", date: "2026-10-07", examiner: "e", durationMin: 11, checklist: {}, note: "", images: { house: png, tree: png } },
  ];
  return buildReportData({ child: { id: "demo-1", nickname: "예시 아동", ageBand: "7-8" }, today: "2026-10-07", catalog: await demoRepository.listCatalog(), records: await demoRepository.listRecords("demo-1"),
    sessions: p.sessions, missions: p.missions, notes: [{ date: "2025-03-12", body: "눈맞춤과 주고받기가 늘었다는 보호자 보고" }], htp, includeImages: true, ...over });
}
const pageCount = (b: Uint8Array) => (Buffer.from(b).toString("latin1").match(/\/Type \/Page\b(?!s)/g) ?? []).length;
const text = (bytes: Uint8Array) => { const dir = mkdtempSync(join(tmpdir(), "rep-")), f = join(dir, "r.pdf"); writeFileSync(f, bytes); const r = spawnSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8" }); return r.status === 0 ? r.stdout : null; };

describe("보고서 데이터", () => {
  it("검사별 변화·그림 검사 분리·연습 요약", async () => {
    const d = await sample();
    expect(d.assessments.map((a) => a.name)).toEqual(["(예시) 언어 검사", "(예시) 행동 평정"]);
    expect(d.drawingAssessments[0].name).toContain("HTP");
    expect(d.assessments[0].series.find((s) => s.field.key === "raw")!.changeText).toBe("처음 41 → 최근 57 (+16)");
    expect(d.practice).toMatchObject({ count: 2, activeDays: 2, missionsDone: 1, missionsOpen: 1, noLevel: 1 });
    expect(d.practice.levelCounts).toEqual({ 1: 1, 2: 2, 3: 0, 4: 1 });
  });
  it("그림 저장 동의가 없으면 그림을 넣지 않는다", async () => expect((await sample({ includeImages: false })).htp.every((h) => Object.keys(h.images).length === 0)).toBe(true));
  it("기간 밖 연습은 제외", async () => expect((await sample({ today: "2026-12-31" })).practice.count).toBe(0));
  it("수정으로 대체된 검사 기록은 제외", async () => {
    const recs = (await demoRepository.listRecords("demo-1")).map((r) => (r.id === "r3" ? { ...r, supersededBy: "x" } : r));
    expect((await sample({ records: recs })).assessments[0].records).toHaveLength(2);
  });
});

describe("PDF 생성", () => {
  it("유효한 PDF, 한글 본문·표·안내 문구 포함, 쪽번호", async () => {
    const bytes = await renderReportPdf(await sample(), await loadFonts());
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    expect(pageCount(bytes)).toBeGreaterThanOrEqual(1);
    const t = text(bytes);
    if (t === null) return; // pdftotext 가 없는 환경에서는 본문 확인을 건너뛴다
    for (const s of ["토키 진도 보고서", "예시 아동", "(예시) 언어 검사", "처음 41 → 최근 57 (+16)", "높을수록 좋은 점수", "낮을수록 좋은 점수", "해석과 판단은 담당 전문가", "회기 메모", "눈맞춤과 주고받기", "그림 비교 (2026-07-01 → 2026-10-07)"])
      expect(t, s).toContain(s);
    expect(t).toMatch(/1\s*\/\s*\d/);
    expect(t).not.toMatch(/진단|치료/);
  });
  it("폰트에 없는 글자(이모지)가 있어도 생성이 깨지지 않는다", async () => {
    const d = await sample({ notes: [{ date: "2026-10-01", body: "아주 잘했어요 🎉⭐ 다음엔 😊" }] });
    const bytes = await renderReportPdf(d, await loadFonts());
    expect(bytes.length).toBeGreaterThan(1000);
  });
  it("메모가 아주 많아도 여러 쪽으로 나눠진다", async () => {
    const notes = Array.from({ length: 80 }, (_, i) => ({ date: `2026-09-${String((i % 28) + 1).padStart(2, "0")}`, body: "관찰 메모 ".repeat(25) }));
    expect(pageCount(await renderReportPdf(await sample({ notes }), await loadFonts()))).toBeGreaterThan(2);
  });
  it("생성 결과를 확인용으로 저장", async () => { writeFileSync("/tmp/claude-0/sample-report.pdf", await renderReportPdf(await sample(), await loadFonts())); });
});
