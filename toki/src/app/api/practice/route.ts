import { NextResponse } from "next/server";
import { handlePractice } from "@/lib/ai/handler";
import { getAiEngine } from "@/lib/ai/server";
import { offlineEngine } from "@/lib/practice/engine";
import { findForChild } from "@/lib/child/scenarios";
import { childContext } from "@/lib/server/child";
import { getSafetyStore } from "@/lib/safety/events";
import { getUsageStore } from "@/lib/usage/limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  const c = childContext();
  if (!c.hasConsent) return NextResponse.json({ error: "consent_required" }, { status: 403 }); // 보호자 동의가 없으면 아동 기능을 쓸 수 없다
  const r = await handlePractice(body, {
    childId: c.childId, targetLevel: c.cfg.targetLevel, dailyMinutes: c.cfg.dailyMinutes,
    findScenario: (id) => findForChild(id, c.ageBand),
    ai: getAiEngine(), offline: offlineEngine, usage: getUsageStore(), safety: getSafetyStore(),
  });
  return NextResponse.json(r.body, { status: r.status });
}
