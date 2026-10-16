import "server-only";
import crypto from "crypto";
import { query } from "./db";

// 구글시트 '보기용 복사본'. 진짜 기록은 항상 DB에 있고, 시트 쓰기가 실패해도 신청은 정상 접수돼요.
// 저장된 뒤에 따로 보내고, 실패하면 sheet_synced_at 이 비어 있는 건을 나중에 다시 보내요.

const email = () => process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const sheetId = () => process.env.GOOGLE_SHEET_ID ?? "";
const privateKey = () => (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
const BASE = () => process.env.GOOGLE_SHEETS_BASE ?? "https://sheets.googleapis.com";
const TOKEN_URL = () => process.env.GOOGLE_TOKEN_URL ?? "https://oauth2.googleapis.com/token";
export const sheetsConfigured = () => !!(email() && sheetId() && privateKey());

const BRANCH_TAB: Record<string, string> = { daechi: "대치점", dogok: "도곡초점", guryong: "구룡초점" };
const ALL_TAB = "전체";
const NOTE = "이 시트는 보기용이에요. 시트에서 고친 내용은 앱에 반영되지 않아요. 수정은 관리자 화면에서 해 주세요.";
const BASE_HEAD = ["신청일시(KST)", "지점", "학생 이름", "학년", "학교", "보호자 연락처", "재원 구분", "신청 과정", "1차 타임", "2차 타임", "수강료", "상태", "대기 순번", "요청사항", "관리자 메모", "신청 ID", "기존 수강권", "수강 종료일", "지난 방학 이력", "결제 상태", "확정문자 발송", "재원생 확인"];
const ID_COL = "P"; // 신청 ID 열

let token: { v: string; exp: number } | null = null;
async function accessToken() {
  if (token && token.exp > Date.now() + 60_000) return token.v;
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: email(), scope: "https://www.googleapis.com/auth/spreadsheets", aud: TOKEN_URL(), iat: now, exp: now + 3600 })}`;
  const sig = crypto.createSign("RSA-SHA256").update(unsigned).sign(privateKey()).toString("base64url");
  const res = await fetch(TOKEN_URL(), { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }) });
  if (!res.ok) throw new Error(`구글 로그인 실패 (${res.status})`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  token = { v: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return token.v;
}

async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${BASE()}/v4/spreadsheets/${sheetId()}${path}`, {
    method, headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`구글시트 오류 ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}
const rng = (tab: string, a1: string) => encodeURIComponent(`'${tab}'!${a1}`);

type Row = { id: string; branch_slug: string; cells: (string | number)[] };

async function loadRows(onlyUnsynced: boolean, limit = 300): Promise<{ rows: Row[]; extraHead: string[] }> {
  const fields = await query<{ key: string; label: string }>("select key, label from form_fields order by sort_order, key");
  const data = await query<Record<string, unknown>>(
    `select a.id, b.slug branch_slug, to_char(a.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') at, b.name branch_name, a.student_name, a.grade, a.school, a.guardian_phone,
       a.enrollment_type, a.course, s1.label slot1, s2.label slot2, a.price, a.status, a.waitlist_order, a.memo, a.admin_note, a.pass_note, to_char(a.pass_end_date, 'YYYY-MM-DD') pass_end, a.extra, a.payment_status, (a.confirm_sms_sent_at is not null) sms, a.enroll_verified,
       (select string_agg(p.term || ' ' || p.outcome, ', ') from past_records p where p.guardian_phone = a.guardian_phone and p.student_name = a.student_name) history
     from applications a join branches b on b.id = a.branch_id left join slots s1 on s1.id = a.slot1_id left join slots s2 on s2.id = a.slot2_id
     ${onlyUnsynced ? "where a.sheet_synced_at is null" : ""} order by a.created_at ${onlyUnsynced ? "limit " + limit : ""}`);
  const rows = data.map((r) => {
    const p = String(r.guardian_phone);
    const extra = (r.extra ?? {}) as Record<string, string | boolean>;
    return {
      id: String(r.id), branch_slug: String(r.branch_slug),
      cells: [r.at, r.branch_name, r.student_name, r.grade, r.school, `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`, r.enrollment_type, r.course, r.slot1 ?? "", r.slot2 ?? "", r.price, r.status, r.waitlist_order ?? "", r.memo ?? "", r.admin_note ?? "", r.id, r.pass_note ?? "", r.pass_end ?? "", r.history ?? "", r.payment_status, r.sms ? "발송" : "", r.enroll_verified === null ? "" : r.enroll_verified ? "일치" : "불일치",
        ...fields.map((f) => (extra[f.key] === true ? "예" : extra[f.key] ?? ""))] as (string | number)[],
    };
  });
  return { rows, extraHead: fields.map((f) => f.label) };
}

async function ensureTabs(titles: string[]) {
  const meta = (await api("?fields=sheets.properties.title")) as { sheets?: { properties: { title: string } }[] };
  const have = new Set((meta.sheets ?? []).map((s) => s.properties.title));
  const missing = titles.filter((t) => !have.has(t));
  if (missing.length) await api(":batchUpdate", "POST", { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) });
}

const tabsFor = (slugs: string[]) => [...new Set([...slugs.map((s) => BRANCH_TAB[s]).filter(Boolean), ALL_TAB])];
const tabOf = (slug: string) => [BRANCH_TAB[slug], ALL_TAB].filter(Boolean);

async function writeHeader(tab: string, extraHead: string[]) {
  await api(`/values/${rng(tab, "A1")}?valueInputOption=RAW`, "PUT", { values: [[NOTE], [...BASE_HEAD, ...extraHead]] });
}

async function setError(msg: string) {
  await query("insert into app_settings (key, value) values ('sheet_last_error', $1) on conflict (key) do update set value = excluded.value", [msg]);
}

// 전체 다시 맞추기: 모든 탭을 지우고 DB 내용으로 다시 써요.
export async function rebuildAll(): Promise<{ ok: boolean; message: string }> {
  if (!sheetsConfigured()) return { ok: false, message: "구글시트가 아직 연결되지 않았어요." };
  try {
    const { rows, extraHead } = await loadRows(false);
    const tabs = [...Object.values(BRANCH_TAB), ALL_TAB];
    await ensureTabs(tabs);
    for (const tab of tabs) {
      const mine = rows.filter((r) => tab === ALL_TAB || BRANCH_TAB[r.branch_slug] === tab);
      await api(`/values/${rng(tab, "A:AZ")}:clear`, "POST", {});
      await api(`/values/${rng(tab, "A1")}?valueInputOption=RAW`, "PUT", { values: [[NOTE], [...BASE_HEAD, ...extraHead], ...mine.map((r) => r.cells)] });
    }
    await query("update applications set sheet_synced_at = now() where id = any($1::uuid[])", [rows.map((r) => r.id)]);
    await setError("");
    return { ok: true, message: `${rows.length}건을 시트에 다시 맞췄어요.` };
  } catch (e) {
    const m = e instanceof Error ? e.message : "알 수 없는 오류";
    await setError(m);
    return { ok: false, message: m };
  }
}

// 밀린 건만 보내기. 새 신청은 아래에 붙이고, 상태가 바뀐 건은 그 줄을 고쳐요.
export async function syncUnsynced(): Promise<{ ok: boolean; message: string; sent: number }> {
  if (!sheetsConfigured()) return { ok: false, message: "구글시트가 아직 연결되지 않았어요.", sent: 0 };
  // 동시에 여러 번 쓰지 않도록 60초짜리 잠금을 잡아요 (못 잡으면 다른 곳에서 이미 보내는 중)
  const got = await query("update app_settings set value = $1 where key = 'sheet_lock' and value::timestamptz < now() returning key", [new Date(Date.now() + 60_000).toISOString()]);
  if (got.length === 0) return { ok: true, message: "다른 곳에서 보내는 중이에요.", sent: 0 };
  let sent = 0;
  try {
    for (let round = 0; round < 6; round++) {
      const { rows, extraHead } = await loadRows(true);
      if (rows.length === 0) break;
      await ensureTabs(tabsFor(rows.map((r) => r.branch_slug)));
      for (const tab of tabsFor(rows.map((r) => r.branch_slug))) {
        await writeHeader(tab, extraHead);
        const mine = rows.filter((r) => tabOf(r.branch_slug).includes(tab));
        const idRes = (await api(`/values/${rng(tab, `${ID_COL}3:${ID_COL}`)}`)) as { values?: string[][] };
        const pos = new Map((idRes.values ?? []).map((v, i) => [v[0], i + 3]));
        const updates = mine.filter((r) => pos.has(r.id));
        const appends = mine.filter((r) => !pos.has(r.id));
        if (updates.length) {
          await api("/values:batchUpdate", "POST", { valueInputOption: "RAW", data: updates.map((r) => ({ range: `'${tab}'!A${pos.get(r.id)}`, values: [r.cells] })) });
        }
        if (appends.length) {
          await api(`/values/${rng(tab, "A3")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, "POST", { values: appends.map((r) => r.cells) });
        }
      }
      await query("update applications set sheet_synced_at = now() where id = any($1::uuid[]) and sheet_synced_at is null", [rows.map((r) => r.id)]);
      sent += rows.length;
    }
    await setError("");
    return { ok: true, message: `${sent}건을 시트에 보냈어요.`, sent };
  } catch (e) {
    const m = e instanceof Error ? e.message : "알 수 없는 오류";
    await setError(m);
    return { ok: false, message: m, sent };
  } finally {
    await query("update app_settings set value = '2000-01-01T00:00:00Z' where key = 'sheet_lock'");
  }
}

export async function sheetStatus() {
  const [s] = await query<{ pending: number; last: string | null }>(
    "select count(*) filter (where sheet_synced_at is null)::int pending, to_char(max(sheet_synced_at) at time zone 'Asia/Seoul', 'MM/DD HH24:MI:SS') last from applications");
  const err = await query<{ value: string }>("select value from app_settings where key = 'sheet_last_error'");
  return { configured: sheetsConfigured(), pending: s.pending, last: s.last, error: err[0]?.value ?? "", url: sheetsConfigured() ? `https://docs.google.com/spreadsheets/d/${sheetId()}` : "" };
}
