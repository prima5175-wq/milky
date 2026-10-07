// 서버 전용: content/scenarios/*.json 시드를 읽는다. (DB 연결 전 임시 저장소)
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Scenario } from "./schema.ts";

export function loadSeedScenarios(): Scenario[] {
  const dir = join(process.cwd(), "content", "scenarios");
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
    .flatMap((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Scenario[]);
}
