// 관리자 화면 색 구분. (Tailwind가 클래스를 찾을 수 있도록 문자열을 통째로 적어요)
export const GRADE_ROW: Record<number, string> = {
  1: "border-l-[6px] border-l-[#c98a7e] bg-[#faeeea]",
  2: "border-l-[6px] border-l-[#d3a057] bg-[#fbf1e1]",
  3: "border-l-[6px] border-l-[#b9ae6a] bg-[#f8f5e3]",
  4: "border-l-[6px] border-l-[#8aa89a] bg-[#edf3ef]",
  5: "border-l-[6px] border-l-[#8199b3] bg-[#ecf0f5]",
  6: "border-l-[6px] border-l-[#a690b8] bg-[#f2edf6]",
};
export const GRADE_PILL: Record<number, string> = {
  1: "bg-[#c98a7e] text-white", 2: "bg-[#d3a057] text-white", 3: "bg-[#b9ae6a] text-ink",
  4: "bg-[#8aa89a] text-white", 5: "bg-[#8199b3] text-white", 6: "bg-[#a690b8] text-white",
};
export const SLOT_CHIP: Record<string, string> = {
  "1부": "bg-[#efe3c8] text-[#7a5a1c]", "2부": "bg-[#dde3ea] text-[#37495e]", "3부": "bg-[#f0dcd2] text-[#85462f]",
  "4부": "bg-[#e6dce6] text-[#5a3b5c]", "5부": "bg-[#e3e0db] text-[#46423c]",
};
export const COURSE_CHIP: Record<string, string> = {
  "1차": "bg-ink text-white",
  "2차": "bg-white text-ink ring-1 ring-gold",
};
export const STATUS_BADGE: Record<string, string> = {
  확정: "bg-pine text-white", 대기: "bg-white text-alert ring-2 ring-alert", 취소: "bg-line text-muted", 환불: "bg-line text-muted",
};
export const ENROLL_LABEL: Record<string, string> = {
  신규: "신규", "정규 재원생": "재원생", 휴원생: "휴원생", "타 지점 수강생": "타 지점",
};
