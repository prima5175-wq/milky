import { notFound } from "next/navigation";
import { findForChild } from "@/lib/child/scenarios";
import { demoRepository as repo } from "@/lib/assessments/demo";
import { ScenarioFlow } from "@/components/child/ScenarioFlow";

export default async function ScenarioPage({ params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = await params;
  const child = (await repo.listChildren())[0];
  // 승인되지 않은 시나리오는 주소를 알아도 열리지 않는다.
  const scenario = findForChild(scenarioId, child.ageBand);
  if (!scenario) notFound();
  return <ScenarioFlow scenario={scenario} targetLevel={2} />;
}
