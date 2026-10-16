-- 책나무 방학특강 신청 앱 · 초기 DB 구조
-- 원칙: 학부모 화면은 서버 API(service_role)로만 접근한다. 익명(anon) 사용자는 어떤 테이블도 직접 읽을 수 없다.


-- ───────── 테이블 ─────────

create table branches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0,
  refund_deadline timestamptz not null,
  open_at timestamptz,                    -- null이면 신청을 열지 않음
  close_at timestamptz,
  contact_url text,
  notice text,                            -- 지점별 운영 메모
  bundle_price int not null,              -- 1·2차 모두 금액
  makeup_limit int not null default 3,    -- 보강 가능 횟수(지점별 설정)
  makeup_start_date date,                 -- 보강을 미리 신청할 수 있는 시작일 (null이면 차수 시작일부터)
  partial_full_mode text not null default 'all_wait'
    check (partial_full_mode in ('all_wait', 'split')), -- 1·2차 중 한쪽만 마감일 때 처리
  is_active boolean not null default true
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  code text not null check (code in ('1차', '2차')),
  start_date date not null,
  end_date date not null,
  lesson_count int not null,
  price int not null,
  unique (branch_id, code)
);

create table slots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  label text not null,
  start_time time not null,
  end_time time not null,
  capacity int check (capacity is null or capacity >= 0), -- null이면 무제한. 학부모에게 절대 노출 금지
  sort_order int not null default 0,
  unique (session_id, label)
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  branch_id uuid not null references branches(id),
  student_name text not null,
  grade int not null check (grade between 1 and 6),
  school text not null,
  guardian_phone text not null check (guardian_phone ~ '^010[0-9]{8}$'),
  enrollment_type text not null check (enrollment_type in ('신규', '정규 재원생', '휴원생', '타 지점 수강생')),
  course text not null check (course in ('1차', '2차', '1·2차')),
  slot1_id uuid references slots(id),
  slot2_id uuid references slots(id),
  price int not null,
  status text not null check (status in ('확정', '대기', '취소', '환불')),
  waitlist_order int,
  agree_policy boolean not null,
  agree_privacy boolean not null,
  policy_version text not null,
  agreed_at timestamptz not null,
  memo text check (memo is null or char_length(memo) <= 200),
  admin_note text,
  idempotency_key text not null unique,
  sheet_synced_at timestamptz,
  extra jsonb not null default '{}'::jsonb, -- 관리자가 추가한 칸의 답변
  pass_note text,                           -- 기존 수강권 메모 (관리자 입력)
  pass_end_date date,                       -- 기존 수강 종료일 (관리자 입력)
  check (agree_policy and agree_privacy),
  check ((course = '1차' and slot1_id is not null and slot2_id is null)
      or (course = '2차' and slot1_id is null and slot2_id is not null)
      or (course = '1·2차' and slot1_id is not null and slot2_id is not null))
);

-- 같은 지점·학생·연락처·과정으로 확정/대기가 이미 있으면 막는다 (동시 제출 최후 방어선)
create unique index applications_no_duplicate
  on applications (branch_id, student_name, guardian_phone, course)
  where status in ('확정', '대기');
create index applications_slot1_idx on applications (slot1_id) where status in ('확정', '대기');
create index applications_slot2_idx on applications (slot2_id) where status in ('확정', '대기');
create index applications_lookup_idx on applications (branch_id, student_name);
create index applications_unsynced_idx on applications (created_at) where sheet_synced_at is null;

create table admin_users (
  email text primary key,
  role text not null check (role in ('owner', 'branch_admin', 'teacher')),
  branch_id uuid references branches(id),
  check (role = 'owner' or branch_id is not null)
);

