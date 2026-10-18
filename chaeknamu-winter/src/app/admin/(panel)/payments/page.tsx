import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { sortByGrade } from "@/lib/admin-queries";
import { getSetting } from "@/lib/repo";
import { kDateOnly } from "@/lib/format";
import { COURSE_CHIP, GRADE_PILL, SLOT_CHIP } from "@/lib/ui";
import CopyButton from "@/components/admin/CopyButton";
import MaskedPhone from "@/components/admin/MaskedPhone";
import { markSmsSent, setPayment } from "../../actions";

type R = {
  id: string; student_name: string; grade: number; guardian_phone: string; course: string; slot1: string | null; slot2: string | null; price: number;
  payment_status: string; created_kst: string; enroll_verified: boolean | null; enrollment_type: string; branch_name: string; rd: string;
  sms_sent: boolean; paid_kst: string | null;
};

export default async function Payments({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const a = await requireAdmin(["owner", "branch_admin"]);
  const { msg } = await searchParams;
  const confirmNotice = await getSetting("confirm_notice");
  const rows = sortByGrade(await query<R>(
    `select a.id, a.student_name, a.grade, a.guardian_phone, a.course, s1.label slot1, s2.label slot2, a.price, a.payment_status,
       to_char(a.created_at at time zone 'Asia/Seoul', 'MM/DD HH24:MI') created_kst, a.enroll_verified, a.enrollment_type, b.name branch_name,
       b.refund_deadline::text rd, (a.confirm_sms_sent_at is not null) sms_sent, to_char(a.paid_at at time zone 'Asia/Seoul', 'MM/DD HH24:MI') paid_kst
     from applications a join branches b on b.id = a.branch_id left join slots s1 on s1.id = a.slot1_id left join slots s2 on s2.id = a.slot2_id
     where a.status = '확정' and ($1::uuid is null or a.branch_id = $1)`, [a.role === "owner" ? null : a.branch_id]));
  const unpaid = rows.filter((r) => r.payment_status !== "결제완료");
  const toSend = rows.filter((r) => r.payment_status === "결제완료" && !r.sms_sent);
  const sent = rows.filter((r) => r.sms_sent);
  const fmt = (p: string) => `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`;
  const text = (r: R) =>
    `[책나무 강남서초지사] ${r.student_name} 학생 2027 겨울방학특강 확정 안내예요.\n${r.branch_name.replace(/^\d관 /, "")} · ${r.course}${r.slot1 ? " · 1차 " + r.slot1 : ""}${r.slot2 ? " · 2차 " + r.slot2 : ""}\n입금·결제가 확인되어 확정되었어요. 환불·변경은 ${kDateOnly(r.rd)}까지 가능해요.`;

  const chips = (r: R) => (
    <span className="flex flex-wrap items-center gap-1">
      {r.slot1 && <><span className={`rounded-md px-2 text-sm font-bold ${COURSE_CHIP["1차"]}`}>1차</span><span className={`rounded-md px-2 text-sm ${SLOT_CHIP[r.slot1]}`}>{r.slot1}</span></>}
      {r.slot2 && <><span className={`ml-1 rounded-md px-2 text-sm font-bold ${COURSE_CHIP["2차"]}`}>2차</span><span className={`rounded-md px-2 text-sm ${SLOT_CHIP[r.slot2]}`}>{r.slot2}</span></>}
    </span>
  );
  const who = (r: R) => (
    <span className="flex flex-wrap items-center gap-2">
      <b>{r.student_name}</b><span className={`rounded-full px-2 text-sm font-bold ${GRADE_PILL[r.grade]}`}>{r.grade}학년</span>
      <span className="text-sm text-muted">{r.branch_name.replace(/^\d관 /, "")}</span>{chips(r)}
      {r.enroll_verified === false && <span className="rounded bg-alert px-1.5 text-xs text-white">재원생 명단 불일치</span>}
    </span>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-pine">결제·확정 문자</h1>
        <p className="mt-1 text-[15px] text-muted">입금·결제가 확인된 분만 확정이에요. {confirmNotice}</p>
      </div>
      {msg && <p role="status" className="rounded-xl bg-mint p-3 text-[15px]">{msg}</p>}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[["결제 확인 필요", unpaid.length, "text-alert"], ["확정 문자 보낼 분", toSend.length, "text-pine"], ["발송 완료", sent.length, "text-ink"]].map(([l, n, c]) => (
          <div key={String(l)} className="card !p-4"><p className="text-sm text-muted">{l}</p><p className={`text-3xl font-black tabular-nums ${c}`}>{n}</p></div>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-xl text-pine">① 입금·결제 확인이 필요해요 <span className="text-base text-muted">{unpaid.length}명</span></h2>
        <ul className="divide-y divide-line rounded-[20px] border border-line bg-white">
          {unpaid.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-[15px]">
              {who(r)}<span className="text-sm text-muted">신청 {r.created_kst} · {r.price.toLocaleString()}원</span>
              <span className="ml-auto flex items-center gap-3"><MaskedPhone phone={r.guardian_phone} />
                <form action={setPayment}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="paid" value="1" /><button className="btn !min-h-11">결제 완료</button></form></span>
            </li>
          ))}
          {unpaid.length === 0 && <li className="px-4 py-5 text-center text-muted">결제 확인이 필요한 분이 없어요.</li>}
        </ul>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl text-pine">② 확정 문자를 보내 주세요 <span className="text-base text-muted">{toSend.length}명</span></h2>
          {toSend.length > 0 && (
            <>
              <CopyButton label="연락처 전체 복사" text={toSend.map((r) => fmt(r.guardian_phone)).join("\n")} />
              <form action={markSmsSent}><input type="hidden" name="ids" value={toSend.map((r) => r.id).join(",")} /><button className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm">전체 발송 완료로 표시</button></form>
            </>
          )}
        </div>
        <p className="text-sm text-muted">문자는 이 앱이 보내지 않아요. 문구와 연락처를 복사해서 보내시고, 보낸 뒤 &lsquo;발송 완료&rsquo;로 표시해 주세요.</p>
        <ul className="divide-y divide-line rounded-[20px] border border-line bg-white">
          {toSend.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-[15px]">
              {who(r)}<span className="text-sm text-muted">결제 {r.paid_kst}</span>
              <span className="ml-auto flex flex-wrap items-center gap-2"><MaskedPhone phone={r.guardian_phone} />
                <CopyButton label="문구 복사" text={text(r)} />
                <form action={markSmsSent}><input type="hidden" name="id" value={r.id} /><button className="btn !min-h-11">발송 완료</button></form></span>
            </li>
          ))}
          {toSend.length === 0 && <li className="px-4 py-5 text-center text-muted">보낼 문자가 없어요.</li>}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl text-pine">③ 확정 문자 발송 완료 <span className="text-base text-muted">{sent.length}명</span></h2>
        <ul className="divide-y divide-line rounded-[20px] border border-line bg-white">
          {sent.slice(0, 100).map((r) => <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[15px]">{who(r)}</li>)}
          {sent.length === 0 && <li className="px-4 py-5 text-center text-muted">아직 없어요.</li>}
        </ul>
      </section>
    </div>
  );
}
