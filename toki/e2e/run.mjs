// 모든 E2E 를 차례로 실행한다 (파일마다 서버를 새로 띄운다). 사용: npm run build && npm run e2e [파일이름 일부]
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const dir = fileURLToPath(new URL(".", import.meta.url)), root = fileURLToPath(new URL("..", import.meta.url));
const only = process.argv[2];
const files = readdirSync(dir).filter((f) => f.endsWith(".mjs") && !["helpers.mjs", "run.mjs", "mock-anthropic.mjs"].includes(f) && (!only || f.includes(only))).sort();
const failed = [];
for (const f of files) {
  console.log(`\n━━━━━━━━ ${f} ━━━━━━━━`);
  const r = spawnSync("node", [`e2e/${f}`], { cwd: root, stdio: "inherit", timeout: 300_000 });
  if (r.status !== 0) failed.push(f);
}
console.log(`\n${files.length - failed.length}/${files.length} 파일 통과${failed.length ? " · 실패: " + failed.join(", ") : ""}`);
process.exit(failed.length ? 1 : 0);
