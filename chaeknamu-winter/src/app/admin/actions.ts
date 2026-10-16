"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { query } from "@/lib/db";
import { clearSession, devLoginEnabled, getAdmin, hasSupabase, isAllowedEmail, requireAdmin, setDevSession, supabaseServer } from "@/lib/auth";
import { checkRate } from "@/lib/repo";
import { triggerSheetSync } from "@/lib/sheet-trigger";
import { rebuildAll, syncUnsynced } from "@/lib/sheets";

export type LoginState = { message: string } | null;

// 허용 목록에 있는 이메일에만 로그인 링크를 보내요. 목록에 없어도 같은 안내를 보여줘서 목록을 추측할 수 없게 해요.
export async function requestLogin(_: LoginState, fd: FormData): Promise<LoginState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { message: "이메일 주소를 확인해 주세요." };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (!(await checkRate(`login:${ip}`, 600, 10))) return { message: "잠시 후 다시 시도해 주세요." };
  const allowed = await isAllowedEmail(email);
  if (devLoginEnabled()) {
    if (!allowed) return { message: "허용된 이메일이 아니에요." };
    await setDevSession(email);
    redirect("/admin");
  }
  if (allowed && hasSupabase()) {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await (await supabaseServer()).auth.signInWithOtp({ email, options: { emailRedirectTo: `${site}/admin/callback`, shouldCreateUser: true } });
  }
  return { message: "허용된 이메일이라면 로그인 링크를 보냈어요. 메일함을 확인해 주세요." };
}

export async function logout() {
  await clearSession();
  redirect("/admin/login");
}

const back = (id: string, q: string) => redirect(`/admin/applications/${id}?${q}`);

// 상태 변경. 경고가 필요한 경우(정원 초과, 환불 마감 후)는 확인 화면으로 돌려보내요.
export async function changeStatus(fd: FormData) {
  const admin = await requireAdmin(["owner", "branch_admin"]);
  const id = String(fd.get("id"));
  const to = String(fd.get("to"));
  const note = String(fd.get("note") ?? "").trim();
  const force = fd.get("force") === "1";
  const own = await query<{ branch_id: string }>("select branch_id from applications where id = $1", [id]);
  if (!own[0] || (admin.role !== "owner" && own[0].branch_id !== admin.branch_id)) redirect("/admin");
  const r = (await query<{ r: { ok: boolean; code?: string } }>("select change_application_status($1, $2, $3, $4, $5) r", [id, to, admin.email, note, force]))[0].r;
  if (r.ok) { triggerSheetSync(); back(id, "msg=" + encodeURIComponent("상태를 바꿨어요.")); }
  back(id, `warn=${r.code}&to=${encodeURIComponent(to)}&note=${encodeURIComponent(note)}`);
}

export async function saveNote(fd: FormData) {
  const admin = await requireAdmin(["owner", "branch_admin"]);
  const id = String(fd.get("id"));
  const own = await query<{ branch_id: string }>("select branch_id from applications where id = $1", [id]);
  if (!own[0] || (admin.role !== "owner" && own[0].branch_id !== admin.branch_id)) redirect("/admin");
  await query("update applications set admin_note = $2, pass_note = nullif($3, ''), pass_end_date = nullif($4, '')::date, sheet_synced_at = null where id = $1", [id, String(fd.get("admin_note") ?? ""), String(fd.get("pass_note") ?? "").trim(), String(fd.get("pass_end_date") ?? "")]);
  triggerSheetSync();
  back(id, "msg=" + encodeURIComponent("저장했어요."));
}

const toNum = (v: FormDataEntryValue | null) => (v === null || String(v).trim() === "" ? null : Number(v));
const kst = (v: FormDataEntryValue | null) => (v && String(v) ? String(v) : null);

