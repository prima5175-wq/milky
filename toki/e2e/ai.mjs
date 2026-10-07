// AI 친구 서버 경로 검증: 가짜 Anthropic 서버로 SDK 가 보내는 요청과 응답 처리, 실패 시 오프라인 대체, 안전·시간 제한을 확인한다.
import { startServer, stopServer } from "./helpers.mjs";
import { startMock } from "./mock-anthropic.mjs";
const mock = await startMock(3199);
await startServer({ ANTHROPIC_API_KEY: "dummy-key", ANTHROPIC_BASE_URL: "http://127.0.0.1:3199", NO_PROXY: "127.0.0.1,localhost" });
const B = `http://localhost:${process.env.E2E_PORT || 3111}`, M = "http://127.0.0.1:3199";
let pass = 0, fail = 0; const ok = (n, c, x = "") => { c ? pass++ : fail++; console.log(c ? "✔" : "✘", n, x); };
const post = async (path, body, base = B) => { const r = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { s: r.status, j }; };
const setMode = (m) => fetch(M + "/__mode", { method: "POST", body: m });
const sid = (await (await fetch(B + "/child")).text()).match(/href="\/child\/([a-z]+-\d{3})"/)[1];
const body = (text, extra = {}) => ({ scenarioId: sid, turnNo: 1, text, mode: "text", ...extra });

// 1) 정상: 실제 SDK 가 보낸 요청 본문 확인
await setMode("ok");
let r = await post("/api/practice", body("너 돈가스 좋아해?"));
ok("AI 정상 응답", r.s === 200 && r.j.source === "ai" && r.j.detectedLevel === 2, JSON.stringify(r.j));
const reqs = await (await fetch(M + "/__reqs")).json(); const q = reqs.at(-1);
ok("SDK 요청 경로", q.url.startsWith("/v1/messages"), q.url);
ok("API 키는 서버에서만 사용", q.headers["x-api-key"] === "dummy-key");
ok("모델 claude-opus-5-5", q.body.model === "claude-opus-5-5");
ok("effort low", q.body.output_config?.effort === "low", JSON.stringify(q.body.output_config).slice(0, 120));
ok("JSON 스키마 출력 지정", q.body.output_config?.format?.type === "json_schema" && !!q.body.output_config.format.schema?.properties?.friendReply);
ok("thinking·temperature 미전송", !("thinking" in q.body) && !("temperature" in q.body));
ok("시스템 프롬프트에 시나리오", /목표 단계/.test(typeof q.body.system === "string" ? q.body.system : JSON.stringify(q.body.system)));
ok("아동 말은 user 메시지의 child_reply 안", JSON.stringify(q.body.messages).includes("<child_reply>너 돈가스 좋아해?</child_reply>"));
ok("클라이언트 응답에 키·프롬프트 없음", !JSON.stringify(r.j).includes("dummy-key") && !JSON.stringify(r.j).includes("목표 단계"));

// 2) 실패 유형 → 오프라인으로 계속
for (const m of ["bad", "garbage", "refusal", "error"]) {
  await setMode(m); r = await post("/api/practice", body("너 돈가스 좋아해?"));
  ok(`AI ${m} → 오프라인 대체`, r.s === 200 && r.j.source === "offline" && r.j.feedback.length > 0, r.j.source);
}
// 3) 모델이 위험 감지
await setMode("model_flag"); r = await post("/api/practice", body("오늘 좀 이상해"));
ok("모델 감지 → 안전 응답(고정 문구)", r.j.safetyFlag && r.j.source === "safety" && r.j.feedback.includes("어른에게") && !r.j.feedback.includes("y"), r.j.source);
// 4) 키워드 → AI 호출 없음
await setMode("ok"); const before = (await (await fetch(M + "/__reqs")).json()).length;
r = await post("/api/practice", body("친구가 나를 따돌려요"));
const after = (await (await fetch(M + "/__reqs")).json()).length;
ok("키워드 → source=safety, AI 미호출", r.j.source === "safety" && before === after, `req ${before}→${after}`);
// 5) 입력 검증·권한
ok("빈 글 400", (await post("/api/practice", body(""))).s === 400);
ok("깨진 JSON 400", (await post("/api/practice", "{oops")).s === 400);
ok("승인 안 된 시나리오 404", (await post("/api/practice", { scenarioId: "aca-001", turnNo: 1, text: "안녕", mode: "text" })).s === 404);
// 6) 안전 이벤트 기록·확인
let ev = await (await fetch(B + "/api/safety-events")).json();
ok("안전 이벤트 기록됨", ev.events.length === 2 && ev.events.some(e => e.category === "bullying") && ev.events.some(e => e.category === "model_flagged"), ev.events.map(e => e.category).join(","));
r = await post("/api/safety-events", { id: ev.events[0].id, by: "guardian" });
ok("확인 처리", r.s === 200); ok("재확인은 404", (await post("/api/safety-events", { id: ev.events[0].id })).s === 404);
r = await post("/api/safety-events", { reports: [{ scenarioId: sid, category: "abuse", excerpt: "오프라인 중 한 말" }, { scenarioId: sid, category: "x", excerpt: "무시" }] });
ok("오프라인 대기분 등록(잘못된 분류는 무시)", r.j.added === 1);
// 7) 시간 제한: 15분 = 60초 × 15
for (let i = 0; i < 15; i++) await post("/api/usage", { seconds: 60 });
const u = await (await fetch(B + "/api/usage")).json();
ok("사용 시간 누적 900초 → reached", u.used === 900 && u.reached, JSON.stringify(u));
r = await post("/api/practice", body("너 돈가스 좋아해?"));
ok("제한 초과 → 429", r.s === 429 && r.j.error === "limit_reached");
ok("조작 시도(한 번에 99999초)는 상한 적용", (await post("/api/usage", { seconds: 99999 })).j.used === 960);

console.log(`\n통과 ${pass} / 실패 ${fail}`); mock.close(); await stopServer(); process.exit(fail ? 1 : 0);
