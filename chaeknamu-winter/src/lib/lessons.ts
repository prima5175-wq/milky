// 수업일 계산 (모두 한국 시각 기준 날짜 'YYYY-MM-DD')
export const CLOSED_DAYS = ["2027-02-06", "2027-02-07", "2027-02-08", "2027-02-09"]; // 설 연휴 휴원

export function todayKst() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}


export function isLessonDay(d: string) {
  const w = new Date(`${d}T12:00:00+09:00`).getUTCDay();
  return w >= 1 && w <= 5 && !CLOSED_DAYS.includes(d);
}

export function dayReason(d: string) {
  const w = new Date(`${d}T12:00:00+09:00`).getUTCDay();
  if (w === 0 || w === 6) return "주말에는 수업이 없어요.";
  if (CLOSED_DAYS.includes(d)) return "설 연휴 휴원일이에요.";
  return "";
}
