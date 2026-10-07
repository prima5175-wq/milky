import { NextResponse } from "next/server";
import { requireGuardian } from "@/lib/server/guard";
import { childContext } from "@/lib/server/child";
import { getProgressStore } from "@/lib/progress/store";

export const dynamic = "force-dynamic";
/** 보호자가 "실제로 해 봤어요" 확인 → 미션 점수 지급 (PIN 필요) */
export async function POST(req: Request) {
  const denied = requireGuardian(req); if (denied) return denied;
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  const c = childContext(); const p = getProgressStore();
  const m = p.missions.find((x) => x.id === id);
  if (!m || m.childId !== c.childId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const r = p.confirmMission(m.id, "guardian");
  return NextResponse.json(r, { status: r.ok ? 200 : 409 });
}
