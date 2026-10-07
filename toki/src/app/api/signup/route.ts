import { NextResponse } from "next/server";
import { validateSignup, type ConsentKind, type SignupInput } from "@/lib/consent/consent";
import { hashPin } from "@/lib/consent/pin";
import { getStores } from "@/lib/server/stores";
import { DEMO_CHILD } from "@/lib/child/demo";

export const dynamic = "force-dynamic";
/** 가입 + 법정대리인 동의. 데모에서는 한 번만 가능하다 (이후 변경은 보호자 PIN 필요). */
export async function POST(req: Request) {
  const s = getStores();
  if (s.guardian.registered) return NextResponse.json({ error: "already_registered" }, { status: 409 });
  const body = (await req.json().catch(() => null)) as SignupInput | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const v = validateSignup(body);
  if (!v.ok) return NextResponse.json({ errors: v.errors }, { status: 400 });
  s.guardian.name = body.guardianName.trim(); s.guardian.pinHash = hashPin(body.pin); s.guardian.registered = true;
  s.guardian.profile = { nickname: body.childNickname.trim(), ageBand: body.ageBand };
  for (const k of ["service", "voice_storage", "drawing_storage", "research"] as ConsentKind[]) if (body.consents[k]) s.consent.grant(DEMO_CHILD.id, k);
  return NextResponse.json({ ok: true });
}
