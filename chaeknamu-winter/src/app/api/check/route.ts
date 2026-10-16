import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { checkRate } from "@/lib/repo";
import { clientIp } from "@/lib/ip";

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

  const rows = await query<{ r: { course: string; slot1: string | null; slot2: string | null; status: string }[] }>(
    "select check_application($1, $2, $3) r",
    [parsed.data.branch, parsed.data.name, parsed.data.last4],
  );
  const found = rows[0].r;
  if (found.length === 0) await checkRate(failKey, 600, 1000);
  return NextResponse.json({ ok: true, rows: found });
}
