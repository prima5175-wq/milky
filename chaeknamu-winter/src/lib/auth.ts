import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { query } from "./db";

export type Role = "owner" | "branch_admin" | "teacher";
export type Admin = { email: string; role: Role; branch_id: string | null };

// Supabase가 열쇠 이름을 바꿔서(anon → publishable) 두 이름 모두 받아요
const supabaseKey = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const hasSupabase = () => !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!supabaseKey();
// 내 컴퓨터 임시 DB를 쓰는 경우에만 '간편 로그인'을 허용해요. (DATABASE_URL이 있으면 절대 켜지지 않아요)
export const devLoginEnabled = () => !hasSupabase() && !process.env.DATABASE_URL;

const secret = () => process.env.DEV_AUTH_SECRET ?? "dev-only-secret";
const sign = (v: string) => crypto.createHmac("sha256", secret()).update(v).digest("hex");

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
}

export async function setDevSession(email: string) {
  (await cookies()).set("dev_admin", `${email}|${sign(email)}`, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
}

export async function clearSession() {
  if (hasSupabase()) await (await supabaseServer()).auth.signOut();
  (await cookies()).delete("dev_admin");
}

export async function isAllowedEmail(email: string) {
  const r = await query("select 1 from admin_users where lower(email) = lower($1)", [email.trim()]);
  return r.length > 0;
}

// 로그인한 사람이 허용 목록(admin_users)에 있을 때만 관리자로 인정해요
export async function getAdmin(): Promise<Admin | null> {
  let email: string | null = null;
  if (hasSupabase()) {
    const { data } = await (await supabaseServer()).auth.getUser();
    email = data.user?.email ?? null;
  } else if (devLoginEnabled()) {
    const raw = (await cookies()).get("dev_admin")?.value;
    const [e, sig] = (raw ?? "").split("|");
    if (e && sig && sig === sign(e)) email = e;
  }
  if (!email) return null;
  const rows = await query<Admin>("select email, role, branch_id from admin_users where lower(email) = lower($1)", [email]);
  return rows[0] ?? null;
}

export async function requireAdmin(roles?: Role[]) {
  const a = await getAdmin();
  if (!a) redirect("/admin/login");
  if (roles && !roles.includes(a.role)) redirect(a.role === "teacher" ? "/admin/attendance" : "/admin");
  return a;
}
