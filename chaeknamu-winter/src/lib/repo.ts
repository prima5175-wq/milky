import "server-only";
import { query } from "./db";
import type { Branch, FormField } from "./types";

type RawBranch = Omit<Branch, "sessions"> & {
  sessions: (Omit<Branch["sessions"][number], "slots"> & {
    slots: (Omit<Branch["sessions"][number]["slots"][number], "start_time" | "end_time"> & { start_time: string; end_time: string })[];
  })[];
};

// DB의 public_branch_status 함수 결과를 화면용으로 다듬어요. (정원 숫자는 애초에 오지 않아요)
export async function getBranch(slug: string): Promise<Branch | null> {
  const rows = await query<{ r: RawBranch | null }>("select public_branch_status($1) r", [slug]);
  const j = rows[0]?.r;
  if (!j) return null;
  return {
    ...j,
    sessions: j.sessions.map((s) => ({
      ...s,
      slots: s.slots.map((t) => ({ ...t, start_time: t.start_time.slice(0, 5), end_time: t.end_time.slice(0, 5) })),
    })),
  };
}

export async function listBranches(): Promise<Branch[]> {
  const rows = await query<{ slug: string }>("select slug from branches where is_active order by sort_order");
  const all = await Promise.all(rows.map((r) => getBranch(r.slug)));
  return all.filter((b): b is Branch => !!b);
}

export async function getCurriculum() {
  return query<{ group: string; items: string[] }>("select grade_group as \"group\", items from curriculum order by sort_order");
}

export async function getSetting(key: string, fallback = "") {
  const rows = await query<{ value: string }>("select value from app_settings where key = $1", [key]);
  return rows[0]?.value ?? fallback;
}

export async function getFormFields(): Promise<FormField[]> {
  return query<FormField>(
    "select id, key, label, type, options, required, help from form_fields where is_active order by sort_order, key",
  );
}

export async function checkRate(key: string, windowSec: number, max: number) {
  const rows = await query<{ r: boolean }>("select check_rate($1, $2, $3) r", [key, windowSec, max]);
  return rows[0].r;
}

// 원장 영상(유튜브) 안내. 관리자 설정에 값이 없으면 기본 문구를 써요.
export async function getYoutube() {
  const rows = await query<{ key: string; value: string }>("select key, value from app_settings where key in ('youtube_url', 'youtube_title', 'youtube_desc')");
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    url: m.youtube_url ?? "https://tinyurl.com/3pfkxtjn",
    title: m.youtube_title || "원장님 영상 보기",
    desc: m.youtube_desc || "방학 독서에 대한 생각을 영상으로도 나눴어요.",
  };
}
