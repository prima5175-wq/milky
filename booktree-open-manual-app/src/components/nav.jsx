import React from 'react';
import { Icon, BooktreeLogo } from './icons.jsx';

// 하단 탭바 (모바일) & 사이드바 (데스크톱)

// 모바일 탭 (5개는 좁으니 4개로: 홈 / 오픈단계 / 마케팅 / My)
// 모바일 하단 탭. 자주 쓰는 4개 + '전체'.
// ⚠️ 여기 없는 화면(도서·FAQ·퀴즈·가맹개요)은 '전체' 탭에서 갑니다.
//    탭을 늘리거나 줄일 때 menu.jsx 의 MENU_GROUPS 도 함께 확인해 주세요.
//    모든 화면은 반드시 최소 한 경로로 닿을 수 있어야 해요.
const TABS = [
  { id: 'home', label: '홈', icon: 'Home' },
  { id: 'steps', label: '오픈단계', icon: 'Route' },
  { id: 'books', label: '도서', icon: 'Book' },
  { id: 'marketing', label: '마케팅', icon: 'Megaphone' },
  { id: 'menu', label: '전체', icon: 'Menu' },
];

// 데스크톱 사이드바 (전체 매뉴얼 접근)
const SIDEBAR_ITEMS = [
  { id: 'home', label: '대시보드', icon: 'Home' },
  { id: 'steps', label: 'Ⅲ 오픈 20단계', icon: 'Route', primary: true },
  { id: 'marketing', label: 'Ⅳ 마케팅 플랜', icon: 'Megaphone' },
  { id: 'contract', label: 'Ⅰ·Ⅱ·Ⅴ 가맹 개요', icon: 'Doc' },
  { id: 'books', label: 'Ⅵ·Ⅶ 도서·필독서', icon: 'Book' },
  { id: 'faq', label: 'Ⅹ FAQ·노하우', icon: 'Alert' },
  { id: 'quiz', label: '이해도 테스트', icon: 'Quiz' },
  { id: 'my', label: '내 기록·뱃지', icon: 'User' },
];

function TabBar({ active, onChange }) {
  return (
    <div className="tabbar">
      {TABS.map(t => {
        const I = Icon[t.icon];
        return (
          <button
            key={t.id}
            className={`tabbar-item ${active === t.id ? 'active' : ''}`}
            onClick={() => onChange(t.id)}
          >
            <I />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Sidebar({ active, onChange, meta, onOpenSettings }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <BooktreeLogo size={30} color="var(--bt-yellow)" />
          <div>
            <div className="sidebar-brand-title">책나무</div>
            <div className="sidebar-brand-sub">Open Manual</div>
          </div>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-nav-heading">Menu</div>
        {SIDEBAR_ITEMS.map(t => {
          const I = Icon[t.icon];
          return (
            <button
              key={t.id}
              className={`sidebar-nav-item ${active === t.id ? 'active' : ''}`}
              onClick={() => onChange(t.id)}
            >
              <I />
              <span>{t.label}</span>
              {t.primary && !((active === t.id)) && (
                <span style={{ marginLeft: 'auto', fontSize: 9, background: 'var(--bt-yellow)', color: 'var(--bt-ink)', padding: '2px 6px', borderRadius: 999, fontWeight: 800 }}>CORE</span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <button
          onClick={onOpenSettings}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.08)', color: 'white',
            fontSize: 12, fontWeight: 600, marginBottom: 12, textAlign: 'left',
          }}
        >
          <Icon.Settings style={{ width: 14, height: 14 }} />
          <span>지점 설정</span>
          <Icon.Chevron style={{ marginLeft: 'auto', width: 14, height: 14, opacity: 0.5 }} />
        </button>
        <div style={{ color: 'var(--bt-yellow)', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', marginBottom: 3 }}>D-{meta.daysToOpen} · 오픈까지</div>
        <div style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: 12 }}>{meta.district}</div>
        <div style={{ marginTop: 6, opacity: 0.5 }}>Since 2009 · v{meta.version}</div>
      </div>
    </aside>
  );
}

export { TabBar, Sidebar };
