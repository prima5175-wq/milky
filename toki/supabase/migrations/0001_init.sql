-- 토키 초기 스키마 · 역할별 접근 제어(RLS)
-- 원칙: 보호자는 자기 자녀만, 검사자는 배정된 아동만, 감수 전 시나리오는 아동에게 노출하지 않는다.

create extension if not exists pgcrypto;

-- ───────── 공통 타입 ─────────
create type user_role as enum ('therapist', 'guardian', 'admin');
create type review_status as enum ('draft', 'expert_review', 'approved');
create type consent_kind as enum ('service', 'voice_storage', 'drawing_storage', 'research');

-- ───────── 사용자 ─────────
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null,
  display_name text not null,
  organization text,
  locale text not null default 'ko',
  created_at timestamptz not null default now()
);

create table children (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references profiles(id),
  nickname text not null,                    -- 실명 대신 별칭
  age_band text not null,                    -- 생년월일 대신 연령대 (예: '5-6', '7-9')
  target_level smallint not null default 1 check (target_level between 1 and 4),
  target_domains text[] not null default '{}',
  low_stimulus boolean not null default false,
  daily_minutes smallint not null default 15,
  daily_scenarios smallint not null default 3,
  video_mode text not null default 'cartoon' check (video_mode in ('cartoon', 'real')),
  referral_note text,                        -- 의뢰 사유·대상군(검사자 입력, 선택, 민감정보)
  created_at timestamptz not null default now()
);

