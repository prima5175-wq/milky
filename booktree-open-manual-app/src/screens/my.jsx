import React from 'react';
import { Icon } from '../components/icons.jsx';
import { BRANCH_LINKS } from '../data/manual.js';
import { StatusBar } from './home.jsx';
import { BADGES, FINAL_CHECKLIST } from '../data/manual.js';

// My 페이지 - 프로필 + 뱃지 + 최종 체크리스트 + 설정
function MyScreen({ meta, steps, checked, onOpenSettings, viewMode }) {
  const isDesktop = viewMode === 'desktop';
  const doneItems = steps.filter(s => checked[`step:${s.n}`]).length;
  const pct = Math.round((doneItems / steps.length) * 100);
  const badges = BADGES.map(b => ({ ...b, earned: doneItems >= b.threshold }));
  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <div className="app-screen anim-fade">
      <div className="screen-body">
        {/* 프로필 헤더 */}
        <div style={{
          background: 'linear-gradient(160deg, var(--bt-green) 0%, var(--bt-green-dark) 100%)',
          color: 'white',
          padding: isDesktop ? '28px 32px' : '4px 20px 28px',
          borderRadius: isDesktop ? 'var(--radius-lg)' : '0 0 20px 20px',
          position: 'relative', overflow: 'hidden',
        }}>
          {!isDesktop && <StatusBar dark={true} />}
          {!isDesktop && <div style={{ height: 8 }} />}
          {isDesktop && <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: '0.1em', fontWeight: 800, marginBottom: 12 }}>MY PAGE</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 66, height: 66, borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)',
              border: '2px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-serif)',
              color: 'var(--bt-yellow)',
              flexShrink: 0,
            }}>金</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>{meta.managerName}</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{meta.district}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <span className="chip yellow-solid" style={{ fontSize: 10 }}>신규 원장</span>
                <span className="chip white-on-dark">{meta.branch}</span>
              </div>
            </div>
          </div>

          {/* 스탯 */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            marginTop: 18,
            background: 'rgba(0,0,0,0.15)',
            borderRadius: 14, padding: 14,
          }}>
            <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--bt-yellow)', letterSpacing: '-0.02em' }}>D-{meta.daysToOpen}</div>
              <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2, letterSpacing: '0.06em' }}>OPEN</div>
            </div>
            <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--bt-yellow)', letterSpacing: '-0.02em' }}>{pct}<span style={{ fontSize: 12, opacity: 0.6 }}>%</span></div>
              <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2, letterSpacing: '0.06em' }}>진행률</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--bt-yellow)', letterSpacing: '-0.02em' }}>{earnedCount}<span style={{ fontSize: 12, opacity: 0.6 }}>/{badges.length}</span></div>
              <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2, letterSpacing: '0.06em' }}>뱃지</div>
            </div>
          </div>
        </div>

        <div style={{ padding: isDesktop ? '24px 32px 40px' : '20px 20px 40px' }}>
          {/* 뱃지 컬렉션 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em' }}>뱃지 컬렉션</div>
                <div style={{ fontSize: 11, color: 'var(--bt-muted)', marginTop: 2 }}>{earnedCount}개 획득 · {badges.length - earnedCount}개 잠금</div>
              </div>
            </div>
            <div className="badge-grid" style={{ gridTemplateColumns: isDesktop ? 'repeat(6, 1fr)' : 'repeat(3, 1fr)' }}>
              {badges.map(b => (
                <div key={b.id} className={`badge ${b.earned ? 'earned' : 'locked'}`}>
                  <div className="badge-icon">{b.earned ? b.icon : '?'}</div>
                  <div className="badge-name">{b.name}</div>
                  <div className="badge-cond">{b.condition}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 최종 체크리스트 (Ⅸ 요약) 타임라인 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 12 }}>Ⅸ 최종 점검 체크리스트</div>
            <div className="card" style={{ padding: '20px 16px 16px' }}>
              <div className="timeline">
                {FINAL_CHECKLIST.map((phase, i) => (
                  <div key={i} className={`timeline-item ${phase.starred ? 'starred' : ''}`}>
                    <div className="timeline-phase">{phase.phase} {phase.starred && '★'}</div>
                    {phase.label && <div className="timeline-label">{phase.label}</div>}
                    <div className="timeline-items">
                      {phase.items.map((item, j) => (
                        <div key={j} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 12, color: 'var(--bt-body)', lineHeight: 1.55 }}>
                          <div style={{ color: 'var(--bt-muted)', flexShrink: 0 }}>☐</div>
                          <div>{item}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 수료증 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.01em' }}>수료증</div>
            <div style={{
              padding: 20, borderRadius: 14,
              background: 'linear-gradient(140deg, #FEF3B8 0%, #FDE68A 100%)',
              border: '2px solid var(--bt-yellow)',
              display: 'flex', gap: 16, alignItems: 'center',
            }}>
              <div style={{
                width: 56, height: 72,
                background: 'white',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 6,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                flexShrink: 0,
              }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 900, color: 'var(--bt-green)' }}>證</div>
                <div style={{ fontSize: 8, letterSpacing: '0.1em', color: 'var(--bt-muted)' }}>CERT</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, color: '#856404', fontWeight: 800, letterSpacing: '0.06em' }}>준비 중 · {pct}%</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#5D4501', marginTop: 4 }}>책나무 오픈 인증서</div>
                <div style={{ fontSize: 11, color: '#856404', marginTop: 3, opacity: 0.85 }}>20단계 완료 시 발급</div>
                <div style={{ marginTop: 8, height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--bt-green)', borderRadius: 2 }} />
                </div>
              </div>
            </div>
          </div>

          {/* 원장 교육 일정 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.01em' }}>Ⅷ 신규 원장 교육 & 사후관리</div>
            <div className="card" style={{ padding: 0 }}>
              {[
                { label: '신규 원장 교육', freq: '매월 2째 주 목·금 (2일)', note: '지사 사전 공지' },
                { label: '원장 스터디', freq: '월 1회', note: '개원 이후 정기 참여' },
                { label: '지사장 현장방문', freq: '분기 1회', note: '운영 점검 및 애로 상담' },
              ].map((s, i, arr) => (
                <div key={i} style={{ padding: '14px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--bt-border-soft)' : 'none', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--bt-green-tint)', color: 'var(--bt-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon.Calendar style={{ width: 16, height: 16 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--bt-muted)', marginTop: 1 }}>{s.freq} · {s.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 지점 설정 */}
          <button
            onClick={onOpenSettings}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', marginBottom: 12,
              borderRadius: 14, background: 'white',
              border: '1px solid var(--bt-border-soft)',
              textAlign: 'left',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--bt-green-tint)', color: 'var(--bt-green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon.Settings style={{ width: 18, height: 18 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>지점 설정</div>
              <div style={{ fontSize: 11, color: 'var(--bt-muted)', marginTop: 2 }}>지점명 · 원장님 · 주요 날짜 수정</div>
            </div>
            <Icon.Chevron style={{ width: 18, height: 18, flexShrink: 0, color: 'var(--bt-mute-2)' }} />
          </button>

          {/* 지사 연락처 */}
          <div style={{
            padding: '16px 18px', borderRadius: 14,
            background: 'var(--bt-green)', color: 'white',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.08em', fontWeight: 700 }}>지사 문의</div>
            <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>{meta.supervisor}</div>
            <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 2 }}>{meta.branch}</div>
            <BranchLinks />
          </div>

          <div style={{ textAlign: 'center', color: 'var(--bt-mute-2)', fontSize: 10.5, lineHeight: 1.7 }}>
            책나무 신규 오픈 매뉴얼 v{meta.version}<br />
            © 2026 BOOKTREE · Since 2009<br />
            전국 가맹점 {meta.totalBranches}개 (2026년 8월 기준)
          </div>
        </div>
      </div>
    </div>
  );
}


// 지사 인스타그램·블로그 링크.
// 주소는 src/data/manual.js 의 BRANCH_LINKS 에서 관리해요.
// 주소가 비어 있는 항목은 버튼 자체가 나오지 않아요.
function BranchLinks() {
  const links = [
    { key: 'instagram', label: '인스타그램', url: BRANCH_LINKS.instagram, Ico: Icon.Instagram },
    { key: 'blog', label: '블로그', url: BRANCH_LINKS.blog, Ico: Icon.Blog },
  ].filter(l => l.url && l.url.trim());

  if (links.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
      {links.map(({ key, label, url, Ico }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.15)', color: 'white',
            padding: '8px 14px', borderRadius: 8,
            fontSize: 12, fontWeight: 700, textDecoration: 'none',
          }}
        >
          <Ico style={{ width: 14, height: 14 }} />
          {label}
          <Icon.External style={{ width: 11, height: 11, opacity: 0.6 }} />
        </a>
      ))}
    </div>
  );
}

export { MyScreen };
