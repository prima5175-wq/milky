"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Toki } from "./Toki";
import { VideoPlayer } from "./VideoPlayer";
import { useChildSettings } from "./useChildSettings";
import { SUBTITLE_CLASS } from "@/lib/child/settings";
import { completePractice, flushPendingProgress } from "@/lib/child/progress";
import { browserTts } from "@/lib/speech/tts";
import { browserStt, type SttSession } from "@/lib/speech/stt";
import { buildChoices, shuffle } from "@/lib/practice/choices";
import { MAX_TURNS, offlineEngine, type InputMode, type PracticeEngine, type PracticeOutput } from "@/lib/practice/engine";
import { LimitReachedError, remoteEngine } from "@/lib/practice/remote";
import { flushPendingSafety, queueSafety } from "@/lib/safety/pending";
import { TimeUp } from "./TimeUp";
import { useUsageHeartbeat } from "./useUsageHeartbeat";
import { POINTS } from "@/lib/practice/rewards";
import type { Level, Scenario } from "@/lib/scenarios/schema";

type Step = "watch" | "question" | "practice" | "mission";
interface Turn { text: string; out: PracticeOutput; mode: InputMode }

export function ScenarioFlow({ scenario: s, targetLevel, engine = remoteEngine }: { scenario: Scenario; targetLevel: Level; engine?: PracticeEngine }) {
  const [settings] = useChildSettings();
  const cap = SUBTITLE_CLASS[settings.subtitleSize];
  const [step, setStep] = useState<Step>("watch");
  const [timeUp, setTimeUp] = useState(false);
  useUsageHeartbeat(() => setTimeUp(true));
  useEffect(() => { flushPendingSafety(); flushPendingProgress(); }, []);
  const [record, setRecord] = useState<{ levels: Array<number | null>; modes: string[] }>({ levels: [], modes: [] });
  const speak = (t: string) => { if (settings.readAloud) browserTts.speak(t, { rate: settings.speechRate }); };
  useEffect(() => () => browserTts.cancel(), []);

  const good = s.goodResponses[String(targetLevel) as "1"][0];

  if (timeUp) return <TimeUp lowStimulus={settings.lowStimulus} />;
  return (
    <div className={settings.lowStimulus ? "low-stim min-h-screen" : "min-h-screen"} style={{ background: "var(--bg)" }}>
      <main className="mx-auto max-w-2xl p-6">
        <nav className="mb-4 flex items-center justify-between text-lg"><Link href="/child" className="underline">← 처음으로</Link>
          <span aria-label="진행 단계">{["watch", "question", "practice", "mission"].indexOf(step) + 1} / 4</span></nav>
        {step === "watch" && <Watch s={s} good={good} cap={cap} speak={speak} onNext={() => setStep("question")} />}
        {step === "question" && <Question s={s} good={good} cap={cap} speak={speak} onNext={() => setStep("practice")} />}
        {step === "practice" && <Practice s={s} targetLevel={targetLevel} engine={engine} cap={cap} speak={speak} defaultMode={settings.inputMode} onDone={(r) => { setRecord(r); setStep("mission"); }} onTimeUp={() => setTimeUp(true)} />}
        {step === "mission" && <Mission s={s} cap={cap} speak={speak} record={record} />}
      </main>
    </div>
  );
}

const Big = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p} className={`w-full rounded-2xl border-2 p-4 text-left text-xl disabled:opacity-50 ${p.className ?? ""}`} />;
const Next = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => <button onClick={onClick} className="mt-6 w-full rounded-2xl bg-[var(--accent)] p-4 text-xl text-white">{children}</button>;

function Panel({ title, text, cap, speak, tone, video, videoCaption }: { title: string; text: string; cap: string; speak: (t: string) => void; tone: string; video?: string | null; videoCaption?: string }) {
  return (
    <section className={`rounded-2xl border-2 p-4 ${tone}`}>
      <h2 className="mb-2 text-lg font-bold">{title}</h2>
      {video ? <VideoPlayer src={video} caption={videoCaption ?? text} captionClass={cap} /> : (
        /* 영상이 없으면 일러스트 + 자막 + 읽어주기로 대체한다 */
        <div className="flex items-center gap-3"><Toki size={64} mood="listen" /><p className={`rounded-2xl bg-white/70 p-3 ${cap}`}>“{text}”</p></div>)}
      <button className="mt-2 rounded-full border px-4 py-2" onClick={() => speak(text)}>🔊 다시 듣기</button>
    </section>
  );
}

