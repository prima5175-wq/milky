# 토키 (Toki)

사회적 대화에 어려움이 있는 아동을 위한 **화용언어·사회성 연습 및 교육 보조 도구**.
**보기 → 연습하기 → 실제로 해보기.** 검사자가 쓰던 검사 결과를 누적해 장기 변화를 한눈에 봅니다.

> 이 앱은 연습·교육 보조 도구입니다. 아이의 상태를 진단하거나 치료한다고 표방하지 않으며, 검사 결과의 해석과 판단은 전문가가 합니다.

## ⚠ 지금 상태: 데모 (운영에 쓸 수 없음)

화면과 핵심 로직은 동작하지만 **로그인과 DB 가 연결되어 있지 않습니다.**

- 진행 기록·동의·안전 이벤트·HTP 기록·사용 시간은 **서버 메모리**에 있어 서버를 다시 켜면 사라집니다. 서버리스(Vercel 등)에서는 요청마다 다른 인스턴스가 처리해서 기록이 서로 보이지 않을 수도 있습니다.
- 보호자 PIN 은 같은 기기에서 아이가 보호자 기능을 쓰지 못하게 막는 **간이 장치**이며 실제 로그인이 아닙니다. 치료사용 API 에는 인증이 없습니다.
- 시나리오 120개와 검사 목록은 **전문가 감수 전**입니다.

→ 실제 서비스 전에 "남은 작업"(아래)을 끝내야 합니다. **이 상태로 인터넷에 공개하지 마세요.**

## 실행

필요: Node.js 22 이상.

```bash
cd toki
npm install
cp .env.example .env.local          # 필요한 값만 채운다 (비워 두어도 데모는 동작)
TOKI_DEMO_APPROVE=1 npm run dev     # http://localhost:3000/child
```

| 주소 | 화면 |
|---|---|
| `/child` | 아동 (보기 → 질문 → 연습 → 미션, 스티커판, 화면 설정) |
| `/guardian` | 보호자 (데모 PIN `1234`): 미션 확인, 주간 요약, 대화 팁, 연습 시간, 동의 관리, 안전 알림, 보고서 PDF |
| `/therapist/children/demo-1` | 검사자: 검사 결과 누적·그래프·비교, 그림 검사(HTP) 기록, 보고서 PDF |
| `/therapist/children/demo-1/prescription` | 아이별 하루 시간·개수·목표 단계, 시나리오 후보 |
| `/admin/scenarios` | 시나리오 감수 (초안 → 전문가 검토 → 승인) |
| `/signup` | 보호자 가입·동의 (데모에서는 한 번만) |
| `/legal/privacy`, `/legal/terms` | 개인정보처리방침·이용약관 **초안** (법률 검토 필요) |

운영 빌드: `npm run build && npm start` (PWA 서비스 워커는 운영 빌드에서만 켜집니다).

## 환경변수

| 이름 | 용도 | 없으면 |
|---|---|---|
| `TOKI_DEMO_APPROVE` | `1` 이면 감수 전 시나리오 일부를 임시 승인으로 보여 줌 (개발 확인용) | 승인된 시나리오만 노출 → 지금은 승인된 것이 0개라 아동 화면이 비어 있음 |
| `ANTHROPIC_API_KEY` | AI 친구 (서버에서만 사용) | 오프라인 대체 응답으로 연습 |
| `TOKI_AI_MODEL` | AI 모델 (기본 `claude-opus-5-5`) | 기본값 |
| `TOKI_ADMIN_TOKEN` | 연구용 CSV 내보내기 관리자 토큰 | `/api/export` 가 막힘(503) |
| `TOKI_EXPORT_SALT` | CSV 가명화 소금 (16자 이상, 비밀) | `/api/export` 가 막힘(503) |
| `NEXT_PUBLIC_SUPABASE_URL` 등 | Supabase (아직 앱에 연결 안 됨) | — |

- AI 호출은 아이 한 명이 이야기 1개를 하면 최대 3번입니다. 비용은 모델에 따라 크게 다르니 운영 전에 측정하세요.
- 키가 없거나 AI 가 실패·거절·부적절한 응답을 하면 항상 오프라인 엔진으로 연습을 이어 갑니다.

