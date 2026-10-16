import ExcelJS from "exceljs";
import { getAdmin } from "@/lib/auth";
import { listApplications, type Filters } from "@/lib/admin-queries";
import { query } from "@/lib/db";

// 현재 검색 조건 그대로 엑셀(.xlsx)로 내려받기. 지점별로 시트를 나눠요.
export async function GET(req: Request) {
  const a = await getAdmin();
  if (!a || a.role === "teacher") return new Response("권한이 없어요.", { status: 403 });
  const u = new URL(req.url).searchParams;
  const f: Filters = Object.fromEntries(["branch", "course", "slot", "status", "grade", "q"].map((k) => [k, u.get(k) ?? ""]));
  const [rows, fields] = await Promise.all([
    listApplications(a, f, 5000),
    query<{ key: string; label: string }>("select key, label from form_fields order by sort_order, key"),
  ]);
  const wb = new ExcelJS.Workbook();
  const head = ["신청일시", "지점", "학생 이름", "학년", "학교", "보호자 연락처", "재원 구분", "신청 과정", "1차 타임", "2차 타임", "수강료", "상태", "대기 순번", "요청사항", "관리자 메모", "기존 수강권", "수강 종료일", "지난 방학 이력", ...fields.map((x) => x.label), "신청 ID"];
  const byBranch = Map.groupBy(rows, (r) => r.branch_name);
  if (byBranch.size === 0) wb.addWorksheet("신청").addRow(head);
  for (const [name, list] of byBranch) {
    const ws = wb.addWorksheet(name.replace(/^\d관 /, "").replace(/[\\/*?:[\]]/g, "").slice(0, 30));
    ws.addRow(head).font = { bold: true };
    for (const r of list) {
      const p = r.guardian_phone;
      ws.addRow([r.created_kst, r.branch_name, r.student_name, r.grade, r.school, `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`, r.enrollment_type, r.course, r.slot1 ?? "", r.slot2 ?? "", r.price, r.status, r.waitlist_order ?? "", r.memo ?? "", r.admin_note ?? "", r.pass_note ?? "", r.pass_end ?? "", (r.history ?? []).map((h) => `${h.term} ${h.outcome}`).join(", "), ...fields.map((x) => { const v = r.extra?.[x.key]; return v === true ? "예" : v ?? ""; }), r.id]);
    }
    ws.columns.forEach((c) => (c.width = 14));
    ws.views = [{ state: "frozen", ySplit: 1 }];
  }
  const buf = await wb.xlsx.writeBuffer();
  const day = new Date().toISOString().slice(0, 10);
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`방특신청_${day}.xlsx`)}`,
    },
  });
}
