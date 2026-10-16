import { kDateOnly, kDateTime } from "@/lib/format";
import type { Branch } from "@/lib/types";

// 신청 일정 안내 (관리자 설정의 단계별 시각에서 자동으로 만들어져요)
export default function ScheduleCard({ b, confirmNotice }: { b: Pick<Branch, "open_at" | "priority_end_at" | "general_open_at" | "close_at" | "final_deadline_at" | "phase">; confirmNotice?: string }) {
  if (!b.open_at) return null;
  const range = (a: string, z: string | null) => (z ? `${kDateTime(a)} ~ ${kDateOnly(z)}` : kDateTime(a));
  const steps: { label: string; text: string; on: boolean }[] = [];
  if (b.priority_end_at) {
    steps.push({ label: "재원생 우대 신청", text: range(b.open_at, b.priority_end_at), on: b.phase === "priority" });
    if (b.general_open_at) steps.push({ label: "비재원생 신청", text: range(b.general_open_at, b.close_at), on: b.phase === "general" });
  } else {
    steps.push({ label: "신청", text: range(b.open_at, b.close_at), on: b.phase === "general" });
  }
  if (b.final_deadline_at) steps.push({ label: "방학특강 신청 최종 마감", text: kDateOnly(b.final_deadline_at), on: false });
  return (
    <section className="card !p-5">
      <h2 className="text-lg text-pine">신청 일정</h2>
      <ol className="mt-3 space-y-2.5">
        {steps.map((s) => (
          <li key={s.label} className="flex items-start gap-3 text-[15px]">
            <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${s.on ? "bg-pine ring-4 ring-mint" : "bg-line"}`} />
            <span><b>{s.label}</b><br /><span className="text-muted">{s.text}</span></span>
          </li>
        ))}
      </ol>
      {confirmNotice && <p className="mt-3 rounded-xl bg-mint p-3 text-[14px] text-ink">{confirmNotice}</p>}
    </section>
  );
}
