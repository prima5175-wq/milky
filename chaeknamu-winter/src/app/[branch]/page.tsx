import Link from "next/link";
import { notFound } from "next/navigation";
import OpenGate from "@/components/OpenGate";
import PolicyBox from "@/components/PolicyBox";
import { CURRICULUM, getBranch } from "@/lib/mock";
import { kDate, slotText, won } from "@/lib/format";

export default async function BranchPage({ params }: { params: Promise<{ branch: string }> }) {
  const { branch: slug } = await params;
  const b = getBranch(slug);
  if (!b) notFound();
  const [s1, s2] = b.sessions;
  const totalLessons = s1.lesson_count + s2.lesson_count;

  return (
    <main className="mx-auto max-w-xl px-4 pb-32 pt-8">
      <Link href="/" className="text-sm text-muted">← 처음으로</Link>
      <p className="mt-3 text-sm text-muted">2027 겨울방학특강 · 몰입독서반</p>
      <h1 className="mt-1 text-3xl font-black text-pine">{b.name}</h1>
      <div className="mt-3 h-0.5 w-12 bg-gold" />

      <h2 className="mt-8 text-lg text-pine">일정과 수강료</h2>
      <div className="mt-2 space-y-3">
        {b.sessions.map((s) => (
          <div key={s.code} className="card">
            <p className="font-bold">{s.code}</p>
            <p className="text-[15px] text-muted">{kDate(s.start_date)} ~ {kDate(s.end_date)} · {s.lesson_count}회</p>
            <p className="mt-1 text-xl font-bold text-pine">{won(s.price)}</p>
          </div>
        ))}
        <div className="card border-gold">
          <p className="font-bold">1·2차 모두</p>
          <p className="text-[15px] text-muted">총 {totalLessons}회</p>
          <p className="mt-1 text-xl font-bold text-pine">{won(b.bundle_price)}</p>
        </div>
      </div>
      <p className="mt-3 text-[15px] text-muted">
        방학특강은 월~금만 진행해요. 2/6(토)~2/9(화)는 설 연휴로 쉬어요.
      </p>

      <h2 className="mt-8 text-lg text-pine">수업 시간표</h2>
      <div className="card mt-2">
        <ul className="divide-y divide-line text-[15px]">
          {s1.slots.map((t) => (
            <li key={t.id} className="py-2">{slotText(t)}</li>
          ))}
        </ul>
      </div>

      {b.notice && (
        <>
          <h2 className="mt-8 text-lg text-pine">지점 안내</h2>
          <div className="card mt-2 text-[15px]">{b.notice}</div>
        </>
      )}

      <h2 className="mt-8 text-lg text-pine">학년별 수업</h2>
      <div className="mt-2 space-y-3">
        {CURRICULUM.map((c) => (
          <div key={c.group} className="card">
            <p className="font-bold">{c.group}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[15px]">
              {c.items.map((i) => <li key={i}>{i}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[15px] text-muted">모든 수업은 개인 진도와 상담에 따라 개별 시간표로 진행돼요.</p>

      <h2 className="mt-8 text-lg text-pine">신청 전 꼭 확인해 주세요</h2>
      <div className="card mt-2 border-gold">
        <PolicyBox refundDeadline={b.refund_deadline} makeupLimit={b.makeup_limit} />
      </div>

      {b.contact_url && (
        <p className="mt-6 text-center text-[15px]">
          궁금한 점은 <a href={b.contact_url} className="font-bold text-pine underline">문의하기</a>
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-xl">
          <OpenGate openAt={b.open_at} href={`/${b.slug}/apply`} />
        </div>
      </div>
    </main>
  );
}
