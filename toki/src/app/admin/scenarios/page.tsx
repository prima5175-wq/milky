import { loadSeedScenarios } from "@/lib/scenarios/load";
import { ReviewBoard } from "@/components/scenarios/ReviewBoard";

export default function AdminScenarios() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <p className="mb-4 rounded bg-yellow-100 p-2 text-sm">전문가 감수 전 초안입니다. 승인된 시나리오만 아동 화면에 나옵니다. (상태 변경은 이 화면에서만 반영되는 데모)</p>
      <h1 className="mb-4 text-2xl font-bold">시나리오 감수</h1>
      <ReviewBoard initial={loadSeedScenarios()} />
    </main>
  );
}
