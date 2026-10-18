import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRate } from "@/lib/repo";
import { addMakeup } from "@/lib/makeups";
import { findApplications } from "@/lib/lookup";

const body = z.object({
  branch: z.string().max(30), name: z.string().trim().min(1).max(30), last4: z.string().regex(/^\d{4}$/),
  application_id: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time_note: z.string().max(60).optional(),
});

// 학부모 보강 요청: 이름·연락처 뒷 4자리를 다시 확인한 뒤 '요청' 상태로 접수해요. 관리자가 승인하면 확정돼요.
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "입력 내용을 다시 확인해 주세요." }, { status: 400 });
  const d = parsed.data;
  if (!(await checkRate(`makeup:${d.branch}:${d.name}`, 600, 10))) return NextResponse.json({ ok: false, message: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  const mine = (await findApplications(d.branch, d.name, d.last4)).find((r) => r.id === d.application_id && r.status === "확정");
  if (!mine) return NextResponse.json({ ok: false, message: "일치하는 신청이 없어요." }, { status: 404 });
  const r = await addMakeup(d.application_id, d.date, d.time_note ?? "", "parent", "요청");
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, message: r.message }, { status: 409 });
}
