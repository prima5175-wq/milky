import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// 오픈 시각 확인용: 서버 시각과 오픈 여부만 알려줘요
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await query<{ phase: string; next_change_at: string | null; is_open: boolean; server_now: string }>(
    `select branch_launch.phase, branch_launch.next_change_at, branch_launch.phase in ('priority', 'general') is_open, now() server_now
     from branches b, lateral (select branch_phase(b) phase, case branch_phase(b) when 'before' then b.open_at when 'priority' then b.priority_end_at
       when 'paused' then b.general_open_at when 'general' then b.close_at end next_change_at) branch_launch
     where b.slug = $1 and b.is_active`,
    [slug],
  );
  if (!rows[0]) return NextResponse.json({}, { status: 404 });
  return NextResponse.json(rows[0], { headers: { "Cache-Control": "no-store" } });
}
