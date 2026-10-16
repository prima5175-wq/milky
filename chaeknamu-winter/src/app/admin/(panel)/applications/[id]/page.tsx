import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getApplication, logsFor } from "@/lib/admin-queries";
import { query } from "@/lib/db";
import { changeStatus, saveNote } from "../../../actions";
import MaskedPhone from "@/components/admin/MaskedPhone";
import { won } from "@/lib/format";

const WARN: Record<string, string> = {
  over_capacity: "이 타임은 정원이 이미 찼어요. 그래도 확정할까요?",
  after_deadline: "규정상 환불 불가 기간입니다. 그래도 처리할까요?",
  need_reason: "환불 마감 이후에는 사유를 꼭 적어야 해요.",
  duplicate: "같은 정보로 이미 확정·대기 중인 신청이 있어요.",
  invalid: "처리할 수 없는 요청이에요.",
};

export default async function Detail({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; warn?: string; to?: string; note?: string }>;
}) {
  const admin = await requireAdmin(["owner", "branch_admin"]);
  const { id } = await params;
  const sp = await searchParams;
  const r = await getApplication(admin, id);
  if (!r) notFound();
  const [logs, fields] = await Promise.all([
    logsFor(id),
    query<{ key: string; label: string }>("select key, label from form_fields"),
  ]);
  const label = (k: string) => fields.find((f) => f.key === k)?.label ?? k;
  const options = ["확정", "대기", "취소", "환불"].filter((s) => s !== r.status);
  const row = (k: string, v: React.ReactNode) => (<><dt className="text-muted">{k}</dt><dd>{v}</dd></>);

  return (
    <div className="space-y-6">
      <Link href="/admin/applications" className="text-sm text-muted">← 신청 목록</Link>
      <h1 className="text-2xl font-black text-pine">{r.student_name} <span className="text-base font-normal text-muted">{r.grade}학년 · {r.school}</span></h1>
      {sp.msg && <p role="status" className="rounded-xl bg-mint p-3 text-[15px]">{sp.msg}</p>}

      {sp.warn && (
        <form action={changeStatus} className="card space-y-3 border-gold">
          <p className="font-bold">{WARN[sp.warn] ?? "확인이 필요해요."}</p>
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="to" value={sp.to} />
          {(sp.warn === "after_deadline" || sp.warn === "need_reason") && (
            <div>
              <label className="label" htmlFor="why">사유 (필수)</label>
              <input id="why" name="note" defaultValue={sp.note} className="input" required />
            </div>
          )}
          {sp.warn !== "need_reason" && sp.warn !== "duplicate" && sp.warn !== "invalid" && <input type="hidden" name="force" value="1" />}
          {sp.warn === "need_reason" ? <input type="hidden" name="force" value="1" /> : null}
          {sp.warn !== "duplicate" && sp.warn !== "invalid" && <button className="btn">네, 바꿀게요</button>}
          <Link href={`/admin/applications/${r.id}`} className="ml-3 text-sm text-muted underline">취소</Link>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <dl className="grid grid-cols-[88px_1fr] gap-y-1.5 text-[15px]">
            {row("상태", <b>{r.status}{r.waitlist_order ? ` · 대기 ${r.waitlist_order}번` : ""}</b>)}
            {row("지점", r.branch_name)}
            {row("과정", r.course)}
            {r.slot1 && row("1차 타임", r.slot1)}
            {r.slot2 && row("2차 타임", r.slot2)}
            {row("수강료", won(r.price))}
            {row("연락처", <MaskedPhone phone={r.guardian_phone} />)}
            {row("재원 구분", r.enrollment_type)}
            {row("신청 시각", r.created_kst)}
            {row("규정 버전", r.policy_version)}
            {row("요청사항", r.memo || "-")}
            {Object.entries(r.extra ?? {}).map(([k, v]) => row(label(k), String(v === true ? "예" : v)))}
          </dl>
        </section>

        <section className="space-y-4">
          <form action={changeStatus} className="card space-y-3">
            <h2 className="text-lg text-pine">상태 변경</h2>
            <input type="hidden" name="id" value={r.id} />
            <select name="to" className="input">{options.map((s) => <option key={s}>{s}</option>)}</select>
            <input name="note" placeholder="사유·메모 (환불 마감 후에는 필수)" className="input" />
            <button className="btn w-full">바꾸기</button>
            <p className="text-sm text-muted">대기 → 확정은 대기 순번이 빠른 순서대로 눌러 주세요. 정원이 차 있으면 한 번 더 물어봐요.</p>
          </form>
          <form action={saveNote} className="card space-y-3">
            <h2 className="text-lg text-pine">관리자 메모</h2>
            <input type="hidden" name="id" value={r.id} />
            <textarea name="admin_note" defaultValue={r.admin_note ?? ""} className="input !min-h-24 py-2" />
            <button className="btn w-full">메모 저장</button>
          </form>
        </section>
      </div>

      <section className="card">
        <h2 className="text-lg text-pine">변경 기록</h2>
        <ul className="mt-2 space-y-1 text-[15px]">
          {logs.map((l, i) => (
            <li key={i}><span className="text-muted">{l.at}</span> {l.from_status ?? "신규"} → <b>{l.to_status}</b> <span className="text-muted">({l.changed_by}{l.note ? ` · ${l.note}` : ""})</span></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
