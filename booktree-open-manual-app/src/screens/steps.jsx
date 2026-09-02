import React from 'react';
import { Icon } from '../components/icons.jsx';
import { StatusBar } from './home.jsx';
import { formatStepDate } from '../utils/dates.js';

// 오픈 진행 20단계 리스트 (핵심 화면)
function StepsScreen({ steps, meta, checked, onOpenStep, viewMode }) {
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState('all'); // all / starred / undone
  const isDesktop = viewMode === 'desktop';

  const filtered = steps.filter(s => {
    if (filter === 'starred' && !s.badge) return false;
    if (filter === 'undone' && checked[`step:${s.n}`]) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      const hay = (s.title + ' ' + (s.items || []).join(' ') + ' ' + (s.vendor || '') + ' ' + (s.badgeContent || '')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const doneCount = steps.filter(s => checked[`step:${s.n}`]).length;
  const starredCount = steps.filter(s => s.badge).length;

  return (
    <div className="app-screen anim-fade">
      {!isDesktop && <StatusBar />}
      {!isDesktop && (
        <div className="appbar">
          <div>
            <div style={{ fontSize: 11, color: 'var(--bt-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>Ⅲ · SECTION</div>
            <div className="appbar-title">오픈 진행 20단계</div>
          </div>
          <div className="appbar-spacer" />
          <span className="chip">{doneCount}/{steps.length}</span>
        </div>
      )}

      <div className="screen-body" style={{ padding: isDesktop ? 0 : '0 20px 32px' }}>
        {isDesktop && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--bt-green)', fontWeight: 800, letterSpacing: '0.1em' }}>Ⅲ · CORE</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>신규지점 오픈 진행 20단계</div>
            <div style={{ color: 'var(--bt-muted)', marginTop: 6, fontSize: 13 }}>
              본사 절차에 강남서초지사 / 광진성동중랑동대문지사 운영 경험을 반영한 실무 순서입니다. ★는 반드시 지켜야 하는 지사 특별지침이에요.
            </div>
          </div>
        )}

        {/* 검색 */}
        <div className="search-wrap" style={{ marginBottom: 12 }}>
          <Icon.Search />
          <input
            className="search-input"
            placeholder="단계·업체·서류 검색"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {/* 필터 chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
          <button className="chip" style={{ background: filter === 'all' ? 'var(--bt-green)' : 'var(--bt-green-light)', color: filter === 'all' ? 'white' : 'var(--bt-green)', cursor: 'pointer' }} onClick={() => setFilter('all')}>
            전체 {steps.length}
          </button>
          <button className="chip yellow-solid" style={{ opacity: filter === 'starred' ? 1 : 0.6, cursor: 'pointer' }} onClick={() => setFilter('starred')}>
            ★ 지사지침 {starredCount}
          </button>
          <button className="chip gray" style={{ background: filter === 'undone' ? 'var(--bt-ink)' : '#F1EFE6', color: filter === 'undone' ? 'white' : 'var(--bt-muted)', cursor: 'pointer' }} onClick={() => setFilter('undone')}>
            미완료 {steps.length - doneCount}
          </button>
        </div>

        {/* Step 리스트 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
          gap: 10,
        }}>
          {filtered.map(s => {
            const isDone = !!checked[`step:${s.n}`];
            const isStarred = !!s.badge;
            return (
              <button
                key={s.n}
                className={`step-card ${isDone ? 'done' : ''} ${isStarred ? 'starred' : ''}`}
                onClick={() => onOpenStep(s.n)}
                data-screen-label={`Step ${s.n} ${s.title}`}
              >
                <div className="step-num">{isDone ? <Icon.Check style={{ width: 18, height: 18 }} /> : String(s.n).padStart(2, '0')}</div>
                <div className="step-body">
                  <div className="step-title">{s.title}</div>
                  <div className="step-meta">
                    <span className="chip gray" style={{ padding: '2px 7px', fontSize: 10 }}>{s.phase}</span>
                    {meta && meta.openDate && formatStepDate(s.n, meta.openDate) && (
                      <span className="chip" style={{ padding: '2px 7px', fontSize: 10 }}>{formatStepDate(s.n, meta.openDate)}</span>
                    )}
                    <span>{(s.items || []).length}개 항목</span>
                    {s.docs && <span>· 서류 {s.docs.length}</span>}
                  </div>
                </div>
                <Icon.Chevron style={{ color: 'var(--bt-mute-2)', flexShrink: 0, marginTop: 8 }} />
                {isStarred && <span className="step-badge-star">★ 지사지침</span>}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--bt-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <div>검색 결과가 없어요</div>
          </div>
        )}
      </div>
    </div>
  );
}

export { StepsScreen };
