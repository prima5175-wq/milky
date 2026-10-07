import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ko } from "@/lib/i18n/ko";
import { en } from "@/lib/i18n/en";

const keys = (o: object, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v !== null && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));

describe("i18n", () => {
  it("ko 와 en 의 키가 같다", () => expect(keys(ko).sort()).toEqual(keys(en).sort()));
  it("함수형 문구의 결과가 비어 있지 않다 (두 언어 모두)", () => {
    for (const m of [ko, en]) {
      expect(m.child.home.hello("A")).toContain("A"); expect(m.child.practice.turn(1, 3)).toContain("1"); expect(m.child.mission.body(5)).toContain("5");
      expect(m.child.stickers.title(2)).toContain("2"); expect(m.child.question.notQuite("why")).toContain("why"); expect(m.child.watch.speak("S", "L")).toContain("L");
    }
  });
  it("영어 문구에 한글이 섞여 있지 않다 (언어 이름·콘텐츠 안내 제외)", () => {
    const bad = keys(en).filter((k) => { const v = k.split(".").reduce((o: any, p) => o[p], en); return typeof v === "string" && /[가-힣]/.test(v); });
    expect(bad).toEqual([]);
  });
});

describe("아동 화면 컴포넌트에 직접 쓴 한글 문구가 없다 (모두 사전으로)", () => {
  const dir = join(__dirname, "../src/components/child");
  const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/(^|[^:])\/\/.*$/, "$1")).join("\n");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))) {
    it(f, () => {
      const hits = strip(readFileSync(join(dir, f), "utf8")).split("\n").map((l, i) => [i + 1, l] as const).filter(([, l]) => /[가-힣]/.test(l));
      expect(hits.map(([n, l]) => `${f}:${n}: ${l.trim()}`)).toEqual([]);
    });
  }
});
