import type { AssessmentRecord } from "./types";

export type RetestStatus = "none" | "ok" | "soon" | "overdue";
export interface RetestInfo { status: RetestStatus; lastOn?: string; dueOn?: string; daysLeft?: number }

const DAY = 86_400_000;
const toUtc = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d); };

export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12), nm = total % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate(); // 말일 보정 (1/31 + 1개월 = 2/28)
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/** 마지막 시행일 + 권장 간격으로 다음 검사 예정일을 계산한다. 30일 이내면 soon. */
export function retestInfo(records: AssessmentRecord[], catalogId: string, intervalMonths: number | undefined, today: string): RetestInfo {
  const mine = records.filter((r) => r.catalogId === catalogId && !r.supersededBy);
  if (!intervalMonths || mine.length === 0) return { status: "none" };
  const lastOn = mine.map((r) => r.administeredOn).sort().at(-1)!;
  const dueOn = addMonths(lastOn, intervalMonths);
  const daysLeft = Math.round((toUtc(dueOn) - toUtc(today)) / DAY);
  return { status: daysLeft < 0 ? "overdue" : daysLeft <= 30 ? "soon" : "ok", lastOn, dueOn, daysLeft };
}