## 확인 (테스트)

```bash
npm test                 # 단위 테스트 (로직·PDF·CSV·i18n 등)
npm run lint:copy        # 화면 문구·콘텐츠에 금지 표현("치료한다", "진단한다") 검사
bash scripts/test-rls.sh # 로컬 Postgres 로 DB 스키마 + 권한(RLS) 테스트 (Postgres 필요)
npm run build && npm run e2e   # 브라우저 E2E (아래)
npm run test:all         # 위 단위·문구 검사 + E2E
```

**E2E** (`e2e/`): 운영 빌드를 파일마다 새로 띄워 크로미움으로 실제 화면을 조작합니다. 크로미움이 없으면 `npx playwright-core install chromium` 후 실행하거나 `CHROMIUM_PATH` 를 지정하세요.

| 파일 | 확인하는 것 |
|---|---|
| `child-flow` | 휴대폰·태블릿에서 보기→질문→연습(3번)→미션→스티커, 가로 스크롤 없음 |
| `child-edge` | 안전 키워드 중단, 미승인·다른 연령대 시나리오 404, 저자극 모드 |
| `guardian` | PIN·무차별 대입 잠금, 미션 확인, 동의 철회로 아동 화면 차단, HTP 동의 게이트·그림 삭제, 가입 |
| `ai` | 가짜 Anthropic 서버로 SDK 요청 형식·응답 처리, 실패 시 오프라인 대체, 안전·시간 제한 |
| `offline` | **서버를 실제로 끈 상태**에서 연습·미션·안전 감지, 연결 복구 후 대기 기록 자동 전송 |
| `english` | 영어 화면 전환 |
| `report-export` | PDF 보고서, 동의 기반 익명화 CSV, 관리자 토큰·동의 조건 |
| `not-configured` | 환경변수가 없으면 내보내기가 막혀 있음 |

## 구조

```
src/app/            화면과 API 라우트 (child, guardian, therapist, admin, signup, legal, api/*)
src/components/     화면 컴포넌트 (child/ 안의 문구는 모두 i18n 사전에서 온다)
src/lib/
  scenarios/        시나리오 형식·검증·감수 흐름·처방·후보 제안
  practice/         한 마디 덧붙이기 4단계 분류, 대체 엔진, 선택지, 보상
  ai/               Claude 연동(구조화 출력, 안전 검사, 응답 검사, 요청 처리기)
  safety/ usage/    안전 키워드·이벤트, 하루 사용 시간 제한
  assessments/      검사 점수 검증·추이·비교·재검 알림·타임라인
  progress/ consent/ htp/ report/ export/   진행 기록, 동의, 그림 검사, PDF, 익명화 CSV
  i18n/             ko(기준)·en 사전 (en 은 ko 와 같은 모양이어야 컴파일됨)
content/scenarios/  시나리오 120개 (전부 초안) · assessment-catalog-review.csv (교수님 감수용 검사 목록)
supabase/migrations DB 스키마와 권한 정책(RLS)
public/sw.js        PWA 서비스 워커
```

## 핵심 원칙 (코드와 테스트로 고정되어 있음)

- 외부 상용 검사의 문항·도판은 복제하지 않는다. 점수만 검사자가 입력한다.
- 감수(`approved`) 전 시나리오는 아동에게 노출하지 않는다 (DB 정책 + 코드 + E2E 404 로 이중 차단).
- 보상은 앱 안 연습(1점, 하루 상한)보다 보호자가 확인한 실제 생활 미션(5점)에 크게 준다. 점수는 서버가 정한다.
- 안전 키워드는 AI 호출 **전에** 서버에서 먼저 검사한다. 감지되면 연습을 멈추고 보호자·검사자 화면에 알린다.
- 음성 원본은 저장하지 않는다. 그림은 보호자 별도 동의가 있을 때만 저장하고, 동의를 철회하면 삭제한다.
- 연구용 CSV 는 연구 동의가 있는 아동만, 이름·정확한 날짜·자유 입력 글 없이 가명(HMAC)으로만 내보낸다.
- HTP 등 그림 검사는 앱이 해석·점수화하지 않는다.
- 화면 문구에 "치료한다", "진단한다" 같은 표현을 쓰지 않는다 (`npm run lint:copy`).

