import "server-only";
import { query } from "./db";

type Match = { id: string; course: string; slot1: string | null; slot2: string | null; status: string; payment_status: string };

// 이름 + 연락처 뒷 4자리가 모두 맞는 신청만 찾아요. 틀려도 어느 항목이 틀렸는지는 알려주지 않아요.
export async function findApplications(branch: string, name: string, last4: string) {
  return query<Match>(
    `select a.id, a.course, s1.label slot1, s2.label slot2, case a.status when '환불' then '취소' else a.status end status, a.payment_status
     from applications a join branches b on b.id = a.branch_id
       left join slots s1 on s1.id = a.slot1_id left join slots s2 on s2.id = a.slot2_id
     where b.slug = $1 and a.student_name = btrim($2) and right(a.guardian_phone, 4) = $3 order by a.created_at`,
    [branch, name, last4]);
}

