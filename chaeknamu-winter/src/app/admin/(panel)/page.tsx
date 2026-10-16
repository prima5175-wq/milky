import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { dashboard } from "@/lib/admin-queries";

export default async function Dashboard() {
  const a = await requireAdmin();
  if (a.role === "teacher") redirect("/admin/attendance");
  const rows = await dashboard(a);
  const byBranch = Map.groupBy(rows, (r) => r.branch_name);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-pine">신청 현황</h1>
        <p className="mt-1 text-[15px] text-muted">확정 / 정원 · 대기. 정원 숫자는 관리자에게만 보여요.</p>
      </div>
      {[...byBranch].map(([name, list]) => (
        <section key={name}>
          <h2 className="text-lg text-pine">{name}</h2>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            {["1차", "2차"].map((code) => (
              <div key={code} className="card !p-4">
                <p className="font-bold">{code}</p>
                <ul className="mt-2 space-y-3">
                  {list.filter((r) => r.code === code).map((r) => {
                    const ratio = r.capacity ? r.confirmed / r.capacity : 0;
                    const color = ratio >= 1 ? "bg-alert" : ratio >= 0.7 ? "bg-gold" : "bg-pine";
                    return (
                      <li key={r.label}>
                        <div className="flex items-baseline justify-between text-[15px]">
                          <span>{r.label} <span className="text-sm text-muted">{r.start_time}</span></span>
                          <span className="tabular-nums">
                            <b>{r.confirmed}</b> / {r.capacity ?? "제한 없음"}
                            {r.waiting > 0 && <span className="ml-2 rounded-full bg-gold/30 px-2 text-sm">대기 {r.waiting}</span>}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-mint">
                          <div className={`h-full ${color}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
