import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { deleteCurriculum, deleteField, saveBranch, saveCurriculum, saveField } from "../../actions";

type B = { id: string; name: string; open_at: string | null; close_at: string | null; refund_deadline: string; bundle_price: number; contact_url: string | null; notice: string | null; makeup_limit: number; partial_full_mode: string; makeup_start_date: string | null };
type S = { id: string; branch_id: string; code: string; price: number; lesson_count: number };
type L = { id: string; session_id: string; label: string; capacity: number | null };

export default async function Settings({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireAdmin(["owner"]);
  const { msg } = await searchParams;
  const kstv = (c: string) => `to_char(${c} at time zone 'Asia/Seoul', 'YYYY-MM-DD"T"HH24:MI')`;
  const [branches, sessions, slots, curriculum, fields, note] = await Promise.all([
    query<B>(`select id, name, ${kstv("open_at")} open_at, ${kstv("close_at")} close_at, ${kstv("refund_deadline")} refund_deadline, bundle_price, contact_url, notice, makeup_limit, partial_full_mode, to_char(makeup_start_date, 'YYYY-MM-DD') makeup_start_date from branches order by sort_order`),
    query<S>("select id, branch_id, code, price, lesson_count from sessions order by code"),
    query<L>("select id, session_id, label, capacity from slots order by sort_order"),
    query<{ id: string; grade_group: string; items: string[] }>("select id, grade_group, items from curriculum order by sort_order"),
    query<{ id: string; label: string; type: string; options: string[]; required: boolean; help: string | null; sort_order: number; is_active: boolean }>("select id, label, type, options, required, help, sort_order, is_active from form_fields order by sort_order, key"),
    query<{ value: string }>("select value from app_settings where key = 'curriculum_note'"),
  ]);

  const FieldForm = ({ f }: { f?: (typeof fields)[number] }) => (
    <form action={saveField} className="card space-y-3 !p-4">
      {f && <input type="hidden" name="id" value={f.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">질문 (화면에 보이는 이름)</label><input name="label" defaultValue={f?.label} className="input" required /></div>
        <div><label className="label">답하는 방식</label>
          <select name="type" defaultValue={f?.type ?? "text"} className="input">
            <option value="text">짧은 글</option><option value="textarea">긴 글</option><option value="select">고르기</option><option value="checkbox">체크</option>
          </select></div>
      </div>
      <div><label className="label">고르기 보기 (한 줄에 하나, 「고르기」일 때만)</label><textarea name="options" defaultValue={f?.options.join("\n")} className="input !min-h-20 py-2" /></div>
      <div><label className="label">안내 문구 (선택)</label><input name="help" defaultValue={f?.help ?? ""} className="input" /></div>
      <div className="flex flex-wrap items-center gap-4 text-[15px]">
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="required" defaultChecked={f?.required} className="size-5 accent-pine" />꼭 답해야 해요</label>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={f ? f.is_active : true} className="size-5 accent-pine" />신청 폼에 보이기</label>
        <label className="flex items-center gap-2">순서 <input name="sort_order" type="number" defaultValue={f?.sort_order ?? 10} className="input !w-20" /></label>
      </div>
      <div className="flex gap-2">
        <button className="btn">{f ? "저장" : "칸 추가"}</button>
        {f && <button formAction={deleteField} formNoValidate className="min-h-11 rounded-xl border border-line px-4 text-alert">지우기</button>}
      </div>
    </form>
  );

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-black text-pine">설정</h1>
      {msg && <p role="status" className="rounded-xl bg-mint p-3 text-[15px]">{msg}</p>}

      <section className="space-y-4">
        <h2 className="text-xl text-pine">지점 설정</h2>
        <p className="text-sm text-muted">시간은 모두 한국 시각이에요. 신청 시작 시각을 비워 두면 신청이 열리지 않아요.</p>
        {branches.map((b) => (
          <form key={b.id} action={saveBranch} className="card space-y-4">
            <input type="hidden" name="id" value={b.id} />
            <h3 className="text-lg text-pine">{b.name}</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className="label">신청 시작</label><input type="datetime-local" name="open_at" defaultValue={b.open_at ?? ""} className="input" /></div>
              <div><label className="label">신청 마감 (선택)</label><input type="datetime-local" name="close_at" defaultValue={b.close_at ?? ""} className="input" /></div>
              <div><label className="label">환불·변경 마감</label><input type="datetime-local" name="refund_deadline" defaultValue={b.refund_deadline} className="input" required /></div>
              <div><label className="label">1·2차 모두 금액</label><input type="number" name="bundle_price" defaultValue={b.bundle_price} className="input" required /></div>
              <div><label className="label">보강 가능 횟수</label><input type="number" name="makeup_limit" defaultValue={b.makeup_limit} className="input" required /></div>
              <div><label className="label">보강 미리 신청 가능 시작일</label><input type="date" name="makeup_start_date" defaultValue={b.makeup_start_date ?? ""} className="input" /></div>
              <div><label className="label">1·2차 중 한쪽만 마감일 때</label>
                <select name="partial_full_mode" defaultValue={b.partial_full_mode} className="input"><option value="all_wait">전체 대기로 접수</option><option value="split">차수별로 나눠 접수</option></select></div>
            </div>
            <div><label className="label">문의 링크</label><input name="contact_url" defaultValue={b.contact_url ?? ""} className="input" placeholder="https://" /></div>
            <div><label className="label">지점 안내 메모 (안내 페이지에 표시)</label><textarea name="notice" defaultValue={b.notice ?? ""} className="input !min-h-20 py-2" /></div>
            {sessions.filter((s) => s.branch_id === b.id).map((s) => (
              <div key={s.id} className="rounded-xl bg-snow p-3">
                <p className="font-bold">{s.code}</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div><label className="label">수강료</label><input type="number" name={`price_${s.id}`} defaultValue={s.price} className="input" /></div>
                  <div><label className="label">회차</label><input type="number" name={`lessons_${s.id}`} defaultValue={s.lesson_count} className="input" /></div>
                </div>
                <p className="label mt-3">타임별 정원 (비우면 제한 없음)</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {slots.filter((l) => l.session_id === s.id).map((l) => (
                    <div key={l.id}><label className="text-sm text-muted">{l.label}</label><input type="number" min={0} name={`cap_${l.id}`} defaultValue={l.capacity ?? ""} className="input" /></div>
                  ))}
                </div>
              </div>
            ))}
            <button className="btn">{b.name} 저장</button>
          </form>
        ))}
      </section>

      <section id="curriculum" className="space-y-4">
        <h2 className="text-xl text-pine">학년별 수업 내용</h2>
        <form action={saveCurriculum} className="card space-y-4">
          {curriculum.map((c) => (
            <div key={c.id} className="space-y-2">
              <div className="flex gap-2">
                <input name={`group_${c.id}`} defaultValue={c.grade_group} className="input" />
                <button formAction={deleteCurriculum} formNoValidate name="id" value={c.id} className="min-h-11 shrink-0 rounded-xl border border-line px-3 text-alert">지우기</button>
              </div>
              <textarea name={`items_${c.id}`} defaultValue={c.items.join("\n")} className="input !min-h-24 py-2" />
            </div>
          ))}
          <div className="space-y-2 rounded-xl bg-snow p-3">
            <p className="font-bold">새 학년 묶음 추가</p>
            <input name="new_group" placeholder="예: 중등" className="input" />
            <textarea name="new_items" placeholder="한 줄에 수업 하나" className="input !min-h-20 py-2" />
          </div>
          <div><label className="label">수업 안내 문구</label><input name="curriculum_note" defaultValue={note[0]?.value ?? ""} className="input" /></div>
          <p className="text-sm text-muted">수업 내용은 한 줄에 하나씩 적어요.</p>
          <button className="btn">수업 내용 저장</button>
        </form>
      </section>

      <section id="fields" className="space-y-4">
        <h2 className="text-xl text-pine">신청 폼 칸 관리</h2>
        <p className="text-sm text-muted">여기서 만든 칸이 신청 폼에 바로 나타나고, 엑셀에도 열이 생겨요. 이름·학년·학교·연락처·재원 구분·요청사항은 기본 칸이라 그대로 있어요.</p>
        {fields.map((f) => <FieldForm key={f.id} f={f} />)}
        <h3 className="text-lg text-pine">새 칸 추가</h3>
        <FieldForm />
      </section>
    </div>
  );
}
