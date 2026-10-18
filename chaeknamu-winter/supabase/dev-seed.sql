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
