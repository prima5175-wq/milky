# 책나무 방특 신청 앱 — 진짜 연결 따라하기 (A부터 G까지)

> 이 문서는 **컴퓨터(PC)에서** 따라 하시는 걸 기준으로 썼어요. 화면은 사이트가 가끔 바뀌어서 버튼 이름이 조금 다를 수 있어요. 그럴 때는 **화면을 캡처해서 보내주세요.** 그 화면 그대로 보고 바로 알려드릴게요.
> 한 단계가 끝날 때마다 "이 화면이 보이면 성공" 표시를 확인하고 다음 단계로 가세요. 막히면 거기서 멈추고 캡처만 보내주시면 돼요. 서두르지 않아도 괜찮아요.

---

## 먼저 알아두세요

### 이 앱은 세 곳에 나뉘어 있어요
| 이름 | 하는 일 | 비유 |
|---|---|---|
| **GitHub** | 앱의 설계도(코드)가 있는 곳. 이미 제가 올려 두었어요. | 설계도 보관함 |
| **Supabase** | 신청 내용이 저장되는 곳 | 금고 |
| **Vercel** | 학부모가 접속하는 주소를 만들어 주는 곳 | 간판 |

### 미리 준비할 것
- [ ] 구글 계정 (Gmail) 하나
- [ ] GitHub 계정 (없으면 B 단계 전에 `github.com`에서 가입. 이 앱 저장소 `prima5175-wq/milky`를 볼 수 있는 계정이어야 해요)
- [ ] 메모장 또는 종이: **받은 값들을 적어 둘 곳** (아래 "값 메모표" 참고)
- [ ] 약 2~3시간 (나눠서 해도 돼요)

### 비용 (대략, 환율·정책에 따라 바뀔 수 있어요)
- 처음에는 **둘 다 무료**로 시작할 수 있어요.
- 실제 신청을 받기 전에는 **Supabase Pro(월 약 25달러)**, **Vercel Pro(월 약 20달러)**로 올리는 걸 권해요. 신청이 몰릴 때 안정적이고, Vercel 무료 플랜은 사업용으로 쓰면 약관에 맞지 않아요. 올리는 건 **오픈 한 달 전쯤** 하셔도 돼요.

