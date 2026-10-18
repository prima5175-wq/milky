"use server";
import { query } from "@/lib/db";
import { requireAdmin, type Admin } from "@/lib/auth";
import { isLessonDay } from "@/lib/lessons";
import type { Book } from "@/lib/lesson-queries";

type Result = { ok: boolean; message?: string };

// 이 학생이 내가 일할 수 있는 지점 소속인지 확인
async function ownApp(admin: Admin, appId: string) {
  const r = await query<{ branch_id: string }>("select branch_id from applications where id = $1 and status = '확정'", [appId]);
  return !!r[0] && (admin.role === "owner" || r[0].branch_id === admin.branch_id);
}

export async function setAttendance(appId: string, date: string, slotId: string, status: "출석" | "지각" | "결석" | null): Promise<Result> {
  const admin = await requireAdmin();
  if (!isLessonDay(date) || !(await ownApp(admin, appId))) return { ok: false, message: "처리할 수 없어요." };
  if (status === null) await query("delete from attendance where application_id = $1 and lesson_date = $2", [appId, date]);
  else await query(
    `insert into attendance (application_id, lesson_date, slot_id, status, checked_by) values ($1, $2, $3, $4, $5)
     on conflict (application_id, lesson_date) do update set status = excluded.status, checked_by = excluded.checked_by, checked_at = now()`,
    [appId, date, slotId, status, admin.email]);
  return { ok: true };
}

export type RecordInput = { activity: string; comment: string; worksheet_count: number; taught_by: string | null; graded: boolean; books: Book[] };

export async function saveRecord(appId: string, date: string, input: RecordInput): Promise<Result> {
  const admin = await requireAdmin();
  if (!isLessonDay(date) || !(await ownApp(admin, appId))) return { ok: false, message: "처리할 수 없어요." };
  const prev = (await query<{ id: string; worksheet_graded: boolean; taught_by: string | null }>(
    "select id, worksheet_graded, taught_by from lesson_records where application_id = $1 and lesson_date = $2", [appId, date]))[0];
  const taughtBy = input.taught_by || prev?.taught_by || (admin.role === "teacher" ? admin.email : null);

  // 첨삭 체크는 그날 수업한 강사만 (관리자·지점 관리자는 누구나)
  const toggled = !!prev && prev.worksheet_graded !== input.graded || (!prev && input.graded);
  if (toggled && admin.role === "teacher" && taughtBy !== admin.email) {
    return { ok: false, message: "그날 수업한 강사만 첨삭 체크를 할 수 있어요." };
  }
  const worksheets = Math.max(0, Math.floor(Number(input.worksheet_count) || 0));
  const gradedChanged = toggled;
  const rows = await query<{ id: string }>(
    `insert into lesson_records (application_id, lesson_date, activity, comment, worksheet_count, taught_by, worksheet_graded, graded_by, graded_at, recorded_by)
     values ($1, $2, $3, $4, $5, $6, $7, case when $7 then $8 end, case when $7 then now() end, $8)
     on conflict (application_id, lesson_date) do update set
       activity = excluded.activity, comment = excluded.comment, worksheet_count = excluded.worksheet_count, taught_by = excluded.taught_by,
       worksheet_graded = excluded.worksheet_graded,
       graded_by = case when $9 then (case when excluded.worksheet_graded then $8 end) else lesson_records.graded_by end,
       graded_at = case when $9 then (case when excluded.worksheet_graded then now() end) else lesson_records.graded_at end,
       recorded_by = excluded.recorded_by, updated_at = now()
     returning id`,
    [appId, date, input.activity.slice(0, 2000), input.comment.slice(0, 2000), worksheets, taughtBy, input.graded, admin.email, gradedChanged]);
  const rid = rows[0].id;
  await query("delete from lesson_books where record_id = $1", [rid]);
  let i = 0;
  for (const b of input.books) {
    const title = String(b.title ?? "").trim().slice(0, 100);
    if (!title) continue;
    await query("insert into lesson_books (record_id, title, volumes, sort_order) values ($1, $2, $3, $4)", [rid, title, Math.max(1, Math.floor(Number(b.volumes) || 1)), i++]);
  }
  return { ok: true };
}

// 같은 타임 학생 모두에게 '반 공통 활동' 적용 (이미 적힌 활동은 덮어써요)
export async function applyCommonActivity(appIds: string[], date: string, activity: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!isLessonDay(date)) return { ok: false, message: "수업일이 아니에요." };
  for (const id of appIds) {
    if (!(await ownApp(admin, id))) continue;
    await query(
      `insert into lesson_records (application_id, lesson_date, activity, recorded_by, taught_by) values ($1, $2, $3, $4, $5)
       on conflict (application_id, lesson_date) do update set activity = excluded.activity, recorded_by = excluded.recorded_by, updated_at = now()`,
      [id, date, activity.slice(0, 2000), admin.email, admin.role === "teacher" ? admin.email : null]);
  }
  return { ok: true };
}

// 첨삭 확인 목록에서 바로 체크
export async function markGraded(recordId: string): Promise<Result> {
  const admin = await requireAdmin();
  const r = (await query<{ taught_by: string | null; branch_id: string }>(
    "select lr.taught_by, a.branch_id from lesson_records lr join applications a on a.id = lr.application_id where lr.id = $1", [recordId]))[0];
  if (!r || (admin.role !== "owner" && r.branch_id !== admin.branch_id)) return { ok: false, message: "처리할 수 없어요." };
  if (admin.role === "teacher" && r.taught_by !== admin.email) return { ok: false, message: "그날 수업한 강사만 체크할 수 있어요." };
  await query("update lesson_records set worksheet_graded = true, graded_by = $2, graded_at = now() where id = $1", [recordId, admin.email]);
  return { ok: true };
}
