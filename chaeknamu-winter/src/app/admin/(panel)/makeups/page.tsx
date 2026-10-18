import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { addDays, mondayOf } from "@/lib/makeups";
import { todayKst } from "@/lib/lessons";
import { GRADE_PILL } from "@/lib/ui";
import CopyButton from "@/components/admin/CopyButton";
import { decideMakeup, registerMakeup } from "../../makeup-actions";

type Row = { id: string; d: string; time_note: string; app_id: string; student_name: string; grade: number; branch_name: string; lim: number; used: number };
const SQL = (status: string, range: boolean) => `
  select m.id, to_char(m.lesson_date, 'MM/DD') d, m.time_note, a.id app_id, a.student_name, a.grade, b.name branch_name, b.makeup_limit lim,
    (select count(*)::int from makeups x where x.application_id = a.id and x.status in ('요청', '확정')) used
  from makeups m join applications a on a.id = m.application_id join branches b on b.id = a.branch_id
  where m.status = '${status}' ${range ? "and m.lesson_date between $2::date and $3::date" : ""} and ($1::uuid is null or a.branch_id = $1)
  order by a.grade, a.student_name, m.lesson_date`;

export default async function Makeups({ searchParams }: { searchParams: Promise<{ week?: string; msg?: string }> }) {
  const a = await requireAdmin(["owner", "branch_admin"]);
  const sp = await searchParams;
  const mon = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(sp.week ?? "") ? sp.week! : todayKst());
  const fri = addDays(mon, 4);
  const scope = a.role === "owner" ? null : a.branch_id;
  const [pending, weekly, apps] = await Promise.all([
    query<Row>(SQL("요청", false), [scope]),
    query<Row>(SQL("확정", true), [scope, mon, fri]),
    query<{ id: string; student_name: string; grade: number; branch_name: string }>(
      `select a.id, a.student_name, a.grade, b.name branch_name from applications a join branches b on b.id = a.branch_id
       where a.status = '확정' and ($1::uuid is null or a.branch_id = $1) order by b.sort_order, a.grade, a.student_name`, [scope]),
  ]);
  const byStudent = Map.groupBy(weekly, (r) => r.app_id);
  const msgFor = (rows: Row[]) =>
    `[책나무] ${rows[0].student_name} 학생 보강 안내\n이번 주 보강: ${rows.map((r) => `${r.d}${r.time_note ? " " + r.time_note : ""}`).join(", ")}\n지금까지 보강 ${rows[0].used}회 사용, 남은 횟수 ${Math.max(0, rows[0].lim - rows[0].used)}회예요.`;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black text-pine">보강 관리</h1>
      {sp.msg && <p role="status" className="rounded-xl bg-mint p-3 text-[15px]">{sp.msg}</p>}

      <section className="space-y-2">
        <h2 className="text-xl text-pine">승인 기다리는 요청 <span className="text-base text-muted">{pending.length}건</span></h2>
        <ul className="divide-y divide-line rounded-[18px] border border-line bg-white">
          {pending.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-[15px]">
              <b>{r.student_name}</b><span className={`rounded-full px-2 text-sm font-bold ${GRADE_PILL[r.grade]}`}>{r.grade}학년</span>
              <span>{r.d} {r.time_note}</span><span className="text-sm text-muted">사용 {r.used}/{r.lim}회</span>
              <div className="ml-auto flex gap-2">
                <form action={decideMakeup}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="to" value="확정" /><input type="hidden" name="week" value={mon} /><button className="btn !min-h-11">승인</button></form>
                <form action={decideMakeup}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="to" value="거절" /><input type="hidden" name="week" value={mon} /><button className="min-h-11 rounded-xl border border-line px-4 text-alert">거절</button></form>
              </div>
            </li>
          ))}
          {pending.length === 0 && <li className="px-4 py-5 text-center text-muted">기다리는 요청이 없어요.</li>}
        </ul>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl text-pine">주간 보강 확인</h2>
          <Link href={`/admin/makeups?week=${addDays(mon, -7)}`} className="min-h-11 rounded-xl border border-line px-3 leading-[44px]">← 지난주</Link>
          <span className="font-bold tabular-nums">{mon.slice(5)} ~ {fri.slice(5)}</span>
          <Link href={`/admin/makeups?week=${addDays(mon, 7)}`} className="min-h-11 rounded-xl border border-line px-3 leading-[44px]">다음주 →</Link>
        </div>
        <p className="text-sm text-muted">이번 주에 보강이 확정된 학생이에요. 학부모께 안내해야 할 대상이니, 문구를 복사해서 문자로 보내 주세요. (문자는 자동으로 보내지 않아요.)</p>
        <ul className="divide-y divide-line rounded-[18px] border border-line bg-white">
          {[...byStudent.values()].map((rows) => (
            <li key={rows[0].app_id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-[15px]">
              <b>{rows[0].student_name}</b><span className={`rounded-full px-2 text-sm font-bold ${GRADE_PILL[rows[0].grade]}`}>{rows[0].grade}학년</span>
              <span>{rows.map((r) => `${r.d}${r.time_note ? " " + r.time_note : ""}`).join(", ")}</span>
              <span className="rounded bg-ink px-2 text-sm text-white">누적 {rows[0].used}/{rows[0].lim}회 · 남은 {Math.max(0, rows[0].lim - rows[0].used)}회</span>
              <span className="ml-auto"><CopyButton text={msgFor(rows)} /></span>
            </li>
          ))}
          {byStudent.size === 0 && <li className="px-4 py-5 text-center text-muted">이번 주 확정된 보강이 없어요.</li>}
        </ul>
      </section>

      <section>
        <h2 className="text-xl text-pine">보강 등록 (문자로 받은 요청)</h2>
        <form action={registerMakeup} className="card mt-2 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="week" value={mon} />
          <div className="sm:col-span-2"><label className="label" htmlFor="app">학생</label>
            <select id="app" name="app_id" className="input" required>
              <option value="">선택해 주세요</option>
              {apps.map((s) => <option key={s.id} value={s.id}>{s.student_name} ({s.grade}학년 · {s.branch_name.replace(/^\d관 /, "")})</option>)}
            </select></div>
          <div><label className="label" htmlFor="date">보강 날짜</label><input id="date" type="date" name="date" className="input" required /></div>
          <div><label className="label" htmlFor="tn">시간 (예: 3부 12:30)</label><input id="tn" name="time_note" className="input" /></div>
          <p className="text-sm text-muted sm:col-span-2">주말·설 연휴, 신청하신 차수 기간 밖, 횟수 한도를 넘는 날짜는 등록되지 않아요.</p>
          <button className="btn sm:col-span-2">보강 등록</button>
        </form>
      </section>
    </div>
  );
}
