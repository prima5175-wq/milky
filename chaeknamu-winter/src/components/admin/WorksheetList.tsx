"use client";
import { useState } from "react";
import { markGraded } from "@/app/admin/lesson-actions";
import { GRADE_PILL } from "@/lib/ui";

type Row = { id: string; lesson_date: string; student_name: string; grade: number; branch_name: string; worksheet_count: number; taught_by: string | null; taught_name: string | null };

export default function WorksheetList({ rows, canAll, me }: { rows: Row[]; canAll: boolean; me: string }) {
  const [done, setDone] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const left = rows.filter((r) => !done.includes(r.id));
  return (
    <div className="space-y-2">
      {err && <p role="alert" className="text-alert">{err}</p>}
      <ul className="divide-y divide-line rounded-[18px] border border-line bg-white">
        {left.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-[15px]">
            <span className="tabular-nums text-muted">{r.lesson_date.slice(5)}</span>
            <b>{r.student_name}</b>
            <span className={`rounded-full px-2 text-sm font-bold ${GRADE_PILL[r.grade]}`}>{r.grade}학년</span>
            <span>활동지 {r.worksheet_count}장</span>
            <span className="text-sm text-muted">수업 강사: {r.taught_name ?? "미기록"}</span>
            <button
              className="btn ml-auto !min-h-11 text-[15px]"
              disabled={!canAll && r.taught_by !== me}
              onClick={async () => { const x = await markGraded(r.id); if (x.ok) setDone([...done, r.id]); else setErr(x.message ?? ""); }}
            >첨삭 완료</button>
          </li>
        ))}
        {left.length === 0 && <li className="px-4 py-6 text-center text-muted">첨삭할 활동지가 없어요. 모두 확인됐어요.</li>}
      </ul>
    </div>
  );
}
