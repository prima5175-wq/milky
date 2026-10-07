import { NextResponse } from "next/server";
import { DEMO_CHILD } from "@/lib/child/demo";
import { getSafetyStore } from "@/lib/safety/events";

export const dynamic = "force-dynamic";
// ⚠ 데모: 로그인·권한 확인이 없다. 연결 후에는 보호자/배정된 치료사만 열람·처리할 수 있어야 한다(RLS).
export async function GET() { return NextResponse.json({ events: getSafetyStore().list(DEMO_CHILD.id) }); }
const CATEGORIES = ["self_harm", "abuse", "bullying", "secrecy", "model_flagged"] as const;
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: string; by?: string; reports?: Array<{ scenarioId?: string; category?: string; excerpt?: string }> };
  // 오프라인 중 쌓인 이벤트 일괄 등록
  if (Array.isArray(body.reports)) {
    let n = 0;
    for (const r of body.reports.slice(0, 20)) {
      const category = CATEGORIES.find((c) => c === r.category);
      if (!category || typeof r.scenarioId !== "string") continue;
      getSafetyStore().add({ childId: DEMO_CHILD.id, scenarioId: r.scenarioId.slice(0, 40), category, excerpt: String(r.excerpt ?? "") }); n++;
    }
    return NextResponse.json({ ok: true, added: n });
  }
  const { id, by } = body;
  const ok = typeof id === "string" && getSafetyStore().markHandled(id, by === "therapist" ? "therapist" : "guardian");
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
