"use client";
import { useEffect, useRef, useState } from "react";
import type { Book, Student } from "@/lib/lesson-queries";
import { applyCommonActivity, saveRecord, setAttendance } from "@/app/admin/lesson-actions";
import { GRADE_PILL } from "@/lib/ui";

type Staff = { email: string; name: string };
type Me = { email: string; role: string };
const ATT = [
  ["출석", "bg-pine text-white"],
  ["지각", "bg-gold text-ink"],
  ["결석", "bg-alert text-white"],
] as const;

function kstNow() {
  const f = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" }).format(new Date());
  return { date: f.slice(0, 10), time: f.slice(11, 16) };
}
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

function Card({ s, date, staff, me }: { s: Student; date: string; staff: Staff[]; me: Me }) {
  const [att, setAtt] = useState(s.att_status);
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState(s.activity);
  const [comment, setComment] = useState(s.comment);
  const [worksheets, setWorksheets] = useState(s.worksheet_count);
  const [taught, setTaught] = useState(s.taught_by ?? (me.role === "teacher" ? me.email : ""));
  const [graded, setGraded] = useState(s.worksheet_graded);
  const [books, setBooks] = useState<Book[]>(s.books);
  const [state, setState] = useState<"" | "saving" | "saved" | "error">("");
  const [msg, setMsg] = useState("");
  const first = useRef(true);

  // 입력이 멈추고 0.8초 뒤 자동 저장
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setState("saving");
    const t = setTimeout(async () => {
      const r = await saveRecord(s.id, date, { activity, comment, worksheet_count: worksheets, taught_by: taught || null, graded, books });
      if (r.ok) { setState("saved"); setMsg(""); } else { setState("error"); setMsg(r.message ?? "저장하지 못했어요."); if (r.message?.includes("첨삭")) setGraded(s.worksheet_graded); }
    }, 800);
    return () => clearTimeout(t);
  }, [activity, comment, worksheets, taught, graded, books]); // eslint-disable-line react-hooks/exhaustive-deps

  // 외부에서(반 공통 활동) 바뀐 값 반영
  useEffect(() => { setActivity(s.activity); }, [s.activity]);

  const now = kstNow();
  const absentSoon = !att && date === now.date && minutes(now.time) > minutes(s.start_time) + 30;
  const canGrade = me.role !== "teacher" || taught === me.email;

  async function mark(status: "출석" | "지각" | "결석") {
    const next = att === status ? null : status;
    setAtt(next);
    const r = await setAttendance(s.id, date, s.slot_id, next);
    if (!r.ok) { setAtt(att); setMsg(r.message ?? ""); }
  }

  return (
    <li className="card !p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen(!open)} className="flex min-h-12 items-center gap-2 text-left" aria-expanded={open}>
          <span className="text-lg font-bold">{s.student_name}</span>
          <span className={`rounded-full px-2 text-sm font-bold ${GRADE_PILL[s.grade]}`}>{s.grade}학년</span>
          {absentSoon && <span className="rounded bg-alert px-2 text-sm text-white">결석 예정</span>}
          {s.worksheet_count > 0 && !graded && <span className="rounded bg-white px-2 text-sm text-alert ring-2 ring-alert">첨삭 전</span>}
          <span className="text-sm text-muted">{open ? "접기 ▲" : "기록하기 ▼"}</span>
        </button>
        <div className="ml-auto flex gap-2">
          {ATT.map(([k, cls]) => (
            <button key={k} type="button" onClick={() => mark(k)} aria-pressed={att === k}
              className={`min-h-12 min-w-16 rounded-xl px-4 text-base font-bold ${att === k ? cls : "bg-white text-muted ring-1 ring-line"}`}>
              {k}
            </button>
          ))}
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          <div>
            <label className="label">당일 활동</label>
            <textarea className="input !min-h-20 py-2" value={activity} onChange={(e) => setActivity(e.target.value)} />
          </div>
          <div>
            <label className="label">선생님 코멘트</label>
            <textarea className="input !min-h-20 py-2" value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <div>
            <p className="label">읽은 책</p>
            <ul className="space-y-2">
              {books.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <input className="input" placeholder="책 제목" value={b.title} onChange={(e) => setBooks(books.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                  <input className="input !w-20 shrink-0" type="number" min={1} aria-label="권수" value={b.volumes} onChange={(e) => setBooks(books.map((x, j) => (j === i ? { ...x, volumes: Number(e.target.value) } : x)))} />
                  <span className="flex items-center text-sm text-muted">권</span>
                  <button type="button" className="min-h-11 shrink-0 rounded-xl border border-line px-3 text-alert" onClick={() => setBooks(books.filter((_, j) => j !== i))}>삭제</button>
                </li>
              ))}
            </ul>
            <button type="button" className="mt-2 min-h-11 rounded-xl border border-line px-4 text-[15px]" onClick={() => setBooks([...books, { title: "", volumes: 1 }])}>+ 책 추가</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">활동지 개수</label>
              <input className="input" type="number" min={0} value={worksheets} onChange={(e) => setWorksheets(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">수업한 강사</label>
              <select className="input" value={taught} onChange={(e) => setTaught(e.target.value)}>
                <option value="">선택해 주세요</option>
                {staff.map((t) => <option key={t.email} value={t.email}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <p className="label">활동지 첨삭</p>
              <label className={`flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 ${canGrade ? "" : "opacity-50"}`}>
                <input type="checkbox" className="size-5 accent-pine" disabled={!canGrade || worksheets === 0} checked={graded} onChange={(e) => setGraded(e.target.checked)} />
                첨삭 완료
              </label>
              {!canGrade && <p className="mt-1 text-xs text-muted">그날 수업한 강사만 체크할 수 있어요.</p>}
            </div>
          </div>
          <p className="text-sm text-muted" aria-live="polite">
            {state === "saving" && "저장 중…"}{state === "saved" && "저장됐어요."}{state === "error" && <span className="text-alert">{msg}</span>}
          </p>
        </div>
      )}
    </li>
  );
}

export default function AttendanceBoard({ students, date, staff, me }: { students: Student[]; date: string; staff: Staff[]; me: Me }) {
  const [common, setCommon] = useState("");
  const [list, setList] = useState(students);
  const [note, setNote] = useState("");
  useEffect(() => setList(students), [students]);

  const total = list.length;
  const done = list.filter((s) => s.att_status).length;

  async function applyAll() {
    if (!common.trim()) return;
    const r = await applyCommonActivity(list.map((s) => s.id), date, common.trim());
    if (r.ok) { setList(list.map((s) => ({ ...s, activity: common.trim() }))); setNote("모든 학생의 당일 활동에 적용했어요."); }
    else setNote(r.message ?? "");
  }

  return (
    <div className="space-y-4">
      <div className="card !p-4">
        <p className="text-sm text-muted">출석 체크 {done} / {total}명</p>
        <label className="label mt-2" htmlFor="common">반 공통 활동 (한 번에 모든 학생에게 적용)</label>
        <div className="flex gap-2">
          <input id="common" className="input" value={common} onChange={(e) => setCommon(e.target.value)} placeholder="예: 시사독해 · 원고지 쓰기" />
          <button type="button" className="btn shrink-0" onClick={applyAll}>적용</button>
        </div>
        {note && <p className="mt-1 text-sm text-pine" role="status">{note}</p>}
      </div>
      <ul className="space-y-3">
        {list.map((s) => <Card key={s.id} s={s} date={date} staff={staff} me={me} />)}
        {total === 0 && <li className="card text-[15px] text-muted">이 날짜·타임에 수업하는 학생이 없어요.</li>}
      </ul>
    </div>
  );
}
