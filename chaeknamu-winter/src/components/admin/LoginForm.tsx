"use client";
import { useActionState } from "react";
import { requestLogin } from "@/app/admin/actions";

export default function LoginForm({ dev }: { dev: boolean }) {
  const [state, action, pending] = useActionState(requestLogin, null);
  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="email">관리자 이메일</label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <button className="btn w-full" disabled={pending}>{pending ? "확인 중이에요…" : dev ? "로그인" : "로그인 링크 받기"}</button>
      {state && <p role="status" className="text-[15px] text-muted">{state.message}</p>}
      {dev && (
        <p className="rounded-xl bg-mint p-3 text-sm text-ink">
          지금은 내 컴퓨터 임시 DB로 돌고 있어서 메일 없이 바로 들어가요. 연습용 이메일: owner@example.com(원장), daechi@example.com(지점 관리자), teacher@example.com(강사)
        </p>
      )}
    </form>
  );
}
