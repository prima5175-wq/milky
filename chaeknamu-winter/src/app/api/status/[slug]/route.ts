import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// 오픈 시각 확인용: 서버 시각과 오픈 여부만 알려줘요
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await query<{ open_at: string | null; is_open: boolean; server_now: string }>(
    `select open_at, (open_at is not null and now() >= open_at and (close_at is null or now() < close_at)) is_open, now() server_now
     from branches where slug = $1 and is_active`,
    [slug],
  );
  if (!rows[0]) return NextResponse.json({}, { status: 404 });
  return NextResponse.json(rows[0], { headers: { "Cache-Control": "no-store" } });
}
