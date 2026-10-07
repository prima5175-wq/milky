// 화면에 보이는 문구와 콘텐츠에 금지 표현("치료한다", "진단한다" 등)이 들어가면 실패시킨다.
// 이 앱은 '연습·교육 보조 도구'이며 질병을 진단·치료한다고 표방하지 않는다 (의료기기 규제 대상이 되지 않도록).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const targets = ["src/lib/i18n", "src/components", "src/app", "content/scenarios"];
const banned = [/치료(한다|합니다|해요|해 줍니다|해 드려요)/, /진단(한다|합니다|해요|해 줍니다|해 드려요)/, /\bcures?\b/i, /\btreats? (your|the) (child|condition)/i, /\bdiagnos(e|es|ing)\b/i];
const files = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : /\.(tsx?|json)$/.test(f) ? [p] : []; });
let bad = 0, n = 0;
for (const t of targets) for (const f of files(join(root, t))) {
  n++;
  readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    if (banned.some((r) => r.test(line))) { console.error(`금지 표현: ${relative(root, f)}:${i + 1}: ${line.trim()}`); bad++; }
  });
}
console.log(bad ? `금지 표현 ${bad}건` : `통과 (${n}개 파일 검사)`);
process.exit(bad ? 1 : 0);
