import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGuardian } from "@/lib/server/guard";
import { getStores } from "@/lib/server/stores";
import { DEMO_CHILD } from "@/lib/child/demo";
import { DOMAINS } from "@/lib/scenarios/schema";

export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json(getStores().config.get(DEMO_CHILD.id)); }

const Body = z.object({ dailyMinutes: z.number(), dailyScenarios: z.number(), targetLevel: z.number().int().min(1).max(4), targetDomains: z.array(z.enum(DOMAINS)).max(4) });
/** 연습 설정 저장. 치료사(처방 화면) 또는 보호자(PIN)가 바꾼다. ⚠ 데모: 치료사 로그인이 없어 PIN 없이도 저장된다. */
export async function POST(req: Request) {
  if (req.headers.get("x-guardian-pin")) { const d = requireGuardian(req); if (d) return d; }
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ errors: ["입력을 확인해 주세요"] }, { status: 400 });
  const r = getStores().config.set(DEMO_CHILD.id, { ...b.data, targetLevel: b.data.targetLevel as 1 | 2 | 3 | 4 });
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
