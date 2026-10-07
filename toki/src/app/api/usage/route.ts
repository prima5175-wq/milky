import { NextResponse } from "next/server";
import { DEMO_CHILD } from "@/lib/child/demo";
import { dayOf, getUsageStore, status } from "@/lib/usage/limit";

export const dynamic = "force-dynamic";
const snap = () => status(getUsageStore().used(DEMO_CHILD.id, dayOf(new Date())), DEMO_CHILD.dailyMinutes);

export async function GET() { return NextResponse.json(snap()); }

/** 화면이 보이는 동안 주기적으로 사용한 시간(초)을 올린다. */
export async function POST(req: Request) {
  const { seconds } = (await req.json().catch(() => ({}))) as { seconds?: number };
  getUsageStore().add(DEMO_CHILD.id, dayOf(new Date()), Number(seconds));
  return NextResponse.json(snap());
}
