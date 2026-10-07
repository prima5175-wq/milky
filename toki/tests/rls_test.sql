-- 권한 테스트: 치료사는 배정된 아동만, 감수 전 시나리오는 비노출
\set ON_ERROR_STOP on
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b'),
 ('00000000-0000-0000-0000-0000000000c1'),('00000000-0000-0000-0000-0000000000c2'),
 ('00000000-0000-0000-0000-0000000000ad');
insert into profiles(id,role,display_name) values
 ('00000000-0000-0000-0000-00000000000a','therapist','치료사A'),
 ('00000000-0000-0000-0000-00000000000b','therapist','치료사B'),
 ('00000000-0000-0000-0000-0000000000c1','guardian','보호자1'),
 ('00000000-0000-0000-0000-0000000000c2','guardian','보호자2'),
 ('00000000-0000-0000-0000-0000000000ad','admin','관리자');
insert into children(id,guardian_id,nickname,age_band) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1','토토','7-9'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000c2','모모','5-6');
insert into therapist_assignments(therapist_id,child_id) values
 ('00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000001');
insert into scenarios(id,setting,age_band,domains,target_level,content,review_status) values
 ('s-draft','급식실','7-9','{담화 관리}',2,'{}','draft'),
 ('s-ok','급식실','7-9','{담화 관리}',2,'{}','approved');
insert into assessment_catalog(id,name_ko,category,administration,review_status) values
 ('20000000-0000-0000-0000-000000000001','테스트검사','언어','clinician','approved');

grant usage on schema public, auth to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
set role authenticated;

create or replace function pg_temp.n(sql text) returns bigint language plpgsql as
$$ declare c bigint; begin execute sql into c; return c; end $$;

do $$
declare c bigint;
begin
  set local app.uid = '00000000-0000-0000-0000-00000000000a';       -- 치료사A
  assert (select count(*) from children) = 1, '치료사A 는 배정된 아동 1명만 보여야 함';
  assert (select count(*) from scenarios) = 1, '관리자 아니면 승인 시나리오만';
  insert into assessment_records(child_id,catalog_id,administered_on,examiner_id)
    values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date,auth.uid());

  set local app.uid = '00000000-0000-0000-0000-00000000000b';       -- 치료사B (배정 없음)
  assert (select count(*) from children) = 0, '치료사B 는 아동이 보이면 안 됨';
  assert (select count(*) from assessment_records) = 0, '치료사B 는 검사 기록이 보이면 안 됨';
  begin
    insert into assessment_records(child_id,catalog_id,administered_on,examiner_id)
      values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date,auth.uid());
    raise exception '치료사B 가 남의 아동 기록을 입력함';
  exception when insufficient_privilege then null; end;

  set local app.uid = '00000000-0000-0000-0000-0000000000c1';       -- 보호자1
  assert (select count(*) from children) = 1, '보호자1 은 자기 자녀만';
  assert (select count(*) from assessment_records) = 1, '보호자1 은 자녀 검사 기록 열람 가능';

  set local app.uid = '00000000-0000-0000-0000-0000000000c2';       -- 보호자2
  assert (select count(*) from assessment_records) = 0, '보호자2 는 타 아동 기록 불가';

  set local app.uid = '00000000-0000-0000-0000-0000000000ad';       -- 관리자
  assert (select count(*) from scenarios) = 2, '관리자는 초안 포함 전체 시나리오';
  raise notice 'RLS 테스트 통과';
end $$;