create table application_logs (
  id bigint generated always as identity primary key,
  application_id uuid not null references applications(id) on delete cascade,
  changed_by text not null,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

-- 학년별 커리 (관리자 화면에서 수정)
create table curriculum (
  id uuid primary key default gen_random_uuid(),
  grade_group text not null unique,       -- '1~2학년' 등
  items text[] not null,
  sort_order int not null default 0
);

-- 앱 공통 문구 설정 (공통 안내 문구 등)
create table app_settings (
  key text primary key,
  value text not null
);

-- 지난 방학 이력 (관리자가 붙여 넣어 등록: 지난 여름방학 수강, 지난 방학 취소 등)
create table past_records (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  guardian_phone text not null check (guardian_phone ~ '^010[0-9]{8}$'),
  term text not null,                       -- 예: '2026 여름'
  outcome text not null check (outcome in ('수강', '취소')),
  note text,
  created_at timestamptz not null default now()
);
create index past_records_lookup_idx on past_records (guardian_phone, student_name);

-- 신청 폼 칸 설정 (관리자가 추가·수정·삭제)
create table form_fields (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_]{1,30}$'),
  label text not null,
  type text not null check (type in ('text', 'textarea', 'select', 'checkbox')),
  options text[] not null default '{}',
  required boolean not null default false,
  help text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- 요청 횟수 제한용 기록 (서버리스 환경에서도 동작하도록 DB에 저장)
create table rate_events (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index rate_events_key_idx on rate_events (key, created_at);

-- ───────── 보안 (RLS) ─────────
-- 모든 테이블 RLS 켬. 익명 정책은 없음 → 익명은 아무것도 못 읽는다.
-- 쓰기는 서버(service_role)에서만 한다. 관리자 로그인 사용자는 읽기만 허용(지점 관리자는 자기 지점만).

alter table branches enable row level security;
alter table sessions enable row level security;
alter table slots enable row level security;
alter table applications enable row level security;
alter table admin_users enable row level security;
alter table application_logs enable row level security;
alter table curriculum enable row level security;
alter table app_settings enable row level security;
alter table form_fields enable row level security;
alter table past_records enable row level security;
alter table rate_events enable row level security;

create function admin_role() returns text
language sql stable security definer set search_path = public as $$
  select role from admin_users where lower(email) = lower(auth.jwt() ->> 'email')
$$;

create function admin_branch() returns uuid
language sql stable security definer set search_path = public as $$
  select branch_id from admin_users where lower(email) = lower(auth.jwt() ->> 'email')
$$;

create policy admin_read_branches on branches for select to authenticated
  using (admin_role() = 'owner' or id = admin_branch());
create policy admin_read_sessions on sessions for select to authenticated
  using (admin_role() = 'owner' or branch_id = admin_branch());
create policy admin_read_slots on slots for select to authenticated
  using (admin_role() = 'owner' or exists (
    select 1 from sessions s where s.id = slots.session_id and s.branch_id = admin_branch()));
create policy admin_read_applications on applications for select to authenticated
  using (admin_role() = 'owner' or branch_id = admin_branch());
create policy admin_read_logs on application_logs for select to authenticated
  using (admin_role() = 'owner' or exists (
    select 1 from applications a where a.id = application_logs.application_id and a.branch_id = admin_branch()));
create policy admin_read_self on admin_users for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

revoke all on all tables in schema public from anon, authenticated;
grant select on branches, sessions, slots, applications, application_logs, admin_users to authenticated;

-- ───────── 학부모용 타임 현황 (is_full만 반환) ─────────
-- 정원·신청 수·남은 자리는 절대 반환하지 않는다.
create function public_branch_status(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare b branches; result jsonb;
begin
  select * into b from branches where slug = p_slug and is_active;
  if not found then return null; end if;
  select jsonb_build_object(
    'slug', b.slug, 'name', b.name, 'open_at', b.open_at, 'close_at', b.close_at,
    'refund_deadline', b.refund_deadline, 'contact_url', b.contact_url, 'notice', b.notice,
    'bundle_price', b.bundle_price, 'makeup_limit', b.makeup_limit, 'makeup_start_date', b.makeup_start_date,
    'is_open', (b.open_at is not null and now() >= b.open_at and (b.close_at is null or now() < b.close_at)),
    'server_now', now(),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', s.code, 'start_date', s.start_date, 'end_date', s.end_date,
        'lesson_count', s.lesson_count, 'price', s.price,
        'slots', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', sl.id, 'label', sl.label, 'start_time', sl.start_time, 'end_time', sl.end_time,
            'is_full', (sl.capacity is not null and (
              select count(*) from applications a
              where a.status = '확정' and (a.slot1_id = sl.id or a.slot2_id = sl.id)) >= sl.capacity)
          ) order by sl.sort_order) from slots sl where sl.session_id = s.id), '[]'::jsonb)
      ) order by s.code) from sessions s where s.branch_id = b.id), '[]'::jsonb)
  ) into result;
  return result;
