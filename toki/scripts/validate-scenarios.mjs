// 사용: node scripts/validate-scenarios.mjs [파일...]   (인자 없으면 content/scenarios/*.json 전체)
import { readFileSync, readdirSync } from "node:fs";
import { validateAll } from "../src/lib/scenarios/validate.ts";

const dir = new URL("../content/scenarios/", import.meta.url);
const files = process.argv.length > 2 ? process.argv.slice(2) : readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => new URL(f, dir).pathname);
const all = files.flatMap((f) => JSON.parse(readFileSync(f, "utf8")));
const { errors, stats } = validateAll(all);
errors.forEach((m) => console.error("✗", m));
console.log(errors.length ? `오류 ${errors.length}건` : "통과", JSON.stringify(stats));
process.exit(errors.length ? 1 : 0);
