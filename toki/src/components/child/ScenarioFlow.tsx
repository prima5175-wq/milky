"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Toki } from "./Toki";
import { VideoPlayer } from "./VideoPlayer";
import { useChildT } from "./useChildSettings";
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
import type { Messages } from "@/lib/i18n";
import type { Level, Scenario } from "@/lib/scenarios/schema";

type T = Messages["child"];
type Step = "watch" | "question" | "practice" | "mission";
interface Turn { text: string; out: PracticeOutput; mode: InputMode }
type Speak = (t: string) => void;

export function ScenarioFlow({ scenario: s, targetLevel, engine = remoteEngine }: { scenario: Scenario; targetLevel: Level; engine?: PracticeEngine }) {
  const { t, settings } = useChildT();
  const cap = SUBTITLE_CLASS[settings.subtitleSize];
  const [step, setStep] = useState<Step>("watch");
  const [timeUp, setTimeUp] = useState(false);
  useUsageHeartbeat(() => setTimeUp(true));
  useEffect(() => { flushPendingSafety(); flushPendingProgress(); }, []);
  const [record, setRecord] = useState<{ levels: Array<number | null>; modes: string[] }>({ levels: [], modes: [] });
  const speak: Speak = (x) => { if (settings.readAloud) browserTts.speak(x, { rate: settings.speechRate }); };
  useEffect(() => () => browserTts.cancel(), []);

  const good = s.goodResponses[String(targetLevel) as "1"][0];

  if (timeUp) return <TimeUp />;
  return (
    <div className={settings.lowStimulus ? "low-stim min-h-screen" : "min-h-screen"} style={{ background: "var(--bg)" }} lang={settings.locale}>
      <main className="mx-auto max-w-2xl p-6">
        <nav className="mb-4 flex items-center justify-between text-lg"><Link href="/child" className="underline">{t.back}</Link>
          <span aria-label={t.stepAria}>{t.step(["watch", "question", "practice", "mission"].indexOf(step) + 1)}</span></nav>
        {step === "watch" && <Watch t={t} s={s} good={good} cap={cap} speak={speak} onNext={() => setStep("question")} />}
        {step === "question" && <Question t={t} s={s} good={good} cap={cap} speak={speak} onNext={() => setStep("practice")} />}
        {step === "practice" && <Practice t={t} s={s} targetLevel={targetLevel} engine={engine} cap={cap} speak={speak} defaultMode={settings.inputMode} onDone={(r) => { setRecord(r); setStep("mission"); }} onTimeUp={() => setTimeUp(true)} />}
        {step === "mission" && <Mission t={t} s={s} cap={cap} speak={speak} record={record} />}
      </main>
    </div>
  );
}

const Big = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p} className={`w-full rounded-2xl border-2 p-4 text-left text-xl disabled:opacity-50 ${p.className ?? ""}`} />;
const Next = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => <button onClick={onClick} className="mt-6 w-full rounded-2xl bg-[var(--accent)] p-4 text-xl text-white">{children}</button>;

function Panel({ t, title, text, cap, speak, tone, video }: { t: T; title: string; text: string; cap: string; speak: Speak; tone: string; video?: string | null }) {
  return (
    <section className={`rounded-2xl border-2 p-4 ${tone}`}>
      <h2 className="mb-2 text-lg font-bold">{title}</h2>
      {video ? <VideoPlayer src={video} caption={text} captionClass={cap} /> : (
        /* 영상이 없으면 일러스트 + 자막 + 읽어주기로 대체한다 */
        <div className="flex items-center gap-3"><Toki size={64} mood="listen" label={t.mascot} /><p className={`rounded-2xl bg-white/70 p-3 ${cap}`}>“{text}”</p></div>)}
      <button className="mt-2 rounded-full border px-4 py-2" onClick={() => speak(text)}>{t.listenAgain}</button>
    </section>
  );
}

function Watch({ t, s, good, cap, speak, onNext }: { t: T; s: Scenario; good: string; cap: string; speak: Speak; onNext: () => void }) {
  useEffect(() => speak(t.watch.speak(s.situation, s.partnerLine)), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="animate-pop space-y-4">
      <p className={cap}>{s.situation}</p>
      <Panel t={t} title={t.watch.friendSays} text={s.partnerLine} cap={cap} speak={speak} tone="bg-sky-50" />
      <Panel t={t} title={t.watch.awkward} text={s.awkwardExample.line} cap={cap} speak={speak} tone="bg-amber-50" video={s.media.videoAwkward} />
      <Panel t={t} title={t.watch.good} text={good} cap={cap} speak={speak} tone="bg-emerald-50" video={s.media.videoGood} />
      <Next onClick={onNext}>{t.watch.done}</Next>
    </div>
  );
}

function Question({ t, s, good, cap, speak, onNext }: { t: T; s: Scenario; good: string; cap: string; speak: Speak; onNext: () => void }) {
  const opts = useMemo(() => shuffle([{ k: "awkward", t: s.awkwardExample.line }, { k: "good", t: good }], `${s.id}:q`), [s, good]);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => speak(t.question.title), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="animate-pop space-y-3">
      <h1 className="text-2xl font-bold">{t.question.title}</h1>
      {opts.map((o) => <Big key={o.k} disabled={picked !== null} onClick={() => { setPicked(o.k); speak(o.k === "good" ? t.question.correctShort : s.awkwardExample.whyAwkward); }}>“{o.t}”</Big>)}
      {picked && (
        <div role="status" className={`rounded-2xl bg-white/70 p-4 ${cap}`}>
          {picked === "good" ? t.question.correct : t.question.notQuite(s.awkwardExample.whyAwkward)}
          <Next onClick={onNext}>{t.question.next}</Next>
        </div>)}
    </div>
  );
}