create table therapist_assignments (
  therapist_id uuid not null references profiles(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  primary key (therapist_id, child_id)
);

create table consents (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  kind consent_kind not null,
  policy_version text not null,
  granted_by uuid not null references profiles(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- ───────── 검사 카탈로그 (외부 검사는 메타데이터만, 문항은 저장하지 않음) ─────────
create table assessment_catalog (
  id uuid primary key default gen_random_uuid(),
  name_ko text not null,
  name_en text,
  abbreviation text,
  publisher text,
  category text not null,                    -- 발달선별, 지능, 언어, 자폐 …
  administration text not null check (administration in ('clinician', 'parent_rating', 'teacher_rating', 'self_report', 'drawing')),
  age_min_months int,
  age_max_months int,
  target_groups text[] not null default '{}',-- 대상군(참고)
  score_schema jsonb not null default '[]',  -- [{key,label,type,min,max}] 입력 양식
  retest_interval_months int,
  license_note text,
  country text[] not null default '{KR}',
  review_status review_status not null default 'draft',
  is_custom boolean not null default false,  -- 센터가 직접 추가한 검사
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- 검사 결과 (장기 누적의 핵심: child + catalog + 시점)
create table assessment_records (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  catalog_id uuid not null references assessment_catalog(id),
  administered_on date not null,
  examiner_id uuid not null references profiles(id),
  phase text not null default 'follow_up' check (phase in ('pre', 'follow_up', 'post')),
  scores jsonb not null default '{}',        -- score_schema 의 key → 값
  note text,
  drawing_paths text[] not null default '{}',-- HTP 등 그림 파일(별도 동의 시)
  superseded_by uuid references assessment_records(id), -- 수정 시 이전 기록 보존
  created_at timestamptz not null default now()
);
create index on assessment_records (child_id, catalog_id, administered_on);

-- ───────── 시나리오 ─────────
create table scenarios (
  id text primary key,
  setting text not null,
  age_band text not null,
  domains text[] not null,
  target_level smallint not null check (target_level between 1 and 4),
  content jsonb not null,                    -- situation, partnerLine, goodResponses 등
  review_status review_status not null default 'draft',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz
);

create table child_scenarios (
  child_id uuid not null references children(id) on delete cascade,
  scenario_id text not null references scenarios(id),
  assigned_by uuid not null references profiles(id),
  primary key (child_id, scenario_id)
);

-- ───────── 연습 기록 ─────────
create table practice_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  scenario_id text not null references scenarios(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references practice_sessions(id) on delete cascade,
  turn_no smallint not null check (turn_no between 1 and 3),  -- 최대 3번 주고받기
  input_mode text not null check (input_mode in ('voice', 'choice', 'text')),
  response_text text not null,               -- 음성 원본은 저장하지 않음
  detected_level smallint check (detected_level between 1 and 4),
  feedback text,
  safety_flag boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, turn_no)
);

create table missions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  scenario_id text not null references scenarios(id),
  text text not null,
  status text not null default 'open' check (status in ('open', 'done', 'skipped')),
  confirmed_by uuid references profiles(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table stickers (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  kind text not null,
  reason text not null check (reason in ('practice', 'mission')),
  points smallint not null,
  created_at timestamptz not null default now()
);

create table session_notes (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table safety_events (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  turn_id uuid references turns(id),
  category text not null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create table usage_daily (
  child_id uuid not null references children(id) on delete cascade,
  day date not null,
  seconds int not null default 0,
  primary key (child_id, day)
);

-- 처방(시간·개수·목표) 변경 이력: 효과 분석용
create table prescription_history (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  changed_by uuid not null references profiles(id),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

-- ───────── 권한 헬퍼 ─────────
create function current_role_is(r user_role) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from profiles where id = auth.uid() and role = r) $$;

create function can_access_child(cid uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select
       exists (select 1 from children c where c.id = cid and c.guardian_id = auth.uid())
    or exists (select 1 from therapist_assignments a
               where a.child_id = cid and a.therapist_id = auth.uid() and a.ended_at is null)
  $$;

-- ───────── RLS ─────────
alter table profiles enable row level security;
alter table children enable row level security;
alter table therapist_assignments enable row level security;
alter table consents enable row level security;
alter table assessment_catalog enable row level security;
alter table assessment_records enable row level security;
alter table scenarios enable row level security;
alter table child_scenarios enable row level security;
alter table practice_sessions enable row level security;
alter table turns enable row level security;
alter table missions enable row level security;
alter table stickers enable row level security;
alter table session_notes enable row level security;
alter table safety_events enable row level security;
alter table usage_daily enable row level security;
alter table prescription_history enable row level security;

create policy profiles_self on profiles for select using (id = auth.uid());
create policy profiles_self_update on profiles for update using (id = auth.uid());

create policy children_read on children for select using (can_access_child(id));
create policy children_guardian_write on children for all
  using (guardian_id = auth.uid()) with check (guardian_id = auth.uid());
-- 검사자는 배정된 아동의 처방(목표·시간)만 수정
create policy children_therapist_update on children for update using (can_access_child(id));

create policy assign_read on therapist_assignments for select
  using (therapist_id = auth.uid() or exists (select 1 from children c where c.id = child_id and c.guardian_id = auth.uid()));
create policy assign_guardian_write on therapist_assignments for all
  using (exists (select 1 from children c where c.id = child_id and c.guardian_id = auth.uid()))
  with check (exists (select 1 from children c where c.id = child_id and c.guardian_id = auth.uid()));

-- 동의는 보호자만 기록·철회, 검사자는 열람만
create policy consents_read on consents for select using (can_access_child(child_id));
create policy consents_guardian_write on consents for all
  using (exists (select 1 from children c where c.id = child_id and c.guardian_id = auth.uid()))
  with check (exists (select 1 from children c where c.id = child_id and c.guardian_id = auth.uid()));

-- 검사 카탈로그: 승인된 것은 로그인 사용자 모두, 초안은 관리자·작성자만
create policy catalog_read on assessment_catalog for select
  using (review_status = 'approved' or current_role_is('admin') or created_by = auth.uid());
create policy catalog_admin_write on assessment_catalog for all
  using (current_role_is('admin')) with check (current_role_is('admin'));
-- 센터가 직접 추가하는 검사(is_custom)는 검사자도 생성 가능
create policy catalog_custom_insert on assessment_catalog for insert
  with check (current_role_is('therapist') and is_custom and created_by = auth.uid());

-- 검사 기록: 접근 가능한 아동만 열람, 검사자만 입력 (삭제 없음, 수정은 superseded_by 로 이력 보존)
create policy records_read on assessment_records for select using (can_access_child(child_id));
create policy records_insert on assessment_records for insert
  with check (current_role_is('therapist') and examiner_id = auth.uid() and can_access_child(child_id));
create policy records_supersede on assessment_records for update
  using (current_role_is('therapist') and can_access_child(child_id));

-- 시나리오: 아동용 노출은 승인된 것만. 초안·검토 단계는 관리자만 열람
create policy scenarios_read on scenarios for select
  using (review_status = 'approved' or current_role_is('admin'));
create policy scenarios_admin_write on scenarios for all
  using (current_role_is('admin')) with check (current_role_is('admin'));

create policy child_scenarios_read on child_scenarios for select using (can_access_child(child_id));
create policy child_scenarios_write on child_scenarios for all
  using (current_role_is('therapist') and can_access_child(child_id))
  with check (current_role_is('therapist') and can_access_child(child_id) and assigned_by = auth.uid());

-- 연습·미션·스티커 등 아동 기록: 접근 가능한 사람만
create policy sessions_rw on practice_sessions for all
  using (can_access_child(child_id)) with check (can_access_child(child_id));
create policy turns_rw on turns for all
  using (exists (select 1 from practice_sessions s where s.id = session_id and can_access_child(s.child_id)))
  with check (exists (select 1 from practice_sessions s where s.id = session_id and can_access_child(s.child_id)));
create policy missions_read on missions for select using (can_access_child(child_id));
-- 미션 완료 인증은 보호자만 (교사 확인은 후속 단계에서 별도 역할로)
create policy missions_guardian_confirm on missions for update
  using (exists (select 1 from children c where c.id = child_id and c.guardian_id = auth.uid()));
create policy stickers_read on stickers for select using (can_access_child(child_id));
create policy notes_read on session_notes for select using (can_access_child(child_id));
create policy notes_insert on session_notes for insert
  with check (current_role_is('therapist') and author_id = auth.uid() and can_access_child(child_id));
create policy safety_read on safety_events for select using (can_access_child(child_id));
create policy usage_read on usage_daily for select using (can_access_child(child_id));
create policy prescription_read on prescription_history for select using (can_access_child(child_id));
create policy prescription_insert on prescription_history for insert
  with check (changed_by = auth.uid() and can_access_child(child_id));
-- 스티커·안전 이벤트·사용 시간 기록은 서버(service role)에서만 쓴다.
