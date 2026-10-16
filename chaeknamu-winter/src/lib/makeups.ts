import "server-only";
import { query } from "./db";

export const MAKEUP_MSG: Record<string, string> = {
  not_confirmed: "확정된 신청만 보강을 할 수 있어요.",
  not_lesson_day: "평일(설 연휴 제외)만 보강할 수 있어요. 주말 보강은 없어요.",
  out_of_window: "신청하신 차수 기간 안에서만 보강할 수 있어요. (1차만 신청하셨다면 2차 기간에는 보강이 안 돼요.)",
  limit: "보강 가능 횟수를 모두 사용했어요.",
  duplicate: "같은 날짜에 이미 보강이 등록되어 있어요.",
};

export async function addMakeup(appId: string, date: string, timeNote: string, by: string, status: "요청" | "확정") {
  const r = (await query<{ r: { ok: boolean; code?: string } }>("select add_makeup($1, $2::date, $3, $4, $5) r", [appId, date, timeNote, by, status]))[0].r;
  return r.ok ? { ok: true as const } : { ok: false as const, message: MAKEUP_MSG[r.code ?? ""] ?? "처리할 수 없어요." };
}

export type MakeupInfo = { limit: number; used: number; start: string; end: string };

// 이 학생이 보강할 수 있는 기간과 횟수 (화면 안내용. 실제 검사는 DB 함수가 해요)
export async function makeupInfo(appId: string): Promise<MakeupInfo | null> {
  const r = await query<MakeupInfo>(
    `select b.makeup_limit "limit",
       (select count(*)::int from makeups m where m.application_id = a.id and m.status in ('요청', '확정')) used,
       to_char(case when a.course = '2차' then s2.start_date else coalesce(b.makeup_start_date, s1.start_date) end, 'YYYY-MM-DD') start,
       to_char(case when a.course = '1차' then s1.end_date else s2.end_date end, 'YYYY-MM-DD') "end"
     from applications a join branches b on b.id = a.branch_id
       join sessions s1 on s1.branch_id = b.id and s1.code = '1차' join sessions s2 on s2.branch_id = b.id and s2.code = '2차'
     where a.id = $1 and a.status = '확정'`, [appId]);
  return r[0] ?? null;
}

export function mondayOf(d: string) {
  const dt = new Date(`${d}T12:00:00+09:00`);
  const w = dt.getUTCDay();
  dt.setUTCDate(dt.getUTCDate() - (w === 0 ? 6 : w - 1));
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(dt);
}
export function addDays(d: string, n: number) {
  const dt = new Date(`${d}T12:00:00+09:00`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(dt);
}
