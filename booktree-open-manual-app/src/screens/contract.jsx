import React from 'react';
import { Icon } from '../components/icons.jsx';
import { StatusBar } from './home.jsx';
import { FRANCHISE_INFO, CONTRACT_STEPS } from '../data/manual.js';

// Ⅰ 프랜차이즈 개요 + Ⅱ 가맹 절차 6단계 + Ⅴ 가맹비 예치
function ContractScreen({ viewMode }) {
  const isDesktop = viewMode === 'desktop';
  const [tab, setTab] = React.useState('overview');
  const f = FRANCHISE_INFO;

  return (
    <div className="app-screen anim-fade">
      {!isDesktop && <StatusBar />}
      {!isDesktop && (
        <div className="appbar">
          <div>
            <div style={{ fontSize: 11, color: 'var(--bt-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>Ⅰ · Ⅱ · Ⅴ</div>
            <div className="appbar-title">프랜차이즈 · 가맹</div>
          </div>
        </div>
      )}

      <div className="screen-body" style={{ padding: isDesktop ? 0 : '0 20px 32px' }}>
        {isDesktop && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--bt-green)', fontWeight: 800, letterSpacing: '0.1em' }}>Ⅰ · Ⅱ · Ⅴ</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>가맹 개요 · 절차 · 예치</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, background: '#F1EFE6', padding: 4, borderRadius: 12, marginBottom: 16 }}>
          {[
            { k: 'overview', label: '프랜차이즈 개요' },
            { k: 'process', label: '가맹 절차 6단계' },
            { k: 'deposit', label: '가맹비 예치' },
          ].map(t => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              style={{ flex: 1, padding: '9px 8px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, background: tab === t.k ? 'white' : 'transparent', color: tab === t.k ? 'var(--bt-green)' : 'var(--bt-muted)' }}
            >{t.label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="anim-fade">
            {/* 가맹점 수 하이라이트 */}
            <div style={{
              padding: 20, borderRadius: 16,
              background: 'linear-gradient(135deg, var(--bt-green) 0%, var(--bt-green-dark) 100%)',
              color: 'white', marginBottom: 16,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.1em', fontWeight: 800 }}>SINCE 2009</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
                <div style={{ fontSize: 42, fontFamily: 'var(--font-serif)', fontWeight: 900, color: 'var(--bt-yellow)', letterSpacing: '-0.03em', lineHeight: 1 }}>647</div>
                <div style={{ fontSize: 14, opacity: 0.9 }}>전국 가맹점</div>
              </div>
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>2026년 8월 기준 · 독서 중심 · 아이 중심 · 문해력 교육 전문</div>
            </div>

            {/* 가맹비 */}
            <div style={{ marginBottom: 16 }}>
              <div className="section-heading">가맹 형태별 가맹비 · 교육비</div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {f.fees.map((row, i) => (
                  <div key={i} style={{ padding: '14px 16px', borderBottom: i < f.fees.length - 1 ? '1px solid var(--bt-border-soft)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bt-green-tint)', color: 'var(--bt-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontWeight: 900, fontSize: 16, flexShrink: 0 }}>
                      {row.type[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{row.type}</div>
                      <div style={{ fontSize: 11, color: 'var(--bt-muted)', marginTop: 2 }}>교육비 {row.education} 별도 · 초도물품·설명회 1회 포함</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--bt-green)', letterSpacing: '-0.02em' }}>{row.franchise}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--bt-muted)', marginTop: 6, lineHeight: 1.5 }}>
                * 공부방으로 입점 후 상가 이전 시 가맹비 100만원(VAT별도) 추가 납입.<br />
                * 공부방은 상권에 따라 입점이 불가한 지역이 있을 수 있음.
              </div>
            </div>

            {/* 프로그램 사용료 */}
            <div style={{ marginBottom: 16 }}>
              <div className="section-heading">가맹 유지 · 프로그램 사용료</div>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--bt-green)', letterSpacing: '-0.02em' }}>{f.monthly}</div>
                <div style={{ fontSize: 11.5, color: 'var(--bt-muted)', marginTop: 4, lineHeight: 1.5 }}>
                  진단 테스트 · BToS 온라인 독해력 체크 · 독서이력관리 · 북히스토리 · 1:1 독후활동지 · 특별활동지(신문·한국사·세계사·문학·교과) · 비문학 독해 훈련서(월 1권)
                </div>
              </div>
            </div>

            {/* 창업 비용 */}
            <div style={{ marginBottom: 16 }}>
              <div className="section-heading">창업 비용 예시 (임대 보증금 제외)</div>
              <div className="card" style={{ padding: 0 }}>
                {f.investment.map((inv, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: i < f.investment.length - 1 ? '1px solid var(--bt-border-soft)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{inv.type}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--bt-green)' }}>{inv.amount}</div>
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--bt-muted)', marginTop: 2 }}>{inv.unit}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 표준 매출 */}
            <div>
              <div className="section-heading">표준 매출표 (2024년 100개 지점 기준)</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>구분</th>
                      <th>A</th>
                      <th>B</th>
                      <th>C</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>초등학생 수</td>
                      {f.standardRevenue.map((r, i) => <td key={i}>{r.students}</td>)}
                    </tr>
                    <tr>
                      <td>예상 원생</td>
                      {f.standardRevenue.map((r, i) => <td key={i}>{r.mine}</td>)}
                    </tr>
                    <tr>
                      <td>총매출</td>
                      {f.standardRevenue.map((r, i) => <td key={i} style={{ fontWeight: 700, color: 'var(--bt-green)' }}>{r.revenue}</td>)}
                    </tr>
                    <tr>
                      <td>지출</td>
                      {f.standardRevenue.map((r, i) => <td key={i} style={{ color: 'var(--bt-muted)' }}>{r.cost}</td>)}
                    </tr>
                    <tr className="total">
                      <td>순수익</td>
                      {f.standardRevenue.map((r, i) => <td key={i}>{r.profit}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'process' && (
          <div className="anim-fade">
            <div style={{ fontSize: 12.5, color: 'var(--bt-body)', lineHeight: 1.6, marginBottom: 16, padding: 14, background: '#FAF9F2', borderRadius: 10 }}>
              <b>⚠️ 신규 지점 임대 계약 전에는 반드시 상가 용도를 확인합니다.</b><br />
              (건축물대장 용도 : 2종 근린생활시설(교육연구시설))
            </div>

            <div className="timeline">
              {CONTRACT_STEPS.map((step, i) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-phase">STEP {step.code} · {step.title}</div>
                  <div className="timeline-items">
                    {step.items.map((item, j) => (
                      <div key={j} style={{ fontSize: 12, color: 'var(--bt-body)', padding: '3px 0', display: 'flex', gap: 6 }}>
                        <span style={{ color: 'var(--bt-mute-2)' }}>{['①','②','③','④','⑤','⑥'][j] || '·'}</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'deposit' && (
          <div className="anim-fade">
            <div className="tip-box" style={{ marginBottom: 16 }}>
              <div>가맹금 예치금 제도: 가맹점과 본사가 계약 후 <b>2개월 경과 시점</b>에 가맹본부에 가맹비 예치금이 지급되는 제도예요.</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div className="section-heading">1. 국민은행 예치 (본사 지정)</div>
              <div className="card">
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, color: 'var(--bt-body)', lineHeight: 1.6 }}>
                  <li style={{ display: 'flex', gap: 6 }}><span style={{ color: 'var(--bt-green)' }}>•</span> 본사 수령 통장과 가맹점 송금 통장은 <b>동일 은행</b>이어야 함</li>
                  <li style={{ display: 'flex', gap: 6 }}><span style={{ color: 'var(--bt-green)' }}>•</span> ㈜책나무는 국민은행 예치 지정 → 원장님 명의 국민은행 통장 필요</li>
                  <li style={{ display: 'flex', gap: 6 }}><span style={{ color: 'var(--bt-green)' }}>•</span> 사업이 이미 시작된 경우 예치 없이 본사 계좌 직접 송금 가능 (가맹비 본사 입금 확인서 작성)</li>
                </ul>
                <div style={{ marginTop: 12, padding: 12, background: 'var(--bt-green-tint)', borderRadius: 10, fontSize: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--bt-green)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 4 }}>본사 가맹비 입금 계좌</div>
                  <div style={{ fontWeight: 700, color: 'var(--bt-ink)' }}>국민은행 596001-04-186116</div>
                  <div style={{ color: 'var(--bt-muted)', marginTop: 2 }}>예금주: 주식회사 책나무</div>
                </div>
              </div>
            </div>

            <div>
              <div className="section-heading">2. 우리에스크로 예치 절차</div>
              <div className="card">
                <div style={{ fontSize: 12.5, color: 'var(--bt-body)', lineHeight: 1.7 }}>
                  <p>• 구비서류: 가맹점사업자 신분증 사본 1부</p>
                  <p>• 영업 개시 또는 가맹계약일로부터 2개월 경과 시 예치금이 본부에 지급됨</p>
                  <p style={{ marginTop: 8, fontWeight: 700 }}>지급 보류 사유:</p>
                  <p style={{ paddingLeft: 12 }}>① 반환 소 제기 ② 알선·조정·중재 신청 ③ 공정거래위원회 신고</p>
                  <p style={{ marginTop: 8 }}>• 지급 보류: 「예치가맹금 지급보류요청서」 제출</p>
                  <p>• 반환: 「예치가맹금 지급/반환요청서」 제출</p>
                  <p>• 접수처: 가까운 우리은행 영업점</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { ContractScreen };
