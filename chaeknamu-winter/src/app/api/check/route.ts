import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { checkRate } from "@/lib/repo";
import { clientIp } from "@/lib/ip";
import { makeupInfo } from "@/lib/makeups";
import { findApplications } from "@/lib/lookup";

const body = z.object({ branch: z.string().max(30), name: z.string().trim().min(1).max(30), last4: z.string().regex(/^\d{4}$/) });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true, rows: [] });
  const ip = clientIp(req);

  // IP만으로는 막지 않아요(같은 와이파이의 다른 학부모가 막히면 안 되니까요).
  // 같은 학생 이름을 계속 바꿔 가며 찍어 보는 시도만 10분에 8번 틀리면 잠시 막아요.
  const failKey = `checkfail:${parsed.data.branch}:${parsed.data.name}`;
  const fails = await query<{ n: number }>(
    "select count(*)::int n from rate_events where key = $1 and created_at > now() - interval '10 minutes'",
    [failKey],
  );
  if (fails[0].n >= 8) return NextResponse.json({ ok: false, message: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  if (!(await checkRate(`check:${ip}`, 60, 300))) return NextResponse.json({ ok: false, message: "잠시 후 다시 시도해 주세요." }, { status: 429 });

  const found = await findApplications(parsed.data.branch, parsed.data.name, parsed.data.last4);
  if (found.length === 0) await checkRate(failKey, 600, 1000);

  // 확정된 신청에는 출석 현황과 보강 정보를 붙여요. (수업 기록·코멘트는 학부모에게 공개하지 않아요)
  const rows = await Promise.all(found.map(async (r) => {
    if (r.status !== "확정") return r;
    const [att] = await query<{ present: number; absent: number }>(
      `select count(*) filter (where status in ('출석', '지각'))::int present, count(*) filter (where status = '결석')::int absent from attendance where application_id = $1`, [r.id]);
    const list = await query<{ d: string; time_note: string; status: string }>(
      `select to_char(lesson_date, 'MM/DD') d, time_note, status from makeups where application_id = $1 and status in ('요청', '확정') order by lesson_date`, [r.id]);
    return { ...r, attendance: att, makeup: { ...(await makeupInfo(r.id)), list } };
  }));
  return NextResponse.json({ ok: true, rows });
}
