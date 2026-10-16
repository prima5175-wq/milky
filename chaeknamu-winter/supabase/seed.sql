-- 시드 데이터 (지시서 5장). 정원은 임시로 모두 10 → 관리자 설정에서 변경.
-- 신청 오픈 시각(open_at)은 [미정]이라 비워 둠 → 관리자가 지점별로 입력해야 신청이 열린다.

insert into branches (slug, name, sort_order, refund_deadline, contact_url, notice, bundle_price) values
 ('daechi',  '1관 대치점(한티역)',   1, '2026-12-27 23:59:00+09', 'https://tinyurl.com/3pfkxtjn',
  '방학 중 정규수업은 평일 14:00~19:00로 운영해요. (학기 중 21:00까지)', 850000),
 ('dogok',   '2관 대치도곡초점',     2, '2026-12-27 23:59:00+09', null,
  '방학 동안 특강·정규 구분 없이 5타임으로 운영해요. 정규 수강생도 이 앱에서 타임을 신청해 주세요.', 850000),
 ('guryong', '3관 대치구룡초점',     3, '2026-12-20 23:59:00+09', null,
  null, 980000);  -- 구룡 환불 마감 12/20은 [확인 필요], 오후 타임 [미정]

insert into sessions (branch_id, code, start_date, end_date, lesson_count, price)
select b.id, v.code, v.s::date, v.e::date, v.n, v.price
from branches b join (values
 ('daechi',  '1차', '2027-01-11', '2027-02-05', 20, 520000),
 ('daechi',  '2차', '2027-02-10', '2027-02-26', 13, 330000),
 ('dogok',   '1차', '2027-01-11', '2027-02-05', 20, 520000),
 ('dogok',   '2차', '2027-02-10', '2027-02-26', 13, 330000),
 ('guryong', '1차', '2027-01-04', '2027-01-29', 20, 520000),
 ('guryong', '2차', '2027-02-01', '2027-02-26', 18, 460000)
) as v(slug, code, s, e, n, price) on v.slug = b.slug;

-- 타임: 모든 지점 1~3부, 도곡만 4·5부
insert into slots (session_id, label, start_time, end_time, capacity, sort_order)
select s.id, t.label, t.st::time, t.et::time, 10, t.ord
from sessions s join branches b on b.id = s.branch_id
join (values
 ('1부', '09:00', '10:30', 1), ('2부', '10:30', '12:00', 2), ('3부', '12:30', '14:00', 3),
 ('4부', '14:00', '15:30', 4), ('5부', '15:30', '17:00', 5)
) as t(label, st, et, ord) on (t.ord <= 3 or b.slug = 'dogok');

insert into curriculum (grade_group, items, sort_order) values
 ('1~2학년', array['시사독해 · 일기쓰기와 활동지', '긴 글쓰기', '다양한 영역 독서와 북토킹'], 1),
 ('3~4학년', array['시사독해', '한국사 진도', '긴 글쓰기 단계별 훈련과 원고지쓰기', '다양한 영역 독서와 북토킹'], 2),
 ('5~6학년', array['생기부 필독서 읽고 서평쓰기', '한국사·세계사 심화', '문학 작품 발문지'], 3);

insert into app_settings (key, value) values
 ('curriculum_note', '모든 수업은 개인 진도와 상담에 따라 개별 시간표로 진행돼요.'),
 ('closed_days', '2027-02-06~2027-02-09 설 연휴 휴원 (월~금만 진행, 주말 수업 없음)');

-- 관리자 등록 예시 (이메일 확정 후 실행):
-- insert into admin_users (email, role) values ('원장@이메일', 'owner');
