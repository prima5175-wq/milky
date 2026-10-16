import Link from "next/link";
import { listBranches } from "@/lib/repo";
import { kDate } from "@/lib/format";
import { LETTER } from "@/lib/texts";
import Hero from "@/components/Hero";

export const dynamic = "force-dynamic";

export default async function Home() {
  const BRANCHES = await listBranches();
  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-10">
      <Hero kicker="책나무 강남서초지사 · 2027 겨울방학특강" title="몰입독서반" />

      <section className="card mt-6 space-y-3 text-[16px] leading-[1.85]">
        {LETTER.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <p className="text-right font-bold text-pine">— 책나무 강남서초지사 원장 드림</p>
      </section>

      <h2 className="mt-8 text-xl text-pine">지점을 골라 주세요</h2>
      <div className="mt-3 space-y-3">
        {BRANCHES.map((b) => (
          <section key={b.slug} className="card">
            <h3 className="text-lg text-pine">{b.name}</h3>
            <ul className="mt-2 space-y-0.5 text-[15px] text-muted">
              {b.sessions.map((s) => (
                <li key={s.code}>
                  {s.code} {kDate(s.start_date)} ~ {kDate(s.end_date)}
                </li>
              ))}
            </ul>
            <Link href={`/${b.slug}`} className="btn mt-4 w-full">
              안내 보기
            </Link>
          </section>
        ))}
      </div>

      <p className="mt-6 text-center text-[15px]">
        이미 신청하셨나요? <Link href="/check" className="font-bold text-pine underline">신청 조회</Link>
      </p>

      <section className="mt-10 border-t border-line pt-4 text-sm text-muted">
        <p>방학 독서에 대한 제 생각을 영상으로도 나눴어요. (영상 링크는 준비 중이에요)</p>
        <p className="mt-3 font-bold text-ink">문의</p>
        <ul className="mt-1 space-y-0.5">
          {BRANCHES.map((b) => (
            <li key={b.slug}>
              {b.name}{" "}
              {b.contact_url ? (
                <a href={b.contact_url} className="text-pine underline">문의하기</a>
              ) : (
                <span>(준비 중)</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
