-- 내 컴퓨터 임시 DB 전용 데모 데이터 (실제 Supabase에는 쓰지 않아요)
update branches set priority_end_at = null, general_open_at = null, close_at = null, final_deadline_at = null; -- 연습용: 단계 일정은 비워 둠
update branches set open_at = now() - interval '1 day' where slug in ('daechi', 'dogok');
update branches set open_at = now() + interval '3 days' where slug = 'guryong';
insert into admin_users (email, role, branch_id, display_name) values
 ('owner@example.com', 'owner', null, '원장'),
 ('daechi@example.com', 'branch_admin', (select id from branches where slug = 'daechi'), '대치점 관리자'),
 ('teacher@example.com', 'teacher', (select id from branches where slug = 'daechi'), '김선생'),
 ('teacher2@example.com', 'teacher', (select id from branches where slug = 'daechi'), '이선생');
update slots set capacity = 3 where session_id = (select s.id from sessions s join branches b on b.id = s.branch_id where b.slug = 'daechi' and s.code = '1차') and label = '1부';

-- ───────── 체험용 학생 예시 (대치점) ─────────
-- 대치점 1차 1부 정원이 3명이라, 4번째부터 대기로 들어가요.
do $$
declare r record; v1 uuid; v2 uuid;
begin
  for r in select * from (values
    ('박하준', 5, '01022223333', '1·2차', '1부', '1부', '정규 재원생'),
    ('박하린', 1, '01022223333', '1차',   '1부', null,  '정규 재원생'),
    ('이도윤', 1, '01044445555', '1차',   '1부', null,  '휴원생'),
    ('한지우', 3, '01012341234', '1차',   '1부', null,  '신규'),
    ('오서윤', 2, '01056785678', '1차',   '1부', null,  '신규'),
    ('김서연', 3, '01011112222', '1·2차', '2부', '2부', '정규 재원생'),
    ('김서준', 6, '01011112222', '1·2차', '2부', '2부', '정규 재원생'),
    ('정하은', 2, '01088889999', '1·2차', '3부', '3부', '신규'),
    ('최민지', 4, '01066667777', '2차',   null,  '3부', '타 지점 수강생'),
    ('유하늘', 6, '01099990000', '1차',   '2부', null,  '정규 재원생')
  ) as t(name, grade, phone, course, l1, l2, enr) loop
    select sl.id into v1 from slots sl join sessions s on s.id = sl.session_id join branches b on b.id = s.branch_id
      where b.slug = 'daechi' and s.code = '1차' and sl.label = r.l1;
    select sl.id into v2 from slots sl join sessions s on s.id = sl.session_id join branches b on b.id = s.branch_id
      where b.slug = 'daechi' and s.code = '2차' and sl.label = r.l2;
    perform submit_application(jsonb_build_object('branch_slug', 'daechi', 'course', r.course, 'slot1_id', v1, 'slot2_id', v2,
      'student_name', r.name, 'grade', r.grade, 'school', '대치초', 'guardian_phone', r.phone, 'enrollment_type', r.enr,
      'agree_policy', true, 'agree_privacy', true, 'policy_version', '2027W-v2', 'idempotency_key', 'demo-seed-' || r.name));
  end loop;
end $$;

-- 결제·확정 문자·수강권·지난 방학 이력·보강·출석·수업 기록 예시
update applications set payment_status = '결제완료', paid_at = now(), paid_by = 'owner@example.com' where student_name in ('박하준', '박하린', '김서연', '김서준', '유하늘');
update applications set confirm_sms_sent_at = now() where student_name in ('김서연', '김서준');
update applications set pass_note = '정규 12회권 (휴원 중)', pass_end_date = '2026-12-31' where student_name = '이도윤';
insert into past_records (student_name, guardian_phone, term, outcome, note) values
  ('이도윤', '01044445555', '2026 여름', '취소', '개인 사정'),
  ('박하준', '01022223333', '2026 여름', '수강', null),
  ('정하은', '01088889999', '2026 여름', '수강', null);
select add_makeup((select id from applications where student_name = '김서연'), date '2027-01-05', '3부 12:30', 'owner@example.com', '확정');
select add_makeup((select id from applications where student_name = '한지우'), date '2027-01-06', '1부 09:00', 'parent', '요청') where false;
insert into attendance (application_id, lesson_date, slot_id, status, checked_by)
  select a.id, date '2027-01-12', a.slot1_id, case a.student_name when '박하준' then '출석' when '박하린' then '지각' else '결석' end, 'teacher@example.com'
  from applications a where a.student_name in ('박하준', '박하린', '이도윤');
with lr as (
  insert into lesson_records (application_id, lesson_date, activity, comment, worksheet_count, taught_by, recorded_by)
  select a.id, date '2027-01-12', '시사독해, 일기쓰기', '집중을 잘했어요.', 3, 'teacher@example.com', 'teacher@example.com'
  from applications a where a.student_name = '박하린' returning id)
insert into lesson_books (record_id, title, volumes) select id, '마당을 나온 암탉', 1 from lr;
