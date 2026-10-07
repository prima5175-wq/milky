import { z } from "zod";
import { demoRepository as repo } from "@/lib/assessments/demo";
import { buildReportData } from "@/lib/report/data";
import { renderReportPdf } from "@/lib/report/pdf";
import { loadFonts } from "@/lib/report/fonts";
import { getStores } from "@/lib/server/stores";
import { getProgressStore } from "@/lib/progress/store";
import { requireGuardian } from "@/lib/server/guard";
import { DEMO_CHILD } from "@/lib/child/demo";
import { dayOf } from "@/lib/usage/limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Rec = z.object({
  id: z.string().max(60), childId: z.string().max(60), catalogId: z.string().max(60), administeredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  examinerName: z.string().max(40), phase: z.enum(["pre", "follow_up", "post"]), scores: z.record(z.string().max(40), z.union([z.number(), z.string().max(40)])),
  note: z.string().max(2000).optional(), supersededBy: z.string().nullable().optional(),
});
const Body = z.object({ records: z.array(Rec).max(500).optional() }).optional();

/**
 * 보호자 상담용 진도 보고서 PDF.
 * 보호자는 PIN 으로, 검사자는 (데모에서는 로그인 없이) 화면에 보이는 검사 기록을 함께 보내 만든다. ⚠ 로그인 연결 후에는 배정된 검사자·해당 보호자만 가능해야 한다.
 */
export async function POST(req: Request) {
  if (req.headers.get("x-guardian-pin")) { const denied = requireGuardian(req); if (denied) return denied; }
  const parsed = Body.safeParse(await req.json().catch(() => undefined));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });

  const s = getStores(), progress = getProgressStore();
  const records = parsed.data?.records ?? (await repo.listRecords(DEMO_CHILD.id));
  const data = buildReportData({
    child: { id: DEMO_CHILD.id, nickname: s.guardian.profile.nickname, ageBand: s.guardian.profile.ageBand }, today: dayOf(new Date()),
    catalog: await repo.listCatalog(), records: records.map((r) => ({ ...r, childId: DEMO_CHILD.id })), sessions: progress.sessions, missions: progress.missions,
    notes: await repo.listNotes(DEMO_CHILD.id), htp: s.htp.list(DEMO_CHILD.id),
    includeImages: s.consent.has(DEMO_CHILD.id, "drawing_storage"), // 그림 저장 동의가 있을 때만 보고서에 그림을 넣는다
  });
  const pdf = await renderReportPdf(data, await loadFonts());
  return new Response(Buffer.from(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="toki-report-${data.generatedOn}.pdf"`, "cache-control": "no-store" } });
}
