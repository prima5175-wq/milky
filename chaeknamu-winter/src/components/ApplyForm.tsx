"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { Branch, Course, FormField } from "@/lib/types";
import { kDate, kDateTime, phoneFormat, slotText, won } from "@/lib/format";
import { MSG, PRIVACY_ITEMS } from "@/lib/texts";
import PolicyBox from "./PolicyBox";

type Result = { status: "확정" | "대기" };

export default function ApplyForm({ branch: b, fields, confirmNotice, paymentInfo }: { branch: Branch; fields: FormField[]; confirmNotice: string; paymentInfo: string }) {
  const keyRef = useRef(typeof crypto !== "undefined" ? crypto.randomUUID() : String(Math.random()));
  const [extra, setExtra] = useState<Record<string, string | boolean>>({});
  const [s1, s2] = b.sessions;
  const [course, setCourse] = useState<Course>("1차");
  const [slot1, setSlot1] = useState("");
  const [slot2, setSlot2] = useState("");
  const [same, setSame] = useState(true);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [school, setSchool] = useState("");
  const [phone, setPhone] = useState("");
  const priority = b.phase === "priority";
  const [enroll, setEnroll] = useState(priority ? "정규 재원생" : "신규");
  const blockedByPriority = priority && enroll !== "정규 재원생";
  const [memo, setMemo] = useState("");
  const [agreeA, setAgreeA] = useState(false);
  const [agreeB, setAgreeB] = useState(false);
  const [trap, setTrap] = useState(""); // 숨김 필드(스팸 방지)
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const need1 = course !== "2차";
  const need2 = course !== "1차";
  // 같은 시간으로: 2차 타임을 1차와 같은 이름의 타임으로 맞춰요
  const effSlot2 = need1 && need2 && same
    ? s2.slots.find((t) => t.label === s1.slots.find((x) => x.id === slot1)?.label)?.id ?? ""
    : slot2;

  const price = course === "1차" ? s1.price : course === "2차" ? s2.price : b.bundle_price;
  const pick1 = s1.slots.find((t) => t.id === slot1);
  const pick2 = s2.slots.find((t) => t.id === effSlot2);
  const anyFull = (need1 && pick1?.is_full) || (need2 && pick2?.is_full);
  const phoneOk = /^010-\d{4}-\d{4}$/.test(phone);
  const extraOk = fields.every((f) => !f.required || (extra[f.key] !== undefined && extra[f.key] !== "" && extra[f.key] !== false));
  const valid =
    !blockedByPriority && extraOk && name.trim() && grade && school.trim() && phoneOk && (!need1 || slot1) && (!need2 || effSlot2) && agreeA && agreeB;

  const courseCards = useMemo(
    () => [
      { c: "1차" as Course, t: "1차만", d: `${kDate(s1.start_date)} ~ ${kDate(s1.end_date)} · ${s1.lesson_count}회`, p: s1.price },
      { c: "2차" as Course, t: "2차만", d: `${kDate(s2.start_date)} ~ ${kDate(s2.end_date)} · ${s2.lesson_count}회`, p: s2.price },
      { c: "1·2차" as Course, t: "1·2차 모두", d: `총 ${s1.lesson_count + s2.lesson_count}회`, p: b.bundle_price },
    ],
    [b, s1, s2],
  );

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_slug: b.slug,
          course,
          slot1_id: need1 ? slot1 : null,
          slot2_id: need2 ? effSlot2 : null,
          student_name: name.trim(),
          grade: Number(grade),
          school: school.trim(),
          guardian_phone: phone,
          enrollment_type: enroll,
          memo: memo || undefined,
          agree_policy: true,
          agree_privacy: true,
          idempotency_key: keyRef.current,
          extra,
          website: trap,
        }),
      });
      const j = await res.json();
      if (!j.ok) { setError(j.message ?? MSG.error); return; }
      setResult({ status: j.status });
      setStep("done");
      window.scrollTo({ top: 0 });
    } catch {
      setError(MSG.error);
    } finally {
      setBusy(false);
    }
  }

  if (step === "done" && result) {
    return (
      <div className="card space-y-3">
        <h2 className="text-xl text-pine">{result.status === "확정" ? "신청이 접수되었어요." : "대기 신청으로 접수되었어요."}</h2>
        <Summary />
        {result.status === "확정" ? (
          <div className="space-y-2 text-[15px]">
            <p className="rounded-xl bg-mint p-3"><b>입금·결제가 확인되면 확정이에요.</b> {confirmNotice}</p>
            {paymentInfo ? <p className="whitespace-pre-line rounded-xl border border-line p-3">{paymentInfo}</p> : <p className="text-muted">입금 안내는 문자로 따로 드려요.</p>}
            <p className="text-muted">이 화면을 캡처해 두시면 편해요.</p>
          </div>
        ) : (
          <p className="text-[15px]">자리가 나면 신청 순서대로 연락드릴게요.</p>
        )}
        <Link href="/check" className="btn w-full">신청 조회하기</Link>
      </div>
    );
  }

  function Summary() {
    return (
      <dl className="grid grid-cols-[84px_1fr] gap-y-1.5 rounded-xl bg-snow p-3 text-[15px]">
        <dt className="text-muted">지점</dt><dd>{b.name}</dd>
        <dt className="text-muted">학생</dt><dd>{name} ({grade}학년)</dd>
        <dt className="text-muted">과정</dt><dd>{course}</dd>
        {need1 && pick1 && (<><dt className="text-muted">1차 타임</dt><dd>{slotText(pick1)}</dd></>)}
        {need2 && pick2 && (<><dt className="text-muted">2차 타임</dt><dd>{slotText(pick2)}</dd></>)}
        <dt className="text-muted">수강료</dt><dd className="font-bold text-pine">{won(price)}</dd>
      </dl>
    );
  }

  if (step === "confirm") {
    return (
      <div className="card space-y-4">
        <h2 className="text-xl text-pine">이대로 신청할까요?</h2>
        <Summary />
        {anyFull && <p className="rounded-xl border border-gold bg-white p-3 text-[15px]">{MSG.fullSlot}</p>}
        {error && <p role="alert" className="text-[15px] font-bold text-red-700">{error}</p>}
        <button className="btn w-full" disabled={busy} onClick={submit}>
          {busy ? "접수 중이에요…" : "이대로 신청할게요"}
        </button>
        <button className="min-h-11 w-full text-[15px] text-muted underline" disabled={busy} onClick={() => setStep("form")}>
          다시 고칠게요
        </button>
      </div>
    );
  }

  const slotPicker = (
    title: string,
    list: typeof s1.slots,
    value: string,
    set: (v: string) => void,
    group: string,
  ) => (
    <fieldset className="mt-3">
      <legend className="label">{title}</legend>
      <div className="space-y-2">
        {list.map((t) => (
          <label key={t.id} className="chip">
            <input type="radio" name={group} className="mr-2 size-4 accent-pine" checked={value === t.id} onChange={() => set(t.id)} />
            {slotText(t)}
            {t.is_full && <span className="ml-1 text-muted">· 마감 (대기 신청)</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) {
          setStep("confirm");
          window.scrollTo({ top: 0 });
        }
      }}
    >
      <section>
        <h2 className="text-lg text-pine">1. 과정 선택</h2>
        <div className="mt-2 space-y-2">
          {courseCards.map((c) => (
            <label key={c.c} className="chip !items-start !py-3">
              <input type="radio" name="course" className="mr-3 mt-1 size-4 accent-pine" checked={course === c.c} onChange={() => setCourse(c.c)} />
              <span>
                <span className="block font-bold">{c.t}</span>
                <span className="block text-sm font-normal text-muted">{c.d}</span>
                <span className="block font-bold text-pine">{won(c.p)}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg text-pine">2. 타임 선택</h2>
        {need1 && slotPicker("1차 타임", s1.slots, slot1, setSlot1, "slot1")}
        {need1 && need2 && (
          <label className="mt-3 flex min-h-11 items-center gap-2 text-[15px]">
            <input type="checkbox" className="size-4 accent-pine" checked={same} onChange={(e) => setSame(e.target.checked)} />
            2차도 같은 시간으로
          </label>
        )}
        {need2 && !(need1 && same) && slotPicker("2차 타임", s2.slots, slot2, setSlot2, "slot2")}
        {need1 && need2 && same && pick2 && <p className="mt-1 text-sm text-muted">2차 타임: {slotText(pick2)}</p>}
        {anyFull && <p className="mt-3 rounded-xl border border-gold bg-white p-3 text-[15px]">{MSG.fullSlot}</p>}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg text-pine">3. 학생 정보</h2>
        <div>
          <label className="label" htmlFor="name">학생 이름</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" maxLength={30} />
        </div>
        <div>
          <label className="label" htmlFor="grade">학년 (현재 학년)</label>
          <select id="grade" className="input" value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="">선택해 주세요</option>
            {[1, 2, 3, 4, 5, 6].map((g) => <option key={g} value={g}>{g}학년</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="school">학교</label>
          <input id="school" className="input" value={school} onChange={(e) => setSchool(e.target.value)} autoComplete="off" />
        </div>
        <div>
          <label className="label" htmlFor="phone">보호자 연락처</label>
          <input id="phone" className="input" inputMode="numeric" placeholder="010-0000-0000" value={phone} onChange={(e) => setPhone(phoneFormat(e.target.value))} autoComplete="tel" />
        </div>
        {priority && (
          <p className="rounded-xl border border-gold bg-white p-3 text-[14px]">
            지금은 <b>재원생 우대 신청 기간</b>이에요. 재원생만 신청할 수 있어요.{b.general_open_at ? ` 비재원생 신청은 ${kDateTime(b.general_open_at)}에 열려요.` : ""}
          </p>
        )}
        <fieldset>
          <legend className="label">재원 구분</legend>
          <div className="space-y-2">
            {[
              ["신규", "신규"],
              ["정규 재원생", b.slug === "dogok" ? "정규 재원생 (타임 신청만)" : "정규 재원생"],
              ["휴원생", "휴원생 (예전에 다닌 적 있어요)"],
              ["타 지점 수강생", "타 지점 수강생"],
            ].map(([v, l]) => (
              <label key={v} className="chip">
                <input type="radio" name="enroll" className="mr-2 size-4 accent-pine" checked={enroll === v} onChange={() => setEnroll(v)} />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        {fields.map((f) => (
          <div key={f.id}>
            <label className="label" htmlFor={`x-${f.key}`}>{f.label}{f.required ? "" : " (선택)"}</label>
            {f.type === "text" && <input id={`x-${f.key}`} className="input" value={String(extra[f.key] ?? "")} onChange={(e) => setExtra({ ...extra, [f.key]: e.target.value })} />}
            {f.type === "textarea" && <textarea id={`x-${f.key}`} className="input !min-h-24 py-2" maxLength={500} value={String(extra[f.key] ?? "")} onChange={(e) => setExtra({ ...extra, [f.key]: e.target.value })} />}
            {f.type === "select" && (
              <select id={`x-${f.key}`} className="input" value={String(extra[f.key] ?? "")} onChange={(e) => setExtra({ ...extra, [f.key]: e.target.value })}>
                <option value="">선택해 주세요</option>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
            {f.type === "checkbox" && (
              <label className="flex min-h-11 items-center gap-2 text-[15px]">
                <input type="checkbox" className="size-5 accent-pine" checked={extra[f.key] === true} onChange={(e) => setExtra({ ...extra, [f.key]: e.target.checked })} />
                {f.help ?? "확인했어요"}
              </label>
            )}
            {f.help && f.type !== "checkbox" && <p className="mt-1 text-sm text-muted">{f.help}</p>}
          </div>
        ))}
        <div>
          <label className="label" htmlFor="memo">요청사항 (선택)</label>
          <textarea id="memo" className="input !min-h-24 py-2" maxLength={200} value={memo} onChange={(e) => setMemo(e.target.value)} />
          <p className="text-right text-xs text-muted">{memo.length}/200</p>
        </div>
        {/* 사람 눈에는 보이지 않는 함정 필드 */}
        <div aria-hidden className="absolute -left-[9999px]">
          <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} name="website" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg text-pine">4. 동의</h2>
        <details className="card !p-4">
          <summary className="cursor-pointer text-[15px] font-bold">[필수] 방학특강 운영 규정 보기</summary>
          <div className="mt-3"><PolicyBox refundDeadline={b.refund_deadline} makeupLimit={b.makeup_limit} makeupStart={b.makeup_start_date} /></div>
        </details>
        <label className="flex min-h-11 items-center gap-2 text-[15px]">
          <input type="checkbox" className="size-5 accent-pine" checked={agreeA} onChange={(e) => setAgreeA(e.target.checked)} />
          [필수] 운영 규정을 확인했어요
        </label>
        <details className="card !p-4">
          <summary className="cursor-pointer text-[15px] font-bold">[필수] 개인정보 수집·이용 보기</summary>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px]">{PRIVACY_ITEMS.map((t) => <li key={t}>{t}</li>)}</ul>
        </details>
        <label className="flex min-h-11 items-center gap-2 text-[15px]">
          <input type="checkbox" className="size-5 accent-pine" checked={agreeB} onChange={(e) => setAgreeB(e.target.checked)} />
          [필수] 개인정보 수집·이용에 보호자 본인이 동의합니다
        </label>
      </section>

      {blockedByPriority && <p className="text-center text-sm text-alert">재원생 우대 기간에는 「정규 재원생」을 선택한 분만 신청할 수 있어요.</p>}
      <button type="submit" className="btn w-full" disabled={!valid}>신청 내용 확인하기</button>
    </form>
  );
}
