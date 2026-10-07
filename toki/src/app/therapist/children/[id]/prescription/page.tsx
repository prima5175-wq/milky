import { notFound } from "next/navigation";
import { demoRepository as repo } from "@/lib/assessments/demo";
import { loadSeedScenarios } from "@/lib/scenarios/load";
import { visibleToChild } from "@/lib/scenarios/review";
import { getStores } from "@/lib/server/stores";
import { DEMO_CHILD } from "@/lib/child/demo";
import { PrescriptionForm } from "@/components/scenarios/PrescriptionForm";

export const dynamic = "force-dynamic";

export default async function PrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const child = await repo.getChild(id);
  if (!child) notFound();
  // 승인된 것만 클라이언트로 보낸다 (초안 내용이 브라우저에 실리지 않게)
  const approved = visibleToChild(loadSeedScenarios());
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-bold">{child.nickname} · 연습 설정</h1>
      <p className="mb-6 text-sm opacity-70">하루 시간·개수·목표를 정하고 시나리오를 배정합니다. 앱은 후보만 제안해요.</p>
      <PrescriptionForm ageBand={child.ageBand} scenarios={approved} initial={getStores().config.get(DEMO_CHILD.id)} />
    </main>
  );
}
