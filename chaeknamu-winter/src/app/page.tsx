import Link from "next/link";
import { getSetting, getYoutube, listBranches } from "@/lib/repo";
import YoutubeCard from "@/components/YoutubeCard";
import ContactLink from "@/components/ContactLink";
import ScheduleCard from "@/components/ScheduleCard";
import { kDate } from "@/lib/format";
import { LETTER } from "@/lib/texts";
import Hero from "@/components/Hero";
import { Icon, KeyFacts, SectionTitle, Wave } from "@/components/deco";

export const dynamic = "force-dynamic";

export default async function Home() {
  const BRANCHES = await listBranches();
  const confirmNotice = await getSetting("confirm_notice");
  const yt = await getYoutube();
  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-10">
      <Hero kicker="책나무 강남서초지사 · 2027 겨울방학특강" title="몰입독서반" sub="방학의 오전을 책으로 함께 시작해요." />

      <KeyFacts items={[{ big: "30쪽", small: "하루 읽기" }, { big: "1,000쪽+", small: "방학 내내" }, { big: "월~금", small: "매일 아침" }]} />

      {BRANCHES[0] && <div className="mt-4"><ScheduleCard b={BRANCHES[0]} confirmNotice={confirmNotice} /></div>}

      <section className="card relative mt-4 space-y-3 overflow-hidden text-[16px] leading-[1.85]">
        <span aria-hidden className="pointer-events-none absolute -right-2 -top-6 font-serif text-[120px] leading-none text-gold/25">”</span>
        <p className="relative flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.2em] text-gold"><Icon name="pen" className="size-4" />원장 레터</p>
        {LETTER.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <p className="text-right font-bold text-pine">— 책나무 강남서초지사 원장 드림</p>
      </section>

      <div className="mt-4"><YoutubeCard yt={yt} /></div>

      <SectionTitle no="BRANCH" title="지점을 골라 주세요" icon="cap" sub="가까운 지점의 안내와 신청 화면으로 이동해요." />
      <div className="mt-3 space-y-3">
        {BRANCHES.map((b) => (
          <section key={b.slug} data-branch={b.slug} className="card relative overflow-hidden !p-0">
            <div className="relative bg-[linear-gradient(135deg,var(--accent),var(--accent-d))] px-5 py-4 text-white">
              <span aria-hidden className="absolute inset-2 rounded-xl border border-gold-l/30" />
              <span aria-hidden className="absolute -right-6 top-1/2 size-24 -translate-y-1/2 rotate-45 border border-gold-l/50" />
              <span aria-hidden className="absolute right-1 top-1/2 size-12 -translate-y-1/2 rotate-45 bg-gold-l/25" />
              <p className="relative text-[11px] font-display uppercase tracking-[0.3em] text-gold-l">{b.name.match(/^\d관/)?.[0] ?? ""} BRANCH</p>
              <h3 className="relative mt-0.5 text-[20px] text-white">{b.name.replace(/^\d관 /, "")}</h3>
            </div>
            <div className="p-5">
              <ul className="space-y-2 text-[15px]">
                {b.sessions.map((s) => (
                  <li key={s.code} className="flex items-center gap-3">
                    <span className="rounded-full bg-mint px-2.5 py-0.5 text-[13px] font-bold text-pine">{s.code}</span>
                    <span className="text-muted">{kDate(s.start_date)} ~ {kDate(s.end_date)}</span>
                  </li>
                ))}
              </ul>
              <Link href={`/${b.slug}`} className="btn mt-4 w-full">안내 보기</Link>
            </div>
          </section>
        ))}
      </div>

      <p className="mt-6 text-center text-[15px]">
        이미 신청하셨나요? <Link href="/check" className="font-bold text-pine underline">신청 조회</Link>
      </p>

      <Wave className="mt-10" />
      <section className="border-t border-line pt-4 text-sm text-muted">
        <p className="mt-3 font-bold text-ink">문의</p>
        <ul className="mt-1 space-y-0.5">
          {BRANCHES.map((b) => (
            <li key={b.slug}>
              {b.name}{" "}
              {b.contact_url ? (
                <ContactLink value={b.contact_url} className="text-pine underline" />
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
