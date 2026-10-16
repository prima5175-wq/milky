"use client";
import { useState } from "react";
import { BRANCHES } from "@/lib/mock";

type Row = { course: string; slots: string; status: string };

export default function CheckForm() {
  const [branch, setBranch] = useState(BRANCHES[0].slug);
  const [name, setName] = useState("");
  const [last4, setLast4] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    // 3단계: 가짜 조회 (홍길동 / 1234 만 결과가 나와요)
    setRows(name.trim() === "홍길동" && last4 === "1234" ? [{ course: "1·2차", slots: "1차 2부 · 2차 2부", status: "확정" }] : []);
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={go} className="card space-y-4">
        <div>
          <label className="label" htmlFor="b">지점</label>
          <select id="b" className="input" value={branch} onChange={(e) => setBranch(e.target.value)}>
            {BRANCHES.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="n">학생 이름</label>
          <input id="n" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </div>
        <div>
          <label className="label" htmlFor="l">보호자 연락처 뒷 4자리</label>
          <input id="l" className="input" inputMode="numeric" maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))} />
        </div>
        <button className="btn w-full" disabled={busy || !name.trim() || last4.length !== 4}>{busy ? "찾는 중이에요…" : "조회하기"}</button>
      </form>
      {rows && rows.length === 0 && <p className="card text-[15px]">일치하는 신청이 없어요.</p>}
      {rows?.map((r) => (
        <div key={r.course} className="card text-[15px]">
          <p className="font-bold">{r.course}</p>
          <p className="text-muted">{r.slots}</p>
          <p className="mt-1 font-bold text-pine">{r.status === "확정" ? "확정되었어요" : r.status === "대기" ? "대기로 접수되었어요" : r.status}</p>
        </div>
      ))}
    </div>
  );
}