end $$;

-- ───────── 선착순 접수 (트랜잭션) ─────────
-- 반환: {ok, code?, status?, applications:[{id,status}]}  (정원/순번 같은 숫자는 반환하지 않음)
create function submit_application(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b branches;
  s1 sessions; s2 sessions;
  sl1 slots; sl2 slots;
  v_course text := p ->> 'course';
  v_slot1 uuid := nullif(p ->> 'slot1_id', '')::uuid;
  v_slot2 uuid := nullif(p ->> 'slot2_id', '')::uuid;
  v_phone text := regexp_replace(coalesce(p ->> 'guardian_phone', ''), '[^0-9]', '', 'g');
  v_name text := btrim(coalesce(p ->> 'student_name', ''));
  v_key text := coalesce(p ->> 'idempotency_key', '');
  v_full1 boolean := false; v_full2 boolean := false;
  v_existing jsonb;
  v_id uuid; v_id2 uuid;
  v_order int; v_status text;
begin
  -- 1) 같은 키로 이미 접수됐으면 처음 결과를 그대로 돌려준다
  if v_key = '' then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;
  select jsonb_build_object('ok', true, 'duplicate_key', true, 'applications',
           jsonb_agg(jsonb_build_object('id', id, 'status', status) order by created_at))
    into v_existing
    from applications where idempotency_key = v_key or idempotency_key = v_key || '#2';
  if v_existing -> 'applications' is not null and jsonb_typeof(v_existing -> 'applications') = 'array' then
    return v_existing;
  end if;

  -- 2) 입력 검증
  if v_name = '' or char_length(v_name) > 30
     or v_phone !~ '^010[0-9]{8}$'
     or coalesce((p ->> 'grade')::int, 0) not between 1 and 6
     or btrim(coalesce(p ->> 'school', '')) = ''
     or (p ->> 'enrollment_type') not in ('신규', '정규 재원생', '휴원생', '타 지점 수강생')
     or v_course not in ('1차', '2차', '1·2차')
     or coalesce((p ->> 'agree_policy')::boolean, false) is not true
     or coalesce((p ->> 'agree_privacy')::boolean, false) is not true
     or char_length(coalesce(p ->> 'memo', '')) > 200
     or (v_course = '1차' and (v_slot1 is null or v_slot2 is not null))
     or (v_course = '2차' and (v_slot2 is null or v_slot1 is not null))
     or (v_course = '1·2차' and (v_slot1 is null or v_slot2 is null)) then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;

  -- 3) 지점·오픈 시각 확인 (서버 시각 기준)
  select * into b from branches where slug = p ->> 'branch_slug' and is_active;
  if not found then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;
  if b.open_at is null or now() < b.open_at then
    return jsonb_build_object('ok', false, 'code', 'not_open');
  end if;
  if b.close_at is not null and now() >= b.close_at then
    return jsonb_build_object('ok', false, 'code', 'closed');
  end if;

  select * into s1 from sessions where branch_id = b.id and code = '1차';
  select * into s2 from sessions where branch_id = b.id and code = '2차';

  -- 4) 타임 행 잠금 (id 순서로 잠가 교착 방지) + 지점/차수 일치 확인
  perform 1 from slots
    where id in (coalesce(v_slot1, v_slot2), coalesce(v_slot2, v_slot1))
    order by id for update;
  if v_slot1 is not null then
    select * into sl1 from slots where id = v_slot1 and session_id = s1.id;
    if not found then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;
  end if;
  if v_slot2 is not null then
    select * into sl2 from slots where id = v_slot2 and session_id = s2.id;
    if not found then return jsonb_build_object('ok', false, 'code', 'invalid'); end if;
  end if;

  -- 5) 중복 신청 확인 (과정이 겹치는 확정/대기 신청)
  if exists (
    select 1 from applications a
    where a.branch_id = b.id and a.student_name = v_name and a.guardian_phone = v_phone
      and a.status in ('확정', '대기')
      and (a.course = v_course or a.course = '1·2차' or v_course = '1·2차')
  ) then
    return jsonb_build_object('ok', false, 'code', 'duplicate');
  end if;

  -- 6) 정원 확인
  if v_slot1 is not null then
    v_full1 := sl1.capacity is not null and (
      select count(*) from applications where status = '확정' and (slot1_id = v_slot1 or slot2_id = v_slot1)) >= sl1.capacity;
  end if;
  if v_slot2 is not null then
    v_full2 := sl2.capacity is not null and (
      select count(*) from applications where status = '확정' and (slot1_id = v_slot2 or slot2_id = v_slot2)) >= sl2.capacity;
  end if;

  -- 7) 저장. 금액은 서버에서 계산 (클라이언트 금액은 받지 않음)
  if v_course = '1·2차' and b.partial_full_mode = 'split' and (v_full1 <> v_full2) then
    -- 한쪽만 마감: 차수별로 나눠 저장
    v_status := case when v_full1 then '대기' else '확정' end;
    v_order := case when v_full1 then (select coalesce(max(waitlist_order), 0) + 1 from applications
                 where status = '대기' and (slot1_id = v_slot1 or slot2_id = v_slot1)) end;
    insert into applications (branch_id, student_name, grade, school, guardian_phone, enrollment_type, course,
        slot1_id, price, status, waitlist_order, agree_policy, agree_privacy, policy_version, agreed_at, memo, extra, idempotency_key)
      values (b.id, v_name, (p ->> 'grade')::int, btrim(p ->> 'school'), v_phone, p ->> 'enrollment_type', '1차',
        v_slot1, s1.price, v_status, v_order, true, true, coalesce(p ->> 'policy_version', ''), now(), nullif(p ->> 'memo', ''), coalesce(p -> 'extra', '{}'::jsonb), v_key)
      returning id into v_id;
    insert into application_logs (application_id, changed_by, from_status, to_status, note)
      values (v_id, 'system', null, v_status, '신청 접수');

    v_status := case when v_full2 then '대기' else '확정' end;
    v_order := case when v_full2 then (select coalesce(max(waitlist_order), 0) + 1 from applications
                 where status = '대기' and (slot1_id = v_slot2 or slot2_id = v_slot2)) end;
    insert into applications (branch_id, student_name, grade, school, guardian_phone, enrollment_type, course,
        slot2_id, price, status, waitlist_order, agree_policy, agree_privacy, policy_version, agreed_at, memo, extra, idempotency_key)
      values (b.id, v_name, (p ->> 'grade')::int, btrim(p ->> 'school'), v_phone, p ->> 'enrollment_type', '2차',
        v_slot2, s2.price, v_status, v_order, true, true, coalesce(p ->> 'policy_version', ''), now(), nullif(p ->> 'memo', ''), coalesce(p -> 'extra', '{}'::jsonb), v_key || '#2')
      returning id into v_id2;
    insert into application_logs (application_id, changed_by, from_status, to_status, note)
      values (v_id2, 'system', null, v_status, '신청 접수');
  else
    v_status := case when v_full1 or v_full2 then '대기' else '확정' end;
    if v_status = '대기' then
      select coalesce(max(waitlist_order), 0) + 1 into v_order from applications
        where status = '대기' and (
          (v_full1 and (slot1_id = v_slot1 or slot2_id = v_slot1)) or
          (v_full2 and (slot1_id = v_slot2 or slot2_id = v_slot2)));
    end if;
    insert into applications (branch_id, student_name, grade, school, guardian_phone, enrollment_type, course,
        slot1_id, slot2_id, price, status, waitlist_order, agree_policy, agree_privacy, policy_version, agreed_at, memo, extra, idempotency_key)
      values (b.id, v_name, (p ->> 'grade')::int, btrim(p ->> 'school'), v_phone, p ->> 'enrollment_type', v_course,
        v_slot1, v_slot2,
        case v_course when '1차' then s1.price when '2차' then s2.price else b.bundle_price end,
        v_status, v_order, true, true, coalesce(p ->> 'policy_version', ''), now(), nullif(p ->> 'memo', ''), coalesce(p -> 'extra', '{}'::jsonb), v_key)
      returning id into v_id;
    insert into application_logs (application_id, changed_by, from_status, to_status, note)
      values (v_id, 'system', null, v_status, '신청 접수');
  end if;

  return jsonb_build_object('ok', true, 'applications', (
    select jsonb_agg(jsonb_build_object('id', id, 'status', status) order by course)
    from applications where id in (v_id, v_id2)));

