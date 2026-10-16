"use client";
import { useState } from "react";

type Row = { course: string; slots: string; status: string };

export default function CheckForm({ branches }: { branches: { slug: string; name: string }[] }) {
  const [branch, setBranch] = useState(branches[0]?.slug ?? "");
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [last4, setLast4] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
        setMsg("");
    try {
      const res = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branch, name, last4 }) });
      const j = await res.json();
      if (!j.ok) { setMsg(j.message); setRows(null); }
      else setRows((j.rows as { course: string; slot1: string | null; slot2: string | null; status: string }[]).map((r) => ({
        course: r.course,
        slots: [r.slot1 && `1차 ${r.slot1}`, r.slot2 && `2차 ${r.slot2}`].filter(Boolean).join(" · "),
        status: r.status,
      })));
    } catch { setMsg("잠시 후 다시 시도해 주세요."); }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={go} className="card space-y-4">
        <div>
          <label className="label" htmlFor="b">지점</label>
          <select id="b" className="input" value={branch} onChange={(e) => setBranch(e.target.value)}>
            {branches.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
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
      {msg && <p role="alert" className="card text-[15px]">{msg}</p>}
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
