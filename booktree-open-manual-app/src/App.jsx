import React from 'react';
import { OPEN_STEPS, APP_META } from './data/manual.js';
import { calcDaysToOpen } from './utils/dates.js';
import { reportProgress, isReportEnabled } from './utils/report.js';
import { Icon } from './components/icons.jsx';
import { TabBar, Sidebar } from './components/nav.jsx';
import { HomeScreen } from './screens/home.jsx';
import { StepsScreen } from './screens/steps.jsx';
import { DetailScreen } from './screens/detail.jsx';
import { MarketingScreen } from './screens/marketing.jsx';
import { ContractScreen } from './screens/contract.jsx';
import { BooksScreen } from './screens/books.jsx';
import { FaqScreen } from './screens/faq.jsx';
import { QuizScreen } from './screens/quiz.jsx';
import { MyScreen } from './screens/my.jsx';
import { MenuScreen } from './screens/menu.jsx';
import { SettingsScreen } from './screens/settings.jsx';

const STORAGE_KEY = 'booktree-manual-v5';

const DEFAULT_CONFIG = {
  branchName: '',
  managerName: '',
  contractDate: '',
  interiorDoneDate: '',
  openDate: '',
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        tab: parsed.tab || 'home',
        viewMode: parsed.viewMode || 'auto',
        checked: parsed.checked || {},
        quizScores: parsed.quizScores || {},
        openStep: null,
        config: { ...DEFAULT_CONFIG, ...(parsed.config || {}) },
        showSettings: false,
      };
    }
  } catch (e) {}
  // 첫 실행이에요. 홈 화면부터 보여주고, 지점 설정은 홈의 안내 카드로 유도합니다.
  return { tab: 'home', viewMode: 'auto', checked: {}, quizScores: {}, openStep: null, config: DEFAULT_CONFIG, showSettings: false };
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tab: state.tab, viewMode: state.viewMode, checked: state.checked,
      quizScores: state.quizScores, config: state.config,
    }));
  } catch (e) {}
}

// 뷰포트 폭으로 데스크톱 여부를 판단해요. viewMode가 'auto'일 때만 쓰입니다.
const DESKTOP_QUERY = '(min-width: 1024px)';

function useIsWideViewport() {
  const [isWide, setIsWide] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches
  );
  React.useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => setIsWide(e.matches);
    mq.addEventListener('change', onChange);
    setIsWide(mq.matches);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isWide;
}

