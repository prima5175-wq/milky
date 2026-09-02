import React from 'react';
import { Icon } from '../components/icons.jsx';
import { StatusBar } from './home.jsx';
import { MARKETING_CALENDAR } from '../data/manual.js';

// Ⅳ 오픈 마케팅 플랜 - 캘린더 + 체크리스트 + TIP
function MarketingScreen({ viewMode }) {
  const [tab, setTab] = React.useState('calendar'); // calendar / checklist / tips
  const data = MARKETING_CALENDAR;
  const isDesktop = viewMode === 'desktop';

  return (
    <div className="app-screen anim-fade">
      {!isDesktop && <StatusBar />}
      {!isDesktop && (
        <div className="appbar">
          <div>
            <div style={{ fontSize: 11, color: 'var(--bt-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>Ⅳ · MARKETING</div>
            <div className="appbar-title">오픈 마케팅 플랜</div>
          </div>
        </div>
      )}

      <div className="screen-body" style={{ padding: isDesktop ? 0 : '0 20px 32px' }}>
        {isDesktop && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--bt-green)', fontWeight: 800, letterSpacing: '0.1em' }}>Ⅳ · MARKETING</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>오픈 마케팅 플랜</div>
            <div style={{ color: 'var(--bt-muted)', marginTop: 6, fontSize: 13 }}>오픈 2~3개월 전부터 시장조사와 홍보 계획을 세워야 해요. 실제 오픈 사례 기반 표준 일정이에요.</div>
          </div>
        )}

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 4, background: '#F1EFE6', padding: 4, borderRadius: 12, marginBottom: 16 }}>
          {[
            { k: 'calendar', label: '홍보 캘린더' },
            { k: 'checklist', label: '체크리스트' },
            { k: 'tips', label: 'TIP' },
          ].map(t => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 8,
                fontSize: 12.5, fontWeight: 700,
                background: tab === t.k ? 'white' : 'transparent',
                color: tab === t.k ? 'var(--bt-green)' : 'var(--bt-muted)',
                boxShadow: tab === t.k ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* 캘린더 뷰 */}
        {tab === 'calendar' && (
          <div className="anim-fade">
            {/* 지사 지침 */}
            <div className="branch-directive">
              <div className="branch-directive-label"><Icon.Star style={{ width: 12, height: 12 }} /> 지사 특별지침</div>
              <div className="branch-directive-content">
                학부모 설명회는 지사장 일정을 먼저 확인 후 조율 확정. 설명회 홍보는 반드시 <b>예정일 1개월 전부터</b> 시작해요.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>오픈 전월 (D-1개월)</div>
              <span className="chip gray">시장조사는 이보다 앞선 시기(D-2개월)에 완료</span>
            </div>
            {data.preMonth.map((item, i) => (
              <div key={i} className={`cal-item ${item.type === 'milestone' ? 'milestone' : ''}`}>
                <div className="cal-day">{item.day}</div>
                <div className={`cal-dot ${item.type}`} />
                <div className="cal-task">{item.task}</div>
              </div>
            ))}

            <div style={{ fontSize: 13, fontWeight: 800, marginTop: 20, marginBottom: 8 }}>오픈 당월</div>
            {data.openMonth.map((item, i) => (
              <div key={i} className={`cal-item ${item.type === 'milestone' ? 'milestone' : ''}`}>
                <div className="cal-day">{item.day}</div>
                <div className={`cal-dot ${item.type}`} />
                <div className="cal-task">{item.task}</div>
              </div>
            ))}

            {/* 범례 */}
            <div style={{ marginTop: 16, padding: 12, background: 'white', borderRadius: 12, border: '1px solid var(--bt-border-soft)' }}>
              <div style={{ fontSize: 10, color: 'var(--bt-muted)', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 8 }}>범례</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--bt-body)' }}>
                {[
                  { c: 'setup', l: '세팅' }, { c: 'community', l: '맘카페' }, { c: 'print', l: '전단지' },
                  { c: 'content', l: '콘텐츠' }, { c: 'ad', l: '광고' }, { c: 'milestone', l: '주요이벤트' },
                ].map((leg, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div className={`cal-dot ${leg.c}`} style={{ width: 7, height: 7 }} />
                    <span>{leg.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 체크리스트 뷰 */}
        {tab === 'checklist' && (
          <div className="anim-fade">
            <div style={{
              display: 'grid',
              gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
              gap: 10,
            }}>
              {data.checklist.map((cat, i) => (
                <div key={i} className="card">
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 10, color: 'var(--bt-green)' }}>
                    {cat.cat}
                  </div>
                  {cat.items.map((item, j) => (
                    <CheckLine key={j} label={item} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TIP 뷰 */}
        {tab === 'tips' && (
          <div className="anim-fade">
            {data.tips.map((tip, i) => (
              <div key={i} className="tip-box" style={{ padding: '14px 16px', marginBottom: 10, fontSize: 13, lineHeight: 1.7 }}>
                <div>{tip}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckLine({ label }) {
  const [on, setOn] = React.useState(false);
  return (
    <div className={`checklist-item ${on ? 'done' : ''}`} onClick={() => setOn(!on)} style={{ padding: '8px 0' }}>
      <div className={`check-box ${on ? 'checked' : ''}`}>
        <Icon.Check />
      </div>
      <div className="check-content">
        <div className="check-title" style={{ fontSize: 12.5 }}>{label}</div>
      </div>
    </div>
  );
}

export { MarketingScreen };
