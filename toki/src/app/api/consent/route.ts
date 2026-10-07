import { NextResponse } from "next/server";
import { requireGuardian } from "@/lib/server/guard";
import { getStores } from "@/lib/server/stores";
import { CONSENT_LABEL, type ConsentKind } from "@/lib/consent/consent";
import { DEMO_CHILD } from "@/lib/child/demo";

export const dynamic = "force-dynamic";
/** 동의 부여·철회 (보호자 PIN 필요). 그림 저장 동의를 철회하면 저장된 그림 파일을 지운다. */
export async function POST(req: Request) {
  const denied = requireGuardian(req); if (denied) return denied;
  const { kind, grant } = (await req.json().catch(() => ({}))) as { kind?: string; grant?: boolean };
  if (!kind || !(kind in CONSENT_LABEL) || typeof grant !== "boolean") return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { consent, htp } = getStores(); const k = kind as ConsentKind;
  let purged = 0;
  if (grant) consent.grant(DEMO_CHILD.id, k);
  else { consent.revoke(DEMO_CHILD.id, k); if (k === "drawing_storage") purged = htp.purgeImages(DEMO_CHILD.id); }
  return NextResponse.json({ ok: true, purgedImages: purged });
}
