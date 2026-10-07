import { SafetyAlerts } from "@/components/SafetyAlerts";

export default function GuardianHome() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <p className="mb-4 rounded bg-yellow-100 p-2 text-sm">화면 확인용입니다. 로그인과 권한 확인은 아직 연결되지 않았어요.</p>
      <h1 className="mb-4 text-2xl font-bold">보호자 화면</h1>
      <h2 className="mb-2 text-lg font-bold">안전 알림</h2>
      <SafetyAlerts role="guardian" />
    </main>
  );
}
