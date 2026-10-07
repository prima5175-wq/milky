// E2E 공통 도우미. 서버를 직접 띄우고 끄며, 결과를 ✔/✘ 로 모아 실패가 있으면 종료 코드를 1 로 낸다.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export { chromium };
export const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const PORT = Number(process.env.E2E_PORT || 3111);
export const B = `http://localhost:${PORT}`;
let pass = 0, fail = 0, srv = null;

export const ok = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(cond ? "✔" : "✘", name, extra); };
export function finish() { console.log(`\n통과 ${pass} / 실패 ${fail}`); return fail === 0; }
export const section = (s) => console.log(`\n== ${s}`);

/** 크로미움 위치: CHROMIUM_PATH 환경변수 → 이 환경의 기본 위치 → playwright 가 설치한 것 */
export const launchOptions = () => {
  const exe = process.env.CHROMIUM_PATH || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
  return exe ? { executablePath: exe } : {};
};

export const serverUp = async () => { try { return (await fetch(B + "/offline.html")).ok; } catch { return false; } };
/** 운영 빌드(next build 후)를 띄운다. 기록이 서버 메모리에 있어서 파일마다 새로 띄운다. */
export async function startServer(env = {}) {
  srv = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], { cwd: ROOT, env: { ...process.env, TOKI_DEMO_APPROVE: "1", ...env }, stdio: "ignore" });
  for (let i = 0; i < 60; i++) { if (await serverUp()) return; await new Promise((r) => setTimeout(r, 250)); }
  throw new Error("서버가 켜지지 않았어요 (먼저 npm run build 를 실행했나요?)");
}
export async function stopServer() { if (srv) { srv.kill("SIGKILL"); srv = null; await new Promise((r) => setTimeout(r, 600)); } }

/** 서버 API 호출 (보호자 PIN 은 pin 으로) */
export const api = async (path, { method = "GET", body, pin, headers = {} } = {}) => {
  const r = await fetch(B + path, { method, headers: { "content-type": "application/json", ...(pin ? { "x-guardian-pin": pin } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  let j; try { j = await r.json(); } catch { j = {}; } return { s: r.status, j };
};
