import React from 'react';
import { Icon, BooktreeLogo } from '../components/icons.jsx';
import { QUIZ_DATA } from '../data/manual.js';
import { formatKoDate } from '../utils/dates.js';

// 홈 대시보드 - D-Day, 진행률, 다음 단계, 오늘의 팁
function StatusBar({ dark }) {
  return (
    <div className={`status-bar ${dark ? 'on-dark' : ''}`}>
      <span>9:41</span>
      <span className="sb-icons">
        <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor"><rect x="0" y="6" width="3" height="4" rx="0.5"/><rect x="4" y="4" width="3" height="6" rx="0.5"/><rect x="8" y="2" width="3" height="8" rx="0.5"/><rect x="12" y="0" width="3" height="10" rx="0.5"/></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 4c4-4 10-4 14 0M3 6.5c2.5-2.5 7.5-2.5 10 0M6 9a2 2 0 0 1 4 0" strokeLinecap="round"/></svg>
        <svg width="24" height="11" viewBox="0 0 24 11" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="20" height="10" rx="2.5"/><rect x="2" y="2" width="15" height="7" rx="1" fill="currentColor" stroke="none"/><rect x="21" y="4" width="1.5" height="3" fill="currentColor" stroke="none"/></svg>
      </span>
    </div>
  );
}

