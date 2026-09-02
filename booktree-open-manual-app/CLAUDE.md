# Claude Code 프로젝트 가이드

이 파일은 Claude Code · Cursor 등 AI 코딩 도우미가 프로젝트를 파악할 때 자동으로 읽는 문서입니다.

## 프로젝트 개요

책나무 강남서초·광진성동지사의 신규 원장님을 위한 오픈 매뉴얼 웹앱.
Vite + React 18 SPA. 서버 없이 정적 사이트로 배포 가능.

원본 매뉴얼: `docs/manual-original.docx` (2026년 9월판)

## 코드 컨벤션

- **함수형 컴포넌트 + Hooks** (Class 컴포넌트 사용 금지)
- 파일 하나 = 화면 하나 (`src/screens/*.jsx`)
- 상태는 최상위 `App.jsx`에서 관리, prop drilling으로 하위 전달 (규모 대비 Context 오버킬)
- CSS는 `src/styles.css` 단일 파일 + 인라인 스타일 혼용
  - 반복되는 것 → CSS 클래스 (`.card`, `.chip`, `.step-card` 등)
  - 일회성 스타일 → 인라인
- 브랜드 컬러는 반드시 `var(--bt-*)` CSS 변수 사용 (직접 hex 값 쓰지 말 것)

## 폴더 구조

```
src/
├── data/manual.js      # 모든 매뉴얼 콘텐츠 (콘텐츠 수정은 대부분 여기)
├── utils/dates.js      # D-Day, 단계별 예상 날짜 계산
├── components/         # 재사용 UI (icons, nav)
├── screens/            # 각 화면 (home, steps, detail, ...)
├── App.jsx             # 라우팅 + 전역 상태
├── main.jsx            # React 부트스트랩
└── styles.css          # 전역 스타일
```

## 상태 관리 흐름

```
App.jsx (useState)
  ├─ state.tab           # 활성 탭 ('home' | 'steps' | 'marketing' | ...)
  ├─ state.viewMode      # 'mobile' | 'desktop'
  ├─ state.checked       # { 'step:1': true, 'step:2': true, ... }
  ├─ state.openStep      # 상세 페이지 활성 단계 번호 (null이면 리스트)
  ├─ state.showSettings  # 지점 설정 화면 표시 여부
  └─ state.config        # 지점명, 원장님, 3개 날짜
                        └─→ meta (useMemo)로 파생 (D-Day 자동 계산)
                            └─→ 모든 화면에 meta prop 전달
```

localStorage 키: `booktree-manual-v3` (스키마 변경 시 v4, v5로 올릴 것)

## 브랜드 시스템 (반드시 지킬 것)

- **Primary Green**: `--bt-green` (#0F5E3D) — 책나무 딥 그린
- **Accent Yellow**: `--bt-yellow` (#F5D547) — 강조·D-Day 숫자·★ 지사지침
- **Surface**: `--bt-surface` (#FCFBF7) — 크림 화이트 배경
- **Serif Font**: Noto Serif KR — 숫자·헤딩 강조 (D-Day, 뱃지 아이콘)
- **Sans Font**: Noto Sans KR — 본문
- 톤앤매너: **친근한 가이드체 (~해요/합니다)** — "~하십시오"는 절대 쓰지 말 것

## 자주 수정하는 것들

### 매뉴얼 문구·항목 수정
→ `src/data/manual.js` 편집. 앱 재시작 없이 HMR로 즉시 반영됨.

### 새 화면 추가
1. `src/screens/newScreen.jsx` 생성 (다른 screen 파일 참고)
2. `src/App.jsx` 상단에 import 추가
3. `renderScreen()`의 switch에 case 추가
4. `src/components/nav.jsx`의 `TABS` (모바일) / `SIDEBAR_ITEMS` (데스크톱) 배열에 추가

### 새 아이콘 추가
→ `src/components/icons.jsx`의 `Icon` 객체에 SVG 추가.
스트로크 2px, viewBox 24x24, Lucide 스타일 유지.

### 컬러 팔레트 변경
→ `src/styles.css`의 `:root` 블록만 수정. 하드코딩된 hex 검색 후 변수로 치환.

## 주의사항

- **날짜 필드**: HTML `<input type="date">` 사용, 값은 ISO string (`YYYY-MM-DD`)
- **stateful 화면 이동**: React Router 미사용. `state.tab`, `state.openStep`, `state.showSettings` 조합으로 처리
- **모바일 프레임**: 개발용 프레임(390x844 iPhone). 실제 프로덕션 배포 시 프레임 제거하고 뷰포트 전체 사용 권장
- **`--bt-*` CSS 변수는 26개 이상 있음**. 새 컬러 추가 시 기존 팔레트와 조화 확인 필수

## 배포 옵션

- **Vercel / Netlify / Cloudflare Pages**: `npm run build` → `dist/` 폴더 정적 호스팅
- **GitHub Pages**: `vite.config.js`에 `base: '/repo-name/'` 추가 필요
- **자체 서버**: `dist/` 폴더 어디든 정적 서빙

## 데이터 스키마 참고

`OPEN_STEPS` 배열의 각 항목 구조:

```typescript
{
  n: number,              // 1~20
  title: string,          // 단계 제목
  phase: string,          // 'D-60', 'D-DAY' 등
  items: string[],        // 세부 실행 항목
  docs?: string[],        // 필요 서류 (있으면)
  subDocs?: Record<string, string[]>,  // 서류 하위 구분 (공동대표/법인)
  postProcess?: string[], // 인가 후 후속 절차 (STEP 14 전용)
  vendor?: string,        // 관련 업체 정보
  tips?: string[],        // 실전 팁
  badge?: string,         // '★ 지사 특별 지침' (있으면 노란 강조)
  badgeContent?: string,  // 지사 지침 본문
}
```
