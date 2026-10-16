import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ungraded } from "@/lib/lesson-queries";
import WorksheetList from "@/components/admin/WorksheetList";

export default async function Worksheets() {
  const a = await requireAdmin();
  const rows = await ungraded(a);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-pine">첨삭 확인 <span className="text-base font-normal text-muted">{rows.length}건 남음</span></h1>
      <p className="text-[15px] text-muted">활동지를 낸 날 중 아직 첨삭 체크가 안 된 기록이에요. {a.role === "teacher" ? "내가 수업한 날만 보여요." : "수업한 강사별로 확인할 수 있어요."}</p>
      <WorksheetList rows={rows} canAll={a.role !== "teacher"} me={a.email} />
      <Link href="/admin/attendance" className="text-sm underline">← 출석 화면으로</Link>
    </div>
  );
}
