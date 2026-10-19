import Link from "next/link";
import { notFound } from "next/navigation";
import OpenGate from "@/components/OpenGate";
import Hero from "@/components/Hero";
import ScheduleCard from "@/components/ScheduleCard";
import PolicyBox from "@/components/PolicyBox";
import { getBranch, getCurriculum, getSetting, getYoutube } from "@/lib/repo";
import YoutubeCard from "@/components/YoutubeCard";
import ContactLink from "@/components/ContactLink";
import { Icon, SectionTitle, Wave } from "@/components/deco";
import { SLOT_CHIP } from "@/lib/ui";
import { kDate, slotText, won } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BranchPage({ params }: { params: Promise<{ branch: string }> }) {
  const { branch: slug } = await params;
  const b = await getBranch(slug);
  if (!b) notFound();
  const CURRICULUM = await getCurriculum();
  const curriculumNote = await getSetting("curriculum_note");
  const confirmNotice = await getSetting("confirm_notice");
  const yt = await getYoutube();
  const [s1, s2] = b.sessions;
  const totalLessons = s1.lesson_count + s2.lesson_count;

  return (
    <main className="mx-auto max-w-xl px-4 pb-32 pt-8">
      <Link href="/" className="text-sm text-muted">← 처음으로</Link>
      <div className="mt-3"><Hero kicker="2027 겨울방학특강 · 몰입독서반" title={b.name} sub="아이를 바꾸는 건 ‘많이’가 아니라 ‘매일’이에요." /></div>

      <div className="mt-6"><ScheduleCard b={b} confirmNotice={confirmNotice} /></div>

      <SectionTitle no="01" title="일정과 수강료" icon="ticket" />
      <div className="mt-2 space-y-3">
        {b.sessions.map((s) => (
          <div key={s.code} className="card flex items-stretch gap-4 !p-0">
            <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-l-[20px] bg-pine py-4 text-white">
              <span className="font-serif text-[26px] font-bold leading-none">{s.code}</span>
              <span className="mt-1 text-[12px] text-white/75">{s.lesson_count}회</span>
            </div>
            <div className="flex-1 border-l border-dashed border-gold/70 py-4 pr-4 pl-4">
              <p className="text-[14px] text-muted">{kDate(s.start_date)} ~ {kDate(s.end_date)}</p>
              <p className="mt-0.5 font-serif text-[24px] font-bold text-pine">{won(s.price)}</p>
            </div>
          </div>
        ))}
        <div className="card relative flex items-stretch gap-4 overflow-hidden !border-gold !p-0">
          <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-l-[20px] bg-ink py-4 text-gold">
            <span className="font-serif text-[22px] font-bold leading-none">1·2차</span>
            <span className="mt-1 text-[12px] text-white/70">{totalLessons}회</span>
          </div>
          <div className="flex-1 border-l border-dashed border-gold/70 py-4 pr-4 pl-4">
            <p className="text-[14px] text-muted">두 기간을 한 번에 신청해요</p>
            <p className="mt-0.5 font-serif text-[24px] font-bold text-pine">{won(b.bundle_price)}</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[15px] text-muted">
        방학특강은 월~금만 진행해요. 2/6(토)~2/9(화)는 설 연휴로 쉬어요.
      </p>

      <SectionTitle no="02" title="수업 시간표" icon="clock" />
      <div className="card mt-2">
        <ul className="relative space-y-3 pl-1 text-[15px] before:absolute before:bottom-2 before:left-[29px] before:top-2 before:w-px before:bg-gold/50">
          {s1.slots.map((t) => (
            <li key={t.id} className="relative flex items-center gap-3">
              <span className={`z-10 grid size-[30px] shrink-0 place-items-center rounded-full text-[12px] font-bold ring-4 ring-white ${SLOT_CHIP[t.label]}`}>{t.label.replace("부", "")}</span>
              <span>{slotText(t)}</span>
            </li>
          ))}
        </ul>
        {b.regular_hours && (
          <p className="mt-3 rounded-xl bg-mint p-3 text-[15px]">
            <b>방학에도 정규 수업이 있어요.</b> 정규 수업은 평일 {b.regular_hours}에 운영돼요. (위 특강 시간과 별개예요)
          </p>
        )}
      </div>

      {b.notice && (
        <>
          <SectionTitle no="03" title="지점 안내" icon="bell" />
          <div className="card mt-2 text-[15px]">{b.notice}</div>
        </>
      )}

      <SectionTitle no="04" title="학년별 수업" icon="book" />
      <div className="mt-2 space-y-3">
        {CURRICULUM.map((c) => (
          <div key={c.group} className="card">
            <p className="flex items-center gap-2 font-serif text-[18px] font-bold text-pine"><span className="grid size-7 place-items-center rounded-full bg-mint ring-1 ring-gold/60"><Icon name="sparkle" className="size-4" /></span>{c.group}</p>
            <ul className="mt-3 space-y-1.5 text-[15px]">
              {c.items.map((i) => <li key={i} className="flex gap-2"><span aria-hidden className="mt-2.5 size-1.5 shrink-0 rotate-45 bg-gold" />{i}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[15px] text-muted">{curriculumNote}</p>

      <div className="mt-8"><YoutubeCard yt={yt} /></div>

      <SectionTitle no="05" title="신청 전 꼭 확인해 주세요" icon="check" />
      <div className="card mt-2 border-gold">
        <PolicyBox refundDeadline={b.refund_deadline} makeupLimit={b.makeup_limit} makeupStart={b.makeup_start_date} />
      </div>

      <Wave className="mt-10" />
      {b.contact_url && (
        <p className="mt-6 text-center text-[15px]">
          궁금한 점은 전화로 문의해 주세요 · <ContactLink value={b.contact_url} />
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-xl">
          <OpenGate slug={b.slug} href={`/${b.slug}/apply`} phase={b.phase} open_at={b.open_at} priority_end_at={b.priority_end_at} general_open_at={b.general_open_at} next_change_at={b.next_change_at} server_now={b.server_now} />
        </div>
      </div>
    </main>
  );
}
