import React from 'react';
import { Icon } from '../components/icons.jsx';

// 전체 메뉴 — 모바일 하단 탭에 다 담기지 않는 화면까지 여기서 전부 갈 수 있어요.
// 순서·번호는 원본 매뉴얼(2026년 9월판)의 목차를 그대로 따릅니다.
const MENU_GROUPS = [
  {
    heading: '오픈 준비',
    items: [
      { id: 'steps', icon: 'Route', roman: 'Ⅲ', label: '오픈 진행 20단계', sub: '단계별 체크리스트 · 예상 날짜 · ★ 지사 지침' },
      { id: 'marketing', icon: 'Megaphone', roman: 'Ⅳ', label: '오픈 마케팅 플랜', sub: '시장조사 · 홍보 캘린더 · 체크리스트' },
    ],
  },
  {
    heading: '가맹 · 도서 정보',
    items: [
      { id: 'contract', icon: 'Doc', roman: 'Ⅰ·Ⅱ·Ⅴ', label: '가맹 개요 · 절차 · 예치', sub: '가맹비 · 창업비용 · 표준매출표 · 예치 절차' },
      { id: 'books', icon: 'Book', roman: 'Ⅵ·Ⅶ', label: '도서 구입 안내 · 필독서', sub: '기본형/소규모형 가격 · 원장 필독서 10선' },
    ],
  },
  {
    heading: '참고 · 점검',
    items: [
      { id: 'faq', icon: 'Alert', roman: 'Ⅹ', label: 'FAQ · 실전 노하우', sub: '자주 묻는 질문 · 강사 채용 · 원생 유지' },
      { id: 'quiz', icon: 'Quiz', roman: '', label: '매뉴얼 이해도 테스트', sub: '주제별 문항으로 스스로 점검해요' },
      { id: 'my', icon: 'User', roman: 'Ⅷ·Ⅸ', label: '내 기록 · 뱃지', sub: '진행률 · 뱃지 · 인증서 · 원장 교육 일정' },
    ],
  },
];

function MenuScreen({ onNavigate, onOpenSettings, meta, viewMode }) {
  const isDesktop = viewMode === 'desktop';

  return (
    <div className="app-screen anim-fade" data-screen-label="Menu">
      <div className="screen-body" style={{ padding: isDesktop ? 0 : '0 20px 32px' }}>
        <div style={{ paddingTop: isDesktop ? 0 : 18, marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--bt-green)', fontWeight: 800, letterSpacing: '0.1em' }}>ALL MENU</div>
          <div style={{ fontSize: isDesktop ? 26 : 22, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>전체 메뉴</div>
          <div style={{ color: 'var(--bt-muted)', marginTop: 6, fontSize: isDesktop ? 13 : 12.5, lineHeight: 1.6 }}>
            매뉴얼 v{meta.version} 의 모든 항목이에요. 원본 문서의 목차 순서 그대로입니다.
          </div>
        </div>

        {MENU_GROUPS.map(group => (
          <div key={group.heading} style={{ marginBottom: 18 }}>
            <div className="section-heading">{group.heading}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.items.map(item => {
                const I = Icon[item.icon];
                return (
                  <button
                    key={item.id}
                    className="menu-row"
                    onClick={() => onNavigate(item.id)}
                  >
                    <div className="menu-row-icon"><I /></div>
                    <div className="menu-row-body">
                      <div className="menu-row-title">
                        {item.roman && <span className="menu-row-roman">{item.roman}</span>}
                        {item.label}
                      </div>
                      <div className="menu-row-sub">{item.sub}</div>
                    </div>
                    <Icon.Chevron className="menu-row-chev" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="section-heading">설정</div>
        <button className="menu-row" onClick={onOpenSettings}>
          <div className="menu-row-icon"><Icon.Settings /></div>
          <div className="menu-row-body">
            <div className="menu-row-title">지점 설정</div>
            <div className="menu-row-sub">지점명 · 원장님 성함 · 주요 날짜 수정</div>
          </div>
          <Icon.Chevron className="menu-row-chev" />
        </button>
      </div>
    </div>
  );
}

export { MenuScreen };
