"use client";
import { useState } from "react";
import { kDate } from "@/lib/format";

type Row = {
  id: string; course: string; slot1: string | null; slot2: string | null; status: string;
  attendance?: { present: number; absent: number };
  makeup?: { limit: number; used: number; start: string; end: string; list: { d: string; time_note: string; status: string }[] };
};

function MakeupBox({ r, q, onDone }: { r: Row; q: { branch: string; name: string; last4: string }; onDone: () => void }) {
  const m = r.makeup!;
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [msg, setMsg] = useState("");
  const left = Math.max(0, m.limit - m.used);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/makeup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...q, application_id: r.id, date, time_note: time }) });
    const j = await res.json();
    if (j.ok) { setMsg("보강을 요청했어요. 확인되면 안내드릴게요."); setDate(""); setTime(""); onDone(); } else setMsg(j.message ?? "잠시 후 다시 시도해 주세요.");
  }
  return (
    <div className="mt-3 space-y-2 rounded-xl bg-snow p-3 text-[15px]">
      <p>보강 <b>{m.used}회 사용</b> · 남은 횟수 <b className="text-pine">{left}회</b></p>
      {m.list.length > 0 && <ul className="text-sm text-muted">{m.list.map((x) => <li key={x.d + x.time_note}>{x.d} {x.time_note} · {x.status === "요청" ? "확인 중" : "확정"}</li>)}</ul>}
      {left > 0 && (
        <form onSubmit={send} className="space-y-2">
          <p className="text-sm text-muted">보강 가능 기간: {kDate(m.start)} ~ {kDate(m.end)} (평일만)</p>
          <input type="date" className="input" min={m.start} max={m.end} value={date} onChange={(e) => setDate(e.target.value)} required aria-label="보강 날짜" />
          <input className="input" placeholder="희망 시간 (예: 3부 12:30)" value={time} onChange={(e) => setTime(e.target.value)} aria-label="희망 시간" />
          <button className="btn w-full">보강 요청하기</button>
        </form>
      )}
      {msg && <p role="status" className="text-sm text-pine">{msg}</p>}
    </div>
  );
}

export default function CheckForm({ branches }: { branches: { slug: string; name: string }[] }) {
  const [branch, setBranch] = useState(branches[0]?.slug ?? "");
  const [name, setName] = useState("");
  const [last4, setLast4] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function look() {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branch, name, last4 }) });
      const j = await res.json();
      if (!j.ok) { setMsg(j.message); setRows(null); } else setRows(j.rows);
    } catch { setMsg("잠시 후 다시 시도해 주세요."); }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); look(); }} className="card space-y-4">
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
        <div key={r.id} className="card text-[15px]">
          <p className="font-bold">{r.course}</p>
          <p className="text-muted">{[r.slot1 && `1차 ${r.slot1}`, r.slot2 && `2차 ${r.slot2}`].filter(Boolean).join(" · ")}</p>
          <p className="mt-1 font-bold text-pine">{r.status === "확정" ? "확정되었어요" : r.status === "대기" ? "대기로 접수되었어요" : r.status}</p>
          {r.attendance && <p className="mt-1">출석 {r.attendance.present}회 · 결석 {r.attendance.absent}회</p>}
          {r.makeup && r.makeup.start && <MakeupBox r={r} q={{ branch, name, last4 }} onDone={look} />}
        </div>
      ))}
    </div>
  );
}
