import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { dashboard } from "@/lib/admin-queries";
import { COURSE_CHIP, SLOT_CHIP } from "@/lib/ui";
import { triggerSheetSync } from "@/lib/sheet-trigger";
import { query } from "@/lib/db";
import Link from "next/link";

export default async function Dashboard() {
  const a = await requireAdmin();
  if (a.role === "teacher") redirect("/admin/attendance");
  triggerSheetSync(); // 시트에 못 보낸 건이 있으면 이 화면을 열 때 다시 보내요
  const rows = await dashboard(a);
  const [mk] = await query<{ pending: number; week: number }>(
    `select count(*) filter (where m.status = '요청')::int pending, count(*) filter (where m.status = '확정' and m.lesson_date >= date_trunc('week', now() at time zone 'Asia/Seoul')::date and m.lesson_date < date_trunc('week', now() at time zone 'Asia/Seoul')::date + 7)::int week
     from makeups m join applications ap on ap.id = m.application_id where ($1::uuid is null or ap.branch_id = $1)`, [a.role === "owner" ? null : a.branch_id]);
  const byBranch = Map.groupBy(rows, (r) => r.branch_name);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-pine">신청 현황</h1>
        <p className="mt-1 text-[15px] text-muted">확정 / 정원 · 대기. 정원 숫자는 관리자에게만 보여요.</p>
      </div>
      <Link href="/admin/makeups" className="card flex flex-wrap items-center gap-x-6 gap-y-1 !p-4 text-[15px]">
        <span>이번 주 확정 보강 <b>{mk.week}건</b></span>
        <span>승인 기다리는 보강 요청 <b className={mk.pending ? "text-alert" : ""}>{mk.pending}건</b></span>
        <span className="ml-auto text-sm underline">보강 관리 →</span>
      </Link>
      {[...byBranch].map(([name, list]) => (
        <section key={name}>
          <h2 className="text-lg text-pine">{name}</h2>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            {["1차", "2차"].map((code) => (
              <div key={code} className="card !p-4">
                <p><span className={`rounded-md px-3 py-0.5 font-bold ${COURSE_CHIP[code]}`}>{code}</span></p>
                <ul className="mt-2 space-y-3">
                  {list.filter((r) => r.code === code).map((r) => {
                    const ratio = r.capacity ? r.confirmed / r.capacity : 0;
                    const color = ratio >= 1 ? "bg-alert" : ratio >= 0.7 ? "bg-gold" : "bg-pine";
                    return (
                      <li key={r.label}>
                        <div className="flex items-baseline justify-between text-[15px]">
                          <span><span className={`rounded-md px-2 text-sm ${SLOT_CHIP[r.label]}`}>{r.label}</span> <span className="text-sm text-muted">{r.start_time}</span></span>
                          <span className="tabular-nums">
                            <b>{r.confirmed}</b> / {r.capacity ?? "제한 없음"} <span className="text-sm text-muted">(결제 {r.paid})</span>
                            {r.waiting > 0 && <span className="ml-2 rounded-full bg-white px-2 text-sm text-alert ring-2 ring-alert">대기 {r.waiting}</span>}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-mint">
                          <div className={`h-full ${color}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
