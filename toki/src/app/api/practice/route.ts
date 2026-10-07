import { NextResponse } from "next/server";
import { handlePractice } from "@/lib/ai/handler";
import { getAiEngine } from "@/lib/ai/server";
import { offlineEngine } from "@/lib/practice/engine";
import { findForChild } from "@/lib/child/scenarios";
import { DEMO_CHILD } from "@/lib/child/demo";
import { getSafetyStore } from "@/lib/safety/events";
import { getUsageStore } from "@/lib/usage/limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  const r = await handlePractice(body, {
    childId: DEMO_CHILD.id, targetLevel: DEMO_CHILD.targetLevel, dailyMinutes: DEMO_CHILD.dailyMinutes,
    findScenario: (id) => findForChild(id, DEMO_CHILD.ageBand),
    ai: getAiEngine(), offline: offlineEngine, usage: getUsageStore(), safety: getSafetyStore(),
  });
  return NextResponse.json(r.body, { status: r.status });
}
