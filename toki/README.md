# 토키 (Toki)

사회적 대화에 어려움이 있는 아동을 위한 **화용언어·사회성 연습 및 교육 보조 도구**.
보기 → 연습하기 → 실제로 해보기. 검사자가 쓰던 검사 결과를 누적해 장기 변화를 한눈에 봅니다.

> 이 앱은 연습·교육 보조 도구입니다. 검사 결과의 해석과 판단은 전문가가 합니다.

## 현재 진행 상황 (1~2단계 완료)
- Next.js + TypeScript + Tailwind 골격, 한국어/영어 i18n
- DB 스키마와 역할별 접근 제어(RLS): `supabase/migrations/0001_init.sql`
- 검사 카탈로그·검사 기록 구조 (외부 검사는 점수만 입력, 문항은 저장하지 않음)
- **검사 결과 누적 화면** (`/therapist`, 가상 데이터): 점수 입력, 변화 추이 그래프, 두 시점 비교, 재검 예정 알림, 통합 타임라인
  - 점수 방향(높을수록 좋은지)을 모르는 항목은 "좋아짐/나빠짐"을 판정하지 않고 변화량만 보여준다.
  - HTP 같은 그림 검사는 점수 없이 시행 기록·관찰 메모만 남긴다. 자동 해석·채점 없음.
  - 저장소는 `AssessmentRepository` 인터페이스 뒤에 있어 Supabase 연결 시 `demo.ts` 만 교체하면 된다.
- 감수용 검사 목록: `content/assessment-catalog-review.csv` (교수님 기입용)

## 실행
```bash
cd toki
npm install
cp .env.example .env.local   # 값은 Supabase 연결 후 채움
npm run dev                  # http://localhost:3000
```

## 확인
```bash
npm test                 # 단위 테스트
npm run lint:copy        # UI 문구 금지 표현 검사 ("치료한다", "진단한다")
bash scripts/test-rls.sh # 로컬 Postgres 로 마이그레이션 + 권한 테스트 (Postgres 필요)
```

## 원칙
- 외부 상용 검사의 문항·도판은 복제하지 않는다. 점수만 검사자가 입력한다.
- 감수(`approved`) 전 시나리오·검사는 아동에게 노출하지 않는다.
- 음성 원본은 저장하지 않는다. 그림 저장은 보호자 별도 동의가 있을 때만.
