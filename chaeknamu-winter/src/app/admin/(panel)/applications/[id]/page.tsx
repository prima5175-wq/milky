import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getApplication, logsFor } from "@/lib/admin-queries";
import { query } from "@/lib/db";
import { changeStatus, markSmsSent, saveNote, setPayment } from "../../../actions";
import MaskedPhone from "@/components/admin/MaskedPhone";
import { won } from "@/lib/format";
import { recordSummary } from "@/lib/lesson-queries";
import { COURSE_CHIP, GRADE_PILL, SLOT_CHIP } from "@/lib/ui";

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
  const [logs, fields, siblings] = await Promise.all([
    logsFor(id),
    query<{ key: string; label: string }>("select key, label from form_fields"),
    query<{ id: string; student_name: string; grade: number }>("select distinct on (student_name) id, student_name, grade from applications where guardian_phone = $1 and student_name <> $2 order by student_name, created_at desc", [r.guardian_phone, r.student_name]),
  ]);
  const label = (k: string) => fields.find((f) => f.key === k)?.label ?? k;
  const rec = await recordSummary(id);
  const bookTotal = rec.days.reduce((n, d) => n + d.books.reduce((m, b) => m + b.volumes, 0), 0);
  const options = ["확정", "대기", "취소", "환불"].filter((s) => s !== r.status);
  const row = (k: string, v: React.ReactNode) => (<><dt className="text-muted">{k}</dt><dd>{v}</dd></>);

  return (
    <div className="space-y-6">
      <Link href="/admin/applications" className="text-sm text-muted">← 신청 목록</Link>
      <h1 className="text-2xl font-black text-pine">{r.student_name} <span className={`rounded-full px-2 text-base ${GRADE_PILL[r.grade]}`}>{r.grade}학년</span> <span className="text-base font-normal text-muted">{r.school}</span></h1>
      {(r.history?.length || siblings.length > 0) && (
        <div className="flex flex-wrap gap-2 text-sm">
          {r.history?.map((h) => <span key={h.term + h.outcome} className={`rounded px-2 py-0.5 ${h.outcome === "취소" ? "bg-alert text-white" : "bg-pine text-white"}`}>{h.term} {h.outcome}</span>)}
          {siblings.map((x) => <Link key={x.id} href={`/admin/applications/${x.id}`} className="rounded bg-ink px-2 py-0.5 text-white">형제·자매 {x.student_name} ({x.grade}학년)</Link>)}
        </div>
      )}
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
            {r.slot1 && row("1차", <span className="flex gap-1"><span className={`rounded-md px-2 font-bold ${COURSE_CHIP["1차"]}`}>1차</span><span className={`rounded-md px-2 ${SLOT_CHIP[r.slot1]}`}>{r.slot1}</span></span>)}
            {r.slot2 && row("2차", <span className="flex gap-1"><span className={`rounded-md px-2 font-bold ${COURSE_CHIP["2차"]}`}>2차</span><span className={`rounded-md px-2 ${SLOT_CHIP[r.slot2]}`}>{r.slot2}</span></span>)}
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
          {r.status === "확정" && (
            <div className="card space-y-3">
              <h2 className="text-lg text-pine">입금·결제 확인</h2>
              <p className="text-[15px]">상태: <b className={r.payment_status === "결제완료" ? "text-pine" : "text-alert"}>{r.payment_status}</b>{r.paid_kst ? ` (${r.paid_kst})` : ""}{r.sms_sent ? " · 확정 문자 발송 완료" : ""}</p>
              {r.enroll_verified === false && <p className="text-sm text-alert">재원생 명단과 일치하지 않아요. 확정 전에 확인해 주세요.</p>}
              <div className="flex flex-wrap gap-2">
                <form action={setPayment}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="back" value={`/admin/applications/${r.id}`} /><input type="hidden" name="paid" value={r.payment_status === "결제완료" ? "0" : "1"} /><button className="btn !min-h-11">{r.payment_status === "결제완료" ? "결제 완료 취소" : "결제 완료로 표시"}</button></form>
                {r.payment_status === "결제완료" && !r.sms_sent && <form action={markSmsSent}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="back" value={`/admin/applications/${r.id}`} /><button className="min-h-11 rounded-xl border border-line px-4">확정 문자 발송 완료 표시</button></form>}
              </div>
            </div>
          )}
          <form action={saveNote} className="card space-y-3">
            <h2 className="text-lg text-pine">기존 수강 확인·메모</h2>
            <input type="hidden" name="id" value={r.id} />
            <div><label className="label" htmlFor="pass_note">기존 수강권 (예: 정규 12회권, 휴원 중)</label><input id="pass_note" name="pass_note" defaultValue={r.pass_note ?? ""} className="input" /></div>
            <div><label className="label" htmlFor="pass_end_date">수강 종료일 (남은 기간 확인용)</label><input id="pass_end_date" type="date" name="pass_end_date" defaultValue={r.pass_end ?? ""} className="input" /></div>
            <label className="label" htmlFor="admin_note">관리자 메모</label>
            <textarea id="admin_note" name="admin_note" defaultValue={r.admin_note ?? ""} className="input !min-h-24 py-2" />
            <button className="btn w-full">저장</button>
          </form>
        </section>
      </div>

      <section className="card">
        <h2 className="text-lg text-pine">수업 기록 누적 <span className="text-sm font-normal text-muted">(관리자에게만 보여요)</span></h2>
        <p className="mt-1 text-[15px]">출석 {rec.counts.present}회 · 지각 {rec.counts.late}회 · 결석 {rec.counts.absent}회 / 활동지 {rec.counts.worksheets}장 (첨삭 {rec.counts.graded}장) / 읽은 책 {bookTotal}권</p>
        <ul className="mt-3 divide-y divide-line text-[15px]">
          {rec.days.map((d) => (
            <li key={d.d} className="py-2">
              <b className="tabular-nums">{d.d}</b> <span className="text-muted">{d.status ?? "출석 미기록"}</span>
              {d.activity && <p>활동: {d.activity}</p>}
              {d.books.length > 0 && <p>책: {d.books.map((b) => `${b.title} ${b.volumes}권`).join(", ")}</p>}
              {d.worksheet_count > 0 && <p>활동지 {d.worksheet_count}장 · {d.worksheet_graded ? "첨삭 완료" : "첨삭 전"} · 수업 {d.taught_name ?? "미기록"}</p>}
              {d.comment && <p className="text-muted">코멘트: {d.comment}</p>}
            </li>
          ))}
          {rec.days.length === 0 && <li className="py-2 text-muted">아직 기록이 없어요.</li>}
        </ul>
      </section>

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
