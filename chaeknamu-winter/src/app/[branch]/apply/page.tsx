import Link from "next/link";
import { notFound } from "next/navigation";
import ApplyForm from "@/components/ApplyForm";
import { getBranch, getFormFields, getSetting } from "@/lib/repo";
import OpenGate from "@/components/OpenGate";

export const dynamic = "force-dynamic";

export default async function ApplyPage({ params }: { params: Promise<{ branch: string }> }) {
  const { branch: slug } = await params;
  const b = await getBranch(slug);
  if (!b) notFound();
  const fields = await getFormFields();
  const [confirmNotice, paymentInfo] = await Promise.all([getSetting("confirm_notice"), getSetting("payment_info")]);
  return (
    <main className="relative mx-auto max-w-xl px-4 pb-16 pt-8">
      <Link href={`/${b.slug}`} className="text-sm text-muted">← 안내로 돌아가기</Link>
      <p className="mt-3 text-sm text-muted">2027 겨울방학특강 신청</p>
      <h1 className="mt-1 text-2xl font-black text-pine">{b.name}</h1>
            <div className="mt-6">
        {b.is_open ? (
          <ApplyForm branch={b} fields={fields} confirmNotice={confirmNotice} paymentInfo={paymentInfo} />
        ) : (
          <div className="card space-y-3 text-[15px]">
            <p>지금은 신청을 받고 있지 않아요.</p>
            <OpenGate slug={b.slug} href={`/${b.slug}/apply`} phase={b.phase} open_at={b.open_at} priority_end_at={b.priority_end_at} general_open_at={b.general_open_at} next_change_at={b.next_change_at} server_now={b.server_now} />
            <Link href={`/${b.slug}`} className="btn w-full">안내 보기</Link>
          </div>
        )}
      </div>
    </main>
  );
}
