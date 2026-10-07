"use client";
import { useEffect, useRef } from "react";

const BEAT = 15; // 초
/** 화면이 보이는 동안 15초마다 사용 시간을 서버에 올리고, 하루 제한에 닿으면 알려 준다. 네트워크가 안 돼도 조용히 넘어간다. */
export function useUsageHeartbeat(onLimit: () => void) {
  const cb = useRef(onLimit); cb.current = onLimit;
  useEffect(() => {
    let alive = true;
    const call = async (init?: RequestInit) => {
      try { const r = await fetch("/api/usage", init); const j = await r.json(); if (alive && j.reached) cb.current(); } catch { /* 오프라인 */ }
    };
    call();
    const id = setInterval(() => {
      if (document.visibilityState === "visible")
        call({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seconds: BEAT }) });
    }, BEAT * 1000);
    return () => { alive = false; clearInterval(id); };
  }, []);
}
