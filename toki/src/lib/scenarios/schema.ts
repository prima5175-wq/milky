// 시나리오 형식. 모든 문항은 토키가 새로 만든 것이며 외부 검사지 문항을 복제하지 않는다.
export const AGE_BANDS = ["유아", "초등 저학년", "초등 중학년", "초등 고학년"] as const;
export const DOMAINS = ["담화 관리", "상황 맥락 조절", "의사소통 기능", "비언어적 의사소통"] as const;
export const SETTINGS = ["학교 교실", "쉬는 시간", "급식실", "놀이터", "학원", "집(가족)", "생일파티", "온라인 단톡방·게임 채팅", "운동·체육 시간", "처음 만난 친구"] as const;
export const EMOTIONS = ["기쁨", "슬픔", "화남", "놀람", "걱정", "속상함", "설렘", "지루함", "미안함", "자랑스러움"] as const;
export const REVIEW_STATUS = ["draft", "expert_review", "approved"] as const;

export type AgeBand = (typeof AGE_BANDS)[number];
export type Domain = (typeof DOMAINS)[number];
export type ReviewStatus = (typeof REVIEW_STATUS)[number];
export type Level = 1 | 2 | 3 | 4;

export interface Scenario {
  id: string;
  setting: (typeof SETTINGS)[number];
  ageBand: AgeBand;
  domain: Domain[];
  targetLevel: Level;
  situation: string;
  partnerLine: string;
  partnerEmotion: (typeof EMOTIONS)[number];
  awkwardExample: { line: string; whyAwkward: string };
  goodResponses: Record<"1" | "2" | "3" | "4", string[]>;
  choiceOptions: string[];
  mission: string;
  conflict?: boolean; // 갈등·속상한 상황 여부
  media: { cartoon: string | null; videoAwkward: string | null; videoGood: string | null };
  reviewStatus: ReviewStatus;
}

/** 아동의 연령대 코드(children.age_band) → 시나리오 연령 구분 */
export const CHILD_AGE_TO_BAND: Record<string, AgeBand> = {
  "5-6": "유아", "7-8": "초등 저학년", "9-10": "초등 중학년", "11-12": "초등 고학년",
};
