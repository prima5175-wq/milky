# 책나무 신규 오픈 매뉴얼 앱

강남서초·광진성동지사 신규 원장님을 위한 오픈 진행 매뉴얼 웹앱입니다.
가맹 상담부터 학부모 설명회·개원식까지 **20단계**를 한 번에 준비할 수 있어요.

원본 자료: `docs/manual-original.docx` (2026년 9월판, 작성: 강남서초지사장 윤혜림/밀키)

---

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 시작 (자동으로 브라우저 열림)
npm run dev

# 3. 프로덕션 빌드
npm run build

# 4. 빌드 결과 미리보기
npm run preview
```

Node.js 18+ 권장.

---

## GitHub에 올리기

```bash
git init
git add .
git commit -m "Initial commit: 책나무 오픈 매뉴얼 앱"

# GitHub에서 새 레포지토리 생성 후:
git remote add origin https://github.com/YOUR_USERNAME/booktree-open-manual.git
git branch -M main
git push -u origin main
```

`.gitignore`에 `node_modules/`, `dist/` 등이 이미 포함되어 있어요.

---

## 프로젝트 구조

```
booktree-open-manual-app/
├── index.html                    # Vite 엔트리 HTML
├── package.json                  # 의존성 (React 18 + Vite)
├── vite.config.js                # Vite 설정
├── src/
│   ├── main.jsx                  # React 앱 부트스트랩
│   ├── App.jsx                   # 라우팅 + 상태 관리
│   ├── styles.css                # 전역 스타일 (브랜드 컬러·타이포)
│   ├── data/
│   │   └── manual.js             # ★ 매뉴얼 콘텐츠 데이터 (모두 여기에)
│   ├── utils/
│   │   └── dates.js              # D-Day / 단계별 예상일 계산
│   ├── components/
│   │   ├── icons.jsx             # SVG 아이콘 + 책나무 로고
│   │   └── nav.jsx               # 모바일 탭바 + 데스크톱 사이드바
│   └── screens/
│       ├── home.jsx              # 홈 대시보드
│       ├── steps.jsx             # Ⅲ 오픈 20단계 리스트
│       ├── detail.jsx            # 단계 상세 페이지
│       ├── marketing.jsx         # Ⅳ 마케팅 플랜 (캘린더)
│       ├── contract.jsx          # Ⅰ·Ⅱ·Ⅴ 가맹 개요/절차/예치
│       ├── books.jsx             # Ⅵ·Ⅶ 도서·필독서
│       ├── faq.jsx               # Ⅹ FAQ·노하우
│       ├── quiz.jsx              # 매뉴얼 이해도 테스트
│       ├── my.jsx                # My 페이지 (뱃지·수료증)
│       └── settings.jsx          # 지점 설정 (지점명·날짜 입력)
└── docs/
    ├── manual-original.docx      # 원본 매뉴얼 (참고용)
    └── manual-source.txt         # 원본 매뉴얼 텍스트 추출본
