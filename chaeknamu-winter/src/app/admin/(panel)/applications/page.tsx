import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listApplications, type Filters } from "@/lib/admin-queries";
import { query } from "@/lib/db";
import MaskedPhone from "@/components/admin/MaskedPhone";
import { won } from "@/lib/format";

const BADGE: Record<string, string> = { 확정: "bg-pine text-white", 대기: "bg-gold text-ink", 취소: "bg-line text-muted", 환불: "bg-line text-muted" };

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const a = await requireAdmin(["owner", "branch_admin"]);
  const f = await searchParams;
  const [rows, branches] = await Promise.all([
    listApplications(a, f),
    query<{ slug: string; name: string }>("select slug, name from branches order by sort_order"),
  ]);
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
        <input name="q" defaultValue={f.q ?? ""} placeholder="이름 또는 연락처" className={`${sel} min-w-40 flex-1`} />
        <button className="btn !min-h-10">검색</button>
        <Link href="/admin/applications" className="flex min-h-10 items-center px-2 text-sm text-muted underline">초기화</Link>
      </form>

      <div className="overflow-x-auto rounded-[18px] border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-[15px]">
          <thead className="bg-mint text-sm text-muted">
            <tr>{["신청", "지점", "학생", "과정·타임", "연락처", "금액", "상태"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line align-top">
                <td className="whitespace-nowrap px-3 py-2 text-sm text-muted">{r.created_kst}</td>
                <td className="px-3 py-2 text-sm">{r.branch_name.replace(/^\d관 /, "")}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/applications/${r.id}`} className="font-bold text-pine underline">{r.student_name}</Link>
                  <div className="text-sm text-muted">{r.grade}학년 · {r.school}</div>
                </td>
                <td className="px-3 py-2">{r.course}<div className="text-sm text-muted">{[r.slot1 && `1차 ${r.slot1}`, r.slot2 && `2차 ${r.slot2}`].filter(Boolean).join(" · ")}</div></td>
                <td className="px-3 py-2"><MaskedPhone phone={r.guardian_phone} /></td>
                <td className="whitespace-nowrap px-3 py-2">{won(r.price)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${BADGE[r.status]}`}>{r.status}</span>
                  {r.waitlist_order && <span className="ml-1 text-sm text-muted">{r.waitlist_order}번</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">조건에 맞는 신청이 없어요.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
