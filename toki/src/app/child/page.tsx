import { scenariosForChild } from "@/lib/child/scenarios";
import { childContext } from "@/lib/server/child";
import { ChildHome } from "@/components/child/ChildHome";
import { ConsentRequired } from "@/components/child/ConsentRequired";

export const dynamic = "force-dynamic";

export default async function ChildPage() {
  const c = childContext();
  if (!c.hasConsent) return <ConsentRequired />; // 보호자 동의 없이는 아동 화면을 열 수 없다
  const { scenarios, demo } = scenariosForChild(c.ageBand);
  // 클라이언트에는 목록 표시에 필요한 최소 정보만 보낸다.
  const slim = scenarios.slice(0, c.cfg.dailyScenarios).map(({ id, setting, partnerLine }) => ({ id, setting, partnerLine }));
  return <ChildHome scenarios={slim} nickname={c.nickname} demo={demo} />;
}