function Watch({ s, good, cap, speak, onNext }: { s: Scenario; good: string; cap: string; speak: (t: string) => void; onNext: () => void }) {
  useEffect(() => speak(`${s.situation} 친구가 말해요. ${s.partnerLine}`), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="animate-pop space-y-4">
      <p className={cap}>{s.situation}</p>
      <Panel title="친구가 말해요" text={s.partnerLine} cap={cap} speak={speak} tone="bg-sky-50" />
      <Panel title="이런 대답은 어땠을까? (어색한 예)" text={s.awkwardExample.line} cap={cap} speak={speak} tone="bg-amber-50" video={s.media.videoAwkward} />
      <Panel title="이런 대답은 어땠을까? (좋은 예)" text={good} cap={cap} speak={speak} tone="bg-emerald-50" video={s.media.videoGood} />
      <Next onClick={onNext}>다 봤어요 ▶</Next>
    </div>
  );
}

function Question({ s, good, cap, speak, onNext }: { s: Scenario; good: string; cap: string; speak: (t: string) => void; onNext: () => void }) {
  const opts = useMemo(() => shuffle([{ k: "awkward", t: s.awkwardExample.line }, { k: "good", t: good }], `${s.id}:q`), [s, good]);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => speak("어떤 말이 친구 기분을 더 좋게 할까?"), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="animate-pop space-y-3">
      <h1 className="text-2xl font-bold">어떤 말이 친구 기분을 더 좋게 할까?</h1>
      {opts.map((o) => <Big key={o.k} disabled={picked !== null} onClick={() => { setPicked(o.k); speak(o.k === "good" ? "맞아! 친구가 반가워할 거야." : s.awkwardExample.whyAwkward); }}>“{o.t}”</Big>)}
      {picked && (
        <div role="status" className={`rounded-2xl bg-white/70 p-4 ${cap}`}>
          {picked === "good" ? "맞아! 친구가 반가워할 거야. 친구 말을 듣고 한 마디 더 해 줬거든." : `그렇게 생각할 수도 있어. 같이 마음을 볼까? ${s.awkwardExample.whyAwkward}`}
          <Next onClick={onNext}>연습해 볼래요 ▶</Next>
        </div>)}
    </div>
  );
}

