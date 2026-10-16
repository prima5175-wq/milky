import { requireAdmin } from "@/lib/auth";

export default async function AttendancePage() {
  await requireAdmin();
  return (
    <div className="card">
      <h1 className="text-xl text-pine">출석·수업 기록</h1>
      <p className="mt-2 text-[15px] text-muted">방학특강 시작 전에 열릴 예정이에요. (학생별 출석, 당일 활동, 코멘트, 활동지 개수, 읽은 책)</p>
    </div>
  );
}
