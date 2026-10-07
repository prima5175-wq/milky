import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { demoRepository as repo } from "@/lib/assessments/demo";
import { buildResearchCsv } from "@/lib/export/anonymize";
import { getProgressStore } from "@/lib/progress/store";
import { getStores } from "@/lib/server/stores";
import { DEMO_CHILD } from "@/lib/child/demo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

/**
 * 연구용 익명화 CSV (관리자 전용).
 * 환경변수 TOKI_ADMIN_TOKEN(관리자 토큰)과 TOKI_EXPORT_SALT(가명화 소금, 16자 이상)가 둘 다 있어야 동작한다. 없으면 막혀 있다.
 * 보호자가 '연구 활용'에 동의한 아동만 포함된다.
 */
export async function GET(req: Request) {
  const token = process.env.TOKI_ADMIN_TOKEN;
  if (!token) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!same(req.headers.get("x-admin-token") ?? "", token)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const s = getStores(), p = getProgressStore();
  const r = buildResearchCsv({
    childId: DEMO_CHILD.id, ageBand: s.guardian.profile.ageBand, salt: process.env.TOKI_EXPORT_SALT, researchConsent: s.consent.has(DEMO_CHILD.id, "research"),
    sessions: p.sessions, missions: p.missions, assessments: await repo.listRecords(DEMO_CHILD.id),
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === "salt_missing" ? 503 : 409 });
  return new Response(r.csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="toki-research.csv"', "cache-control": "no-store" } });
}
