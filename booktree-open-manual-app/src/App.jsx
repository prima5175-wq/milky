import React from 'react';
import { OPEN_STEPS } from './data/manual.js';
import { calcDaysToOpen } from './utils/dates.js';
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
import { SettingsScreen } from './screens/settings.jsx';

const STORAGE_KEY = 'booktree-manual-v3';

const DEFAULT_CONFIG = {
  branchName: '평촌캠퍼스',
  managerName: '김수현 원장',
  contractDate: '',
  interiorDoneDate: '',
  openDate: '2026-10-15',
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        tab: parsed.tab || 'home',
        viewMode: parsed.viewMode || 'mobile',
        checked: parsed.checked || {},
        openStep: null,
        config: { ...DEFAULT_CONFIG, ...(parsed.config || {}) },
        showSettings: false,
      };
    }
  } catch (e) {}
  const initChecked = {};
  [1, 2, 3, 4].forEach(n => { initChecked[`step:${n}`] = true; });
  return { tab: 'home', viewMode: 'mobile', checked: initChecked, openStep: null, config: DEFAULT_CONFIG, showSettings: false };
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tab: state.tab, viewMode: state.viewMode, checked: state.checked, config: state.config,
    }));
  } catch (e) {}
}

export default function App() {
  const [state, setState] = React.useState(loadState);
  React.useEffect(() => { saveState(state); }, [state]);

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
  const openSettings = () => setState(s => ({ ...s, showSettings: true, openStep: null }));
  const saveConfig = (config) => setState(s => ({ ...s, config: { ...s.config, ...config }, showSettings: false }));

  const meta = React.useMemo(() => {
    const daysToOpen = calcDaysToOpen(state.config.openDate) ?? 0;
    return {
      branch: '강남서초 · 광진성동지사',
      district: state.config.branchName,
      managerName: state.config.managerName,
      managerType: '신규 원장님',
      openDate: state.config.openDate,
      contractDate: state.config.contractDate,
      interiorDoneDate: state.config.interiorDoneDate,
      daysToOpen,
      version: '2026.09',
      supervisor: '윤혜림 지사장 (밀키)',
      totalBranches: 647,
    };
  }, [state.config]);

  const steps = OPEN_STEPS;
  const activeStep = state.openStep ? steps.find(s => s.n === state.openStep) : null;

  const renderScreen = () => {
    if (state.showSettings) {
      return <SettingsScreen config={state.config} onSave={saveConfig} onBack={goBack} viewMode={state.viewMode} />;
    }
    if (activeStep) {
      return <DetailScreen step={activeStep} meta={meta} checked={state.checked} onToggle={toggleStep} onBack={goBack} viewMode={state.viewMode} />;
    }
    switch (state.tab) {
      case 'home': return <HomeScreen meta={meta} steps={steps} checked={state.checked} onNavigate={setTab} onOpenStep={openStep} onOpenSettings={openSettings} viewMode={state.viewMode} />;
      case 'steps': return <StepsScreen steps={steps} meta={meta} checked={state.checked} onOpenStep={openStep} viewMode={state.viewMode} />;
      case 'marketing': return <MarketingScreen viewMode={state.viewMode} />;
      case 'contract': return <ContractScreen viewMode={state.viewMode} />;
      case 'books': return <BooksScreen viewMode={state.viewMode} />;
      case 'faq': return <FaqScreen viewMode={state.viewMode} />;
      case 'quiz': return <QuizScreen viewMode={state.viewMode} />;
      case 'my': return <MyScreen meta={meta} steps={steps} checked={state.checked} onOpenSettings={openSettings} viewMode={state.viewMode} />;
      default: return <HomeScreen meta={meta} steps={steps} checked={state.checked} onNavigate={setTab} onOpenStep={openStep} onOpenSettings={openSettings} viewMode={state.viewMode} />;
    }
  };

  if (state.viewMode === 'desktop') {
    const titleMap = {
      home: '대시보드', steps: 'Ⅲ 신규지점 오픈 진행 20단계', marketing: 'Ⅳ 오픈 마케팅 플랜',
      contract: 'Ⅰ·Ⅱ·Ⅴ 프랜차이즈·가맹', books: 'Ⅵ·Ⅶ 도서·필독서',
      faq: 'Ⅹ 실전 노하우 & FAQ', quiz: '매뉴얼 이해도 테스트', my: '내 기록 & 뱃지',
    };
    const title = state.showSettings ? '지점 설정'
      : activeStep ? `STEP ${activeStep.n} · ${activeStep.title}`
      : titleMap[state.tab];

    return (
      <>
        <ViewModeToggle mode={state.viewMode} onChange={setViewMode} />
        <div className="stage-desktop">
          <div className="desktop-frame">
            <div className="desktop-titlebar">
              <div className="dt-dot r" /><div className="dt-dot y" /><div className="dt-dot g" />
              <div className="dt-url">app.booktreei.com/open-manual · 강남서초·광진성동지사</div>
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
      <ViewModeToggle mode={state.viewMode} onChange={setViewMode} />
      <div className="stage-mobile mobile">
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

function ViewModeToggle({ mode, onChange }) {
  return (
    <div className="viewmode-toggle">
      <button className={mode === 'mobile' ? 'active' : ''} onClick={() => onChange('mobile')}>📱 모바일</button>
      <button className={mode === 'desktop' ? 'active' : ''} onClick={() => onChange('desktop')}>🖥️ 데스크톱</button>
    </div>
  );
}
