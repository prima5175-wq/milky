import type { ko } from "./ko";

/** ko 와 같은 모양이어야 컴파일된다 (키가 빠지거나 남으면 오류). */
export const en: typeof ko = {
  app: { name: "Toki", tagline: "Pragmatic language & social skills practice aid" },
  home: {
    intro: "Watch, practice, then try it in real life",
    roles: { child: "Child", guardian: "Guardian", therapist: "Clinician", admin: "Content admin" },
  },
  notice: "This app supports practice and education. Interpretation of results is made by professionals.",
  child: {
    langName: "English",
    mascot: "Toki",
    back: "← Back", toHome: "Back to start", stepAria: "Progress", step: (n) => `${n} / 4`, listenAgain: "🔊 Listen again",
    home: {
      hello: (name) => `Hi, ${name}! Ready to listen to a friend together?`, today: "Today's practice", empty: "There is nothing to practice yet. Please tell your teacher.",
      start: "Start ▶", done: "✔ Done", stickers: "Stickers", settings: "Display settings",
      timeUp: "That's all for today! Now it's time to try it with a real friend.", note: "Talking with a real friend matters most. Keep it short today, then try it for real!",
      demo: "For preview: unreviewed stories are shown temporarily. Only approved stories appear in real use.", contentNote: "The practice stories and feedback sentences are in Korean for now.",
    },
    watch: {
      friendSays: "Your friend says", awkward: "How about this reply? (awkward)", good: "How about this reply? (good)", done: "I watched it ▶",
      speak: (situation, line) => `${situation} Your friend says: ${line}`,
    },
    question: {
      title: "Which reply makes your friend feel better?", correctShort: "Right! Your friend would be glad.",
      correct: "Right! Your friend would be glad. You listened and added a little more.", notQuite: (why) => `You could think so. Let's look at the feelings together. ${why}`, next: "Let's practice ▶",
    },
    practice: {
      turn: (n, max) => `Your friend says · ${n}/${max}`, me: "Me: ", friend: "Friend: ", noAnswer: "(I didn't say anything)",
      modeAria: "How to answer", modes: { choice: "Choose", voice: "Speak", text: "Write" }, noVoice: "Speaking isn't available on this device. Try choosing or writing.",
      mic: "🎤 Tap to speak", micStop: "⏹ Stop", inputAria: "What I say", placeholder: "Your words appear here", send: "Say it to my friend",
      again: "Try once more ▶", enough: "That's enough ▶ See mission", toAdult: "I'll go talk to a grown-up",
    },
    mission: {
      title: "Today's mission", speak: (m) => `Today's mission. ${m}`,
      body: (pts) => `Try it with a real friend, then tell a grown-up "I did it!" When they confirm, you get ${pts} stickers.`, earned: (n) => `Practice sticker +${n} 🌟`,
    },
    stickers: {
      title: (n) => `My stickers (${n})`, none: "No stickers yet. Practice and try the mission!", pending: "Missions for a grown-up to confirm", noMissions: "None right now.", starsAria: (n) => `${n} stickers`,
    },
    settings: {
      aria: "Display settings", calm: "Calm screen", normal: "Normal", calmOn: "Calm", readAloud: "Read aloud", on: "On", off: "Off", size: "Text size", sizeGlyph: "A",
      rate: "Speech speed", rates: { normal: "Normal", slow: "Slow", slower: "Very slow" }, input: "How to answer", language: "Language",
    },
    video: { speedAria: "Playback speed", normal: "Normal", times: (r) => `${r}x` },
    timeUp: { title: "That's all for today!", body: "Now it's time to try it with a real friend. Say what you learned today!", stickers: "See my stickers" },
    consent: { title: "Please start together with a grown-up", body: "Toki needs a guardian's consent. Please tell a grown-up.", guardianLead: "Guardian:", guardianLink: "guardian screen", guardianTail: " shows the consent status." },
  },
};
