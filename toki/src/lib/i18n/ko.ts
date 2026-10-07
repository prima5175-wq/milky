// 한국어 문구. "치료", "진단" 표현은 사용하지 않는다 (npm run lint:copy 로 검사).
// 영어(en.ts)는 이 객체와 같은 모양이어야 컴파일된다. 연습 이야기(시나리오)와 그에 대한 피드백 문장은 한국어 콘텐츠라서 번역 대상이 아니다.
export const ko = {
  app: { name: "토키", tagline: "화용언어·사회성 연습 및 교육 보조 도구" },
  home: {
    intro: "보고, 연습하고, 실제로 해보는 사회성 연습",
    roles: { child: "아동", guardian: "보호자", therapist: "검사자·언어재활사", admin: "콘텐츠 관리" },
  },
  notice: "이 앱은 연습과 교육을 돕는 도구이며, 검사 결과의 해석과 판단은 전문가가 합니다.",
  child: {
    langName: "한국어",
    mascot: "토키",
    back: "← 처음으로", toHome: "처음으로", stepAria: "진행 단계", step: (n: number) => `${n} / 4`, listenAgain: "🔊 다시 듣기",
    home: {
      hello: (name: string) => `안녕, ${name}! 오늘도 친구 말을 같이 들어 볼까?`, today: "오늘 연습", empty: "오늘 연습할 이야기가 아직 없어요. 선생님께 말해 주세요.",
      start: "시작 ▶", done: "✔ 했어요", stickers: "스티커판", settings: "화면 설정",
      timeUp: "오늘은 여기까지! 이제 진짜 친구에게 해 볼 시간이야.", note: "친구와 진짜로 이야기해 보는 게 제일 중요해요. 오늘은 짧게 하고, 진짜 친구에게 해 보자!",
      demo: "화면 확인용: 감수 전 시나리오를 임시로 보여 주는 중이에요. 실제 운영에서는 승인된 것만 나와요.", contentNote: "",
    },
    watch: {
      friendSays: "친구가 말해요", awkward: "이런 대답은 어땠을까? (어색한 예)", good: "이런 대답은 어땠을까? (좋은 예)", done: "다 봤어요 ▶",
      speak: (situation: string, line: string) => `${situation} 친구가 말해요. ${line}`,
    },
    question: {
      title: "어떤 말이 친구 기분을 더 좋게 할까?", correctShort: "맞아! 친구가 반가워할 거야.",
      correct: "맞아! 친구가 반가워할 거야. 친구 말을 듣고 한 마디 더 해 줬거든.", notQuite: (why: string) => `그렇게 생각할 수도 있어. 같이 마음을 볼까? ${why}`, next: "연습해 볼래요 ▶",
    },
    practice: {
      turn: (n: number, max: number) => `친구가 말해요 · ${n}/${max}번째`, me: "나: ", friend: "친구: ", noAnswer: "(말을 안 했어요)",
      modeAria: "답하는 방법", modes: { choice: "고르기", voice: "말하기", text: "쓰기" }, noVoice: "이 기기에서는 말하기를 쓸 수 없어요. 고르기나 쓰기로 해 보자.",
      mic: "🎤 눌러서 말하기", micStop: "⏹ 그만 말하기", inputAria: "내가 할 말", placeholder: "여기에 내 말이 나와요", send: "친구에게 말하기",
      again: "한 번 더 말해 볼래요 ▶", enough: "이제 충분해요 ▶ 미션 보기", toAdult: "어른에게 이야기하러 갈게요",
    },
    mission: {
      title: "오늘의 미션", speak: (m: string) => `오늘의 미션이에요. ${m}`,
      body: (pts: number) => `진짜 친구에게 해 보고, 어른에게 “했어요” 하고 알려 줘! 어른이 확인해 주면 스티커 ${pts}개를 받아요.`, earned: (n: number) => `연습 스티커 +${n} 🌟`,
    },
    stickers: {
      title: (n: number) => `내 스티커판 (${n}개)`, none: "아직 스티커가 없어요. 연습하고 미션을 해 보자!", pending: "어른이 확인해 줄 미션", noMissions: "지금은 없어요.", starsAria: (n: number) => `스티커 ${n}개`,
    },
    settings: {
      aria: "화면 설정", calm: "차분한 화면", normal: "보통", calmOn: "차분하게", readAloud: "읽어주기", on: "켜기", off: "끄기", size: "글자 크기", sizeGlyph: "가",
      rate: "말 속도", rates: { normal: "보통", slow: "천천히", slower: "아주 천천히" }, input: "답하는 방법", language: "언어",
    },
    video: { speedAria: "재생 속도", normal: "보통", times: (r: number) => `${r}배` },
    timeUp: { title: "오늘은 여기까지!", body: "이제 진짜 친구에게 해 볼 시간이야. 오늘 배운 한 마디를 친구에게 해 보자!", stickers: "내 스티커 보기" },
    consent: { title: "어른과 함께 시작해 주세요", body: "토키를 쓰려면 보호자의 동의가 필요해요. 어른에게 알려 주세요.", guardianLead: "보호자님:", guardianLink: "보호자 화면", guardianTail: "에서 동의 상태를 확인하실 수 있어요." },
  },
};