export async function saveBranch(fd: FormData) {
  await requireAdmin(["owner"]);
  const id = String(fd.get("id"));
  await query(
    `update branches set
       open_at = ($2::text)::timestamp at time zone 'Asia/Seoul',
       close_at = ($3::text)::timestamp at time zone 'Asia/Seoul',
       refund_deadline = ($4::text)::timestamp at time zone 'Asia/Seoul',
       bundle_price = $5, contact_url = nullif($6, ''), notice = nullif($7, ''), makeup_limit = $8, partial_full_mode = $9,
       makeup_start_date = nullif($10, '')::date,
       priority_end_at = ($11::text)::timestamp at time zone 'Asia/Seoul',
       general_open_at = ($12::text)::timestamp at time zone 'Asia/Seoul',
       final_deadline_at = ($13::text)::timestamp at time zone 'Asia/Seoul'
     where id = $1`,
    [id, kst(fd.get("open_at")), kst(fd.get("close_at")), kst(fd.get("refund_deadline")), Number(fd.get("bundle_price")),
     String(fd.get("contact_url") ?? "").trim(), String(fd.get("notice") ?? "").trim(), Number(fd.get("makeup_limit")), String(fd.get("partial_full_mode")), String(fd.get("makeup_start_date") ?? ""), kst(fd.get("priority_end_at")), kst(fd.get("general_open_at")), kst(fd.get("final_deadline_at"))],
  );
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("cap_")) await query("update slots set capacity = $2 where id = $1", [k.slice(4), toNum(v)]);
    if (k.startsWith("price_")) await query("update sessions set price = $2 where id = $1", [k.slice(6), Number(v)]);
    if (k.startsWith("lessons_")) await query("update sessions set lesson_count = $2 where id = $1", [k.slice(8), Number(v)]);
  }
  redirect("/admin/settings?msg=" + encodeURIComponent("저장했어요."));
}

export async function saveCurriculum(fd: FormData) {
  await requireAdmin(["owner"]);
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("items_")) continue;
    const id = k.slice(6);
    const items = String(v).split("\n").map((s) => s.trim()).filter(Boolean);
    await query("update curriculum set items = $2, grade_group = $3 where id = $1", [id, items, String(fd.get("group_" + id))]);
  }
  await query("insert into app_settings (key, value) values ('curriculum_note', $1) on conflict (key) do update set value = excluded.value", [String(fd.get("curriculum_note") ?? "")]);
  const ng = String(fd.get("new_group") ?? "").trim();
  if (ng) await query("insert into curriculum (grade_group, items, sort_order) values ($1, $2, 99)", [ng, String(fd.get("new_items") ?? "").split("\n").map((s) => s.trim()).filter(Boolean)]);
  redirect("/admin/settings?msg=" + encodeURIComponent("수업 내용을 저장했어요.") + "#curriculum");
}

export async function deleteCurriculum(id: string) {
  await requireAdmin(["owner"]);
  await query("delete from curriculum where id = $1", [id]);
  redirect("/admin/settings#curriculum");
}

