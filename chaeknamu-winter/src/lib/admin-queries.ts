import "server-only";
import { query } from "./db";
import type { Admin } from "./auth";

export type Filters = { branch?: string; course?: string; slot?: string; status?: string; grade?: string; q?: string };

export type AppRow = {
  id: string; created_kst: string; branch_name: string; branch_slug: string; student_name: string; grade: number; school: string;
  guardian_phone: string; enrollment_type: string; course: string; slot1: string | null; slot2: string | null; price: number;
  status: string; waitlist_order: number | null; memo: string | null; admin_note: string | null; extra: Record<string, string | boolean>;
  branch_id: string; policy_version: string; pass_note: string | null; pass_end: string | null;
  history: { term: string; outcome: string }[] | null;
};

const SELECT = `select a.id, to_char(a.created_at at time zone 'Asia/Seoul', 'MM/DD HH24:MI') created_kst, b.name branch_name, b.slug branch_slug,
  a.student_name, a.grade, a.school, a.guardian_phone, a.enrollment_type, a.course, s1.label slot1, s2.label slot2, a.price, a.status,
  a.waitlist_order, a.memo, a.admin_note, a.extra, a.branch_id, a.policy_version, a.pass_note, to_char(a.pass_end_date, 'YYYY-MM-DD') pass_end,
  (select jsonb_agg(jsonb_build_object('term', p.term, 'outcome', p.outcome) order by p.term desc) from past_records p where p.guardian_phone = a.guardian_phone and p.student_name = a.student_name) history
  from applications a join branches b on b.id = a.branch_id
  left join slots s1 on s1.id = a.slot1_id left join slots s2 on s2.id = a.slot2_id`;

export async function listApplications(admin: Admin, f: Filters & { sort?: string }, limit = 500): Promise<AppRow[]> {
  const w: string[] = [];
  const p: unknown[] = [];
  const add = (sql: string, v: unknown) => { p.push(v); w.push(sql.replace("?", `$${p.length}`)); };
  if (admin.role !== "owner") add("a.branch_id = ?", admin.branch_id);
  else if (f.branch) add("b.slug = ?", f.branch);
  if (f.course === "1차") w.push("a.slot1_id is not null");
  if (f.course === "2차") w.push("a.slot2_id is not null");
  if (f.slot) { p.push(f.slot); w.push(`(s1.label = $${p.length} or s2.label = $${p.length})`); }
  if (f.status) add("a.status = ?", f.status);
  if (f.grade) add("a.grade = ?", Number(f.grade));
  if (f.q) {
    const digits = f.q.replace(/\D/g, "");
    p.push(`%${f.q.trim()}%`);
    const nameIdx = p.length;
    if (digits.length >= 3) { p.push(`%${digits}%`); w.push(`(a.student_name ilike $${nameIdx} or a.guardian_phone like $${p.length})`); }
    else w.push(`a.student_name ilike $${nameIdx}`);
  }
  p.push(limit);
  const rows = await query<AppRow>(`${SELECT} ${w.length ? "where " + w.join(" and ") : ""} order by a.created_at desc limit $${p.length}`, p);
  return f.sort === "time" ? rows : sortByGrade(rows);
}

// 학년 낮은 순. 같은 보호자 연락처(형제·자매)는 학년과 상관없이 한 묶음으로, 묶음 안에서는 낮은 학년 순.
// 묶음의 위치는 묶음에서 가장 낮은 학년을 기준으로 해요.
export function sortByGrade<T extends { guardian_phone: string; grade: number; created_kst: string; student_name: string }>(rows: T[]): T[] {
  const minGrade = new Map<string, number>();
  for (const r of rows) minGrade.set(r.guardian_phone, Math.min(minGrade.get(r.guardian_phone) ?? 9, r.grade));
  return [...rows].sort((a, b) =>
    minGrade.get(a.guardian_phone)! - minGrade.get(b.guardian_phone)! ||
    a.guardian_phone.localeCompare(b.guardian_phone) ||
    a.grade - b.grade ||
    a.student_name.localeCompare(b.student_name, "ko"));
}

// 같은 보호자 연락처로 서로 다른 학생이 있으면 형제·자매 묶음으로 봐요
export function siblingMap(rows: { guardian_phone: string; student_name: string }[]) {
  const m = new Map<string, Set<string>>();
  for (const r of rows) (m.get(r.guardian_phone) ?? m.set(r.guardian_phone, new Set()).get(r.guardian_phone)!).add(r.student_name);
  return m;
}

export async function getApplication(admin: Admin, id: string): Promise<AppRow | null> {
  const rows = await query<AppRow>(`${SELECT} where a.id = $1`, [id]);
  const r = rows[0];
  if (!r) return null;
  if (admin.role !== "owner" && r.branch_id !== admin.branch_id) return null;
  return r;
}

export type DashRow = { branch_name: string; branch_slug: string; code: string; label: string; start_time: string; capacity: number | null; confirmed: number; waiting: number };

export async function dashboard(admin: Admin): Promise<DashRow[]> {
  return query<DashRow>(
    `select b.name branch_name, b.slug branch_slug, s.code, sl.label, to_char(sl.start_time, 'HH24:MI') start_time, sl.capacity,
       (select count(*)::int from applications a where a.status = '확정' and (a.slot1_id = sl.id or a.slot2_id = sl.id)) confirmed,
       (select count(*)::int from applications a where a.status = '대기' and (a.slot1_id = sl.id or a.slot2_id = sl.id)) waiting
     from slots sl join sessions s on s.id = sl.session_id join branches b on b.id = s.branch_id
     where ($1::uuid is null or b.id = $1)
     order by b.sort_order, s.code, sl.sort_order`,
    [admin.role === "owner" ? null : admin.branch_id],
  );
}

export async function logsFor(id: string) {
  return query<{ changed_by: string; from_status: string | null; to_status: string; note: string | null; at: string }>(
    `select changed_by, from_status, to_status, note, to_char(created_at at time zone 'Asia/Seoul', 'MM/DD HH24:MI') at
     from application_logs where application_id = $1 order by id desc`, [id]);
}
