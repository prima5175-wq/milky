import { chromium } from "playwright-core";
import { startServer, stopServer, launchOptions } from "./helpers.mjs";
await startServer();
import { writeFileSync } from "node:fs";
const B = `http://localhost:${process.env.E2E_PORT || 3111}`;
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { c ? pass++ : fail++; console.log(c ? "✔" : "✘", n, x); };
const api = async (path, { method = "GET", body, pin } = {}) => { const r = await fetch(B + path, { method, headers: { "content-type": "application/json", ...(pin ? { "x-guardian-pin": pin } : {}) }, body: body ? JSON.stringify(body) : undefined }); let j; try { j = await r.json(); } catch { j = {}; } return { s: r.status, j }; };
writeFileSync("" + (await import("node:os")).tmpdir() + "/toki-e2e-d.png", Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
const b = await chromium.launch(launchOptions());
const ctx = await b.newContext({ viewport: { width: 420, height: 900 } }); const p = await ctx.newPage();
const errs = []; p.on("pageerror", e => errs.push(e.message));

console.log("\n== 1. 아이: 연습 → 서버에 기록");
await p.goto(B + "/child"); await p.locator("a:has-text('시작')").first().click();
await p.getByRole("button", { name: /다 봤어요/ }).click(); await p.locator("main button.text-left").first().click();
await p.getByRole("button", { name: /연습해 볼래요/ }).click();
for (let i = 1; i <= 2; i++) { await p.locator("main button.text-left").first().click(); await p.waitForSelector("[role=status]"); if (i < 2) await p.getByRole("button", { name: /한 번 더/ }).click(); }
await p.getByRole("button", { name: /미션 보기/ }).click(); await p.waitForSelector("text=연습 스티커 +1");
let pr = (await api("/api/progress")).j;
ok("서버에 연습 점수 1, 확인 대기 미션 1", pr.points === 1 && pr.openMissions.length === 1, JSON.stringify(pr).slice(0, 90));
ok("아이 API 응답에 미션 id·확인 권한 없음", !JSON.stringify(pr).includes("mis-"));
await p.goto(B + "/child/stickers"); await p.waitForSelector("text=내 스티커판");
ok("스티커판에 1개 + 미션 대기", (await p.locator("h1").innerText()).includes("(1개)") && (await p.locator("ul li").count()) === 1);
await p.goto(B + "/child"); await p.waitForSelector("text=오늘 연습");
ok("홈에서 마친 이야기 표시", await p.locator("text=✔ 했어요").count() === 1);
// 같은 시나리오 반복해도 점수 안 늘어남
const sid = (await (await fetch(B + "/child")).text()).match(/href="\/child\/([a-z]+-\d{3})"/)[1];
await api("/api/progress", { method: "POST", body: { scenarioId: sid, levels: [4, 4, 4], modes: ["text", "text", "text"], points: 999 } });
ok("같은 날 반복·점수 조작 무시", (await api("/api/progress")).j.points === 1);

console.log("\n== 2. 보호자 PIN");
ok("PIN 없이 개요 → 401", (await api("/api/guardian/overview")).s === 401);
ok("PIN 없이 미션 확인 → 401", (await api("/api/guardian/missions", { method: "POST", body: { id: "mis-2" } })).s === 401);
ok("PIN 없이 동의 변경 → 401", (await api("/api/consent", { method: "POST", body: { kind: "service", grant: false } })).s === 401);
ok("틀린 PIN → 401", (await api("/api/guardian/overview", { pin: "0000" })).s === 401);
await p.goto(B + "/guardian"); await p.waitForSelector("text=보호자 확인");
await p.getByLabel("보호자 PIN").fill("9999"); await p.getByRole("button", { name: "들어가기" }).click();
await p.waitForSelector("text=PIN이 맞지 않아요");
ok("화면: 틀린 PIN 안내", true);
const ov0 = await api("/api/guardian/overview", { pin: "1234" }); const mid = ov0.j.openMissions[0].id;
await p.getByLabel("보호자 PIN").fill("1234"); await p.getByRole("button", { name: "들어가기" }).click();
await p.waitForSelector("text=보호자 화면");
ok("맞는 PIN → 대시보드", true);
ok("확인 대기 미션 표시", await p.locator("[aria-label='오늘의 미션'] li").count() === 1);
ok("주간 요약 문장", (await p.locator("[aria-label='주간 요약']").innerText()).includes("이번 주에"));
ok("대화 팁(진단 표현 없음)", !/진단|치료/.test(await p.locator("[aria-label='대화 팁']").innerText()));
await p.getByRole("button", { name: /해 봤어요/ }).click(); await p.waitForSelector("text=스티커 5개가 갔어요");
ok("미션 확인 → 점수 6", (await api("/api/progress")).j.points === 6 && (await api("/api/progress")).j.openMissions.length === 0);
ok("이미 확인한 미션 재확인 → 409(점수 중복 없음)", (await api("/api/guardian/missions", { method: "POST", pin: "1234", body: { id: mid } })).s === 409 && (await api("/api/progress")).j.points === 6);

console.log("\n== 3. 연습 시간 설정 (보호자 → 아이 화면 반영)");
await p.getByLabel("분 (5~60)").fill("3"); await p.getByRole("button", { name: "저장", exact: true }).click(); await p.waitForTimeout(500);
ok("범위 밖(3분)은 거부되고 15분 유지", (await api("/api/child-config")).j.dailyMinutes === 15);
await p.getByLabel("분 (5~60)").fill("20"); await p.getByRole("button", { name: "저장", exact: true }).click(); await p.waitForTimeout(500);
ok("20분으로 저장 → /api/usage 한도 반영", (await api("/api/usage")).j.limit === 1200);

console.log("\n== 4. 동의 철회 → 아이 화면 차단");
await p.goto(B + "/guardian"); await p.waitForSelector("text=보호자 화면");
p.once("dialog", d => d.accept());
await p.locator("li", { hasText: "서비스 이용 및 개인정보" }).getByRole("button").click(); await p.waitForTimeout(600);
await p.goto(B + "/child");
ok("아이 홈: 동의 필요 안내", await p.locator("text=어른과 함께 시작해 주세요").count() === 1);
ok("연습 API 403", (await api("/api/practice", { method: "POST", body: { scenarioId: sid, turnNo: 1, text: "안녕", mode: "text" } })).s === 403);
ok("진행 API 403", (await api("/api/progress")).s === 403);
await p.goto(B + "/child/" + sid); ok("시나리오 주소도 차단", await p.locator("text=어른과 함께 시작해 주세요").count() === 1);
ok("동의 다시 부여", (await api("/api/consent", { method: "POST", pin: "1234", body: { kind: "service", grant: true } })).s === 200);
await p.goto(B + "/child"); ok("복구 후 아이 홈 열림", await p.locator("text=오늘 연습").count() === 1);

console.log("\n== 5. HTP: 그림 저장 동의 게이트");
await p.goto(B + "/therapist/children/demo-1"); await p.waitForSelector("text=그림 검사 기록");
ok("해석 안 한다는 안내", await p.locator("text=해석하거나 점수를 매기지 않아요").count() === 1);
ok("동의 없으면 파일 입력 비활성 + 안내", (await p.locator("input[type=file]").first().isDisabled()) && await p.locator("text=동의가 없어서 사진은 올릴 수 없어요").count() === 1);
const noConsent = await api("/api/htp", { method: "POST", body: { date: "2026-10-07", images: { house: "data:image/png;base64,iVBORw0KGgo=" } } });
ok("서버도 동의 없는 그림 거부(400)", noConsent.s === 400 && noConsent.j.errors[0].includes("동의"));
await p.locator("textarea").last().fill("첫 기록: 집부터 그림"); await p.locator("[aria-label='그림 검사 기록'] label:has-text('지우개') input").check();
await p.locator("[aria-label='그림 검사 기록']").getByRole("button", { name: "기록 저장" }).click(); await p.waitForSelector("text=기록했어요");
ok("사진 없는 관찰 기록은 저장됨", (await api("/api/htp")).j.records.length === 1);
await api("/api/consent", { method: "POST", pin: "1234", body: { kind: "drawing_storage", grant: true } });
await p.reload(); await p.waitForSelector("text=그림 검사 기록");
ok("동의 후 파일 입력 활성", !(await p.locator("input[type=file]").first().isDisabled()));
for (const i of [0, 1, 2]) await p.locator("input[type=file]").nth(i).setInputFiles("" + (await import("node:os")).tmpdir() + "/toki-e2e-d.png");
await p.waitForTimeout(500);
await p.locator("[aria-label='그림 검사 기록'] input[type=date]").fill("2026-12-01");
await p.locator("textarea").last().fill("두 번째 기록");
await p.locator("[aria-label='그림 검사 기록']").getByRole("button", { name: "기록 저장" }).click(); await p.waitForSelector("text=기록했어요");
let htp = (await api("/api/htp")).j;
ok("그림 3장 저장됨(JPEG으로 축소)", htp.records.some(r => Object.keys(r.images).length === 3 && Object.values(r.images).every(v => v.startsWith("data:image/jpeg"))));
await p.reload(); await p.waitForSelector("text=시점 비교");
ok("두 시점 나란히 비교 화면", (await p.locator("img").count()) >= 3);
ok("재검 알림(3개월 주기) 표시", await p.locator("text=/그림 검사 (시기|예정)/").count() >= 1);
ok("그림 파일이 아닌 형식(svg) 거부", (await api("/api/htp", { method: "POST", body: { date: "2026-12-02", images: { house: "data:image/svg+xml;base64,AAAA" } } })).s === 400);
const rv = await api("/api/consent", { method: "POST", pin: "1234", body: { kind: "drawing_storage", grant: false } });
ok("그림 동의 철회 → 저장된 그림 삭제", rv.j.purgedImages === 3 && (await api("/api/htp")).j.records.every(r => Object.keys(r.images).length === 0) && (await api("/api/htp")).j.records.length === 2, `삭제 ${rv.j.purgedImages}장, 기록 유지`);

console.log("\n== 6. 처방(치료사) 저장 → 아이 화면");
await api("/api/child-config", { method: "POST", body: { dailyMinutes: 15, dailyScenarios: 2, targetLevel: 3, targetDomains: ["담화 관리"] } });
const home = await (await fetch(B + "/child")).text();
ok("하루 2개만 노출", (home.match(/href="\/child\/[a-z]+-\d{3}"/g) ?? []).length === 2);
ok("잘못된 처방은 400", (await api("/api/child-config", { method: "POST", body: { dailyMinutes: 1, dailyScenarios: 2, targetLevel: 3, targetDomains: [] } })).s === 400);

console.log("\n== 7. 가입(법정대리인 동의)");
await p.goto(B + "/signup"); await p.waitForSelector("text=보호자 가입");
await p.getByRole("button", { name: "동의하고 가입하기" }).click();
ok("빈 폼 → 오류들", (await p.locator("[role=alert]").count()) >= 4);
await p.getByLabel("보호자 이름").fill("김보호"); await p.getByLabel("이메일").fill("a@b.co"); await p.getByLabel(/보호자 PIN/).fill("4321");
await p.getByLabel(/아이 별명/).fill("나나"); await p.getByLabel(/연령대/).selectOption("9-10");
await p.getByRole("button", { name: "동의하고 가입하기" }).click();
ok("법정대리인·서비스 동의 없이는 가입 불가", (await p.locator("[role=alert]").allInnerTexts()).join(" ").includes("법정대리인") && (await p.locator("[role=alert]").allInnerTexts()).join(" ").includes("서비스 이용 동의"));
await p.getByLabel(/저는 이 아이의 법정대리인/).check(); await p.getByLabel(/서비스 이용 및 개인정보/).check();
await p.getByRole("button", { name: "동의하고 가입하기" }).click(); await p.waitForSelector("text=가입 완료");
ok("가입 완료", true);
ok("두 번째 가입 시도 409 (PIN 재설정 방지)", (await api("/api/signup", { method: "POST", body: { guardianName: "x", email: "a@b.co", pin: "0000", childNickname: "x", ageBand: "7-8", isLegalGuardian: true, consents: { service: true } } })).s === 409);
ok("새 PIN 4321 통과, 옛 PIN 1234 거부", (await api("/api/guardian/overview", { pin: "4321" })).s === 200 && (await api("/api/guardian/overview", { pin: "1234" })).s === 401);
const h2 = await (await fetch(B + "/child")).text();
ok("아이 화면이 새 별명·연령대 반영", h2.includes("나나") && h2.includes("/child/") );
ok("선택 동의는 체크하지 않으면 없음", (await api("/api/guardian/overview", { pin: "4321" })).j.consents.filter(c => c.granted).map(c => c.kind).join() === "service");

console.log("\n== 8. 법적 문서 초안");
for (const path of ["/legal/privacy", "/legal/terms"]) { const t = await (await fetch(B + path)).text(); ok(`${path}: 법률 검토 전 초안 표시`, t.includes("법률 검토 전 초안")); }
ok("처방 기능 문구에 진단·치료 표현 없음", !/치료(한다|합니다)|진단(한다|합니다)/.test(await (await fetch(B + "/legal/terms")).text()));

console.log("\n== 9. PIN 무차별 대입 방지");
let last; for (let i = 0; i < 5; i++) last = await api("/api/guardian/overview", { pin: "0000" });
ok("5번 틀리면 잠김(429)", last.s === 429);
ok("잠긴 동안은 맞는 PIN도 거부", (await api("/api/guardian/overview", { pin: "4321" })).s === 429);

ok("JS 오류 없음", errs.length === 0, errs.join("|"));
console.log(`\n통과 ${pass} / 실패 ${fail}`);
await b.close(); await stopServer(); process.exit(fail ? 1 : 0);
