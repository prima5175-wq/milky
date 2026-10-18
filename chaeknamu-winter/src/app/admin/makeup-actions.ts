"use server";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addMakeup } from "@/lib/makeups";

const go = (msg: string, week?: string) => redirect(`/admin/makeups?${week ? `week=${week}&` : ""}msg=${encodeURIComponent(msg)}`);

// 문자로 받은 보강 요청을 관리자가 직접 등록 (바로 확정)
export async function registerMakeup(fd: FormData) {
  const admin = await requireAdmin(["owner", "branch_admin"]);
  const appId = String(fd.get("app_id"));
  const date = String(fd.get("date"));
  const own = await query<{ branch_id: string }>("select branch_id from applications where id = $1", [appId]);
  if (!own[0] || (admin.role !== "owner" && own[0].branch_id !== admin.branch_id)) go("처리할 수 없어요.");
  const r = await addMakeup(appId, date, String(fd.get("time_note") ?? ""), admin.email, "확정");
  go(r.ok ? "보강을 등록했어요." : r.message, String(fd.get("week") ?? ""));
}

export async function decideMakeup(fd: FormData) {
  const admin = await requireAdmin(["owner", "branch_admin"]);
  const id = String(fd.get("id"));
  const to = String(fd.get("to"));
  if (!["확정", "거절", "취소"].includes(to)) go("처리할 수 없어요.");
  const own = await query<{ branch_id: string }>("select a.branch_id from makeups m join applications a on a.id = m.application_id where m.id = $1", [id]);
  if (!own[0] || (admin.role !== "owner" && own[0].branch_id !== admin.branch_id)) go("처리할 수 없어요.");
  await query("update makeups set status = $2, decided_by = $3, decided_at = now() where id = $1", [id, to, admin.email]);
  go(to === "확정" ? "승인했어요." : "처리했어요.", String(fd.get("week") ?? ""));
}