export async function saveField(fd: FormData) {
  await requireAdmin(["owner"]);
  const id = String(fd.get("id") ?? "");
  const options = String(fd.get("options") ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
  const vals = [String(fd.get("label")).trim(), String(fd.get("type")), options, fd.get("required") === "on", String(fd.get("help") ?? "").trim() || null, Number(fd.get("sort_order") ?? 0), fd.get("is_active") === "on"];
  if (!vals[0]) redirect("/admin/settings#fields");
  if (id) {
    await query("update form_fields set label=$2, type=$3, options=$4, required=$5, help=$6, sort_order=$7, is_active=$8 where id=$1", [id, ...vals]);
  } else {
    const key = "f_" + Math.random().toString(36).slice(2, 10);
    await query("insert into form_fields (key, label, type, options, required, help, sort_order, is_active) values ($1,$2,$3,$4,$5,$6,$7,$8)", [key, ...vals]);
  }
  redirect("/admin/settings?msg=" + encodeURIComponent("칸을 저장했어요.") + "#fields");
}

export async function deleteField(fd: FormData) {
  await requireAdmin(["owner"]);
  await query("delete from form_fields where id = $1", [String(fd.get("id"))]);
  redirect("/admin/settings?msg=" + encodeURIComponent("칸을 지웠어요. (이미 받은 답변은 신청 기록에 남아 있어요)") + "#fields");
}

export async function whoami() {
  return getAdmin();
}

// 지난 방학 이력 붙여 넣기: 한 줄에 `이름,연락처,시즌,결과(수강/취소),메모(선택)` (쉼표 또는 탭)
export async function importHistory(fd: FormData) {
  await requireAdmin(["owner"]);
  let ok = 0;
  const bad: string[] = [];
  for (const line of String(fd.get("text") ?? "").split("\n")) {
    if (!line.trim()) continue;
    const [name, phone, term, outcome, note] = line.split(/[,\t]/).map((x) => x.trim());
    const digits = (phone ?? "").replace(/\D/g, "");
    if (!name || !/^010\d{8}$/.test(digits) || !term || !["수강", "취소"].includes(outcome)) { bad.push(line.trim()); continue; }
    await query("insert into past_records (student_name, guardian_phone, term, outcome, note) values ($1,$2,$3,$4,$5)", [name, digits, term, outcome, note || null]);
    ok++;
  }
  const msg = `${ok}건을 등록했어요.` + (bad.length ? ` 형식이 맞지 않아 건너뛴 줄 ${bad.length}개: ${bad.slice(0, 3).join(" / ")}` : "");
  redirect("/admin/history?msg=" + encodeURIComponent(msg));
}

export async function deleteHistoryTerm(fd: FormData) {
  await requireAdmin(["owner"]);
  await query("delete from past_records where term = $1", [String(fd.get("term"))]);
  redirect("/admin/history?msg=" + encodeURIComponent("지웠어요."));
}

export async function sheetRebuild() {
  await requireAdmin(["owner"]);
  const r = await rebuildAll();
  redirect("/admin/settings?msg=" + encodeURIComponent(r.message) + "#sheet");
}

export async function sheetSyncNow() {
  await requireAdmin(["owner"]);
  const r = await syncUnsynced();
  redirect("/admin/settings?msg=" + encodeURIComponent(r.message) + "#sheet");
}

const safeBack = (v: FormDataEntryValue | null, fallback: string) => {
  const t = String(v ?? "");
  return t.startsWith("/admin/") ? t : fallback;
};

// 입금·결제 확인 처리 (결제 완료자만 확정 문자를 보내요)
export async function setPayment(fd: FormData) {
  const admin = await requireAdmin(["owner", "branch_admin"]);
  const id = String(fd.get("id"));
  const paid = fd.get("paid") === "1";
  const own = await query<{ branch_id: string; status: string }>("select branch_id, status from applications where id = $1", [id]);
  if (!own[0] || (admin.role !== "owner" && own[0].branch_id !== admin.branch_id)) redirect("/admin");
  await query(
    `update applications set payment_status = $2, paid_at = case when $2 = '결제완료' then now() end, paid_by = case when $2 = '결제완료' then $3 end,
       confirm_sms_sent_at = case when $2 = '결제완료' then confirm_sms_sent_at end, sheet_synced_at = null where id = $1`,
    [id, paid ? "결제완료" : "미결제", admin.email]);
  await query("insert into application_logs (application_id, changed_by, from_status, to_status, note) values ($1, $2, $3, $3, $4)",
    [id, admin.email, own[0].status, paid ? "결제 완료 처리" : "결제 완료 취소"]);
  triggerSheetSync();
  redirect(safeBack(fd.get("back"), "/admin/payments"));
}

// 확정 문자를 보낸 뒤 '발송 완료'로 표시 (문자는 이 앱이 보내지 않아요)
export async function markSmsSent(fd: FormData) {
  const admin = await requireAdmin(["owner", "branch_admin"]);
  const ids = String(fd.get("ids") ?? fd.get("id") ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/.test(x));
  if (ids.length) {
    await query(
      `update applications set confirm_sms_sent_at = now(), sheet_synced_at = null where id = any($1::uuid[]) and payment_status = '결제완료'
         and ($2::uuid is null or branch_id = $2)`,
      [ids, admin.role === "owner" ? null : admin.branch_id]);
    triggerSheetSync();
  }
  redirect(safeBack(fd.get("back"), "/admin/payments") + (ids.length > 1 ? `?msg=${encodeURIComponent(ids.length + "명을 발송 완료로 표시했어요.")}` : ""));
}

export async function saveTexts(fd: FormData) {
  await requireAdmin(["owner"]);
  for (const key of ["confirm_notice", "payment_info"]) {
    await query("insert into app_settings (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value", [key, String(fd.get(key) ?? "").trim()]);
  }
  redirect("/admin/settings?msg=" + encodeURIComponent("안내 문구를 저장했어요.") + "#texts");
}

// 재원생 명단: 한 줄에 `이름, 연락처`
export async function importRegular(fd: FormData) {
  await requireAdmin(["owner"]);
  let ok = 0;
  const bad: string[] = [];
  for (const line of String(fd.get("text") ?? "").split("\n")) {
    if (!line.trim()) continue;
    const [name, phone] = line.split(/[,\t]/).map((x) => x.trim());
    const digits = (phone ?? "").replace(/\D/g, "");
    if (!name || !/^010\d{8}$/.test(digits)) { bad.push(line.trim()); continue; }
    await query("insert into regular_students (student_name, guardian_phone) values ($1, $2)", [name, digits]);
    ok++;
  }
  redirect("/admin/history?msg=" + encodeURIComponent(`재원생 ${ok}명을 등록했어요.` + (bad.length ? ` 형식이 맞지 않아 건너뛴 줄 ${bad.length}개` : "")) + "#regular");
}

export async function clearRegular() {
  await requireAdmin(["owner"]);
  await query("delete from regular_students");
  redirect("/admin/history?msg=" + encodeURIComponent("재원생 명단을 지웠어요.") + "#regular");
}
