import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { devLoginEnabled, getAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-black text-pine">관리자 로그인</h1>
      <div className="mt-3 h-0.5 w-12 bg-gold" />
      <div className="mt-6"><LoginForm dev={devLoginEnabled()} /></div>
    </main>
  );
}
