import Link from "next/link";
import CheckForm from "@/components/CheckForm";
import { listBranches } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function CheckPage() {
  const branches = (await listBranches()).map((b) => ({ slug: b.slug, name: b.name }));
  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-8">
      <Link href="/" className="text-sm text-muted">← 처음으로</Link>
      <h1 className="mt-3 text-2xl font-black text-pine">신청 조회</h1>
      <div className="mt-3 h-0.5 w-12 bg-gold" />
      <div className="mt-6"><CheckForm branches={branches} /></div>
    </main>
  );
}