### 꼭 지켜 주세요 (보안)
- 🔒 **비밀번호, DATABASE_URL, 구글 JSON 키는 채팅창에 붙여 넣지 마세요.** 필요한 곳(Vercel 입력칸)에만 넣으세요.
- 채팅으로 보내도 되는 것: 프로젝트 이름, Vercel 주소(https://…vercel.app), 화면 캡처(**캡처에 비밀번호나 긴 키가 보이면 그 부분은 가려 주세요**).

### 값 메모표 (여기에 적어 두세요)
| 이름 | 어디서 받나 | 값 |
|---|---|---|
| Supabase 데이터베이스 비밀번호 | B-3에서 내가 만듦 | |
| NEXT_PUBLIC_SUPABASE_URL | B-5 | |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | B-5 | |
| DATABASE_URL | B-6 | |
| Vercel 주소 | C-7 | |
| Gmail 앱 비밀번호 (16자리) | D-5 | |

---

## A. 앱 코드가 어디 있는지 확인하기 (5분)

1. 인터넷 주소창에 입력: `github.com/prima5175-wq/milky/tree/claude/wonderful-pascal-m2w2d5/chaeknamu-winter`
2. GitHub 로그인이 안 되어 있으면 로그인해요.
3. ✅ **성공**: 파일 목록에 `src`, `supabase`, `docs`, `package.json` 같은 이름이 보여요.
4. ❌ "404 Not found"가 나오면: 로그인한 GitHub 계정에 저장소 접근 권한이 없는 거예요. 저장소 주인 계정으로 로그인했는지 확인하고, 그래도 안 되면 캡처를 보내주세요.

---

## B. Supabase — 금고 만들기 (40분)

### B-1. 가입
1. 주소창에 `supabase.com` → 오른쪽 위 **Sign in**(또는 **Start your project**).
2. **Continue with GitHub** 클릭 → GitHub에서 허용(**Authorize**)을 눌러요.
3. 처음이면 조직(Organization) 만들기 화면이 나와요:
   - Name: `chaeknamu`
   - Type: **Personal**
   - Plan: **Free**
   - **Create organization**

### B-2. 새 프로젝트 만들기
1. **New project** 클릭.
2. 입력:
   - **Project name**: `chaeknamu-winter`
   - **Database Password**: 아래 규칙으로 직접 만드세요.
     - 영어 대문자·소문자·숫자만, **20자 이상**. 예시 모양: `Kd8mQ2xVn7RtWb4LpZ9s` (이건 예시이니 그대로 쓰지 말고 직접 만드세요)
     - `@ # / ? : [ ] %` 같은 **특수문자는 넣지 마세요.** (나중에 주소가 깨져요)
     - **바로 값 메모표에 적으세요.** 나중에 다시 볼 수 없어요(재설정은 가능).
   - **Region**: 목록에서 **Northeast Asia (Seoul)** 선택 ← 중요! (`ap-northeast-2`라고 적혀 있을 수 있어요)
3. **Create new project** 클릭 → 1~3분 기다려요. "Setting up project" 화면이 사라지고 대시보드가 보이면 끝.
4. ✅ **성공**: 왼쪽 위에 프로젝트 이름 `chaeknamu-winter`가 보이고 왼쪽에 메뉴(Table Editor, SQL Editor, Authentication …)가 있어요.

### B-3. (이미 B-2에서 비밀번호를 만들었어요) 잊지 않았는지 확인
값 메모표 첫 줄에 비밀번호가 적혀 있는지 확인하세요. ✔

### B-4. 테이블 만들기 ① — 설계도 붙여 넣기
1. 새 탭에서 아래 주소를 열어요(GitHub 로그인 필요):
   `github.com/prima5175-wq/milky/blob/claude/wonderful-pascal-m2w2d5/chaeknamu-winter/supabase/migrations/0001_init.sql`
2. 파일 내용 위쪽 오른쪽에 **복사 아이콘(Copy raw file)** 이 있어요. 눌러서 전체를 복사해요. (안 보이면 키보드로 내용을 클릭한 뒤 `Ctrl + A` → `Ctrl + C`)
3. Supabase 왼쪽 메뉴에서 **SQL Editor**(`</>` 아이콘) 클릭 → **New query**(또는 `+`).
4. 빈 입력칸에 `Ctrl + V`로 붙여 넣어요. (아주 긴 글이 들어와요. 정상이에요.)
5. 오른쪽 아래 **Run**(초록 버튼, 또는 `Ctrl + Enter`) 클릭.
6. 경고창("Potential issue detected / destructive operations")이 뜨면 내용을 읽고 **Run this query**를 눌러도 돼요. (이 파일은 기존 데이터를 지우지 않아요)
7. ✅ **성공**: 아래에 `Success. No rows returned`가 보여요.
8. ❌ 빨간 에러가 나오면: 에러 문장 **전체**를 캡처해서 보내주세요. (같은 파일을 두 번 실행해서 `already exists` 에러가 나는 건 이미 만들어졌다는 뜻이라 괜찮아요.)

### B-5. 테이블 만들기 ② — 기본 자료 넣기
1. 새 탭에서 `…/chaeknamu-winter/supabase/seed.sql` 파일을 B-4와 같은 방식으로 열어요. 주소:
   `github.com/prima5175-wq/milky/blob/claude/wonderful-pascal-m2w2d5/chaeknamu-winter/supabase/seed.sql`
2. 전체 복사 → Supabase **SQL Editor → New query**에 붙여 넣기 → **Run**.
3. ✅ **성공**: `Success`가 나와요.
4. ⚠️ **절대 실행하지 마세요**: `dev-seed.sql` (연습용 가짜 계정이 들어가요)
5. 확인: 왼쪽 **Table Editor**(표 아이콘) → `branches` 클릭 → **3줄**(대치점·도곡초점·구룡초점)이 보이면 성공이에요. `slots`에는 22줄이 있어야 해요.

### B-6. 관리자 등록하기 (이게 있어야 로그인돼요)
1. **SQL Editor → New query**에 아래를 붙여 넣고, **원장님이메일@gmail.com** 부분을 실제로 로그인에 쓸 Gmail 주소로 바꿔요(따옴표는 그대로 두세요).
   ```sql
   insert into admin_users (email, role, branch_id, display_name)
   values ('원장님이메일@gmail.com', 'owner', null, '원장');
   ```
2. **Run** → ✅ `Success`.
3. 지점 관리자·강사도 지금 등록해 두려면(나중에 해도 돼요):
   ```sql
   -- 대치점 관리자
   insert into admin_users (email, role, branch_id, display_name)
   select '대치점관리자@gmail.com', 'branch_admin', id, '대치점 관리자' from branches where slug = 'daechi';
   -- 대치점 강사 (이름은 화면에 표시돼요)
   insert into admin_users (email, role, branch_id, display_name)
   select '강사1@gmail.com', 'teacher', id, '김선생' from branches where slug = 'daechi';
   ```
   (지점 slug: 대치점 `daechi`, 도곡초점 `dogok`, 구룡초점 `guryong`)
4. 이 목록에 **없는 이메일은 로그인이 안 돼요.**

### B-7. 연결에 필요한 값 3개 찾기
1. 화면 위쪽(프로젝트 화면 오른쪽 위)의 **Connect** 버튼을 클릭해요. (없으면 왼쪽 아래 톱니바퀴 **Project Settings**)
2. **값 ① Project URL**: 
   - Project Settings → **API**(또는 **Data API**) 화면에서 `Project URL`을 복사 → 모양: `https://abcdefghij.supabase.co` → 메모표 `NEXT_PUBLIC_SUPABASE_URL`에 적기.
3. **값 ② anon public 키**:
   - 같은 API 화면의 **Project API keys** 중 **`anon` `public`** 키(아주 긴 글자 `eyJ…`로 시작) 복사 → 메모표 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   - ⚠️ **`service_role` 키는 복사하지 마세요.** 이 앱에서 쓰지 않아요.
   - (키 이름이 "publishable key"로 바뀐 화면이면 그 키를 복사하세요.)
4. **값 ③ DATABASE_URL (제일 중요)**:
   - **Connect** 버튼 → **Connection String**(또는 **Connection pooling**) 탭에서 **Transaction pooler**를 선택해요. (Direct connection이 아니에요!)
   - 주소가 이런 모양이에요: `postgresql://postgres.abcdefghij:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`
   - 복사해서 메모표에 붙이고, **`[YOUR-PASSWORD]` 글자(대괄호 포함)를 B-2에서 만든 비밀번호로 바꿔요.**
   - ✅ **성공 모양**: 대괄호 `[ ]`가 하나도 없고, `:6543/`이 들어 있으며, `pooler.supabase.com`이 들어 있어요.

> 이 B 단계가 끝나면 "금고"가 준비된 거예요. 여기까지가 가장 어려운 부분이에요. 수고하셨어요!

---

## C. Vercel — 간판(주소) 만들기 (40분)

### C-1. 가입
1. `vercel.com` → **Sign Up** → **Continue with GitHub** → 허용(**Authorize**).
2. 이름·용도를 묻는 화면: **Hobby** 선택, 이름 입력(아무거나) → **Continue**.

### C-2. 저장소 연결 허용
1. **Add New… → Project**.
2. 목록에 `milky`가 있으면 → C-3로.
3. 없으면: **Adjust GitHub App Permissions** 클릭 → GitHub 화면에서 **Only select repositories → `milky` 선택 → Save** → 다시 Vercel로 돌아와 새로고침.

### C-3. 가져오기와 설정 (여기가 제일 중요해요)
1. `milky` 옆 **Import** 클릭.
2. **Configure Project** 화면에서:
   - **Project Name**: `chaeknamu-winter` (아무거나 가능. 이게 주소 앞부분이 돼요)
   - **Framework Preset**: `Next.js` (자동)
   - **Root Directory**: 오른쪽 **Edit** 클릭 → `chaeknamu-winter` 폴더 선택 → **Continue**. (이걸 안 하면 실패해요!)
3. **Environment Variables**(환경 변수)를 펼치고 아래를 **하나씩** 입력해요. 왼쪽 칸(Key)은 **대문자·밑줄 그대로**, 오른쪽 칸(Value)은 메모표 값이에요. 입력 후 **Add**.

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | B-7 ① |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | B-7 ② |
   | `DATABASE_URL` | B-7 ③ (비밀번호 바꾼 것) |
   | `NEXT_PUBLIC_SITE_URL` | 일단 `https://example.com` (C-6에서 고쳐요) |

   - ⚠️ **`DEMO_MODE`, `NEXT_PUBLIC_DEMO_MODE`는 넣지 마세요.** (체험용 설정이에요)
   - 값 앞뒤에 **따옴표나 공백을 넣지 마세요.**

### C-4. 배포
1. **Deploy** 클릭 → 화면에서 진행 로그가 올라가요. 1~3분.
2. ✅ **성공**: 축하 화면(폭죽)과 미리보기 이미지가 나와요.
3. ❌ **빨간 Failed / Error**: **Build Logs**(빌드 로그) 맨 아래 빨간 줄을 캡처해서 보내주세요. 가장 흔한 원인은 Root Directory 누락이에요 → C-3의 2번 확인.

### C-5. 어느 브랜치를 배포하나요? (중요)
지금 앱은 `claude/wonderful-pascal-m2w2d5`라는 **작업 브랜치**에 있어요. Vercel은 기본으로 `main`을 "진짜 주소"로 쓰기 때문에 아래 중 하나가 필요해요.

- **방법 1(권장, 지금은 이걸로)**: Vercel 프로젝트 → **Settings → Git**(또는 **Environments → Production**)에서 **Production Branch**를 `claude/wonderful-pascal-m2w2d5`로 바꿔요 → **Deployments** 탭 → 맨 위 배포 오른쪽 `⋯` → **Redeploy**.
- 방법 2(오픈 전): 제가 `main`으로 합치는 요청(PR)을 만들어 드릴게요. **원장님이 "합쳐도 돼요"라고 하실 때만** 진행해요.

### C-6. 주소 확인하고 SITE_URL 고치기
1. **Overview** 화면의 **Domains** 줄에 `https://chaeknamu-winter-xxxx.vercel.app` 같은 주소가 있어요. 클릭해서 열어요.
2. ✅ **성공**: "몰입독서반" 첫 화면이 보여요! (카드 3개)
3. 그 주소(https부터 .app까지)를 메모표 **Vercel 주소**에 적어요.
4. **Settings → Environment Variables**에서 `NEXT_PUBLIC_SITE_URL` 오른쪽 `⋯` → **Edit** → 값을 방금 그 주소로 바꾸고 **Save**.
5. **Deployments → 맨 위 → ⋯ → Redeploy**. (환경 변수는 새로 배포해야 적용돼요)

### C-7. 데이터가 정말 연결됐는지 확인
1. 주소 뒤에 `/daechi`를 붙여 열어요 (`https://…vercel.app/daechi`).
2. ✅ **성공**: "1관 대치점(한티역)"과 수강료·시간표가 보여요. 하단 버튼은 "신청 일정은 곧 안내드려요."(오픈 시각을 아직 안 넣었으니 정상!)
3. ❌ 오류 화면/빈 화면이면: C-3의 `DATABASE_URL`을 의심해요. 대괄호가 남아 있나, 비밀번호가 맞나 확인하세요. 캡처를 보내주셔도 돼요.

---

## D. 관리자 로그인 연결 (30분)

### D-1. 주소 등록 (Supabase)
1. Supabase → 왼쪽 **Authentication** → **URL Configuration**.
2. **Site URL**: C-6의 Vercel 주소 입력 → **Save**.
3. **Redirect URLs** → **Add URL** → `https://(내 Vercel 주소)/admin/callback` 입력 → **Save**.
   - 예: `https://chaeknamu-winter-xxxx.vercel.app/admin/callback`

### D-2. 먼저 로그인해 보기 (원장님 이메일만 가능)
1. `https://(내 주소)/admin/login` 열기.
2. B-6에서 등록한 원장님 이메일 입력 → **로그인 링크 받기**.
3. "허용된 이메일이라면 로그인 링크를 보냈어요" 문구가 나오면 Gmail을 열어요(스팸함도 확인).
4. 메일의 로그인 링크를 클릭.
   - ⚠️ **링크는 요청한 그 브라우저(같은 기기·같은 브라우저)에서 열어야 해요.** PC에서 요청했으면 PC에서, 폰에서 요청했으면 폰의 같은 브라우저에서요.
5. ✅ **성공**: "신청 현황" 관리자 화면이 열려요.
6. ❌ 메일이 안 오면: 스팸함 확인 → 1분 후 한 번만 다시 시도(너무 자주 누르면 막혀요) → 안 되면 D-3(메일 서버 설정)을 먼저 해 주세요.

> 이 이메일 링크 로그인은 **제가 실제 Supabase로는 아직 시험하지 못했어요.** 오류가 나면 캡처를 보내주세요. 가장 먼저 고칠게요.

### D-3. 직원(강사·지점 관리자)도 로그인하려면: 메일 서버 연결 (Gmail 방식)
기본 메일 기능은 **발송 횟수가 매우 적고 팀원에게만** 보내지는 경우가 있어요. 직원 여러 명이 쓰려면 아래를 해 주세요.

**[D-3-1] Gmail 앱 비밀번호 만들기**
1. `myaccount.google.com` → 왼쪽 **보안**.
2. **2단계 인증**이 꺼져 있으면 켜요(휴대폰 인증).
3. 상단 검색창에 **앱 비밀번호** 입력 → 선택 → 앱 이름 `supabase` 입력 → **만들기**.
4. 노란 상자에 **16자리 비밀번호**가 나와요. 공백 없이 메모표에 적어요(한 번만 보여줘요).

**[D-3-2] Supabase에 입력**
1. Supabase → **Authentication → Emails**(또는 **Settings → SMTP Settings**) → **SMTP Settings** → **Enable Custom SMTP** 켜기.
2. 입력:
   - **Sender email**: 내 Gmail 주소
   - **Sender name**: `책나무 방특`
   - **Host**: `smtp.gmail.com`
   - **Port number**: `465`
   - **Username**: 내 Gmail 주소
   - **Password**: D-3-1의 16자리 앱 비밀번호
3. **Save** → ✅ 저장됨.
4. 이제 D-2를 직원 이메일로도 해 보세요(직원 이메일은 B-6에서 등록해야 해요).

(참고: 개인 Gmail로 보내면 하루 약 500통까지예요. 이 앱에는 충분해요.)

---

## E. 첫 점검 — 오픈 전 설정하고 신청해 보기 (30분)

### E-1. 설정 입력 (관리자 → 설정 메뉴, 원장만)
각 지점 카드에서 입력하고 맨 아래 **저장**을 눌러요.
1. **신청 시작**: 오픈 일시. **지금은 "오늘 오후 아무 시각(이미 지난 시각)"으로 넣으면 바로 신청이 열려요.** 실제 오픈 일시는 나중에 바꿔요.
2. **환불·변경 마감**: 대치·도곡 `2026-12-27 23:59`, 구룡 `2026-12-20 23:59`.
3. **타임별 정원**: 지금은 연습으로 작은 숫자(예: 대치점 1차 1부 `2`)로 넣어 보세요. (마감·대기 화면을 보기 위해서예요.)
4. **문의 링크**: 대치점은 이미 들어 있어요.

### E-2. 신청해 보기 (휴대폰으로!)
1. 휴대폰에서 `https://(내 주소)` 열기 (카카오톡으로 링크를 보내서 **카카오톡 안에서** 열어 보세요).
2. 대치점 → 안내 → **신청하기** → 가짜 이름(`테스트1`), 학년, 학교, 연락처(**본인 번호 말고 `010-0000-0001` 같은 가짜**)로 신청.
3. 1차 1부(정원 2)에 **3번** 신청해 보세요. 3번째가 "대기 신청으로 접수"로 나오면 ✅ 성공이에요.
4. 신청 조회(`/check`)에서 이름 + 뒷 4자리로 조회돼요.
5. 학부모 화면에 **정원·남은 자리 숫자가 어디에도 안 보이는지** 확인해요. (보이면 알려주세요!)

### E-3. 관리자 화면 확인
1. **현황**에서 "확정 2 / 정원 2 · 대기 1"이 보여요.
2. **신청 목록**에서 학년 색·형제 묶음·연락처 가림이 보여요.
3. 대기 학생의 상세에서 상태를 **확정**으로 바꾸면 "정원이 찼어요, 그래도 확정할까요?" 확인창이 나와요.

### E-4. 연습 데이터 지우기 (연습이 끝나면)
- 연습 신청은 제가 안전하게 지워 드릴게요. **지우기 전에 반드시 원장님께 먼저 확인받아요.** "연습 데이터 지워줘"라고 말씀해 주세요.
- 정원과 오픈 시각은 **실제 값으로 되돌리는 걸 잊지 마세요.**

---

## F. 구글시트 연결 (선택, 30분)

신청이 구글시트에 자동으로 쌓이는 기능이에요. 안 해도 앱은 정상이고 엑셀 다운로드로 대신할 수 있어요. 자세한 화면 순서는 `docs/SETUP-GUIDE.md`의 **6장**을 그대로 따라 하세요. 요약:

1. `console.cloud.google.com` → 새 프로젝트 `chaeknamu-winter`
2. **Google Sheets API** 사용 설정
3. **서비스 계정** 만들기 → **JSON 키** 내려받기 (🔒 비밀! 채팅에 붙여 넣지 마세요)
4. 구글시트 새로 만들기 → **공유**에서 서비스 계정 이메일을 **편집자**로 추가
5. Vercel 환경 변수 3개 추가 후 Redeploy
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = 서비스 계정 이메일
   - `GOOGLE_SHEET_ID` = 시트 주소 중 `/d/` 와 `/edit` 사이 글자
   - `GOOGLE_PRIVATE_KEY` = JSON 파일의 `private_key` 값 전체(`-----BEGIN PRIVATE KEY-----`부터 끝까지)
6. 관리자 → 설정 → **구글시트 연결**에서 "연결됨"이 보이고, **지금 전체 다시 맞추기**를 눌러 시트에 줄이 생기면 ✅ 성공이에요.

---

## G. 저에게 알려주실 것 / 마무리

### 각 단계가 끝나면 이렇게 알려주세요
- "B 끝났어요" + Supabase **Table Editor의 `branches` 화면 캡처** (3줄 보이는 것)
- "C 끝났어요" + **Vercel 주소**(https://…vercel.app)
- "D 끝났어요" 또는 "메일이 안 와요" + 화면 캡처
- 막히면 **그 화면 캡처 + 어느 단계(예: B-4)인지**

### 실제 환경에서 제가 직접 확인하고 싶은 것 (선택)
정원 계산과 동시 접수를 **실제 Supabase로 다시 시험**하고 싶어요. 가능하게 하려면:
1. 화면 위쪽 제목줄의 **클라우드 환경 메뉴 → Edit**.
2. **환경 변수**(또는 Network secrets / API credentials)에 `DATABASE_URL`을 추가하고 값은 **그 입력칸에만** 넣어요. (채팅 금지!)
3. **Network access**가 제한이면 Supabase 주소(`*.supabase.com`, `*.pooler.supabase.com`)를 허용 도메인에 추가해요.
4. 새 세션에서 "연결 확인해줘"라고 말씀해 주세요.

### 오픈 전날 최종 점검표
- [ ] 정원 숫자를 **실제 값**으로 입력했다
- [ ] 지점별 **신청 시작 일시**가 맞다 (오전/오후 확인)
- [ ] 연습 신청 데이터를 모두 지웠다 (제가 확인받고 지움)
- [ ] 관리자·강사 이메일이 등록되어 있고 로그인이 된다
- [ ] Supabase 프로젝트가 잠들어 있지 않다 (접속해서 확인)
- [ ] Vercel·Supabase 요금제를 올렸다 (Pro 권장)
- [ ] 직원 3~5명이 휴대폰(카카오톡 안에서)으로 동시에 신청해 보는 **리허설**을 했다
- [ ] 리틀리 등에 걸 **최종 주소**가 맞다

---

## 막혔을 때 자주 나오는 문제

| 증상 | 해결 |
|---|---|
| B-4에서 빨간 에러 | 에러 문장 전체 캡처. `already exists`면 이미 만들어진 것이라 괜찮아요. |
| Vercel 배포 실패 | Root Directory가 `chaeknamu-winter`인지, 환경 변수 Key 철자(대문자·밑줄)가 맞는지 확인. 빌드 로그 마지막 빨간 줄 캡처. |
| 주소는 열리는데 `/daechi`가 오류 | `DATABASE_URL`에 `[ ]`가 남았거나 비밀번호가 틀림. B-7 ③ 다시 확인. 환경 변수를 고친 뒤에는 꼭 **Redeploy**. |
| 로그인 메일이 안 옴 | 스팸함 → 1분 뒤 한 번만 재시도 → D-3(Gmail 메일 서버) 설정. 등록하지 않은 이메일은 메일이 안 가요(B-6 확인). |
| 로그인 링크를 눌렀는데 다시 로그인 화면 | 링크를 **요청한 같은 브라우저**에서 열었는지 확인. Supabase **Redirect URLs**에 `/admin/callback` 주소가 있는지 확인(D-1). |
| 구글시트에 안 쌓임 | 서비스 계정 이메일이 시트에 **편집자**로 공유됐는지, Sheets API가 **사용** 상태인지 확인. 신청 자체는 정상 접수돼요. |

---

*이 문서: `chaeknamu-winter/docs/REAL-SETUP.md` · 화면이 다르면 알려주세요. 바로 고쳐 둘게요.*
