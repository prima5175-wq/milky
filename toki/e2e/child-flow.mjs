import { chromium } from "playwright-core";
import { startServer, stopServer, launchOptions } from "./helpers.mjs";
await startServer();
const b = await chromium.launch(launchOptions());
const B = `http://localhost:${process.env.E2E_PORT || 3111}`;
const results = [];
const ok = (name, cond, extra = "") => { results.push(cond); console.log(cond ? "✔" : "✘", name, extra); };

for (const [label, vp] of [["폰(세로)", { width: 375, height: 760 }], ["태블릿(가로)", { width: 1024, height: 768 }]]) {
  console.log("\n==", label);
  const ctx = await b.newContext({ viewport: vp }); const p = await ctx.newPage();
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(B + "/child"); await p.waitForSelector("text=오늘 연습");
  const overflow = async () => await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  ok("홈: 가로 스크롤 없음", !(await overflow()));
  await p.locator("a:has-text('시작')").first().click();
  await p.waitForSelector("text=다 봤어요");
  ok("보기: 가로 스크롤 없음", !(await overflow()));
  ok("보기: 자막(말풍선)과 다시 듣기", (await p.locator("text=🔊 다시 듣기").count()) === 3);
  await p.getByRole("button", { name: /다 봤어요/ }).click();
  await p.waitForSelector("text=어떤 말이 친구 기분");
  // 어색한 쪽을 먼저 눌러 본다: '틀렸어' 같은 말이 없어야 함
  const qbtns = p.locator("main button.w-full.rounded-2xl.border-2");
  await qbtns.first().click();
  const fb = await p.locator("[role=status]").innerText();
  ok("질문: 비난 표현 없음", !/틀렸|잘못/.test(fb), "→ " + fb.slice(0, 40).replace(/\n/g, " "));
  await p.getByRole("button", { name: /연습해 볼래요/ }).click();
  await p.waitForSelector("text=/1\\/3번째/");
  // 3번 주고받기
  for (let i = 1; i <= 3; i++) {
    const choice = p.locator("main button.w-full.rounded-2xl.border-2").first();
    ok(`연습 ${i}번째: 선택지 4개`, (await p.locator("main button.w-full.rounded-2xl.border-2").count()) === 4);
    await choice.click();
    await p.waitForSelector("[role=status]");
    if (i < 3) await p.getByRole("button", { name: /한 번 더/ }).click();
  }
  ok("3번 후: 더 말하기 버튼 없음(최대 3번)", (await p.getByRole("button", { name: /한 번 더/ }).count()) === 0);
  ok("3번 후: 선택지 없음", (await p.locator("main button.text-left").count()) === 0);
  await p.getByRole("button", { name: /미션 보기/ }).click();
  await p.waitForSelector("text=오늘의 미션");
  ok("미션: 보호자 확인 안내(스티커 5개)", await p.locator("text=스티커 5개").count() > 0);
  ok("미션: 연습 스티커 +1", await p.locator("text=연습 스티커 +1").count() > 0);
  await p.goto(B + "/child/stickers");
  await p.waitForSelector("text=내 스티커판");
  ok("스티커판: 모은 스티커와 확인 대기 미션이 보임", /\(\d+개\)/.test(await p.locator("h1").innerText()) && !(await p.locator("h1").innerText()).includes("(0개)") && (await p.locator("ul li").count()) >= 1);
  ok("스티커판: 가로 스크롤 없음", !(await overflow()));
  ok("JS 오류 없음", errs.length === 0, errs.join("|"));
  await ctx.close();
}
console.log("\n통과", results.filter(Boolean).length, "/", results.length);
await b.close(); await stopServer(); process.exit(results.includes(false) ? 1 : 0);
