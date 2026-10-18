import ExcelJS from "exceljs";
import { getAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

// 출석·수업 기록 엑셀 (기간 선택: ?from=2027-01-04&to=2027-02-26)
export async function GET(req: Request) {
  const a = await getAdmin();
  if (!a || a.role === "teacher") return new Response("권한이 없어요.", { status: 403 });
  const u = new URL(req.url).searchParams;
  const rows = await query<Record<string, string | number | null>>(
    `select to_char(x.d, 'YYYY-MM-DD') 날짜, b.name 지점, ap.student_name 학생, ap.grade 학년, att.status 출석, coalesce(lr.activity, '') 활동, coalesce(lr.comment, '') 코멘트,
       coalesce(lr.worksheet_count, 0) 활동지, case when lr.worksheet_graded then '완료' when coalesce(lr.worksheet_count, 0) > 0 then '전' else '' end 첨삭,
       (select coalesce(display_name, email) from admin_users where email = lr.taught_by) 수업강사,
       coalesce((select string_agg(bk.title || ' ' || bk.volumes || '권', ', ' order by bk.sort_order) from lesson_books bk where bk.record_id = lr.id), '') 읽은책
     from (select application_id, lesson_date d from attendance union select application_id, lesson_date from lesson_records) x
     join applications ap on ap.id = x.application_id join branches b on b.id = ap.branch_id
     left join attendance att on att.application_id = x.application_id and att.lesson_date = x.d
     left join lesson_records lr on lr.application_id = x.application_id and lr.lesson_date = x.d
     where ($1::uuid is null or ap.branch_id = $1) and x.d >= coalesce(nullif($2, '')::date, '2000-01-01') and x.d <= coalesce(nullif($3, '')::date, '2100-01-01')
     order by x.d, b.sort_order, ap.grade, ap.student_name`,
    [a.role === "owner" ? null : a.branch_id, u.get("from") ?? "", u.get("to") ?? ""]);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("수업 기록");
  const head = ["날짜", "지점", "학생", "학년", "출석", "활동", "코멘트", "활동지", "첨삭", "수업강사", "읽은책"];
  ws.addRow(head).font = { bold: true };
  for (const r of rows) ws.addRow(head.map((h) => r[h] ?? ""));
  ws.columns.forEach((c) => (c.width = 16));
  ws.views = [{ state: "frozen", ySplit: 1 }];
  return new Response((await wb.xlsx.writeBuffer()) as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("수업기록.xlsx")}`,
    },
  });
}
