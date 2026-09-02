import React from 'react';
import { Icon } from '../components/icons.jsx';
import { StatusBar } from './home.jsx';
import { QUIZ_DATA } from '../data/manual.js';

// 퀴즈: 매뉴얼 이해도 테스트
function QuizScreen({ viewMode }) {
  const [active, setActive] = React.useState(null);
  const [step, setStep] = React.useState(0);
  const [selected, setSelected] = React.useState(null);
  const [answered, setAnswered] = React.useState(false);
  const [correctCount, setCorrectCount] = React.useState(0);
  const [finished, setFinished] = React.useState(false);
  const isDesktop = viewMode === 'desktop';

  const startQuiz = (q) => {
    setActive(q); setStep(0); setSelected(null); setAnswered(false); setCorrectCount(0); setFinished(false);
  };

  const submit = () => {
    if (selected === null) return;
    setAnswered(true);
    if (active.questions[step] && selected === active.questions[step].answer) {
      setCorrectCount(c => c + 1);
    }
  };

  const nextStep = () => {
    if (step + 1 >= active.questions.length) {
      setFinished(true);
    } else {
      setStep(s => s + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  // 퀴즈 리스트
  if (!active) {
    return (
      <div className="app-screen anim-fade">
        {!isDesktop && <StatusBar />}
        {!isDesktop && (
          <div className="appbar">
            <div>
              <div style={{ fontSize: 11, color: 'var(--bt-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>QUIZ</div>
              <div className="appbar-title">이해도 테스트</div>
            </div>
          </div>
        )}
        <div className="screen-body" style={{ padding: isDesktop ? 0 : '0 20px 32px' }}>
          {isDesktop && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--bt-green)', fontWeight: 800, letterSpacing: '0.1em' }}>QUIZ</div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>매뉴얼 이해도 테스트</div>
              <div style={{ color: 'var(--bt-muted)', marginTop: 6, fontSize: 13 }}>주제별 퀴즈로 매뉴얼을 완전히 내 것으로 만들어봐요</div>
            </div>
          )}

          <div style={{
            background: 'linear-gradient(135deg, var(--bt-green) 0%, var(--bt-green-dark) 100%)',
            borderRadius: 16, padding: 18, color: 'white', marginBottom: 16,
            display: 'flex', gap: 16, alignItems: 'center',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.08em', fontWeight: 800 }}>MY BEST SCORE</div>
              <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4, letterSpacing: '-0.02em', color: 'var(--bt-yellow)' }}>92<span style={{ fontSize: 12, opacity: 0.7 }}>/100</span></div>
            </div>
            <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.08em', fontWeight: 800 }}>COMPLETED</div>
              <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4, letterSpacing: '-0.02em', color: 'var(--bt-yellow)' }}>1<span style={{ fontSize: 12, opacity: 0.7 }}>/{QUIZ_DATA.length}</span></div>
            </div>
          </div>

          <div className="section-heading">주제별 퀴즈</div>
          <div style={{
            display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr 1fr' : '1fr',
            gap: 10,
          }}>
            {QUIZ_DATA.map((q, i) => (
              <button key={q.id} className="step-card" onClick={() => startQuiz(q)}>
                <div className="step-num" style={{ background: i === 0 ? 'var(--bt-green)' : 'var(--bt-green-tint)', color: i === 0 ? 'white' : 'var(--bt-green)' }}>
                  <Icon.Quiz style={{ width: 20, height: 20 }} />
                </div>
                <div className="step-body">
                  <div style={{ fontSize: 10, color: 'var(--bt-mute-2)', fontWeight: 800, letterSpacing: '0.06em' }}>QUIZ 0{i+1} · {q.sectionRef}</div>
                  <div className="step-title" style={{ marginTop: 2 }}>{q.title}</div>
                  <div className="step-meta">
                    <span>{q.questions.length}문항</span>
                    <span>·</span>
                    <span>약 {q.estimatedMin}분</span>
                  </div>
                </div>
                <Icon.Chevron style={{ color: 'var(--bt-mute-2)', flexShrink: 0, marginTop: 8 }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 결과 화면
  if (finished) {
    const total = active.questions.length;
    const pct = Math.round((correctCount / total) * 100);
    const passed = pct >= 70;
    return (
      <div className="app-screen anim-fade">
        {!isDesktop && <StatusBar />}
        <div className="screen-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="anim-scale" style={{ textAlign: 'center', maxWidth: 360, width: '100%' }}>
            <div style={{
              width: 110, height: 110, margin: '0 auto 20px', borderRadius: '50%',
              background: passed ? 'linear-gradient(135deg, var(--bt-green) 0%, var(--bt-green-dark) 100%)' : '#F1EFE6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: passed ? 'var(--bt-yellow)' : 'var(--bt-muted)',
              fontFamily: 'var(--font-serif)', fontWeight: 900, fontSize: 36,
              boxShadow: passed ? '0 16px 36px rgba(15,94,61,0.28)' : 'none',
            }}>{passed ? '合' : '再'}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', fontWeight: 800, color: passed ? 'var(--bt-green)' : 'var(--bt-muted)' }}>
              {passed ? 'PASSED' : 'TRY AGAIN'}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6, letterSpacing: '-0.02em' }}>
              {passed ? '축하해요!' : '다시 도전해요'}
            </div>
            <div style={{ color: 'var(--bt-muted)', marginTop: 6, fontSize: 13 }}>{active.title}</div>
            <div style={{ margin: '20px 0', padding: '18px', background: 'var(--bt-green-tint)', borderRadius: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--bt-muted)', fontWeight: 700 }}>정답률</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--bt-green)', marginTop: 4, letterSpacing: '-0.02em' }}>
                {pct}<span style={{ fontSize: 16 }}>%</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--bt-muted)', marginTop: 4 }}>{correctCount} / {total} 문항 정답</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setActive(null)}>목록으로</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => startQuiz(active)}>다시 풀기</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 진행 화면
  const q = active.questions[step];
  return (
    <div className="app-screen anim-fade">
      {!isDesktop && <StatusBar />}
      <div className="appbar">
        <button className="appbar-back" onClick={() => setActive(null)}><Icon.X /></button>
        <div style={{ flex: 1, height: 6, background: 'var(--bt-border-soft)', borderRadius: 3, overflow: 'hidden', margin: '0 8px' }}>
          <div style={{ width: `${((step+1)/active.questions.length)*100}%`, height: '100%', background: 'var(--bt-green)', borderRadius: 3, transition: 'width 0.3s' }} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--bt-muted)' }}>{step + 1}<span style={{ opacity: 0.5 }}>/{active.questions.length}</span></div>
      </div>

      <div className="screen-body" style={{ padding: isDesktop ? '20px 40px 40px' : '8px 20px 32px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div className="chip" style={{ marginBottom: 12 }}>{active.title}</div>
          <div className="font-serif" style={{ fontSize: isDesktop ? 22 : 18, fontWeight: 800, lineHeight: 1.5, letterSpacing: '-0.01em' }}>
            Q{step + 1}. {q.q}
          </div>

          <div style={{ marginTop: 24 }}>
            {q.options.map((opt, i) => {
              const letters = ['A', 'B', 'C', 'D'];
              let cls = 'quiz-option';
              if (answered) {
                if (i === q.answer) cls += ' correct';
                else if (i === selected) cls += ' wrong';
              } else if (selected === i) cls += ' selected';

              return (
                <button
                  key={i}
                  className={cls}
                  onClick={() => !answered && setSelected(i)}
                  disabled={answered}
                >
                  <div className="quiz-option-letter">{letters[i]}</div>
                  <div style={{ flex: 1 }}>{opt}</div>
                </button>
              );
            })}
          </div>

          {answered && (
            <div className="anim-up" style={{
              marginTop: 14, padding: 14,
              background: selected === q.answer ? 'var(--bt-green-tint)' : '#FEF0EC',
              border: `1px solid ${selected === q.answer ? 'var(--bt-green-light)' : '#F5D5CC'}`,
              borderRadius: 12,
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: selected === q.answer ? 'var(--bt-green)' : 'var(--bt-danger)', letterSpacing: '0.05em' }}>
                {selected === q.answer ? '✓ 정답이에요!' : '✗ 정답을 확인해요'}
              </div>
              <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.6, color: 'var(--bt-body)' }}>{q.explain}</div>
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            {!answered ? (
              <button
                className="btn-primary"
                style={{ width: '100%', opacity: selected === null ? 0.4 : 1 }}
                onClick={submit}
                disabled={selected === null}
              >정답 확인</button>
            ) : (
              <button className="btn-primary" style={{ width: '100%' }} onClick={nextStep}>
                {step + 1 >= active.questions.length ? '결과 보기' : '다음 문제'} <Icon.Chevron />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { QuizScreen };
