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

  // 연속으로 틀리면 잠시 막아요 (10분에 6번 실패까지)
  const fails = await query<{ n: number }>(
    "select count(*)::int n from rate_events where key = $1 and created_at > now() - interval '10 minutes'",
    [`checkfail:${ip}`],
  );
  if (fails[0].n >= 6) return NextResponse.json({ ok: false, message: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  if (!(await checkRate(`check:${ip}`, 60, 20))) return NextResponse.json({ ok: false, message: "잠시 후 다시 시도해 주세요." }, { status: 429 });

  const rows = await query<{ r: { course: string; slot1: string | null; slot2: string | null; status: string }[] }>(
    "select check_application($1, $2, $3) r",
    [parsed.data.branch, parsed.data.name, parsed.data.last4],
  );
  const found = rows[0].r;
  if (found.length === 0) await checkRate(`checkfail:${ip}`, 600, 1000);
  return NextResponse.json({ ok: true, rows: found });
}
