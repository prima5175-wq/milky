import React from 'react';
import { Icon } from '../components/icons.jsx';
import { StatusBar } from './home.jsx';
import { formatStepDate } from '../utils/dates.js';

// 단계 상세 페이지
function DetailScreen({ step, meta, checked, onToggle, onBack, viewMode }) {
  const isDesktop = viewMode === 'desktop';
  const [itemsChecked, setItemsChecked] = React.useState(() => {
    const s = {};
    (step.items || []).forEach((_, i) => { s[i] = false; });
    return s;
  });
  const [expandedTip, setExpandedTip] = React.useState(true);

  React.useEffect(() => {
    // 스텝 바뀔 때 상태 재설정
    const s = {};
    (step.items || []).forEach((_, i) => { s[i] = false; });
    setItemsChecked(s);
  }, [step.n]);

  const isDone = !!checked[`step:${step.n}`];

  return (
    <div className="app-screen anim-fade" data-screen-label={`Detail ${step.n} ${step.title}`}>
      <div className="screen-body">
        {/* 상단 헤더 */}
        <div style={{
          background: step.badge
            ? 'linear-gradient(160deg, #C4900A 0%, #8B5F03 100%)'
            : 'linear-gradient(160deg, var(--bt-green) 0%, var(--bt-green-dark) 100%)',
          color: 'white',
          padding: isDesktop ? '28px 32px' : '4px 20px 24px',
          borderRadius: isDesktop ? 'var(--radius-lg)' : '0 0 20px 20px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {!isDesktop && <StatusBar dark={true} />}
          {!isDesktop && <div style={{ height: 8 }} />}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <button className="appbar-back" style={{ background: 'rgba(255,255,255,0.18)', border: 'none', color: 'white' }} onClick={onBack}>
              <Icon.Back />
            </button>
            <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: '0.1em', fontWeight: 700 }}>STEP {String(step.n).padStart(2, '0')} · {step.phase}</div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button style={{ color: 'white', padding: 6, opacity: 0.9 }}><Icon.Bookmark /></button>
              <button style={{ color: 'white', padding: 6, opacity: 0.9 }}><Icon.Download /></button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 14,
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 900,
              color: 'var(--bt-yellow)',
              flexShrink: 0,
            }}>{String(step.n).padStart(2, '0')}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: isDesktop ? 24 : 20, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{step.title}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <span className="chip yellow-solid" style={{ fontSize: 10 }}>{step.phase}</span>
                {meta && meta.openDate && formatStepDate(step.n, meta.openDate) && (
                  <span className="chip white-on-dark">📅 {formatStepDate(step.n, meta.openDate)}</span>
                )}
                <span className="chip white-on-dark">{(step.items || []).length}개 세부항목</span>
                {step.docs && <span className="chip white-on-dark">서류 {step.docs.length}종</span>}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: isDesktop ? '24px 32px 40px' : '20px 20px 40px' }}>
          {/* ★ 지사 지침 */}
          {step.badge && (
            <div className="branch-directive" style={{ marginTop: 0 }}>
              <div className="branch-directive-label">
                <Icon.Star style={{ width: 12, height: 12 }} /> {step.badge}
              </div>
              <div className="branch-directive-content">{step.badgeContent}</div>
            </div>
          )}

          {/* 체크리스트 */}
          <div style={{ marginTop: step.badge ? 16 : 0 }}>
            <div className="section-heading">세부 실행 항목</div>
            <div className="card" style={{ padding: '2px 16px' }}>
              {(step.items || []).map((item, i) => (
                <div
                  key={i}
                  className={`checklist-item ${itemsChecked[i] ? 'done' : ''}`}
                  onClick={() => setItemsChecked(s => ({ ...s, [i]: !s[i] }))}
                >
                  <div className={`check-box ${itemsChecked[i] ? 'checked' : ''}`}>
                    <Icon.Check />
                  </div>
                  <div className="check-content">
                    <div className="check-title">{item}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 필요 서류 */}
          {step.docs && (
            <div style={{ marginTop: 16 }}>
              <div className="section-heading">필요 서류</div>
              <div className="doc-list">
                <ul>
                  {step.docs.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
              {step.subDocs && Object.entries(step.subDocs).map(([label, items]) => (
                <div key={label} className="doc-list" style={{ marginTop: 8 }}>
                  <div className="doc-list-label">▷ {label}</div>
                  <ul>
                    {items.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* 실사 이후 절차 (STEP 14 전용) */}
          {step.postProcess && (
            <div style={{ marginTop: 16 }}>
              <div className="section-heading">인가 후 후속 절차</div>
              <div className="card" style={{ padding: 14 }}>
                {step.postProcess.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: i < step.postProcess.length - 1 ? '1px solid var(--bt-border-soft)' : 'none' }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'var(--bt-green)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, flexShrink: 0,
                    }}>{i + 1}</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--bt-body)' }}>{p}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 업체 정보 */}
          {step.vendor && (
            <div style={{ marginTop: 16 }}>
              <div className="section-heading">참고 · 업체/절차 정보</div>
              <div style={{
                background: '#FAF9F2',
                padding: '12px 14px',
                borderRadius: 10,
                fontSize: 12,
                color: 'var(--bt-body)',
                lineHeight: 1.6,
                borderLeft: '3px solid var(--bt-mute-2)',
              }}>{step.vendor}</div>
            </div>
          )}

          {/* 실전 노하우 팁 */}
          {step.tips && (
            <div style={{ marginTop: 16 }}>
              <div className="section-heading">💡 실전 노하우</div>
              {step.tips.map((tip, i) => (
                <div key={i} className="tip-box">
                  <div>{tip}</div>
                </div>
              ))}
            </div>
          )}

          {/* 완료 버튼 */}
          <div style={{ marginTop: 24 }}>
            <button
              onClick={() => onToggle(step.n)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 14,
                background: isDone ? 'white' : 'var(--bt-green)',
                color: isDone ? 'var(--bt-green)' : 'white',
                border: isDone ? '2px solid var(--bt-green)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {isDone ? (
                <><Icon.Check style={{ width: 16, height: 16 }} /> STEP {step.n} 완료</>
              ) : (
                <>이 단계 완료로 표시하기</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { DetailScreen };
