export default function Privacy() {
  const li = "list-inside list-disc space-y-1";
  return (
    <main className="prose mx-auto max-w-2xl space-y-4 p-6">
      <p className="rounded bg-yellow-100 p-2 text-sm">⚠ 법률 검토 전 초안입니다. 서비스 출시 전에 개인정보 전문 변호사의 검토가 필요합니다.</p>
      <h1 className="text-2xl font-bold">개인정보처리방침 (초안)</h1>
      <h2 className="text-lg font-bold">1. 수집하는 정보 (최소 수집)</h2>
      <ul className={li}><li>보호자: 이름, 이메일, (해시로 저장한) PIN</li><li>아동: 별명, 연령대 (실명·생년월일은 받지 않아요)</li>
        <li>연습 기록: 아이가 입력하거나 말한 내용을 글자로 바꾼 것, 응답 단계, 미션 확인, 사용 시간</li><li>검사자가 입력한 검사 결과·관찰 메모</li>
        <li>선택 동의 시에만: 음성 원본, 그림 파일</li></ul>
      <h2 className="text-lg font-bold">2. 음성과 그림</h2>
      <ul className={li}><li>음성 원본은 기본적으로 저장하지 않아요. 글자로 바뀐 결과만 사용해요.</li><li>그림 파일은 보호자가 따로 동의한 경우에만 저장하고, 동의를 철회하면 삭제해요.</li></ul>
      <h2 className="text-lg font-bold">3. AI 처리와 국외 이전 (검토 필요)</h2>
      <p>AI 친구가 답할 때 아이가 입력한 글자가 외부 AI 서비스(Anthropic)로 전송돼 처리돼요. 이름·연락처 등 식별 정보는 보내지 않도록 설계했지만, 아이가 직접 입력한 내용에는 포함될 수 있어요. 국외 이전·위탁에 관한 고지와 동의 절차는 법률 검토 후 확정해요.</p>
      <h2 className="text-lg font-bold">4. 이용 목적과 하지 않는 일</h2>
      <ul className={li}><li>연습 제공, 진도 확인, 보호자·검사자 열람에만 써요.</li><li>광고를 하지 않고, 아동 정보를 마케팅에 쓰지 않아요.</li><li>연구용 활용은 보호자가 따로 동의한 경우에만, 익명화해서 해요.</li></ul>
      <h2 className="text-lg font-bold">5. 열람 권한</h2>
      <p>보호자는 자녀의 정보를, 검사자는 배정된 아동의 정보만 볼 수 있어요.</p>
      <h2 className="text-lg font-bold">6. 동의 철회와 삭제</h2>
      <p>보호자는 언제든 보호자 화면에서 동의를 철회할 수 있어요. 서비스 동의를 철회하면 아이 화면이 닫혀요. 보관 기간과 삭제 절차는 법률 검토 후 확정해요.</p>
      <h2 className="text-lg font-bold">7. 서비스의 성격</h2>
      <p>토키는 화용언어·사회성 연습 및 교육 보조 도구예요. 아이의 상태를 판단하는 도구가 아니며, 결과의 해석과 판단은 전문가가 해요.</p>
    </main>
  );
}
