import { NextResponse } from "next/server";
import { requireGuardian } from "@/lib/server/guard";
export const dynamic = "force-dynamic";
export async function POST(req: Request) { return requireGuardian(req) ?? NextResponse.json({ ok: true }); }
