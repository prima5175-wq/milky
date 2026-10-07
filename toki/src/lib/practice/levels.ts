// "한 마디 덧붙이기" 4단계. 아동의 자유 응답을 대략 분류한다.
// ⚠ 오프라인 대체용 간이 규칙이다. AI 연결 시(5단계)에는 AI 분류를 쓰고, 이 규칙은 연결이 끊겼을 때만 쓴다.
export type DetectedLevel = 1 | 2 | 3 | 4;
export const LEVEL_NAME: Record<DetectedLevel, string> = { 1: "반응하기", 2: "질문하기", 3: "내 경험 연결하기", 4: "감정 읽어주기" };

const FEELING = /(신나|신났|신난|속상|기분|힘들|설레|설렜|슬프|슬펐|무섭|무서웠|걱정|떨리|떨렸|서운|아쉬|화나|화났|좋았|기뻤|웃겼|놀랐|짜증)/;
const READING_END = /(겠다|겠네|겠구나|했구나|였구나|구나|했지|였지|지\?|지$)/;
const QUESTION = /(\?|뭐|왜|어디|누구|언제|어떻게|어땠|할래|갈래|볼래|했어$|있어$|니$|까$)/;
const MINE = /(나도|나는|내가|우리\s?집|나한테|난\s)/;

export function classifyLevel(raw: string): DetectedLevel | null {
  const t = raw.trim();
  if (t.length === 0 || /^\.+$/.test(t)) return null;
  if (FEELING.test(t) && READING_END.test(t)) return 4;
  if (QUESTION.test(t)) return 2;
  if (MINE.test(t) && t.length >= 8) return 3;
  return 1;
}