function HomeScreen({ meta, steps, checked, onNavigate, onOpenStep, onOpenSettings, viewMode }) {
  const totalItems = steps.length;
  const doneItems = steps.filter(s => checked[`step:${s.n}`]).length;
  const pct = Math.round((doneItems / totalItems) * 100);

  const currentStep = steps.find(s => !checked[`step:${s.n}`]) || steps[steps.length - 1];
  const nextSteps = steps.filter(s => !checked[`step:${s.n}`]).slice(0, 3);

  const isDesktop = viewMode === 'desktop';

  const heroBlock = (
    <div className="home-hero">
      <StatusBar dark={true} />
      {!isDesktop && <div style={{ height: 8 }} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div className="hero-brandmark">
          <BooktreeLogo size={20} color="var(--bt-yellow)" />
          <span>BOOKTREE · SINCE 2009</span>
        </div>
        <button onClick={onOpenSettings} style={{ padding: 8, color: 'rgba(255,255,255,0.85)' }} aria-label="지점 설정">
          <Icon.Settings style={{ width: 18, height: 18 }} />
        </button>
      </div>
      <div className="hero-greeting">안녕하세요, {meta.managerName}님</div>
      <div className="hero-title">오픈 준비, 오늘도<br/>화이팅이에요 🌱</div>
      <div className="hero-branch">
        <Icon.MapPin style={{ width: 12, height: 12 }} />
        {meta.district ? `${meta.district} · ${meta.branch}` : meta.branch}
      </div>

      <div className="dday-card" onClick={!meta.openDate ? onOpenSettings : undefined} style={!meta.openDate ? { cursor: 'pointer' } : undefined}>
        <div className="dday-num">{meta.openDate ? `D${meta.daysToOpen >= 0 ? '-' : '+'}${Math.abs(meta.daysToOpen)}` : 'D-?'}</div>
        <div className="dday-info">
          <div className="dday-label">GRAND OPEN</div>
          <div className="dday-date">{meta.openDate ? formatKoDate(meta.openDate) : '오픈일을 설정해 주세요'}</div>
          <div className="dday-sub">
            {meta.contractDate && `계약 ${formatKoDate(meta.contractDate).replace(/\s?\(.*\)/, '')} · `}
            {meta.interiorDoneDate && `완공 ${formatKoDate(meta.interiorDoneDate).replace(/\s?\(.*\)/, '')}`}
            {!meta.contractDate && !meta.interiorDoneDate && `매뉴얼 v${meta.version} 기준`}
          </div>
        </div>
        <button onClick={onOpenSettings} style={{ color: 'rgba(255,255,255,0.7)', padding: 4 }} aria-label="날짜 수정">
          <Icon.Settings style={{ width: 15, height: 15 }} />
        </button>
      </div>
    </div>
  );

  const body = (
    <>
      {heroBlock}

      {/* 진행률 카드 */}
      <div className="progress-block">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--bt-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>오픈 진행 20단계</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2, letterSpacing: '-0.02em' }}>
              {pct}<span style={{ fontSize: 14, color: 'var(--bt-muted)', fontWeight: 700 }}>%</span>
              <span style={{ fontSize: 12, color: 'var(--bt-mute-2)', fontWeight: 600, marginLeft: 8 }}>({doneItems}/{totalItems})</span>
            </div>
          </div>
          <button className="btn-ghost" onClick={() => onNavigate('steps')}>계속하기</button>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* 다음 단계 카드 */}
      <div style={{ padding: '20px 20px 4px' }}>
        <div className="section-heading">NEXT UP</div>
        <button
          className="card"
          onClick={() => onOpenStep(currentStep.n)}
          style={{ width: '100%', textAlign: 'left', background: 'var(--bt-green-tint)', border: '1px solid var(--bt-green-light)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div className="step-num" style={{ background: 'var(--bt-green)', color: 'white' }}>{String(currentStep.n).padStart(2, '0')}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10.5, color: 'var(--bt-green)', fontWeight: 800, letterSpacing: '0.08em' }}>STEP {currentStep.n} · {currentStep.phase}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2, letterSpacing: '-0.01em' }}>{currentStep.title}</div>
            </div>
            {currentStep.badge && (
              <span className="chip yellow-solid" style={{ fontSize: 9 }}>★ 지사지침</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', color: 'var(--bt-green)', fontSize: 12, fontWeight: 700 }}>
            이 단계 자세히 보기 <Icon.Chevron style={{ width: 14, height: 14 }} />
          </div>
        </button>

        {/* 앞으로 남은 단계 미리보기 */}
        <div style={{ marginTop: 12 }}>
          {nextSteps.slice(1, 3).map(s => (
            <button
              key={s.n}
              onClick={() => onOpenStep(s.n)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', width: '100%', textAlign: 'left',
                background: 'white', border: '1px solid var(--bt-border-soft)',
                borderRadius: 10, marginBottom: 6,
              }}
            >
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 900, fontSize: 14, color: 'var(--bt-mute-2)', width: 22 }}>{String(s.n).padStart(2, '0')}</div>
              <div style={{ flex: 1, fontSize: 12.5, fontWeight: 500 }}>{s.title}</div>
              <span className="chip gray" style={{ fontSize: 10 }}>{s.phase}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 빠른 접근 (2x2) */}
      <div style={{ padding: '20px 20px 4px' }}>
        <div className="section-heading">QUICK ACCESS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <QuickTile icon="Route" label="가맹 절차" sub="6단계 로드맵" onClick={() => onNavigate('contract')} />
          <QuickTile icon="Megaphone" label="마케팅 플랜" sub="시장조사 · 캘린더" onClick={() => onNavigate('marketing')} accent />
          <QuickTile icon="Book" label="도서 · 필독서" sub="구성 · 필독 LIST" onClick={() => onNavigate('books')} />
          <QuickTile icon="Alert" label="FAQ · 노하우" sub="자주 묻는 질문" onClick={() => onNavigate('faq')} />
          <QuickTile icon="Quiz" label="이해도 테스트" sub="스스로 점검하기" onClick={() => onNavigate('quiz')} />
          <QuickTile icon="Menu" label="전체 메뉴" sub="모든 항목 보기" onClick={() => onNavigate('menu')} />
        </div>
      </div>

      {/* 오늘의 지침 (핵심 지사 지침 3개) */}
      <div style={{ padding: '20px 20px 32px' }}>
        <div className="section-heading">
          <span style={{ color: '#7C4E00' }}>★ 강남서초·광진성동지사 핵심 지침</span>
        </div>

        <div className="branch-directive" style={{ margin: '0 0 8px' }}>
          <div className="branch-directive-label">📞 통신 개통을 가장 먼저</div>
          <div className="branch-directive-content">
            알뜰폰 최우선 개통 → 전화번호 확보 → 블로그·인스타 즉시 개설. 모든 홍보물에 확정된 번호를 기재해요.
          </div>
        </div>

        <div className="branch-directive" style={{ margin: '0 0 8px' }}>
          <div className="branch-directive-label">🏫 교육청 서류는 마무리 2일 전 접수</div>
          <div className="branch-directive-content">
            인테리어 마무리 예정일 2일 전에 미리 접수해 실사 일정을 최대한 앞당겨요.
          </div>
        </div>

        <div className="branch-directive" style={{ margin: '0 0 8px' }}>
          <div className="branch-directive-label">🎤 학부모 설명회 = 지사장 일정 우선</div>
          <div className="branch-directive-content">
            일정은 지사장님과 먼저 조율해 확정하고, 홍보는 반드시 예정일 1개월 전부터 시작해요.
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="app-screen anim-fade">
      <div className="screen-body">
        {body}
      </div>
    </div>
  );
}

function QuickTile({ icon, label, sub, onClick, accent }) {
  const I = Icon[icon] || Icon.Doc;
  return (
    <button
      onClick={onClick}
      style={{
        background: accent ? 'linear-gradient(135deg, var(--bt-green) 0%, var(--bt-green-dark) 100%)' : 'white',
        color: accent ? 'white' : 'var(--bt-ink)',
        border: accent ? 'none' : '1px solid var(--bt-border-soft)',
        borderRadius: 14,
        padding: 14,
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: accent ? 'var(--bt-yellow)' : 'var(--bt-green)', marginBottom: 8 }}>
        <I style={{ width: 18, height: 18 }} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em' }}>{label}</div>
      <div style={{ fontSize: 10.5, opacity: accent ? 0.75 : 0.6, marginTop: 3, color: accent ? 'rgba(255,255,255,0.85)' : 'var(--bt-muted)' }}>{sub}</div>
    </button>
  );
}

export { HomeScreen, StatusBar };
