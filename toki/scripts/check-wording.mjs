// UI 문구 파일에 금지 표현("치료한다", "진단한다" 등)이 들어가면 실패시킨다.
import { readFileSync, readdirSync } from "node:fs";
const dir = new URL("../src/lib/i18n/", import.meta.url);
// TODO: 화면 컴포넌트(src/components, src/app)에 직접 쓴 문구도 검사 대상에 포함하고 i18n 으로 옮긴다.
const banned = [/치료(한다|합니다|해요|해 줍니다)/, /진단(한다|합니다|해요|해 줍니다)/, /\bcures?\b/i, /\bdiagnos(e|es|is)\b/i];
let bad = 0;
for (const f of readdirSync(dir).filter((f) => /\.(ts|json)$/.test(f))) {
  readFileSync(new URL(f, dir), "utf8").split("\n").forEach((line, i) => {
    if (banned.some((r) => r.test(line))) { console.error(`금지 표현: ${f}:${i + 1}: ${line.trim()}`); bad++; }
  });
}
process.exit(bad ? 1 : 0);