exception when unique_violation then
  -- 거의 동시에 같은 신청이 들어온 경우
  select jsonb_build_object('ok', true, 'duplicate_key', true, 'applications',
           jsonb_agg(jsonb_build_object('id', id, 'status', status)))
    into v_existing from applications where idempotency_key = v_key or idempotency_key = v_key || '#2';
  if v_existing -> 'applications' is not null and jsonb_typeof(v_existing -> 'applications') = 'array' then
    return v_existing;
  end if;
  return jsonb_build_object('ok', false, 'code', 'duplicate');
end $$;

-- 이 함수들은 서버(service_role)만 호출할 수 있다
revoke all on function submit_application(jsonb), public_branch_status(text) from public, anon, authenticated;
grant execute on function submit_application(jsonb), public_branch_status(text) to service_role;

-- ───────── 요청 횟수 제한 ─────────
create function check_rate(p_key text, p_window_sec int, p_max int) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from rate_events where created_at < now() - interval '1 day' and random() < 0.01;
  select count(*) into n from rate_events
    where key = p_key and created_at > now() - make_interval(secs => p_window_sec);
  if n >= p_max then return false; end if;
  insert into rate_events (key) values (p_key);
  return true;
end $$;

-- ───────── 학부모 신청 조회 (일치 여부만, 어느 항목이 틀렸는지 알려주지 않음) ─────────
create function check_application(p_slug text, p_name text, p_last4 text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'course', a.course,
    'slot1', (select label from slots where id = a.slot1_id),
    'slot2', (select label from slots where id = a.slot2_id),
    'status', case a.status when '환불' then '취소' else a.status end
  ) order by a.created_at), '[]'::jsonb)
  from applications a join branches b on b.id = a.branch_id
  where b.slug = p_slug and a.student_name = btrim(p_name)
    and right(a.guardian_phone, 4) = p_last4
