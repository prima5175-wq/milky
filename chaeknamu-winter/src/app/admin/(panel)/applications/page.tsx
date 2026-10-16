import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listApplications, siblingMap, type Filters } from "@/lib/admin-queries";
import { query } from "@/lib/db";
import MaskedPhone from "@/components/admin/MaskedPhone";
import { won } from "@/lib/format";
import { COURSE_CHIP, ENROLL_LABEL, GRADE_PILL, GRADE_ROW, SLOT_CHIP, STATUS_BADGE } from "@/lib/ui";

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<Filters & { sort?: string }> }) {
  const a = await requireAdmin(["owner", "branch_admin"]);
  const f = await searchParams;
  const [rows, branches] = await Promise.all([
    listApplications(a, f),
    query<{ slug: string; name: string }>("select slug, name from branches order by sort_order"),
  ]);
  const sib = siblingMap(rows);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
  const sel = "input !min-h-10 !w-auto";
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <h1 className="text-2xl font-black text-pine">신청 목록 <span className="text-base font-normal text-muted">{rows.length}건</span></h1>
        <a href={`/admin/export?${qs}`} className="btn !min-h-10 text-[15px]">엑셀 다운로드</a>
      </div>

      <form className="card flex flex-wrap items-end gap-2 !p-3">
        {a.role === "owner" && (
          <select name="branch" defaultValue={f.branch ?? ""} className={sel}>
            <option value="">전체 지점</option>
            {branches.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
          </select>
        )}
        <select name="course" defaultValue={f.course ?? ""} className={sel}><option value="">전체 차수</option><option>1차</option><option>2차</option></select>
        <select name="slot" defaultValue={f.slot ?? ""} className={sel}><option value="">전체 타임</option>{["1부", "2부", "3부", "4부", "5부"].map((s) => <option key={s}>{s}</option>)}</select>
        <select name="status" defaultValue={f.status ?? ""} className={sel}><option value="">전체 상태</option>{["확정", "대기", "취소", "환불"].map((s) => <option key={s}>{s}</option>)}</select>
        <select name="grade" defaultValue={f.grade ?? ""} className={sel}><option value="">전체 학년</option>{[1, 2, 3, 4, 5, 6].map((g) => <option key={g} value={g}>{g}학년</option>)}</select>
        <select name="sort" defaultValue={f.sort ?? ""} className={sel}><option value="">학년 순 (형제 묶음)</option><option value="time">신청 순</option></select>
        <input name="q" defaultValue={f.q ?? ""} placeholder="이름 또는 연락처" className={`${sel} min-w-40 flex-1`} />
        <button className="btn !min-h-10">검색</button>
        <Link href="/admin/applications" className="flex min-h-10 items-center px-2 text-sm text-muted underline">초기화</Link>
      </form>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span className="flex gap-1">{[1, 2, 3, 4, 5, 6].map((g) => <span key={g} className={`rounded-full px-2 ${GRADE_PILL[g]}`}>{g}학년</span>)}</span>
        <span className="flex gap-1">{["1부", "2부", "3부", "4부", "5부"].map((t) => <span key={t} className={`rounded-md px-2 ${SLOT_CHIP[t]}`}>{t}</span>)}</span>
        <span className="flex gap-1">{["1차", "2차"].map((c) => <span key={c} className={`rounded-md px-2 font-bold ${COURSE_CHIP[c]}`}>{c}</span>)}</span>
      </div>

      <div className="overflow-x-auto rounded-[18px] border border-line bg-white">
        <table className="w-full min-w-[820px] text-left text-[15px]">
          <thead className="bg-mint text-sm text-muted">
            <tr>{["학생", "지점", "과정·타임", "연락처", "금액", "상태", "신청"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const newGroup = i > 0 && rows[i - 1].guardian_phone !== r.guardian_phone;
              const sibs = sib.get(r.guardian_phone)!;
              return (
                <tr key={r.id} className={`align-top ${GRADE_ROW[r.grade]} ${newGroup && f.sort !== "time" ? "border-t-4 border-t-white" : "border-t border-t-white/70"}`}>
                  <td className="px-3 py-2">
                    <Link href={`/admin/applications/${r.id}`} className="font-bold text-pine underline">{r.student_name}</Link>{" "}
                    <span className={`rounded-full px-2 text-sm font-bold ${GRADE_PILL[r.grade]}`}>{r.grade}학년</span>
                    <div className="text-sm text-muted">{r.school}</div>
                    <div className="mt-1 flex flex-wrap gap-1 text-xs">
                      {r.enrollment_type !== "신규" && <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-ink/30">{ENROLL_LABEL[r.enrollment_type]}</span>}
                      {sibs.size > 1 && <span className="rounded bg-ink px-1.5 py-0.5 text-white">형제·자매 {sibs.size}명</span>}
                      {r.history?.map((h) => (
                        <span key={h.term + h.outcome} className={`rounded px-1.5 py-0.5 ${h.outcome === "취소" ? "bg-alert text-white" : "bg-pine text-white"}`}>{h.term} {h.outcome}</span>
                      ))}
                      {r.pass_end && <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-pine">수강권 ~{r.pass_end.slice(5)}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm">{r.branch_name.replace(/^\d관 /, "")}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {r.slot1 && <><span className={`rounded-md px-2 text-sm font-bold ${COURSE_CHIP["1차"]}`}>1차</span><span className={`rounded-md px-2 text-sm ${SLOT_CHIP[r.slot1]}`}>{r.slot1}</span></>}
                      {r.slot2 && <><span className={`ml-1 rounded-md px-2 text-sm font-bold ${COURSE_CHIP["2차"]}`}>2차</span><span className={`rounded-md px-2 text-sm ${SLOT_CHIP[r.slot2]}`}>{r.slot2}</span></>}
                    </div>
                  </td>
                  <td className="px-3 py-2"><MaskedPhone phone={r.guardian_phone} /></td>
                  <td className="whitespace-nowrap px-3 py-2">{won(r.price)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                    {r.waitlist_order && <span className="ml-1 text-sm text-muted">{r.waitlist_order}번</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-sm text-muted">{r.created_kst}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">조건에 맞는 신청이 없어요.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
