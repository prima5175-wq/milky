import { notFound } from "next/navigation";
import { findForChild } from "@/lib/child/scenarios";
import { childContext } from "@/lib/server/child";
import { ScenarioFlow } from "@/components/child/ScenarioFlow";
import { ConsentRequired } from "@/components/child/ConsentRequired";

export const dynamic = "force-dynamic";

export default async function ScenarioPage({ params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = await params;
  const c = childContext();
  if (!c.hasConsent) return <ConsentRequired />;
  // 승인되지 않은 시나리오는 주소를 알아도 열리지 않는다.
  const scenario = findForChild(scenarioId, c.ageBand);
  if (!scenario) notFound();
  return <ScenarioFlow scenario={scenario} targetLevel={c.cfg.targetLevel} />;
}
