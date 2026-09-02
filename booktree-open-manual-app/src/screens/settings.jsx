import React from 'react';
import { Icon } from '../components/icons.jsx';
import { StatusBar } from './home.jsx';
import { formatKoDate, calcDaysToOpen } from '../utils/dates.js';
import { isReportEnabled } from '../utils/report.js';

// 지점 설정 화면 - 지점명·원장님·주요 날짜 입력
export function SettingsScreen({ config, onSave, onBack, viewMode }) {
  const [form, setForm] = React.useState({
    branchName: config.branchName || '',
    managerName: config.managerName || '',
    contractDate: config.contractDate || '',
    interiorDoneDate: config.interiorDoneDate || '',
    openDate: config.openDate || '',
  });
  const isDesktop = viewMode === 'desktop';

  const update = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const save = () => {
    onSave(form);
    onBack && onBack();
  };

  const preview = React.useMemo(() => calcDaysToOpen(form.openDate), [form.openDate]);

  return (
    <div className="app-screen anim-fade">
      {!isDesktop && <StatusBar />}
      {!isDesktop && (
        <div className="appbar">
          <button className="appbar-back" onClick={onBack}><Icon.Back /></button>
          <div className="appbar-title">지점 설정</div>
        </div>
      )}

      <div className="screen-body" style={{ padding: isDesktop ? 0 : '0 20px 32px' }}>
        {isReportEnabled() && (
          <div className="share-notice">
            <b>지사 공유 안내</b>
            입력하신 지점 정보와 오픈 20단계 진행률이 지사에 자동으로 공유돼요.
            지사장님이 진행 상황을 함께 확인하고 필요한 부분을 도와드리기 위한 것이며,
            독서록·상담 내용 등 다른 정보는 전송되지 않아요.
          </div>
        )}
        {isDesktop && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--bt-green)', fontWeight: 800, letterSpacing: '0.1em' }}>SETTINGS</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>지점 설정</div>
            <div style={{ color: 'var(--bt-muted)', marginTop: 6, fontSize: 13 }}>
              지점 정보와 주요 날짜를 입력하면 앱 전체 일정이 자동으로 재계산돼요.
            </div>
          </div>
        )}

        <div className="tip-box" style={{ marginBottom: 20 }}>
          <div>세 개의 날짜를 입력하면 <b>20단계 일정과 D-Day가 자동으로 계산</b>돼요.</div>
        </div>

        {/* 지점 정보 */}
        <div style={{ marginBottom: 18 }}>
          <div className="section-heading">지점 정보</div>
          <div className="card" style={{ padding: 16 }}>
            <FormField label="지점명" required>
              <input type="text" value={form.branchName} onChange={e => update('branchName', e.target.value)} placeholder="예: 평촌캠퍼스" className="setting-input" />
            </FormField>
            <FormField label="원장님 성함" required style={{ marginTop: 14 }}>
              <input type="text" value={form.managerName} onChange={e => update('managerName', e.target.value)} placeholder="예: 김수현 원장" className="setting-input" />
            </FormField>
          </div>
        </div>

        {/* 주요 날짜 */}
        <div style={{ marginBottom: 18 }}>
          <div className="section-heading">주요 날짜</div>
          <div className="card" style={{ padding: 16 }}>
            <FormField label="상가 계약일" hint="Ⅲ 오픈 진행 3단계 (임대차 계약) 기준일">
              <input type="date" value={form.contractDate} onChange={e => update('contractDate', e.target.value)} className="setting-input" />
            </FormField>
            <FormField label="인테리어 완공 예정일" hint="Ⅲ 10단계 (인테리어 시작~마무리) 기준일" style={{ marginTop: 14 }}>
              <input type="date" value={form.interiorDoneDate} onChange={e => update('interiorDoneDate', e.target.value)} className="setting-input" />
            </FormField>
            <FormField label="오픈 예정일 (Grand Open)" hint="Ⅲ 20단계 (개원식) 기준일 · D-Day 계산 기준" required style={{ marginTop: 14 }}>
              <input type="date" value={form.openDate} onChange={e => update('openDate', e.target.value)} className="setting-input" />
            </FormField>
          </div>
        </div>

        {/* 실시간 미리보기 */}
        {form.openDate && (
          <div className="anim-fade" style={{
            padding: 18, borderRadius: 16,
            background: 'linear-gradient(135deg, var(--bt-green) 0%, var(--bt-green-dark) 100%)',
            color: 'white', marginBottom: 18,
          }}>
            <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.1em', fontWeight: 800 }}>PREVIEW</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
              <div style={{
                fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 900,
                color: preview !== null && preview >= 0 ? 'var(--bt-yellow)' : '#F5D5CC',
                letterSpacing: '-0.03em', lineHeight: 1,
              }}>
                D{preview >= 0 ? '-' : '+'}{Math.abs(preview)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{form.branchName || '(지점명)'} · {form.managerName || '(원장님)'}</div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{formatKoDate(form.openDate)} 오픈 예정</div>
              </div>
            </div>
          </div>
        )}

        {/* 액션 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onBack}>취소</button>
          <button
            className="btn-primary"
            style={{ flex: 2, opacity: (form.branchName && form.managerName && form.openDate) ? 1 : 0.4 }}
            disabled={!(form.branchName && form.managerName && form.openDate)}
            onClick={save}
          >
            저장하고 전체 일정 적용
          </button>
        </div>

        <div style={{ fontSize: 11, color: 'var(--bt-muted)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
          입력된 값은 이 기기에만 저장돼요 (localStorage).<br />
          지점명·원장님 이름은 홈·사이드바·My 페이지에 즉시 반영됩니다.
        </div>
      </div>
    </div>
  );
}

function FormField({ label, required, hint, children, style }) {
  return (
    <div style={style}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--bt-body)', marginBottom: 6 }}>
        {label} {required && <span style={{ color: 'var(--bt-danger)' }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 10.5, color: 'var(--bt-muted)', marginTop: 5, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}
