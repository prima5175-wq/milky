import { NextResponse } from "next/server";
import { supabaseServer, hasSupabase } from "@/lib/auth";

// 이메일 링크를 눌렀을 때 도착하는 곳
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (hasSupabase() && code) await (await supabaseServer()).auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_SITE_URL ?? url.origin));
}