```

---

## 콘텐츠 수정하기 (매뉴얼 문구·데이터 편집)

**대부분의 수정은 `src/data/manual.js` 하나만 편집하면 돼요.**

이 파일에는 앱의 모든 콘텐츠가 정리되어 있어요:

| Export | 내용 |
| --- | --- |
| `OPEN_STEPS` | 오픈 진행 20단계 (제목, 실행 항목, 서류, ★ 지사지침, 팁) |
| `CONTRACT_STEPS` | Ⅱ 가맹 절차 6단계 |
| `MARKETING_CALENDAR` | Ⅳ 마케팅 캘린더 · 체크리스트 · TIP |
| `FRANCHISE_INFO` | 가맹비, 창업비용, 표준매출표 |
| `BOOK_INFO` | 도서 구성별 가격 (기본형/소규모형/필수추가/단행본) |
| `MUST_READ` | 원장 필독서 10선 |
| `FINAL_CHECKLIST` | Ⅸ 최종 점검 체크리스트 (D-60 → D+) |
| `FAQ_LIST` | Ⅹ 자주 묻는 질문 |
| `KNOW_HOW` | 강사 채용 / 원생 유지 노하우 |
| `BADGES` | 성취 뱃지 6종 |
| `QUIZ_DATA` | 이해도 테스트 문항 |

### 예: 새로운 오픈 단계 항목 추가

`OPEN_STEPS` 배열에서 원하는 단계의 `items` 배열에 문자열을 추가:

```javascript
{ n: 4, title: '인테리어 업체 선정 및 일정 조율', phase: 'D-45', items: [
    '인테리어 도면 완료',
    '관할 교육청 담당자와 도면 확인 (학원 인가 관련 필요 시)',
    // ↓ 여기에 추가
    '방음 시공 견적 별도 확인',
    ...
]}
```

### 예: 브랜드 컬러 변경

`src/styles.css` 상단의 `:root` 블록에서 CSS 변수 수정:

```css
:root {
  --bt-green: #0F5E3D;    /* ← 여기 hex 값 바꾸면 앱 전체 그린이 바뀜 */
  --bt-yellow: #F5D547;   /* ← 옐로 액센트 */
  ...
}
```

### 예: 새로운 단계 (STEP 21) 추가

1. `src/data/manual.js`의 `OPEN_STEPS` 배열 끝에 새 객체 추가
2. `src/utils/dates.js`의 `STEP_OFFSETS`에 `21: N` 추가 (오픈일로부터 -N일)

---

## 주요 기능

- **홈 대시보드**: D-Day, 진행률, 다음 단계, ★ 지사 핵심 지침 3가지
- **20단계 리스트**: 검색·필터, 각 단계의 예상 날짜 자동 표시
- **단계 상세**: 체크리스트, 필요 서류, ★ 지사 특별지침 강조, 실전 팁
- **마케팅 캘린더**: 오픈 전월/당월 홍보 일정, 10개 카테고리 체크리스트
- **지점 설정**: 지점명·원장님·상가계약일·인테리어완공일·오픈일 입력 → 앱 전체 일정 자동 계산
- **퀴즈**: 3개 주제 이해도 테스트 (합격/재도전)
- **뱃지 & 수료증**: 진행률에 따라 6단계 뱃지 자동 획득
- **모바일 + 데스크톱 뷰**: 우상단 토글로 자유롭게 전환 (실전에서는 미디어쿼리로 자동 대응 추천)

---

## 기술 스택

- **React 18.3** + **Vite 5** (빠른 dev server & 빌드)
- 별도 라우터 없이 useState 기반 라우팅 (앱 규모 대비 가벼움)
- localStorage로 진행 상태·지점 설정 저장 (서버 없음)
- 아이콘: 인라인 SVG (Lucide 스타일)
- 폰트: Google Fonts (Noto Sans/Serif KR)

---

## Claude Code / Cursor 에서 편집 팁

이 프로젝트는 각 화면이 **독립된 파일**이라 AI 도우미가 파악하기 쉽게 구성돼 있어요.

- "홈 화면의 D-Day 카드를 바꿔줘" → `src/screens/home.jsx`만 보면 됨
- "오픈 단계 10번 항목을 수정해줘" → `src/data/manual.js`에서 `n: 10` 검색
- "브랜드 컬러를 파란색 계열로" → `src/styles.css`의 `:root` 변수만 바꾸면 전체 반영

`CLAUDE.md` 파일에 프로젝트 컨벤션이 정리되어 있어 AI 도우미가 자동으로 참고해요.

---

## 라이선스

지사 내부 사용 목적. 외부 배포·재사용은 강남서초지사장(윤혜림/밀키)의 승인이 필요합니다.

---

## 문의

지사 문의: 강남서초지사장 윤혜림 (밀키)
