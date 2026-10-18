import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { clearRegular, deleteHistoryTerm, importHistory, importRegular } from "../../actions";

export default async function History({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireAdmin(["owner"]);
  const { msg } = await searchParams;
  const terms = await query<{ term: string; n: number; cancelled: number }>(
    "select term, count(*)::int n, count(*) filter (where outcome = '취소')::int cancelled from past_records group by term order by term desc");
  const [reg] = await query<{ n: number }>("select count(*)::int n from regular_students");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-pine">지난 방학 이력</h1>
      <p className="text-[15px] text-muted">여기에 등록해 두면, 같은 이름·연락처로 신청이 들어왔을 때 신청 목록에 &ldquo;2026 여름 수강&rdquo;, &ldquo;2026 여름 취소&rdquo;처럼 표시돼요.</p>
      {msg && <p role="status" className="rounded-xl bg-mint p-3 text-[15px]">{msg}</p>}
      <form action={importHistory} className="card space-y-3">
        <label className="label" htmlFor="text">붙여 넣기 (한 줄에 한 명)</label>
        <p className="text-sm text-muted">형식: 이름, 연락처, 방학 이름, 수강 또는 취소, 메모(선택). 엑셀에서 복사해 붙여 넣어도 돼요.</p>
        <textarea id="text" name="text" className="input !min-h-40 py-2 font-mono text-sm" placeholder={"홍길동, 010-1234-5678, 2026 여름, 수강\n김책나, 01099998888, 2026 여름, 취소, 사정으로"} required />
        <button className="btn">등록하기</button>
      </form>
      <section className="card">
        <h2 className="text-lg text-pine">등록된 이력</h2>
        <ul className="mt-2 divide-y divide-line">
          {terms.map((t) => (
            <li key={t.term} className="flex items-center justify-between py-2 text-[15px]">
              <span><b>{t.term}</b> · {t.n}명 (취소 {t.cancelled}명)</span>
              <form action={deleteHistoryTerm}><input type="hidden" name="term" value={t.term} /><button className="min-h-11 px-3 text-alert underline">이 방학 이력 지우기</button></form>
            </li>
          ))}
          {terms.length === 0 && <li className="py-3 text-muted">아직 등록된 이력이 없어요.</li>}
        </ul>
      </section>

      <section id="regular" className="card space-y-3">
        <h2 className="text-lg text-pine">재원생 명단 <span className="text-sm font-normal text-muted">현재 {reg.n}명</span></h2>
        <p className="text-sm text-muted">재원생 우대 기간에 &ldquo;정규 재원생&rdquo;으로 신청한 분이 이 명단(이름+연락처)과 맞는지 확인해요. 맞지 않아도 신청은 받고, 신청 목록에 &ldquo;재원생 명단 불일치&rdquo;로 표시해 드려요. 명단을 등록하지 않으면 표시하지 않아요.</p>
        <form action={importRegular} className="space-y-3">
          <textarea name="text" className="input !min-h-32 py-2 font-mono text-sm" placeholder={"홍길동, 010-1234-5678\n김책나, 01099998888"} required />
          <button className="btn">명단 추가</button>
        </form>
        {reg.n > 0 && <form action={clearRegular}><button className="min-h-11 text-sm text-alert underline">명단 전체 지우기</button></form>}
      </section>
    </div>
  );
}
