import Link from "next/link";
import { notFound } from "next/navigation";
import ApplyForm from "@/components/ApplyForm";
import { getBranch, getFormFields } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function ApplyPage({ params }: { params: Promise<{ branch: string }> }) {
  const { branch: slug } = await params;
  const b = await getBranch(slug);
  if (!b) notFound();
  const fields = await getFormFields();
  return (
    <main className="relative mx-auto max-w-xl px-4 pb-16 pt-8">
      <Link href={`/${b.slug}`} className="text-sm text-muted">← 안내로 돌아가기</Link>
      <p className="mt-3 text-sm text-muted">2027 겨울방학특강 신청</p>
      <h1 className="mt-1 text-2xl font-black text-pine">{b.name}</h1>
      <div className="mt-3 h-0.5 w-12 bg-gold" />
      <div className="mt-6">
        {b.is_open ? (
          <ApplyForm branch={b} fields={fields} />
        ) : (
          <div className="card text-[15px]">
            지금은 신청을 받고 있지 않아요. 안내 페이지에서 오픈 일정을 확인해 주세요.
            <Link href={`/${b.slug}`} className="btn mt-4 w-full">안내 보기</Link>
          </div>
        )}
      </div>
    </main>
  );
}
