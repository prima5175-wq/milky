const KST = "Asia/Seoul";

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export function kDate(d: string) {
  // 'YYYY-MM-DD' → '1월 11일(월)'
  const date = new Date(`${d}T00:00:00+09:00`);
  const md = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, month: "long", day: "numeric" }).format(date);
  const wd = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, weekday: "short" }).format(date);
  return `${md}(${wd})`;
}

export function kDateTime(iso: string) {
  // ISO → '11월 1일(일) 오전 10시'
  const date = new Date(iso);
  const md = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, month: "long", day: "numeric" }).format(date);
  const wd = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, weekday: "short" }).format(date);
  const t = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, hour: "numeric", minute: "2-digit", hour12: true }).format(date);
  return `${md}(${wd}) ${t.replace(":00", "")}`;
}

export const slotText = (s: { label: string; start_time: string; end_time: string }) =>
  `${s.label} ${s.start_time}~${s.end_time}`;

export function phoneFormat(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export function kDateOnly(iso: string) {
  // ISO → 한국 날짜 기준 '12월 27일(일)'
  const ymd = new Intl.DateTimeFormat("sv-SE", { timeZone: KST }).format(new Date(iso));
  return kDate(ymd);
}
