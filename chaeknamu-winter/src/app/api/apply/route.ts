import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { checkRate, getBranch, getFormFields } from "@/lib/repo";
import { kDateTime } from "@/lib/format";
import { clientIp } from "@/lib/ip";
import { MSG, POLICY_VERSION } from "@/lib/texts";
import { triggerSheetSync } from "@/lib/sheet-trigger";

const body = z.object({
  branch_slug: z.string().min(1).max(30),
  course: z.enum(["1차", "2차", "1·2차"]),
  slot1_id: z.string().uuid().nullable().optional(),
  slot2_id: z.string().uuid().nullable().optional(),
  student_name: z.string().trim().min(1).max(30),
  grade: z.number().int().min(1).max(6),
  school: z.string().trim().min(1).max(50),
  guardian_phone: z.string().min(10).max(20),
  enrollment_type: z.enum(["신규", "정규 재원생", "휴원생", "타 지점 수강생"]),
  memo: z.string().max(200).optional(),
  agree_policy: z.literal(true),
  agree_privacy: z.literal(true),
  idempotency_key: z.string().min(8).max(80),
  extra: z.record(z.string(), z.union([z.string().max(500), z.boolean()])).optional(),
  website: z.string().optional(), // 숨김 함정 필드
});

const ERR: Record<string, string> = {
  not_open: "아직 신청이 열리지 않았어요.",
  closed: "신청 기간이 끝났어요.",
  duplicate: MSG.duplicate,
  invalid: "입력 내용을 다시 확인해 주세요.",
  paused: "지금은 접수를 쉬는 기간이에요.",
  priority_only: "지금은 재원생 우대 신청 기간이에요.",
};

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: ERR.invalid }, { status: 400 });
  const d = parsed.data;

  // 스팸 로봇은 성공한 것처럼 보이게 하고 저장하지 않아요
  if (d.website) return NextResponse.json({ ok: true, status: "확정" });

  // 학원 와이파이·통신사 망에서는 학부모 100명이 같은 IP로 보일 수 있어요.
  // 그래서 IP는 로봇 폭주만 막는 넉넉한 한도(1분 300회)로 두고,
  // 실제 방어는 '같은 연락처로 반복 제출'(10분 6회)과 중복 신청·함정 필드로 해요.
  const phoneKey = d.guardian_phone.replace(/\D/g, "");
  if (!(await checkRate(`apply:${clientIp(req)}`, 60, 300)) || !(await checkRate(`applyphone:${phoneKey}`, 600, 6))) {
    return NextResponse.json({ ok: false, message: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  // 관리자가 추가한 칸: 필수 여부 확인, 정의되지 않은 칸은 버려요
  const fields = await getFormFields();
  const extra: Record<string, string | boolean> = {};
  for (const f of fields) {
    const v = d.extra?.[f.key];
    const empty = v === undefined || v === "" || v === false;
    if (f.required && empty) return NextResponse.json({ ok: false, message: ERR.invalid }, { status: 400 });
    if (!empty) {
      if (f.type === "select" && !f.options.includes(String(v))) return NextResponse.json({ ok: false, message: ERR.invalid }, { status: 400 });
      extra[f.key] = v as string | boolean;
    }
  }

  try {
    const rows = await query<{ r: { ok: boolean; code?: string; applications?: { id: string; status: string }[] } }>(
      "select submit_application($1::jsonb) r",
      [JSON.stringify({ ...d, website: undefined, extra, policy_version: POLICY_VERSION })],
    );
    const r = rows[0].r;
    if (!r.ok) {
      let message = ERR[r.code ?? "invalid"] ?? MSG.error;
      if (r.code === "paused" || r.code === "priority_only") {
        const b = await getBranch(d.branch_slug);
        if (b?.general_open_at) message += ` 비재원생 신청은 ${kDateTime(b.general_open_at)}에 열려요.`;
      }
      return NextResponse.json({ ok: false, message }, { status: 409 });
    }
    triggerSheetSync();
    // 정원·대기 순번은 내려주지 않고 확정/대기 여부만 알려요
    const statuses = (r.applications ?? []).map((a) => a.status);
    return NextResponse.json({ ok: true, status: statuses.includes("대기") ? "대기" : "확정", split: statuses.length > 1 ? statuses : undefined });
  } catch {
    return NextResponse.json({ ok: false, message: MSG.error }, { status: 500 });
  }
}
