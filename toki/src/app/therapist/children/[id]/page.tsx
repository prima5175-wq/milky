import Link from "next/link";
import { notFound } from "next/navigation";
import { demoRepository as repo } from "@/lib/assessments/demo";
import { SafetyAlerts } from "@/components/SafetyAlerts";
import { HtpPanel } from "@/components/htp/HtpPanel";
import { ChildAssessments } from "@/components/assessments/ChildAssessments";

export default async function ChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const child = await repo.getChild(id);
  if (!child) notFound();
  const [catalog, records, notes] = await Promise.all([repo.listCatalog(), repo.listRecords(id), repo.listNotes(id)]);
  return (
    <main className="mx-auto max-w-3xl p-6">
      <p className="mb-4 rounded bg-yellow-100 p-2 text-sm">화면 확인용 가상 데이터입니다. 실제 아동 정보가 아닙니다.</p>
      <h1 className="mb-6 text-2xl font-bold">{child.nickname} <span className="text-base font-normal opacity-60">({child.ageBand}세)</span></h1>
      <div className="mb-4"><SafetyAlerts role="therapist" /></div>
      <p className="mb-4"><Link className="underline" href={`/therapist/children/${id}/prescription`}>연습 설정(시간·개수·시나리오)</Link></p>
      <ChildAssessments childId={id} catalog={catalog} initialRecords={records} notes={notes} />
      <div className="mt-8"><HtpPanel /></div>
    </main>
  );
}
