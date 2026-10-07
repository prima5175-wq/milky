export default function Terms() {
  const li = "list-inside list-disc space-y-1";
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <p className="rounded bg-yellow-100 p-2 text-sm">⚠ 법률 검토 전 초안입니다. 출시 전에 전문가의 검토가 필요합니다.</p>
      <h1 className="text-2xl font-bold">이용약관 (초안)</h1>
      <h2 className="text-lg font-bold">1. 서비스</h2><p>토키는 아동의 화용언어·사회성 연습을 돕는 교육 보조 도구예요. 의료 서비스가 아니에요.</p>
      <h2 className="text-lg font-bold">2. 이용 자격</h2><p>만 14세 미만 아동은 법정대리인(보호자)이 가입하고 동의해야 이용할 수 있어요.</p>
      <h2 className="text-lg font-bold">3. 보호자의 역할</h2>
      <ul className={li}><li>실제 생활 미션은 보호자(또는 교사)가 확인해야 완료돼요.</li><li>PIN을 아이에게 알려 주지 않도록 관리해 주세요.</li></ul>
      <h2 className="text-lg font-bold">4. AI 친구</h2><p>AI 친구는 연습 상대일 뿐 실제 친구나 상담자가 아니에요. 걱정되는 이야기가 감지되면 연습을 멈추고 어른에게 알려요. 모든 위험을 찾아낼 수는 없어서, 아이의 안전은 보호자가 함께 살펴 주세요.</p>
      <h2 className="text-lg font-bold">5. 책임의 한계</h2><p>서비스 내용은 전문 진단·치료를 대신하지 않아요. 구체적 문구는 법률 검토 후 확정해요.</p>
    </main>
  );
}
