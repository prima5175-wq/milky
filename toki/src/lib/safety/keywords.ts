// 안전 키워드 감지: 아동이 위험하거나 걱정되는 말을 하면 연습을 멈추고 어른에게 알리도록 안내한다.
// ⚠ 이 목록은 임시 초안입니다. 전문가(아동 상담·보호 전문가) 검토 후 확정해야 합니다.
// 놓치는 것보다 과하게 걸리는 쪽이 낫다: 오탐은 "어른에게 이야기해 줘" 안내가 한 번 나올 뿐이다.
export type SafetyCategory = "self_harm" | "abuse" | "bullying" | "secrecy" | "model_flagged";

const RULES: Array<{ category: Exclude<SafetyCategory, "model_flagged">; re: RegExp }> = [
  { category: "self_harm", re: /죽고\s?싶|죽을\s?래|죽어\s?버리|사라지고\s?싶|자해|스스로\s?(다치|해치)|없어지고\s?싶/ },
  { category: "abuse", re: /(때렸|때려서|맞았|맞아서|때리면|발로\s?찼|목을\s?졸)|(몸을?|옷을?)\s?(만졌|만져|벗)|아빠가\s?때|엄마가\s?때|어른이\s?때/ },
  { category: "bullying", re: /괴롭[혀힘]|따돌|왕따|놀림\s?당|협박|돈을?\s?뺏/ },
  { category: "secrecy", re: /비밀이라고|말하면\s?안\s?된다|아무한테도\s?말\s?하지/ },
];

/** 공백을 제거한 뒤 검사한다 ("죽 고 싶 어" 같은 띄어쓰기 변형 대응). */
export function detectSafety(text: string): { flagged: boolean; category?: SafetyCategory } {
  const compact = text.replace(/\s+/g, "");
  const spaced = text.replace(/\s+/g, " ");
  for (const { category, re } of RULES) {
    if (re.test(spaced) || re.test(compact) || new RegExp(re.source.replace(/\\s\?/g, ""), "").test(compact)) return { flagged: true, category };
  }
  return { flagged: false };
}

export const SAFETY_MESSAGE = "이야기해 줘서 고마워. 이건 어른에게 꼭 이야기해 줘. 엄마, 아빠, 선생님 중 믿는 어른에게 말해 보자.";
