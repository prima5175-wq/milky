import { chromium } from "playwright-core";
import { startServer, stopServer, launchOptions } from "./helpers.mjs";
await startServer();
import { readFileSync, readdirSync } from "node:fs";
const b = await chromium.launch(launchOptions());
const B = `http://localhost:${process.env.E2E_PORT || 3111}`;
let pass = 0, fail = 0; const ok = (n, c, x = "") => { c ? pass++ : fail++; console.log(c ? "✔" : "✘", n, x); };
const ctx = await b.newContext({ viewport: { width: 1024, height: 768 } }); const p = await ctx.newPage();
const CH = "main button.text-left"; // 선택지 버튼만

// 1) 3번 후 선택지가 사라지는지 (정확한 선택자)
await p.goto(B + "/child"); await p.locator("a:has-text('시작')").first().click();
await p.getByRole("button", { name: /다 봤어요/ }).click();
await p.locator("main button.text-left").first().click(); await p.getByRole("button", { name: /연습해 볼래요/ }).click();
for (let i = 1; i <= 3; i++) { await p.locator(CH).first().click(); await p.waitForSelector("[role=status]"); if (i < 3) await p.getByRole("button", { name: /한 번 더/ }).click(); }
ok("3번 후 선택지 0개", (await p.locator(CH).count()) === 0);
ok("3번 후 '미션 보기'만 남음", await p.getByRole("button", { name: /미션 보기/ }).count() === 1);

// 2) 질문: 어색한 쪽을 반드시 눌러 보기
await p.goto(B + "/child"); await p.locator("a:has-text('시작')").first().click();
await p.waitForSelector("text=다 봤어요");
const awkwardLine = await p.locator("main section").nth(1).locator("p").last().innerText(); // 어색한 예 문장 "…"
await p.getByRole("button", { name: /다 봤어요/ }).click();
const target = p.locator(CH, { hasText: awkwardLine.replace(/[“”]/g, "") });
await target.first().click();
const fb = await p.locator("[role=status]").innerText();
ok("어색한 쪽 선택 → 설명(비난 없음)", /같이 마음을 볼까/.test(fb) && !/틀렸|잘못/.test(fb), "→ " + fb.slice(0, 60).replace(/\n/g, " "));

// 3) 안전 키워드: 글자 입력
await p.getByRole("button", { name: /연습해 볼래요/ }).click();
await p.getByRole("tab", { name: "쓰기" }).click();
await p.getByLabel("내가 할 말").fill("친구가 나를 계속 괴롭혀");
await p.getByRole("button", { name: "친구에게 말하기" }).click();
await p.waitForSelector("[role=status]");
const sf = await p.locator("[role=status]").innerText();
ok("안전 키워드 → 어른에게 안내", sf.includes("어른에게"), "→ " + sf.replace(/\n/g, " ").slice(0, 50));
ok("안전 키워드 → 연습 중단(입력창·더 하기 없음)", (await p.getByLabel("내가 할 말").count()) === 0 && (await p.getByRole("button", { name: /한 번 더/ }).count()) === 0);
ok("안전 키워드 → 어른에게 가는 버튼", await p.getByRole("button", { name: /어른에게 이야기하러/ }).count() === 1);

// 4) 승인 안 된 시나리오 주소로 직접 접근 → 404
const all = readdirSync("" + process.cwd() + "/content/scenarios").flatMap(f => JSON.parse(readFileSync("" + process.cwd() + "/content/scenarios/" + f, "utf8")));
const home = await (await fetch(B + "/child")).text();
const shown = new Set([...home.matchAll(/href="\/child\/([a-z]+-\d{3})"/g)].map(m => m[1]));
const hidden = all.find(s => !shown.has(s.id));
const r1 = await fetch(B + "/child/" + hidden.id), r2 = await fetch(B + "/child/" + [...shown][0]);
ok(`임시 승인 안 된 ${hidden.id} 직접 접근 → 404`, r1.status === 404, "status " + r1.status);
ok(`노출된 ${[...shown][0]} → 200`, r2.status === 200);
const otherAge = all.find(s => s.ageBand === "유아");
ok("다른 연령대 시나리오 직접 접근 → 404", (await fetch(B + "/child/" + otherAge.id)).status === 404);

// 5) 저자극 모드
await p.goto(B + "/child");
await p.getByRole("button", { name: "화면 설정" }).click();
await p.getByRole("button", { name: "차분하게" }).click();
ok("저자극 모드 적용", await p.locator(".low-stim").count() > 0);
await p.reload(); await p.waitForSelector("text=오늘 연습");
ok("새로고침 후에도 유지", await p.locator(".low-stim").count() > 0);
const anim = await p.evaluate(() => { const e = document.querySelector(".low-stim"); return getComputedStyle(e).getPropertyValue("--accent").trim(); });
ok("차분한 색으로 바뀜", anim === "#5b6b8c", anim);
await p.screenshot({ path: "child-home.png" });
console.log(`\n통과 ${pass} / 실패 ${fail}`); await b.close(); await stopServer(); process.exit(fail ? 1 : 0);
