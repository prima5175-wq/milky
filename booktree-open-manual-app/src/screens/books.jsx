import React from 'react';
import { Icon } from '../components/icons.jsx';
import { StatusBar } from './home.jsx';
import { BOOK_INFO, MUST_READ } from '../data/manual.js';

// Ⅵ 도서 안내 & Ⅶ 필독서
function BooksScreen({ viewMode }) {
  const [tab, setTab] = React.useState('books');
  const b = BOOK_INFO;
  const isDesktop = viewMode === 'desktop';

  const fmt = (n) => n.toLocaleString('ko-KR');

  return (
    <div className="app-screen anim-fade">
      {!isDesktop && <StatusBar />}
      {!isDesktop && (
        <div className="appbar">
          <div>
            <div style={{ fontSize: 11, color: 'var(--bt-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>Ⅵ · Ⅶ</div>
            <div className="appbar-title">도서 · 필독서</div>
          </div>
        </div>
      )}

      <div className="screen-body" style={{ padding: isDesktop ? 0 : '0 20px 32px' }}>
        {isDesktop && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--bt-green)', fontWeight: 800, letterSpacing: '0.1em' }}>Ⅵ · Ⅶ</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>도서 · 필독서</div>
            <div style={{ color: 'var(--bt-muted)', marginTop: 6, fontSize: 13 }}>2026년 9월 시행 기준. 기본형/소규모형 체계로 개편되었어요.</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, background: '#F1EFE6', padding: 4, borderRadius: 12, marginBottom: 16 }}>
          <button
            onClick={() => setTab('books')}
            style={{ flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, background: tab === 'books' ? 'white' : 'transparent', color: tab === 'books' ? 'var(--bt-green)' : 'var(--bt-muted)' }}
          >구매 도서 안내</button>
          <button
            onClick={() => setTab('required')}
            style={{ flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, background: tab === 'required' ? 'white' : 'transparent', color: tab === 'required' ? 'var(--bt-green)' : 'var(--bt-muted)' }}
          >원장 필독서 10선</button>
        </div>

        {tab === 'books' && (
          <div className="anim-fade">
            <div className="tip-box" style={{ marginBottom: 16 }}>
              <div>기존 "학원형/교습소·공부방형"이 <b>"기본형/소규모형"</b>으로 개편되었어요. 도서 구성·금액은 원장님과 협의 후 결정해요.</div>
            </div>

            {/* 기본형 */}
            <div className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: 'var(--bt-green)', fontWeight: 800, letterSpacing: '0.08em' }}>기본형</div>
                  <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>35종 + 단행본 41권</div>
                </div>
                <span className="chip">2,072권</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--bt-muted)', textDecoration: 'line-through' }}>{fmt(b.basicSet.original)}원</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--bt-green)', letterSpacing: '-0.02em' }}>{fmt(b.basicSet.discounted)}원</div>
                <span className="chip red" style={{ fontSize: 10 }}>10% 할인</span>
              </div>
            </div>

            {/* 소규모형 */}
            <div className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: 'var(--bt-green)', fontWeight: 800, letterSpacing: '0.08em' }}>소규모형</div>
                  <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>23종 + 단행본 41권</div>
                  <div style={{ fontSize: 11, color: 'var(--bt-muted)', marginTop: 2 }}>교습소·공부방 및 500명 이하 상권</div>
                </div>
                <span className="chip">1,401권</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--bt-muted)', textDecoration: 'line-through' }}>{fmt(b.smallSet.original)}원</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--bt-green)', letterSpacing: '-0.02em' }}>{fmt(b.smallSet.discounted)}원</div>
                <span className="chip red" style={{ fontSize: 10 }}>10% 할인</span>
              </div>
            </div>

            {/* 필수추가 */}
            <div className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: '#856404', fontWeight: 800, letterSpacing: '0.08em' }}>필수추가</div>
                  <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>13종 (리퍼·중고)</div>
                  <div style={{ fontSize: 11, color: 'var(--bt-muted)', marginTop: 2 }}>{b.additional.note}</div>
                </div>
                <span className="chip yellow">652권</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#856404', letterSpacing: '-0.02em' }}>{fmt(b.additional.price)}원</div>
            </div>

            {/* 단행본 선택 */}
            <div className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: 'var(--bt-muted)', fontWeight: 800, letterSpacing: '0.08em' }}>선택 구매</div>
                  <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>단행본 150권</div>
                  <div style={{ fontSize: 11, color: 'var(--bt-muted)', marginTop: 2 }}>{b.optional.note}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--bt-muted)', textDecoration: 'line-through' }}>{fmt(b.optional.original)}원</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--bt-body)', letterSpacing: '-0.02em' }}>{fmt(b.optional.discounted)}원</div>
              </div>
            </div>

            <div style={{ background: '#FAF9F2', padding: '12px 14px', borderRadius: 10, fontSize: 12, color: 'var(--bt-body)', lineHeight: 1.6, marginTop: 12 }}>
              <b>주의사항</b><br />
              · 세팅비 30만원 별도<br />
              · 현금 결제만 가능<br />
              · 필수추가 도서 개별 구매 시 도서 품질에 따라 세팅 거부될 수 있음<br />
              · 실제 청구액은 지사장님과 사전 확인 후 진행 필수
            </div>
          </div>
        )}

        {tab === 'required' && (
          <div className="anim-fade">
            <div className="branch-directive" style={{ marginBottom: 16 }}>
              <div className="branch-directive-label"><Icon.Star style={{ width: 12, height: 12 }} /> 개원 전 필독</div>
              <div className="branch-directive-content">개원 전 반드시 10권을 읽고 오픈을 준비해요. 특히 1번은 1차 보수교육 지정 도서예요.</div>
            </div>

            {MUST_READ.map(book => (
              <div key={book.n} className="card" style={{ marginBottom: 8, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 44, height: 60,
                  background: book.n === 1 ? 'linear-gradient(135deg, var(--bt-yellow) 0%, var(--bt-yellow-deep) 100%)' : 'linear-gradient(135deg, var(--bt-green) 0%, var(--bt-green-dark) 100%)',
                  borderRadius: '3px 6px 6px 3px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: book.n === 1 ? 'var(--bt-ink)' : 'var(--bt-yellow)',
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 900, fontSize: 18,
                  flexShrink: 0,
                  boxShadow: '2px 2px 6px rgba(0,0,0,0.1)',
                }}>{String(book.n).padStart(2, '0')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.35 }}>{book.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--bt-muted)', marginTop: 4 }}>{book.author}</div>
                  {book.note && (
                    <span className="chip yellow-solid" style={{ marginTop: 6, fontSize: 10 }}>{book.note}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { BooksScreen };
