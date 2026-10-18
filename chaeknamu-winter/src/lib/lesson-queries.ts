import "server-only";
import { query } from "./db";
import type { Admin } from "./auth";

export type Book = { title: string; volumes: number };
export type Student = {
  id: string; student_name: string; grade: number; guardian_phone: string; slot_id: string; start_time: string;
  att_status: string | null; activity: string; comment: string; worksheet_count: number; taught_by: string | null;
  worksheet_graded: boolean; graded_by: string | null; books: Book[];
};

export async function branchSlotLabels(branchId: string) {
  return query<{ label: string }>(
    `select distinct sl.label, sl.sort_order from slots sl join sessions s on s.id = sl.session_id where s.branch_id = $1 order by sl.sort_order`, [branchId]);
}

export async function staffOf(branchId: string) {
  return query<{ email: string; name: string }>(
    `select email, coalesce(display_name, email) name from admin_users where role in ('teacher', 'branch_admin') and branch_id = $1 order by name`, [branchId]);
}

// 그날 그 타임에 수업하는 특강 확정 학생 (정규 재원생은 제외)
export async function studentsFor(branchId: string, date: string, label: string): Promise<Student[]> {
  const rows = await query<Student & { rid: string | null }>(
    `with t as (
       select a.id, a.student_name, a.grade, a.guardian_phone,
         case when s1.label = $3 and $2::date between ss1.start_date and ss1.end_date then s1.id else s2.id end slot_id,
         case when s1.label = $3 and $2::date between ss1.start_date and ss1.end_date then s1.start_time else s2.start_time end start_time
       from applications a
       left join slots s1 on s1.id = a.slot1_id left join sessions ss1 on ss1.id = s1.session_id
       left join slots s2 on s2.id = a.slot2_id left join sessions ss2 on ss2.id = s2.session_id
       where a.branch_id = $1 and a.status = '확정' and a.enrollment_type <> '정규 재원생'
         and ((s1.label = $3 and $2::date between ss1.start_date and ss1.end_date)
           or (s2.label = $3 and $2::date between ss2.start_date and ss2.end_date)))
     select t.id, t.student_name, t.grade, t.guardian_phone, t.slot_id, to_char(t.start_time, 'HH24:MI') start_time,
       att.status att_status, coalesce(lr.activity, '') activity, coalesce(lr.comment, '') "comment",
       coalesce(lr.worksheet_count, 0) worksheet_count, lr.taught_by, coalesce(lr.worksheet_graded, false) worksheet_graded, lr.graded_by,
       coalesce((select jsonb_agg(jsonb_build_object('title', b.title, 'volumes', b.volumes) order by b.sort_order) from lesson_books b where b.record_id = lr.id), '[]'::jsonb) books
     from t left join attendance att on att.application_id = t.id and att.lesson_date = $2
            left join lesson_records lr on lr.application_id = t.id and lr.lesson_date = $2
     order by t.grade, t.guardian_phone, t.student_name`,
    [branchId, date, label],
  );
  return rows;
}

export async function ungraded(admin: Admin) {
  return query<{ id: string; application_id: string; lesson_date: string; student_name: string; grade: number; branch_name: string; worksheet_count: number; taught_by: string | null; taught_name: string | null }>(
    `select lr.id, lr.application_id, to_char(lr.lesson_date, 'YYYY-MM-DD') lesson_date, a.student_name, a.grade, b.name branch_name,
       lr.worksheet_count, lr.taught_by, (select coalesce(display_name, email) from admin_users where email = lr.taught_by) taught_name
     from lesson_records lr join applications a on a.id = lr.application_id join branches b on b.id = a.branch_id
     where lr.worksheet_count > 0 and not lr.worksheet_graded
       and ($1::uuid is null or a.branch_id = $1)
       and ($2::text is null or lr.taught_by = $2)
     order by lr.lesson_date, a.grade, a.student_name`,
    [admin.role === "owner" ? null : admin.branch_id, admin.role === "teacher" ? admin.email : null],
  );
}

export async function recordSummary(applicationId: string) {
  const [counts] = await query<{ present: number; late: number; absent: number; worksheets: number; graded: number }>(
    `select (select count(*)::int from attendance where application_id = $1 and status = '출석') present,
            (select count(*)::int from attendance where application_id = $1 and status = '지각') late,
            (select count(*)::int from attendance where application_id = $1 and status = '결석') absent,
            coalesce((select sum(worksheet_count)::int from lesson_records where application_id = $1), 0) worksheets,
            coalesce((select sum(worksheet_count)::int from lesson_records where application_id = $1 and worksheet_graded), 0) graded`, [applicationId]);
  const days = await query<{ d: string; status: string | null; activity: string; comment: string; worksheet_count: number; taught_name: string | null; worksheet_graded: boolean; books: Book[] }>(
    `select to_char(x.d, 'MM/DD') d, att.status, coalesce(lr.activity, '') activity, coalesce(lr.comment, '') "comment", coalesce(lr.worksheet_count, 0) worksheet_count,
       (select coalesce(display_name, email) from admin_users where email = lr.taught_by) taught_name, coalesce(lr.worksheet_graded, false) worksheet_graded,
       coalesce((select jsonb_agg(jsonb_build_object('title', b.title, 'volumes', b.volumes) order by b.sort_order) from lesson_books b where b.record_id = lr.id), '[]'::jsonb) books
     from (select lesson_date d from attendance where application_id = $1 union select lesson_date from lesson_records where application_id = $1) x
     left join attendance att on att.application_id = $1 and att.lesson_date = x.d
     left join lesson_records lr on lr.application_id = $1 and lr.lesson_date = x.d
     order by x.d desc`, [applicationId]);
  return { counts, days };
}
