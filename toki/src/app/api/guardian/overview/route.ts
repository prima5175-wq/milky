import { NextResponse } from "next/server";
import { requireGuardian } from "@/lib/server/guard";
import { childContext } from "@/lib/server/child";
import { getStores } from "@/lib/server/stores";
import { getProgressStore } from "@/lib/progress/store";
import { weeklySummary } from "@/lib/progress/summary";
import { tipsFor } from "@/lib/progress/tips";
import { CONSENT_LABEL } from "@/lib/consent/consent";
import { dayOf } from "@/lib/usage/limit";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const denied = requireGuardian(req); if (denied) return denied;
  const c = childContext(), p = getProgressStore();
  return NextResponse.json({
    child: { nickname: c.nickname, ageBand: c.ageBand }, points: p.totalPoints(c.childId),
    openMissions: p.listMissions(c.childId, "open"), summary: weeklySummary(c.childId, p.sessions, p.missions, dayOf(new Date())),
    tips: tipsFor(c.cfg.targetLevel), dailyMinutes: c.cfg.dailyMinutes,
    consents: (Object.keys(CONSENT_LABEL) as Array<keyof typeof CONSENT_LABEL>).map((k) => ({ kind: k, label: CONSENT_LABEL[k], granted: getStores().consent.has(c.childId, k) })),
  });
}
