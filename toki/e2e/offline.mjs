// 진짜 오프라인 검증: 서버 프로세스를 직접 끄고(서비스 워커의 네트워크 요청도 실패), 다시 켠다.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { launchOptions } from "./helpers.mjs";
const B = `http://localhost:${process.env.E2E_PORT || 3111}`; let pass = 0, fail = 0; const ok = (n, c, x = "") => { c ? pass++ : fail++; console.log(c ? "✔" : "✘", n, x); };
let srv = null;
const start = async () => { srv = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", String(process.env.E2E_PORT || 3111)], { cwd: process.cwd(), env: { ...process.env, TOKI_DEMO_APPROVE: "1" }, stdio: "ignore" });
  for (let i = 0; i < 40; i++) { try { if ((await fetch(B + "/offline.html")).ok) return; } catch {} await new Promise(r => setTimeout(r, 250)); } throw new Error("서버가 켜지지 않음"); };
const stop = async () => { srv.kill("SIGKILL"); await new Promise(r => setTimeout(r, 800)); };
const serverUp = async () => { try { await fetch(B + "/offline.html"); return true; } catch { return false; } };
await start();
const b = await chromium.launch(launchOptions());
const ctx = await b.newContext({ viewport: { width: 420, height: 900 }, serviceWorkers: "allow" }); const p = await ctx.newPage();
const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(B + "/child"); await p.waitForSelector("text=오늘 연습");
const hrefs = await p.locator("a[href^='/child/']:not([href='/child/stickers'])").evaluateAll(a => a.map(x => x.getAttribute("href")));
await p.waitForTimeout(6000); // 조회 없이 기다린다 (캐시 조회가 서비스 워커의 저장과 겹치지 않게)
const staticCount = await p.evaluate(async () => (await (await caches.open("toki-static-v2")).keys()).length);
ok("준비: 이야기 화면과 정적 파일이 저장됨", staticCount >= 8, `정적 ${staticCount}개, 화면 ${hrefs.length}개`);

await stop(); ok("서버를 껐다 (진짜 연결 없음)", !(await serverUp()));
await p.goto(B + "/child"); await p.waitForSelector("text=오늘 연습", { timeout: 15000 }); ok("오프라인: 홈이 열림", true);
await p.goto(B + hrefs[0]); await p.waitForSelector("text=다 봤어요", { timeout: 15000 }); ok("오프라인: 이야기 화면이 열림", true);
await p.getByRole("button", { name: /다 봤어요/ }).click(); await p.locator("main button.text-left").first().click();
await p.getByRole("button", { name: /연습해 볼래요/ }).click();
const labels = await p.locator("main button.text-left").allInnerTexts(); await p.locator("main button.text-left").first().click(); await p.waitForSelector("[role=status]");
ok("오프라인: 연습 피드백(대체 엔진)", (await p.locator("[role=status]").innerText()).includes("🐰"));
await p.getByRole("button", { name: /미션 보기/ }).click(); await p.waitForSelector("text=오늘의 미션");
ok("오프라인: 미션까지 완료", true);
const q1 = await p.evaluate(() => localStorage.getItem("toki.pendingProgress.v1")); ok("오프라인: 진행 기록이 대기열에 보관됨", !!q1 && JSON.parse(q1).length === 1);
await p.goto(B + hrefs[1]); await p.waitForSelector("text=다 봤어요"); await p.getByRole("button", { name: /다 봤어요/ }).click(); await p.locator("main button.text-left").first().click();
await p.getByRole("button", { name: /연습해 볼래요/ }).click(); await p.getByRole("tab", { name: "쓰기" }).click();
await p.getByLabel("내가 할 말").fill("친구가 나를 괴롭혀"); await p.getByRole("button", { name: "친구에게 말하기" }).click(); await p.waitForSelector("text=어른에게 꼭 이야기해 줘");
ok("오프라인: 안전 키워드도 감지·중단", (await p.getByRole("button", { name: /어른에게 이야기하러/ }).count()) === 1);
ok("오프라인: 안전 이벤트가 대기열에 보관됨", !!(await p.evaluate(() => localStorage.getItem("toki.pendingSafety.v1"))));
await p.goto(B + "/child/stickers"); await p.waitForSelector("text=내 스티커판", { timeout: 15000 }); ok("오프라인: 스티커판도 열림(저장된 화면)", true);
const r = await p.goto(B + "/child/never-visited-000"); await p.waitForTimeout(500);
ok("오프라인: 한 번도 안 열어 본 화면은 안내 페이지", (await p.locator("text=인터넷이 연결되어 있지 않아요").count()) === 1, `status ${r?.status()}`);
await p.goto(B + "/guardian").catch(() => {}); ok("오프라인: 보호자 화면은 저장돼 있지 않음(열리지 않음)", (await p.locator("text=보호자 확인").count()) === 0);

await start(); ok("서버를 다시 켰다", await serverUp());
await p.goto(B + "/child"); await p.waitForSelector("text=오늘 연습"); await p.waitForTimeout(2500);
const prog = await (await fetch(B + "/api/progress")).json(), ev = await (await fetch(B + "/api/safety-events")).json();
ok("재연결: 대기 중이던 진행 기록이 서버에 올라감", prog.doneToday.length === 1 && prog.points === 1, JSON.stringify({ pts: prog.points, done: prog.doneToday }));
ok("재연결: 대기 중이던 안전 이벤트가 서버에 올라감", ev.events.length === 1 && ev.events[0].category === "bullying");
ok("재연결: 대기열 비워짐", (await p.evaluate(() => [localStorage.getItem("toki.pendingProgress.v1"), localStorage.getItem("toki.pendingSafety.v1")])).every(v => v === null));
ok("JS 오류 없음", errs.length === 0, errs.join("|"));
console.log(`\n통과 ${pass} / 실패 ${fail}`); await b.close(); await stop(); process.exit(fail ? 1 : 0);
