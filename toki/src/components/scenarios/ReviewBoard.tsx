"use client";
import { useMemo, useState } from "react";
import { REVIEW_LABEL, transition } from "@/lib/scenarios/review";
import { REVIEW_STATUS, SETTINGS, type ReviewStatus, type Scenario } from "@/lib/scenarios/schema";

export function ReviewBoard({ initial }: { initial: Scenario[] }) {
  const [list, setList] = useState(initial);
  const [status, setStatus] = useState<ReviewStatus | "all">("all");
  const [setting, setSetting] = useState<string>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const counts = useMemo(() => Object.fromEntries(REVIEW_STATUS.map((s) => [s, list.filter((x) => x.reviewStatus === s).length])), [list]);
  const shown = list.filter((s) => (status === "all" || s.reviewStatus === status) && (setting === "all" || s.setting === setting));

  function move(s: Scenario, to: ReviewStatus) {
    let note: string | undefined;
    if (to === "draft") { note = window.prompt("초안으로 되돌리는 사유") ?? ""; }
    // 데모: 실제로는 로그인한 관리자·검토자 정보를 사용한다.
    const r = transition(s, { to, note, reviewerId: to === "approved" ? "demo-reviewer" : undefined, actorRole: "admin" });
    if (!r.ok) { setMsg(r.error); return; }
    setMsg(""); setList((l) => l.map((x) => (x.id === s.id ? r.scenario : x)));
  }

  return (
    <div>
      <p className="mb-3 text-sm">{REVIEW_STATUS.map((s) => `${REVIEW_LABEL[s]} ${counts[s]}`).join(" · ")} · 전체 {list.length}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <select aria-label="상태 필터" className="rounded border p-1" value={status} onChange={(e) => setStatus(e.target.value as ReviewStatus | "all")}>
          <option value="all">상태 전체</option>{REVIEW_STATUS.map((s) => <option key={s} value={s}>{REVIEW_LABEL[s]}</option>)}
        </select>
        <select aria-label="장소 필터" className="rounded border p-1" value={setting} onChange={(e) => setSetting(e.target.value)}>
          <option value="all">장소 전체</option>{SETTINGS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {msg && <p role="alert" className="mb-2 text-sm text-red-700">{msg}</p>}
      <ul className="space-y-2">
        {shown.map((s) => (
          <li key={s.id} className="rounded-xl border p-3">
            <button className="w-full text-left" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>
              <span className="text-xs opacity-60">{s.id} · {s.setting} · {s.ageBand} · {s.targetLevel}단계 · {s.domain.join(", ")}</span><br />
              <strong>“{s.partnerLine}”</strong> <span className="ml-1 rounded bg-black/5 px-2 text-xs">{REVIEW_LABEL[s.reviewStatus]}</span>
            </button>
            {open === s.id && (
              <div className="mt-2 space-y-1 text-sm">
                <p>상황: {s.situation}</p>
                <p>어색한 예: “{s.awkwardExample.line}” — {s.awkwardExample.whyAwkward}</p>
                {(["1", "2", "3", "4"] as const).map((lv) => <p key={lv}>{lv}단계: {s.goodResponses[lv].join(" / ")}</p>)}
                <p>미션: {s.mission}</p>
                <div className="flex gap-2 pt-2">
                  {s.reviewStatus === "draft" && <button className="rounded bg-[var(--accent)] px-3 py-1 text-white" onClick={() => move(s, "expert_review")}>검토 요청</button>}
                  {s.reviewStatus === "expert_review" && <button className="rounded bg-green-700 px-3 py-1 text-white" onClick={() => move(s, "approved")}>승인</button>}
                  {s.reviewStatus !== "draft" && <button className="rounded border px-3 py-1" onClick={() => move(s, "draft")}>초안으로 되돌리기</button>}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
