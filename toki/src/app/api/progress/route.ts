import { NextResponse } from "next/server";
import { z } from "zod";
import { childContext } from "@/lib/server/child";
import { findForChild } from "@/lib/child/scenarios";
import { getProgressStore } from "@/lib/progress/store";
import { dayOf } from "@/lib/usage/limit";

export const dynamic = "force-dynamic";

/** 아동 화면용: 모은 스티커 수와 어른이 확인해 줄 미션 목록 (미션 id·확인 권한은 주지 않는다) */
export async function GET() {
  const c = childContext(); const p = getProgressStore();
  if (!c.hasConsent) return NextResponse.json({ error: "consent_required" }, { status: 403 });
  return NextResponse.json({ points: p.totalPoints(c.childId), doneToday: p.doneScenarioIds(c.childId, dayOf(new Date())), openMissions: p.listMissions(c.childId, "open").map((m) => ({ text: m.text, day: m.day })) });
}

const Body = z.object({ scenarioId: z.string().min(1).max(40), levels: z.array(z.number().nullable()).max(3), modes: z.array(z.string().max(10)).max(3) });
/** 연습 마침. 점수와 미션 문구는 서버가 정한다 (브라우저가 보낸 값은 쓰지 않는다). */
export async function POST(req: Request) {
  const c = childContext();
  if (!c.hasConsent) return NextResponse.json({ error: "consent_required" }, { status: 403 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const sc = findForChild(b.data.scenarioId, c.ageBand);
  if (!sc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const r = getProgressStore().completePractice({ childId: c.childId, scenarioId: sc.id, day: dayOf(new Date()), levels: b.data.levels, modes: b.data.modes, missionText: sc.mission });
  return NextResponse.json({ counted: r.counted, earned: r.practicePoints });
}