$$;

-- ───────── 관리자 상태 변경 (7-5 규칙) ─────────
-- 반환 code: over_capacity(정원 초과 확인 필요) / after_deadline(환불 마감 후 확인 필요) / need_reason(사유 필요) / duplicate
create function change_application_status(p_id uuid, p_to text, p_by text, p_note text, p_force boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a applications; b branches; sl slots; v_order int; v_slot uuid;
begin
  if p_to not in ('확정', '대기', '취소', '환불') then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  select * into a from applications where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if a.status = p_to then return jsonb_build_object('ok', true, 'unchanged', true); end if;
  select * into b from branches where id = a.branch_id;

  if p_to = '확정' then
    perform 1 from slots where id in (coalesce(a.slot1_id, a.slot2_id), coalesce(a.slot2_id, a.slot1_id)) order by id for update;
    foreach v_slot in array array_remove(array[a.slot1_id, a.slot2_id], null) loop
      select * into sl from slots where id = v_slot;
      if sl.capacity is not null and (select count(*) from applications
           where status = '확정' and id <> a.id and (slot1_id = v_slot or slot2_id = v_slot)) >= sl.capacity
         and not p_force then
        return jsonb_build_object('ok', false, 'code', 'over_capacity');
      end if;
    end loop;
  end if;

  if p_to in ('취소', '환불') and a.status = '확정' and now() > b.refund_deadline then
    if btrim(coalesce(p_note, '')) = '' then return jsonb_build_object('ok', false, 'code', 'need_reason'); end if;
    if not p_force then return jsonb_build_object('ok', false, 'code', 'after_deadline'); end if;
  end if;

  if p_to = '대기' then
    select coalesce(max(waitlist_order), 0) + 1 into v_order from applications
      where status = '대기' and (slot1_id in (a.slot1_id, a.slot2_id) or slot2_id in (a.slot1_id, a.slot2_id));
  end if;

  update applications set status = p_to,
    waitlist_order = case when p_to = '대기' then v_order else null end
    where id = a.id;
  insert into application_logs (application_id, changed_by, from_status, to_status, note)
    values (a.id, p_by, a.status, p_to, nullif(btrim(coalesce(p_note, '')), ''));
  return jsonb_build_object('ok', true);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'code', 'duplicate');
end $$;

revoke all on function check_rate(text, int, int), check_application(text, text, text),
  change_application_status(uuid, text, text, text, boolean) from public, anon, authenticated;
grant execute on function check_rate(text, int, int), check_application(text, text, text),
  change_application_status(uuid, text, text, text, boolean) to service_role;
