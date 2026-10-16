// 3단계용 가짜 데이터. 4단계에서 실제 DB 응답(public_branch_status)으로 바꿔요.
import type { Branch, Slot } from "./types";

const T = [
  ["1부", "09:00", "10:30"],
  ["2부", "10:30", "12:00"],
  ["3부", "12:30", "14:00"],
  ["4부", "14:00", "15:30"],
  ["5부", "15:30", "17:00"],
];

function slots(prefix: string, count: number, fullLabels: string[] = []): Slot[] {
  return T.slice(0, count).map(([label, s, e]) => ({
    id: `${prefix}-${label}`,
    label,
    start_time: s,
    end_time: e,
    is_full: fullLabels.includes(label),
  }));
}

export const BRANCHES: Branch[] = [
  {
    slug: "daechi",
    name: "1관 대치점(한티역)",
    open_at: "2026-11-01T01:00:00Z",
    refund_deadline: "2026-12-27T14:59:00Z",
    contact_url: "https://tinyurl.com/3pfkxtjn",
    notice: "방학 중 정규수업은 평일 14:00~19:00로 운영해요. (학기 중 21:00까지)",
    bundle_price: 850000,
    makeup_limit: 3,
    sessions: [
      { code: "1차", start_date: "2027-01-11", end_date: "2027-02-05", lesson_count: 20, price: 520000, slots: slots("d1", 3, ["1부"]) },
      { code: "2차", start_date: "2027-02-10", end_date: "2027-02-26", lesson_count: 13, price: 330000, slots: slots("d2", 3) },
    ],
  },
  {
    slug: "dogok",
    name: "2관 대치도곡초점",
    open_at: "2026-11-01T01:00:00Z",
    refund_deadline: "2026-12-27T14:59:00Z",
    contact_url: null,
    notice: "방학 동안 특강·정규 구분 없이 5타임으로 운영해요. 정규 수강생도 이 앱에서 타임을 신청해 주세요.",
    bundle_price: 850000,
    makeup_limit: 3,
    sessions: [
      { code: "1차", start_date: "2027-01-11", end_date: "2027-02-05", lesson_count: 20, price: 520000, slots: slots("g1", 5) },
      { code: "2차", start_date: "2027-02-10", end_date: "2027-02-26", lesson_count: 13, price: 330000, slots: slots("g2", 5) },
    ],
  },
  {
    slug: "guryong",
    name: "3관 대치구룡초점",
    open_at: null,
    refund_deadline: "2026-12-20T14:59:00Z",
    contact_url: null,
    notice: null,
    bundle_price: 980000,
    makeup_limit: 3,
    sessions: [
      { code: "1차", start_date: "2027-01-04", end_date: "2027-01-29", lesson_count: 20, price: 520000, slots: slots("r1", 3) },
      { code: "2차", start_date: "2027-02-01", end_date: "2027-02-26", lesson_count: 18, price: 460000, slots: slots("r2", 3) },
    ],
  },
];

export const CURRICULUM = [
  { group: "1~2학년", items: ["시사독해 · 일기쓰기와 활동지", "긴 글쓰기", "다양한 영역 독서와 북토킹"] },
  { group: "3~4학년", items: ["시사독해", "한국사 진도", "긴 글쓰기 단계별 훈련과 원고지쓰기", "다양한 영역 독서와 북토킹"] },
  { group: "5~6학년", items: ["생기부 필독서 읽고 서평쓰기", "한국사·세계사 심화", "문학 작품 발문지"] },
];

export function getBranch(slug: string) {
  return BRANCHES.find((b) => b.slug === slug);
}
