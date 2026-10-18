import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import AttendanceBoard from "@/components/admin/AttendanceBoard";
import { branchSlotLabels, staffOf, studentsFor } from "@/lib/lesson-queries";
import { dayReason, isLessonDay, todayKst } from "@/lib/lessons";
import { SLOT_CHIP } from "@/lib/ui";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ branch?: string; date?: string; slot?: string }> }) {
  const a = await requireAdmin();
  const sp = await searchParams;
  const branches = await query<{ id: string; slug: string; name: string }>("select id, slug, name from branches order by sort_order");
  const branch = a.role === "owner" ? branches.find((b) => b.slug === sp.branch) ?? branches[0] : branches.find((b) => b.id === a.branch_id)!;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : todayKst();
  const labels = (await branchSlotLabels(branch.id)).map((l) => l.label);
  const slot = labels.includes(sp.slot ?? "") ? sp.slot! : labels[0];
  const lesson = isLessonDay(date);
  const [students, staff] = await Promise.all([lesson ? studentsFor(branch.id, date, slot) : Promise.resolve([]), staffOf(branch.id)]);
  const q = (o: Record<string, string>) => "?" + new URLSearchParams({ branch: branch.slug, date, slot, ...o }).toString();

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <h1 className="text-2xl font-black text-pine">출석·수업 기록</h1>
        {a.role !== "teacher" && <a href={`/admin/records-export?branch=${branch.slug}`} className="text-sm underline">전체 기록 엑셀 받기</a>}
      </div>
      <form className="card flex flex-wrap items-end gap-2 !p-3">
        {a.role === "owner" && (
          <select name="branch" defaultValue={branch.slug} className="input !min-h-12 !w-auto">{branches.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}</select>
        )}
        <input type="date" name="date" defaultValue={date} className="input !min-h-12 !w-auto" />
        <input type="hidden" name="slot" value={slot} />
        <button className="btn">날짜 이동</button>
        <Link href={q({ date: todayKst() })} className="flex min-h-12 items-center px-3 text-sm underline">오늘</Link>
      </form>
      <div className="flex flex-wrap gap-2">
        {labels.map((l) => (
          <Link key={l} href={q({ slot: l })} className={`flex min-h-12 min-w-20 items-center justify-center rounded-xl px-4 text-lg font-bold ${SLOT_CHIP[l]} ${l === slot ? "ring-4 ring-ink/40" : "opacity-60"}`}>{l}</Link>
        ))}
      </div>
      {!lesson ? (
        <p className="card text-[15px]">{dayReason(date)} 다른 날짜를 골라 주세요.</p>
      ) : (
        <AttendanceBoard key={`${branch.id}${date}${slot}`} students={students} date={date} staff={staff} me={{ email: a.email, role: a.role }} />
      )}
    </div>
  );
}