function Practice({ t, s, targetLevel, engine, cap, speak, defaultMode, onDone, onTimeUp }: { t: T; s: Scenario; targetLevel: Level; engine: PracticeEngine; cap: string; speak: Speak; defaultMode: InputMode; onDone: (r: { levels: Array<number | null>; modes: string[] }) => void; onTimeUp: () => void }) {
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
  const choices = useMemo(() => buildChoices(s, turnNo, turns.map((x) => x.text), targetLevel), [s, turnNo, turns, targetLevel]);

  async function send(msg: string, m: InputMode) {
    if (!msg.trim() || busy) return;
    setBusy(true);
    let out: PracticeOutput;
    try { out = await engine.respond({ scenario: s, targetLevel, turnNo, text: msg, mode: m }); }
    catch (e) {
      if (e instanceof LimitReachedError) { setBusy(false); onTimeUp(); return; }
      // AI·네트워크가 안 돼도 계속한다. 이때 감지된 안전 이벤트는 나중에 서버로 보낸다.
      out = await offlineEngine.respond({ scenario: s, targetLevel, turnNo, text: msg, mode: m });
      if (out.safetyFlag) { queueSafety({ scenarioId: s.id, category: out.safetyCategory ?? "model_flagged", excerpt: msg }); flushPendingSafety(); }
    }
    setTurns((x) => [...x, { text: msg, out, mode: m }]); setText(""); setShowResult(true); setBusy(false);
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
      <div className="flex items-center gap-3"><Toki size={72} mood="listen" label={t.mascot} />
        <div><p className="text-sm opacity-70">{t.practice.turn(showResult ? turns.length : Math.min(turnNo, MAX_TURNS), MAX_TURNS)}</p>
          <p className={`rounded-2xl bg-sky-50 p-3 ${cap}`}>“{s.partnerLine}”</p></div></div>

      {turns.map((x, i) => (
        <div key={i} className="space-y-1">
          <p className={`ml-auto w-fit max-w-[90%] rounded-2xl bg-emerald-50 p-3 ${cap}`}>{t.practice.me}{x.text === "..." ? t.practice.noAnswer : x.text}</p>
          {i === turns.length - 1 && showResult && (
            <div role="status" className="rounded-2xl bg-white/70 p-3">
              {x.out.friendReply && <p className={cap}>{t.practice.friend}{x.out.friendReply}</p>}
              <p className={`mt-1 ${cap}`}>🐰 {x.out.feedback}</p>
            </div>)}
        </div>))}

      {!finished && !awaitingNext && (
        <>
          <div className="flex gap-2" role="tablist" aria-label={t.practice.modeAria}>
            {(["choice", "voice", "text"] as const).map((k) => (
              <button key={k} role="tab" aria-selected={mode === k} disabled={k === "voice" && !sttOk} onClick={() => setMode(k)}
                className={`rounded-full border px-4 py-2 disabled:opacity-40 ${mode === k ? "bg-[var(--accent)] text-white" : ""}`}>{t.practice.modes[k]}</button>))}
          </div>
          {!sttOk && <p className="text-sm opacity-60">{t.practice.noVoice}</p>}
          {mode === "choice" && <div className="space-y-2">{choices.map((c) => <Big key={c} disabled={busy} onClick={() => send(c, "choice")}>{c}</Big>)}</div>}
          {mode !== "choice" && (
            <div className="space-y-2">
              {mode === "voice" && <button onClick={mic} className="w-full rounded-2xl border-2 p-4 text-xl">{listening ? t.practice.micStop : t.practice.mic}</button>}
              <textarea aria-label={t.practice.inputAria} className={`w-full rounded-2xl border-2 p-3 ${cap}`} rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={t.practice.placeholder} />
              <Next onClick={() => send(text, mode)}>{t.practice.send}</Next>
            </div>)}
        </>)}

      {awaitingNext && <Next onClick={() => { setShowResult(false); }}>{t.practice.again}</Next>}
      {(awaitingNext || finished) && last !== undefined && (
        <button className="w-full rounded-2xl border-2 p-4 text-xl" onClick={() => onDone({ levels: turns.map((x) => x.out.detectedLevel), modes: turns.map((x) => x.mode) })}>{safety ? t.practice.toAdult : t.practice.enough}</button>)}
    </div>
  );
}

function Mission({ t, s, cap, speak, record }: { t: T; s: Scenario; cap: string; speak: Speak; record: { levels: Array<number | null>; modes: string[] } }) {
  const [earned, setEarned] = useState<number | null>(null);
  useEffect(() => {
    completePractice({ scenarioId: s.id, levels: record.levels, modes: record.modes }).then((r) => setEarned(r.earned));
    speak(t.mission.speak(s.mission));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="animate-pop space-y-4 text-center">
      <Toki size={96} label={t.mascot} />
      <h1 className="text-2xl font-bold">{t.mission.title}</h1>
      <p className={`rounded-2xl border-2 bg-white/70 p-4 ${cap}`}>{s.mission}</p>
      <p className="text-lg">{t.mission.body(POINTS.missionConfirmed)}</p>
      {earned !== null && earned > 0 && <p role="status" className="text-lg">{t.mission.earned(earned)}</p>}
      <Link href="/child" className="block rounded-2xl bg-[var(--accent)] p-4 text-xl text-white">{t.toHome}</Link>
    </div>
  );
}
