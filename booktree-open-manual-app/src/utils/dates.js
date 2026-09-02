// 오픈일 기반 D-Day / 각 단계 예상 날짜 계산 유틸

// 원본 매뉴얼 phase 오프셋 (오픈일로부터 D-N)
export const STEP_OFFSETS = {
  1: 60, 2: 55, 3: 50, 4: 45, 5: 42, 6: 40, 7: 38, 8: 35, 9: 33, 10: 30,
  11: 14, 12: 14, 13: 45, 14: 10, 15: 7, 16: 5, 17: 5, 18: 3, 19: 2, 20: 0
};

export function calcDaysToOpen(openDateISO) {
  if (!openDateISO) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const open = new Date(openDateISO);
  open.setHours(0, 0, 0, 0);
  return Math.ceil((open - today) / (1000 * 60 * 60 * 24));
}

export function getStepDate(stepN, openDateISO) {
  if (!openDateISO) return null;
  const offset = STEP_OFFSETS[stepN];
  if (offset === undefined) return null;
  const open = new Date(openDateISO);
  open.setHours(0, 0, 0, 0);
  const d = new Date(open);
  d.setDate(d.getDate() - offset);
  return d;
}

export function formatStepDate(stepN, openDateISO) {
  const d = getStepDate(stepN, openDateISO);
  if (!d) return null;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${m}/${day} (${days[d.getDay()]})`;
}

export function formatKoDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}
