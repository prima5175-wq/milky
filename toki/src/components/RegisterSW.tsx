"use client";
import { useEffect } from "react";
import { flushPendingProgress } from "@/lib/child/progress";
import { flushPendingSafety } from "@/lib/safety/pending";

/** 서비스 워커 등록(운영 빌드에서만). 이미 불러온 정적 파일도 오프라인용으로 저장하게 알려 준다. */
export function RegisterSW() {
  // 오프라인 중 쌓인 진행 기록·안전 이벤트는 어느 화면에서든, 연결이 돌아오는 즉시 서버로 보낸다.
  useEffect(() => {
    const flush = () => { flushPendingSafety(); flushPendingProgress(); };
    flush(); window.addEventListener("online", flush);
    const timer = setInterval(flush, 30_000); // 서버만 잠시 끊겼다 돌아온 경우에는 online 이벤트가 없으므로 주기적으로도 확인한다 (대기열이 비면 아무것도 보내지 않는다)
    return () => { window.removeEventListener("online", flush); clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").then(async () => {
      const reg = await navigator.serviceWorker.ready;
      const urls = performance.getEntriesByType("resource").map((e) => e.name).filter((n) => n.includes("/_next/static/"));
      reg.active?.postMessage({ type: "cache", urls });
    }).catch(() => { /* 등록하지 못해도 앱은 그대로 동작한다 */ });
  }, []);
  return null;
}

/** 오늘 연습할 이야기 화면을 미리 저장해 두면 연결이 없어도 열 수 있다. */
export function warmOffline(paths: string[]) {
  try { navigator.serviceWorker?.ready.then((reg) => reg.active?.postMessage({ type: "warm", urls: paths })); } catch { /* 지원하지 않는 환경 */ }
}
