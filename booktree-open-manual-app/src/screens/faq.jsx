import React from 'react';
import { Icon } from '../components/icons.jsx';
import { StatusBar } from './home.jsx';
import { FAQ_LIST, KNOW_HOW } from '../data/manual.js';

// Ⅹ FAQ + 실전 노하우
function FaqScreen({ viewMode }) {
  const [openIdx, setOpenIdx] = React.useState(0);
  const [tab, setTab] = React.useState('faq');
  const isDesktop = viewMode === 'desktop';
  const kh = KNOW_HOW;

  return (
    <div className="app-screen anim-fade">
      {!isDesktop && <StatusBar />}
      {!isDesktop && (
        <div className="appbar">
          <div>
            <div style={{ fontSize: 11, color: 'var(--bt-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>Ⅹ · FAQ</div>
            <div className="appbar-title">노하우 & FAQ</div>
          </div>
        </div>
      )}

      <div className="screen-body" style={{ padding: isDesktop ? 0 : '0 20px 32px' }}>
        {isDesktop && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--bt-green)', fontWeight: 800, letterSpacing: '0.1em' }}>Ⅹ · KNOW-HOW & FAQ</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>실전 노하우 & 자주 묻는 질문</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, background: '#F1EFE6', padding: 4, borderRadius: 12, marginBottom: 16 }}>
          {[
            { k: 'faq', label: '자주 묻는 질문' },
            { k: 'interview', label: '강사 채용' },
            { k: 'retention', label: '원생 유지' },
          ].map(t => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              style={{ flex: 1, padding: '9px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: tab === t.k ? 'white' : 'transparent', color: tab === t.k ? 'var(--bt-green)' : 'var(--bt-muted)' }}
            >{t.label}</button>
          ))}
        </div>

        {tab === 'faq' && (
          <div className="anim-fade">
            {FAQ_LIST.map((faq, i) => (
              <div key={i} className={`faq-item ${openIdx === i ? 'open' : ''}`}>
                <div className="faq-q" onClick={() => setOpenIdx(openIdx === i ? -1 : i)}>
                  <span className="faq-q-mark">Q.</span>
                  <span style={{ flex: 1 }}>{faq.q}</span>
                  <Icon.Chevron className="faq-q-chev" />
                </div>
                {openIdx === i && (
                  <div className="faq-a">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'interview' && (
          <div className="anim-fade">
            <div className="section-heading">강사 채용 면접 체크포인트</div>
            <div className="card">
              {kh.interview.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < kh.interview.length - 1 ? '1px solid var(--bt-border-soft)' : 'none' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bt-green-light)', color: 'var(--bt-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--bt-body)' }}>{item}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'retention' && (
          <div className="anim-fade">
            <div className="section-heading">초기 3개월 원생 유지 전략</div>
            <div className="card">
              {kh.retention.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < kh.retention.length - 1 ? '1px solid var(--bt-border-soft)' : 'none' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bt-green-light)', color: 'var(--bt-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--bt-body)' }}>{item}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { FaqScreen };
