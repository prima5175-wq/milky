import { scenariosForChild } from "@/lib/child/scenarios";
import { demoRepository as repo } from "@/lib/assessments/demo";
import { ChildHome } from "@/components/child/ChildHome";

const DAILY_SCENARIOS = 3; // 아동별 처방(daily_scenarios)에서 가져온다. DB 연결 전 임시값.

export default async function ChildPage() {
  const child = (await repo.listChildren())[0];
  const { scenarios, demo } = scenariosForChild(child.ageBand);
  // 클라이언트에는 목록 표시에 필요한 최소 정보만 보낸다.
  const slim = scenarios.slice(0, DAILY_SCENARIOS).map(({ id, setting, partnerLine }) => ({ id, setting, partnerLine }));
  return <ChildHome scenarios={slim} nickname={child.nickname} demo={demo} />;
}
