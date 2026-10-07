import { describe, it, expect } from "vitest";
import { ko } from "@/lib/i18n/ko";
import { en } from "@/lib/i18n/en";

const keys = (o: object, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));

describe("i18n", () => {
  it("ko 와 en 의 키가 같다", () => expect(keys(ko).sort()).toEqual(keys(en).sort()));
});