export default function App() {
  const [state, setState] = React.useState(loadState);
  React.useEffect(() => { saveState(state); }, [state]);

  // 'auto'(기본값)면 화면 폭에 따라 자동으로, 토글로 고정하면 그 값을 그대로 써요.
  const isWide = useIsWideViewport();
  // 배포 빌드에서는 목업 미리보기 토글이 없으니, 저장된 값과 무관하게 항상 자동이에요.
  const storedMode = import.meta.env.DEV ? state.viewMode : 'auto';
  const isAuto = storedMode === 'auto';
  const viewMode = isAuto ? (isWide ? 'desktop' : 'mobile') : storedMode;

  const setTab = (tab) => setState(s => ({ ...s, tab, openStep: null, showSettings: false }));
  const openStep = (n) => setState(s => ({ ...s, openStep: n, showSettings: false }));
  const goBack = () => setState(s => ({ ...s, openStep: null, showSettings: false }));
  const toggleStep = (n) => setState(s => {
    const key = `step:${n}`;
    const next = { ...s.checked };
    if (next[key]) delete next[key]; else next[key] = true;
    return { ...s, checked: next };
  });
  const setViewMode = (mode) => setState(s => ({ ...s, viewMode: mode }));
  // 퀴즈는 최고 점수만 남겨요 (다시 풀어서 점수가 낮아져도 기록은 유지)
  const recordQuizScore = (quizId, pct) => setState(s => {
    const prev = s.quizScores?.[quizId] ?? -1;
    if (pct <= prev) return s;
    return { ...s, quizScores: { ...s.quizScores, [quizId]: pct } };
  });
  const openSettings = () => setState(s => ({ ...s, showSettings: true, openStep: null }));
  const saveConfig = (config) => setState(s => ({ ...s, config: { ...s.config, ...config }, showSettings: false }));

  // 진행상황을 지사 구글시트로 보냅니다. REPORT_CONFIG 가 비어 있으면 아무 일도 안 해요.
  // 체크할 때마다 즉시 보내면 연타 시 요청이 쏟아지므로 2초 모았다가 한 번만 보냅니다.
  const reportTimer = React.useRef(null);
  React.useEffect(() => {
    if (!isReportEnabled()) return;
    if (!state.config.branchName) return;   // 지점 설정 전에는 보내지 않아요

    clearTimeout(reportTimer.current);
    reportTimer.current = setTimeout(() => {
      const doneSteps = OPEN_STEPS.filter(s => state.checked[`step:${s.n}`]).map(s => s.n);
      reportProgress({
        branch: state.config.branchName,
        manager: state.config.managerName,
        openDate: state.config.openDate,
        dday: calcDaysToOpen(state.config.openDate),
        percent: Math.round((doneSteps.length / OPEN_STEPS.length) * 100),
        doneCount: doneSteps.length,
        totalCount: OPEN_STEPS.length,
        doneSteps,
        quiz: state.quizScores || {},
      });
    }, 2000);

    return () => clearTimeout(reportTimer.current);
  }, [state.checked, state.config, state.quizScores]);

  const meta = React.useMemo(() => {
    const daysToOpen = calcDaysToOpen(state.config.openDate) ?? 0;
    return {
      branch: '강남서초지사 · 광진성동중랑동대문지사',
      district: state.config.branchName || '',
      managerName: state.config.managerName || '원장',
      managerType: '신규 원장님',
      openDate: state.config.openDate,
      contractDate: state.config.contractDate,
      interiorDoneDate: state.config.interiorDoneDate,
      daysToOpen,
      version: '2026.09',
      supervisorPhone: APP_META.supervisorPhone,
      supervisorEmail: APP_META.supervisorEmail,
      supervisor: '윤혜림 지사장 (밀키)',
      totalBranches: 647,
    };
  }, [state.config]);

  const steps = OPEN_STEPS;
  const activeStep = state.openStep ? steps.find(s => s.n === state.openStep) : null;

  const renderScreen = () => {
    if (state.showSettings) {
      return <SettingsScreen config={state.config} onSave={saveConfig} onBack={goBack} viewMode={viewMode} />;
    }
    if (activeStep) {
      return <DetailScreen step={activeStep} meta={meta} checked={state.checked} onToggle={toggleStep} onBack={goBack} viewMode={viewMode} />;
    }
    switch (state.tab) {
      case 'home': return <HomeScreen meta={meta} steps={steps} checked={state.checked} onNavigate={setTab} onOpenStep={openStep} onOpenSettings={openSettings} viewMode={viewMode} />;
      case 'steps': return <StepsScreen steps={steps} meta={meta} checked={state.checked} onOpenStep={openStep} viewMode={viewMode} />;
      case 'marketing': return <MarketingScreen viewMode={viewMode} />;
      case 'contract': return <ContractScreen viewMode={viewMode} />;
      case 'books': return <BooksScreen viewMode={viewMode} />;
      case 'faq': return <FaqScreen viewMode={viewMode} />;
      case 'quiz': return <QuizScreen viewMode={viewMode} scores={state.quizScores || {}} onFinish={recordQuizScore} />;
      case 'menu': return <MenuScreen meta={meta} onNavigate={setTab} onOpenSettings={openSettings} viewMode={viewMode} />;
      case 'my': return <MyScreen meta={meta} steps={steps} checked={state.checked} onOpenSettings={openSettings} viewMode={viewMode} />;
      default: return <HomeScreen meta={meta} steps={steps} checked={state.checked} onNavigate={setTab} onOpenStep={openStep} onOpenSettings={openSettings} viewMode={viewMode} />;
    }
  };

  if (viewMode === 'desktop') {
    const titleMap = {
      home: '대시보드', steps: 'Ⅲ 신규지점 오픈 진행 20단계', marketing: 'Ⅳ 오픈 마케팅 플랜',
      contract: 'Ⅰ·Ⅱ·Ⅴ 프랜차이즈·가맹', books: 'Ⅵ·Ⅶ 도서·필독서',
      faq: 'Ⅹ 실전 노하우 & FAQ', quiz: '매뉴얼 이해도 테스트', my: '내 기록 & 뱃지', menu: '전체 메뉴',
    };
    const title = state.showSettings ? '지점 설정'
      : activeStep ? `STEP ${activeStep.n} · ${activeStep.title}`
      : titleMap[state.tab];

    return (
      <>
        <ViewModeToggle mode={state.viewMode} effective={viewMode} onChange={setViewMode} />
        <div className={`stage-desktop ${isAuto ? 'bleed' : ''}`}>
          <div className="desktop-frame">
            <div className="desktop-titlebar">
              <div className="dt-dot r" /><div className="dt-dot y" /><div className="dt-dot g" />
              <div className="dt-url">app.booktreei.com/open-manual · 강남서초지사 / 광진성동중랑동대문지사</div>
              <div style={{ width: 60 }} />
            </div>
            <div className="desktop-layout">
              <Sidebar active={state.tab} onChange={setTab} meta={meta} onOpenSettings={openSettings} />
              <div className="desktop-main">
                <div className="desktop-topbar">
                  {(activeStep || state.showSettings) && (
                    <button className="appbar-back" onClick={goBack} style={{ background: 'var(--bt-green-tint)' }}>
                      <Icon.Back />
                    </button>
                  )}
                  <div className="desktop-topbar-title">{title}</div>
                  <div style={{ flex: 1 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--bt-muted)', fontSize: 12 }}>
                    <Icon.Calendar style={{ width: 14, height: 14 }} />
                    <span style={{ color: 'var(--bt-green)', fontWeight: 800 }}>D-{meta.daysToOpen}</span>
                    <span style={{ opacity: 0.4, margin: '0 4px' }}>·</span>
                    <span>{meta.district}</span>
                  </div>
                  <button onClick={openSettings} style={{ padding: 6, color: 'var(--bt-muted)' }}>
                    <Icon.Settings style={{ width: 18, height: 18 }} />
                  </button>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bt-green)', color: 'var(--bt-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-serif)' }}>
                    {meta.managerName ? meta.managerName[0] : '?'}
                  </div>
                </div>
                <div className="desktop-content">
                  <div className="desktop-content-inner">
                    {renderScreen()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const showTabBar = !activeStep && !state.showSettings;
  return (
    <>
      <ViewModeToggle mode={state.viewMode} effective={viewMode} onChange={setViewMode} />
      <div className={`stage-mobile mobile ${isAuto ? 'bleed' : ''}`}>
        <div className="phone-frame">
          <div className="phone-screen">
            <div className="phone-content">
              {renderScreen()}
            </div>
            {showTabBar && <TabBar active={state.tab} onChange={setTab} />}
          </div>
        </div>
      </div>
    </>
  );
}

// 목업 미리보기 토글은 개발용이에요. 배포 빌드(npm run build)에서는 나오지 않아요.
const SHOW_PREVIEW_TOGGLE = import.meta.env.DEV;

function ViewModeToggle({ mode, effective, onChange }) {
  if (!SHOW_PREVIEW_TOGGLE) return null;
  return (
    <div className="viewmode-toggle">
      <button
        className={mode === 'auto' ? 'active' : ''}
        onClick={() => onChange('auto')}
        title="화면 폭에 맞춰 자동 전환 (실제 사용 모드)"
      >
        ↔️ 자동{mode === 'auto' ? <span className="vm-hint">{effective === 'desktop' ? '데스크톱' : '모바일'}</span> : null}
      </button>
      <button className={mode === 'mobile' ? 'active' : ''} onClick={() => onChange('mobile')} title="모바일 목업으로 미리보기">📱 모바일</button>
      <button className={mode === 'desktop' ? 'active' : ''} onClick={() => onChange('desktop')} title="데스크톱 목업으로 미리보기">🖥️ 데스크톱</button>
    </div>
  );
}