## 영어 UI

아동 화면은 화면 설정에서 한국어/English 를 바꿀 수 있습니다. **연습 이야기(시나리오)와 피드백 문장은 한국어 콘텐츠**라서 번역되지 않습니다. 보호자·검사자·관리자 화면과 법적 문서는 아직 한국어만 지원합니다.

## 배포 (Vercel + Supabase) — 연결 작업 후

현재 앱에는 Supabase 가 연결되어 있지 않으므로, 아래는 **연결 작업을 마친 뒤의 순서**입니다.

1. Supabase 프로젝트를 만들고 `supabase/migrations/0001_init.sql` 을 적용한다. 적용 전 `bash scripts/test-rls.sh` 로 권한 정책을 확인한다.
2. 데모 저장소(`src/lib/server/stores.ts`, `src/lib/safety/events.ts`, `src/lib/usage/limit.ts`, `src/lib/progress/store.ts`, `src/lib/assessments/demo.ts`)를 Supabase 구현으로 교체하고, 로그인·역할(보호자/치료사/관리자)과 아동-치료사 배정을 연결한다. 보호자 PIN 은 실제 로그인 위에서 재확인용으로만 남긴다.
3. Vercel 프로젝트를 만들고 환경변수를 넣는다: `ANTHROPIC_API_KEY`, `TOKI_AI_MODEL`(선택), `TOKI_ADMIN_TOKEN`, `TOKI_EXPORT_SALT`, Supabase 3종. **`TOKI_DEMO_APPROVE` 는 넣지 않는다.**
4. 배포 후 확인: 승인된 시나리오만 노출되는지, 동의 없이 아동 화면이 닫히는지, 서비스 워커가 `/api`·`/guardian` 을 저장하지 않는지(`public/sw.js` 주석 참고), `/api/export` 가 토큰 없이 열리지 않는지.
5. PDF 는 `pdfkit` 과 한글 폰트(Noto Sans KR, OFL)를 서버에서 읽습니다. `next.config.mjs` 에 `serverExternalPackages`·`outputFileTracingIncludes` 설정이 이미 있습니다.

서비스 워커를 수정해 배포할 때는 `public/sw.js` 의 `VERSION` 을 올려 예전 캐시가 지워지게 하세요.

## 남은 작업 (MVP 점검표)

| 항목 | 상태 |
|---|---|
| 로그인(치료사·보호자)·치료사-아동 배정 | ❌ 미구현 (DB 권한 정책은 테스트로 확인됨, 앱에는 미연결) |
| DB 저장 (진행·동의·안전 이벤트·HTP·검사 기록 등 전부) | ❌ 서버 메모리 데모 |
| 시나리오 120개 감수·승인 | ⏳ 전문가 감수 대기 (현재 승인 0개) |
| 검사 카탈로그 연령·점수 양식 | ⏳ 교수님 감수 대기 (`content/assessment-catalog-review.csv`) |
| 안전 키워드·안내 문구·HTP 체크 항목·대화 팁 | ⏳ 전문가 검토 필요 (초안) |
| 개인정보처리방침·이용약관·동의 절차 | ⏳ 법률 검토 필요 (초안) |
| 실제 AI 응답 품질 | ⏳ 키 연결 후 점검 필요 (요청 형식은 가짜 서버로만 검증) |
| 치료사 "회기 모드", 검사자 알림 외 푸시·이메일 | ❌ 미구현 |
| 시나리오 CRUD·영상/이미지 업로드 | ❌ 미구현 (영상 플레이어만 있음) |
| 교사의 미션 확인 | ❌ 미구현 |
| 결제 구조(센터/가정 구독) | ❌ 미구현 |
| 보호자·검사자·관리자 화면의 영어 | ❌ 미구현 |
| 시나리오별 응답 단계 변화 그래프·미션 성공률 추이 그래프 | ❌ (데이터는 기록됨, 7일 요약만 있음) |
| 아이별 검사 일정·재검 알림의 외부 발송 | ❌ 화면 표시만 |
