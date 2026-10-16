// 관리자 화면 색 구분. (Tailwind가 클래스를 찾을 수 있도록 문자열을 통째로 적어요)
export const GRADE_ROW: Record<number, string> = {
  1: "border-l-[6px] border-l-[#e9867a] bg-[#fdf0ee]",
  2: "border-l-[6px] border-l-[#f0a24b] bg-[#fef5e8]",
  3: "border-l-[6px] border-l-[#d9c23a] bg-[#fdfae6]",
  4: "border-l-[6px] border-l-[#5bb98a] bg-[#eef9f3]",
  5: "border-l-[6px] border-l-[#5a9fd4] bg-[#edf5fb]",
  6: "border-l-[6px] border-l-[#9a7fd1] bg-[#f3effb]",
};
export const GRADE_PILL: Record<number, string> = {
  1: "bg-[#e9867a] text-white", 2: "bg-[#f0a24b] text-ink", 3: "bg-[#d9c23a] text-ink",
  4: "bg-[#5bb98a] text-white", 5: "bg-[#5a9fd4] text-white", 6: "bg-[#9a7fd1] text-white",
};
export const SLOT_CHIP: Record<string, string> = {
  "1부": "bg-[#2f7a68] text-white", "2부": "bg-[#3b78c2] text-white", "3부": "bg-[#c9822a] text-white",
  "4부": "bg-[#8a5cc2] text-white", "5부": "bg-[#c2506b] text-white",
};
export const COURSE_CHIP: Record<string, string> = {
  "1차": "bg-ink text-white",
  "2차": "bg-gold text-ink ring-2 ring-ink/70",
};
export const STATUS_BADGE: Record<string, string> = {
  확정: "bg-pine text-white", 대기: "bg-white text-alert ring-2 ring-alert", 취소: "bg-line text-muted", 환불: "bg-line text-muted",
};
export const ENROLL_LABEL: Record<string, string> = {
  신규: "신규", "정규 재원생": "재원생", 휴원생: "휴원생", "타 지점 수강생": "타 지점",
};
