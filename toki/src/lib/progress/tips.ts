// 가정에서 함께 할 수 있는 대화 팁. 일반적인 대화 요령이며 평가·진단이 아니다. ⚠ 전문가 검토 후 확정.
export interface Tip { level: 1 | 2 | 3 | 4 | 0; text: string }
export const TIPS: Tip[] = [
  { level: 0, text: "연습은 짧게, 하루 몇 분이면 충분해요. 끝나면 칭찬하고 진짜 대화로 이어 가세요." },
  { level: 0, text: "아이가 어색하게 말해도 바로 고쳐 주기보다, 먼저 말해 준 것을 알아봐 주세요." },
  { level: 1, text: "식탁에서 아이 말에 “그렇구나!” 하고 맞장구쳐 주세요. 아이가 따라 하기 쉬운 모델이 돼요." },
  { level: 1, text: "TV나 책을 보며 “우와, 대단하다!”처럼 짧은 반응을 번갈아 해 보세요." },
  { level: 2, text: "아이 이야기에 “그래서 어떻게 됐어?”, “뭐가 제일 좋았어?” 같은 질문을 하나만 해 보세요." },
  { level: 2, text: "질문을 한 번에 여러 개 하지 말고, 대답을 기다려 주세요." },
  { level: 3, text: "“엄마(아빠)도 그런 적 있어. 그때는…” 하고 내 경험을 짧게 들려주세요." },
  { level: 3, text: "아이가 “나도!”라고 말하면 “어떤 게 같았어?” 하고 한 번 더 물어보세요." },
  { level: 4, text: "“많이 신났겠다”, “속상했겠네”처럼 아이의 기분을 말로 읽어 주세요." },
  { level: 4, text: "그림책 속 인물의 표정을 보며 “지금 어떤 기분일까?” 하고 같이 이야기해 보세요." },
];
export function tipsFor(targetLevel: number): Tip[] {
  return TIPS.filter((t) => t.level === 0 || t.level === targetLevel);
}
