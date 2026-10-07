import { NextResponse } from "next/server";
import { z } from "zod";
import { getStores } from "@/lib/server/stores";
import { DEFAULT_CHECKLIST, KINDS, validateHtp } from "@/lib/htp/store";
import { DEMO_CHILD } from "@/lib/child/demo";

export const dynamic = "force-dynamic";
// ⚠ 데모: 치료사 로그인·배정 확인이 없다. 연결 후에는 배정된 치료사만 열람·기록할 수 있어야 한다(RLS).
export async function GET() {
  const { htp, consent } = getStores();
  return NextResponse.json({ records: htp.list(DEMO_CHILD.id), drawingConsent: consent.has(DEMO_CHILD.id, "drawing_storage"), checklist: DEFAULT_CHECKLIST });
}

const Body = z.object({
  date: z.string(), durationMin: z.number().nullable().optional(), note: z.string().max(2000).optional(), examiner: z.string().max(30).optional(),
  checklist: z.record(z.string(), z.boolean()).optional(), images: z.record(z.string(), z.string()).optional(),
});
export async function POST(req: Request) {
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ errors: ["입력을 확인해 주세요"] }, { status: 400 });
  const { htp, consent } = getStores();
  const errors = validateHtp(b.data, consent.has(DEMO_CHILD.id, "drawing_storage"));
  if (errors.length) return NextResponse.json({ errors }, { status: 400 });
  const images = Object.fromEntries(Object.entries(b.data.images ?? {}).filter(([k]) => (KINDS as readonly string[]).includes(k)));
  const rec = htp.add({ childId: DEMO_CHILD.id, date: b.data.date, examiner: b.data.examiner?.trim() || "검사자", durationMin: b.data.durationMin ?? null,
    checklist: Object.fromEntries(DEFAULT_CHECKLIST.map((k) => [k, !!b.data.checklist?.[k]])), note: b.data.note ?? "", images });
  return NextResponse.json({ ok: true, id: rec.id });
}
