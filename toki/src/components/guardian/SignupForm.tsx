"use client";
import { useState } from "react";
import Link from "next/link";
import { AGE_BANDS, CONSENT_LABEL, validateSignup, type ConsentKind } from "@/lib/consent/consent";

export function SignupForm() {
  const [f, setF] = useState({ guardianName: "", email: "", pin: "", childNickname: "", ageBand: "7-8" });
  const [legal, setLegal] = useState(false);
  const [consents, setConsents] = useState<Partial<Record<ConsentKind, boolean>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({}); const [done, setDone] = useState(false);
  const on = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  async function submit() {
    const body = { ...f, isLegalGuardian: legal, consents };
    const v = validateSignup(body); setErrors(v.errors); if (!v.ok) return;
    const r = await fetch("/api/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) setDone(true); else { const j = await r.json(); setErrors(j.errors ?? { _form: r.status === 409 ? "이미 가입되어 있어요. 보호자 화면에서 PIN으로 들어가 주세요." : "가입하지 못했어요" }); }
  }
  if (done) return <main className="mx-auto max-w-md space-y-3 p-6"><h1 className="text-2xl font-bold">가입 완료</h1><p>아이 화면을 쓸 수 있어요. 보호자 PIN은 꼭 기억해 주세요.</p><Link className="underline" href="/guardian">보호자 화면으로</Link></main>;
  const field = "w-full rounded border p-2"; const err = (k: string) => errors[k] && <span role="alert" className="text-xs text-red-700">{errors[k]}</span>;
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <p className="rounded bg-yellow-100 p-2 text-sm">동의 문구와 절차는 법률 검토 전 초안입니다.</p>
      <h1 className="text-2xl font-bold">보호자 가입</h1>
      <label className="block text-sm">보호자 이름<input className={field} value={f.guardianName} onChange={on("guardianName")} />{err("guardianName")}</label>
      <label className="block text-sm">이메일<input type="email" className={field} value={f.email} onChange={on("email")} />{err("email")}</label>
      <label className="block text-sm">보호자 PIN (숫자 4~6자리)<input type="password" inputMode="numeric" className={field} value={f.pin} onChange={on("pin")} />{err("pin")}</label>
      <h2 className="pt-2 text-lg font-bold">아이 정보</h2>
      <label className="block text-sm">아이 별명 (실명 대신 별명을 권장해요)<input className={field} value={f.childNickname} onChange={on("childNickname")} />{err("childNickname")}</label>
      <label className="block text-sm">연령대 (생년월일은 받지 않아요)<select className={field} value={f.ageBand} onChange={on("ageBand")}>{AGE_BANDS.map((a) => <option key={a} value={a}>만 {a}세</option>)}</select>{err("ageBand")}</label>
      <h2 className="pt-2 text-lg font-bold">동의</h2>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={legal} onChange={(e) => setLegal(e.target.checked)} /> 저는 이 아이의 법정대리인(보호자)입니다. (만 14세 미만 아동은 법정대리인의 동의가 필요해요)</label>{err("isLegalGuardian")}
      {(Object.keys(CONSENT_LABEL) as ConsentKind[]).map((k) => (
        <label key={k} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={!!consents[k]} onChange={(e) => setConsents({ ...consents, [k]: e.target.checked })} /> {CONSENT_LABEL[k]}</label>))}
      {err("service")}
      <p className="text-xs opacity-70">선택 항목은 동의하지 않아도 이용할 수 있고, 언제든 보호자 화면에서 철회할 수 있어요. <Link className="underline" href="/legal/privacy">개인정보처리방침</Link> · <Link className="underline" href="/legal/terms">이용약관</Link></p>
      {errors._form && <p role="alert" className="text-sm text-red-700">{errors._form}</p>}
      <button className="w-full rounded-xl bg-[var(--accent)] p-3 text-white" onClick={submit}>동의하고 가입하기</button>
    </main>
  );
}