function Practice({ s, targetLevel, engine, cap, speak, defaultMode, onDone, onTimeUp }: { s: Scenario; targetLevel: Level; engine: PracticeEngine; cap: string; speak: (t: string) => void; defaultMode: InputMode; onDone: (r: { levels: Array<number | null>; modes: string[] }) => void; onTimeUp: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [mode, setMode] = useState<InputMode>(defaultMode);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const sttRef = useRef<SttSession | null>(null);
  const [sttOk, setSttOk] = useState(false);
  useEffect(() => { setSttOk(browserStt.supported()); setMode(defaultMode); }, [defaultMode]);
  useEffect(() => speak(s.partnerLine), []); // eslint-disable-line react-hooks/exhaustive-deps

  const turnNo = turns.length + 1;
  const last = turns[turns.length - 1];
  const safety = last?.out.safetyFlag === true;
  const finished = safety || turns.length >= MAX_TURNS;
  const [showResult, setShowResult] = useState(false); // 방금 한 말의 결과를 보여 주는 중
  const awaitingNext = showResult && last !== undefined && !finished;
  const choices = useMemo(() => buildChoices(s, turnNo, turns.map((t) => t.text), targetLevel), [s, turnNo, turns, targetLevel]);

  async function send(t: string, m: InputMode) {
    if (!t.trim() || busy) return;
    setBusy(true);
    let out: PracticeOutput;
    try { out = await engine.respond({ scenario: s, targetLevel, turnNo, text: t, mode: m }); }
    catch (e) {
      if (e instanceof LimitReachedError) { setBusy(false); onTimeUp(); return; }
      // AI·네트워크가 안 돼도 계속한다. 이때 감지된 안전 이벤트는 나중에 서버로 보낸다.
      out = await offlineEngine.respond({ scenario: s, targetLevel, turnNo, text: t, mode: m });
      if (out.safetyFlag) { queueSafety({ scenarioId: s.id, category: out.safetyCategory ?? "model_flagged", excerpt: t }); flushPendingSafety(); }
    }
    setTurns((x) => [...x, { text: t, out, mode: m }]); setText(""); setShowResult(true); setBusy(false);
    speak(out.safetyFlag ? out.feedback : `${out.friendReply} ${out.feedback}`);
  }
  function mic() {
    if (listening) { sttRef.current?.stop(); return; }
    setListening(true);
    sttRef.current = browserStt.start({ onResult: setText, onEnd: () => setListening(false), onError: () => setListening(false) });
    if (!sttRef.current) setListening(false);
  }

  return (
    <div className="animate-pop space-y-4">
      <div className="flex items-center gap-3"><Toki size={72} mood="listen" />
        <div><p className="text-sm opacity-70">친구가 말해요 · {showResult ? turns.length : Math.min(turnNo, MAX_TURNS)}/{MAX_TURNS}번째</p>
          <p className={`rounded-2xl bg-sky-50 p-3 ${cap}`}>“{s.partnerLine}”</p></div></div>

      {turns.map((t, i) => (
        <div key={i} className="space-y-1">
          <p className={`ml-auto w-fit max-w-[90%] rounded-2xl bg-emerald-50 p-3 ${cap}`}>나: {t.text === "..." ? "(말을 안 했어요)" : t.text}</p>
          {i === turns.length - 1 && showResult && (
            <div role="status" className="rounded-2xl bg-white/70 p-3">
              {t.out.friendReply && <p className={cap}>친구: {t.out.friendReply}</p>}
              <p className={`mt-1 ${cap}`}>🐰 {t.out.feedback}</p>
            </div>)}
        </div>))}

      {!finished && !awaitingNext && (
        <>
          <div className="flex gap-2" role="tablist" aria-label="답하는 방법">
            {([["choice", "고르기"], ["voice", "말하기"], ["text", "쓰기"]] as const).map(([k, label]) => (
              <button key={k} role="tab" aria-selected={mode === k} disabled={k === "voice" && !sttOk} onClick={() => setMode(k)}
                className={`rounded-full border px-4 py-2 disabled:opacity-40 ${mode === k ? "bg-[var(--accent)] text-white" : ""}`}>{label}</button>))}
          </div>
          {!sttOk && <p className="text-sm opacity-60">이 기기에서는 말하기를 쓸 수 없어요. 고르기나 쓰기로 해 보자.</p>}
          {mode === "choice" && <div className="space-y-2">{choices.map((c) => <Big key={c} disabled={busy} onClick={() => send(c, "choice")}>{c}</Big>)}</div>}
          {mode !== "choice" && (
            <div className="space-y-2">
              {mode === "voice" && <button onClick={mic} className="w-full rounded-2xl border-2 p-4 text-xl">{listening ? "⏹ 그만 말하기" : "🎤 눌러서 말하기"}</button>}
              <textarea aria-label="내가 할 말" className={`w-full rounded-2xl border-2 p-3 ${cap}`} rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="여기에 내 말이 나와요" />
              <Next onClick={() => send(text, mode)}>친구에게 말하기</Next>
            </div>)}
        </>)}

      {awaitingNext && <Next onClick={() => { setShowResult(false); }}>한 번 더 말해 볼래요 ▶</Next>}
      {(awaitingNext || finished) && last !== undefined && (
        <button className="w-full rounded-2xl border-2 p-4 text-xl" onClick={() => onDone({ levels: turns.map((t) => t.out.detectedLevel), modes: turns.map((t) => t.mode) })}>{safety ? "어른에게 이야기하러 갈게요" : "이제 충분해요 ▶ 미션 보기"}</button>)}
    </div>
  );
}

function Mission({ s, cap, speak, record }: { s: Scenario; cap: string; speak: (t: string) => void; record: { levels: Array<number | null>; modes: string[] } }) {
  const [earned, setEarned] = useState<number | null>(null);
  useEffect(() => {
    completePractice({ scenarioId: s.id, levels: record.levels, modes: record.modes }).then((r) => setEarned(r.earned));
    speak(`오늘의 미션이에요. ${s.mission}`);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="animate-pop space-y-4 text-center">
      <Toki size={96} />
      <h1 className="text-2xl font-bold">오늘의 미션</h1>
      <p className={`rounded-2xl border-2 bg-white/70 p-4 ${cap}`}>{s.mission}</p>
      <p className="text-lg">진짜 친구에게 해 보고, 어른에게 “했어요” 하고 알려 줘!<br />어른이 확인해 주면 스티커 {POINTS.missionConfirmed}개를 받아요.</p>
      {earned !== null && earned > 0 && <p role="status" className="text-lg">연습 스티커 +{earned} 🌟</p>}
      <Link href="/child" className="block rounded-2xl bg-[var(--accent)] p-4 text-xl text-white">처음으로</Link>
    </div>
  );
}
