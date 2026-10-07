// PDF 보고서와 연구용 익명화 CSV: 권한·동의 조건과 실제 파일 내용을 확인한다.
import { chromium } from "playwright-core";
import { B, ok, finish, section, startServer, stopServer, launchOptions, api } from "./helpers.mjs";
const SALT = "e2e-salt-0123456789", TOKEN = "e2e-admin-token";

await startServer({ TOKI_ADMIN_TOKEN: TOKEN, TOKI_EXPORT_SALT: SALT });
const b = await chromium.launch(launchOptions());
try {
  const sid = (await (await fetch(B + "/child")).text()).match(/href="\/child\/([a-z]+-\d{3})"/)[1];
  await api("/api/progress", { method: "POST", body: { scenarioId: sid, levels: [1, 2, 4], modes: ["choice", "text", "choice"] } });

  section("PDF 보고서");
  const pdfReq = (pin) => fetch(B + "/api/report", { method: "POST", headers: { "content-type": "application/json", ...(pin ? { "x-guardian-pin": pin } : {}) }, body: "{}" });
  let r = await pdfReq("1234"); const bytes = Buffer.from(await r.arrayBuffer());
  ok("보호자 PIN 으로 PDF 생성", r.status === 200 && r.headers.get("content-type") === "application/pdf" && bytes.subarray(0, 5).toString() === "%PDF-", `${bytes.length} bytes`);
  ok("내려받기 파일명", /attachment; filename="toki-report-\d{4}-\d{2}-\d{2}\.pdf"/.test(r.headers.get("content-disposition") ?? ""));
  ok("캐시하지 않음", r.headers.get("cache-control") === "no-store");
  ok("틀린 PIN → 401", (await pdfReq("0000")).status === 401);
  const bad = await fetch(B + "/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ records: [{ id: 1 }] }) });
  ok("형식이 틀린 검사 기록 → 400", bad.status === 400);

  const p = await (await b.newContext({ viewport: { width: 900, height: 900 }, acceptDownloads: true })).newPage();
  await p.goto(B + "/therapist/children/demo-1"); await p.waitForSelector("text=변화 추이");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: /보호자 상담용 보고서/ }).click()]);
  ok("검사자 화면 버튼으로 PDF 내려받기", /^toki-report-.*\.pdf$/.test(dl.suggestedFilename()), dl.suggestedFilename());

  section("연구용 익명화 CSV");
  const exp = (token) => fetch(B + "/api/export", { headers: token ? { "x-admin-token": token } : {} });
  ok("관리자 토큰 없으면 403", (await exp()).status === 403 && (await exp("wrong-token")).status === 403);
  ok("연구 동의가 없으면 409 (내보내지 않음)", (await exp(TOKEN)).status === 409);
  await api("/api/consent", { method: "POST", pin: "1234", body: { kind: "research", grant: true } });
  r = await exp(TOKEN); const csv = await r.text();
  ok("동의 후 CSV 생성", r.status === 200 && r.headers.get("content-type").startsWith("text/csv"), `${csv.split("\n").length - 1}줄`);
  const lines = csv.trim().split("\n");
  ok("머리글", lines[0] === "pid,age_band,week,record_type,item,field,value");
  ok("연습·미션 기록 포함", csv.includes(`practice,${sid},turn2_level,2`) && csv.includes(`mission,${sid},status,open`));
  ok("검사 점수 포함(검사 id 로만)", csv.includes("assessment,demo-lang,standard,78"));
  const today = new Date().toISOString().slice(0, 4);
  ok("식별 정보 없음(아동 id·별명·검사자·정확한 날짜·미션 글)", !/demo-1|예시 아동|예시 검사자|인사하기/.test(csv) && !/\d{4}-\d{2}-\d{2}/.test(csv));
  ok("모든 줄의 가명이 같은 12자리", new Set(lines.slice(1).map((l) => l.split(",")[0])).size === 1 && /^[0-9a-f]{12}$/.test(lines[1].split(",")[0]));
  await api("/api/consent", { method: "POST", pin: "1234", body: { kind: "research", grant: false } });
  ok("동의를 철회하면 다시 막힘(409)", (await exp(TOKEN)).status === 409);
} catch (e) { ok("예외 없이 끝까지 실행", false, String(e)); }
finally { await b.close(); await stopServer(); process.exit(finish() ? 0 : 1); }
