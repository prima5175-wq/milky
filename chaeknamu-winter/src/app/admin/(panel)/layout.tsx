import Link from "next/link";
import { logout } from "../actions";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ROLE = { owner: "원장", branch_admin: "지점 관리자", teacher: "강사" } as const;

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const a = await requireAdmin();
  const nav = a.role === "teacher"
    ? [["/admin/attendance", "출석·수업 기록"], ["/admin/worksheets", "첨삭 확인"]]
    : [["/admin", "현황"], ["/admin/applications", "신청 목록"], ["/admin/payments", "결제·확정문자"], ["/admin/attendance", "출석·수업 기록"], ["/admin/worksheets", "첨삭 확인"], ["/admin/makeups", "보강"], ...(a.role === "owner" ? [["/admin/history", "지난 방학 이력"], ["/admin/settings", "설정"]] : [])];
  return (
    <div>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 px-4 py-2">
          <span className="font-serif text-lg font-black text-pine">책나무 방특 관리</span>
          <nav className="flex gap-1 text-[15px]">
            {nav.map(([href, label]) => (
              <Link key={href} href={href} className="flex min-h-11 items-center rounded-lg px-3 hover:bg-mint">{label}</Link>
            ))}
          </nav>
          <form action={logout} className="ml-auto flex items-center gap-2 text-sm text-muted">
            <span>{ROLE[a.role]} · {a.email}</span>
            <button className="min-h-11 px-2 underline">로그아웃</button>
          </form>
        </div>
      </header>
      {/* 학부모가 보는 화면 바로가기 (새 탭) */}
      <div className="border-b border-line bg-mint">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-sm">
          <span className="font-bold text-pine">학부모 화면 보기 ↗</span>
          {[["/", "첫 화면"], ["/daechi", "대치점"], ["/dogok", "대치도곡초점"], ["/guryong", "대치구룡초점"], ["/check", "신청 조회"]].map(([href, label]) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-3 py-1 font-medium text-ink hover:bg-snow">{label}</a>
          ))}
        </div>
      </div>
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-6">{children}</main>
    </div>
  );
}
