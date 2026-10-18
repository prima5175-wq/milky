import { NextResponse } from "next/server";
import { devLoginEnabled, setDevSession } from "@/lib/auth";

// 체험용 사이트 전용: 메일 없이 역할을 골라 바로 들어가는 버튼. 실제 사이트(DEMO_MODE 없음)에서는 열리지 않아요.
const WHO: Record<string, { email: string; to: string }> = {
  owner: { email: "owner@example.com", to: "/admin" },
  branch: { email: "daechi@example.com", to: "/admin" },
  teacher: { email: "teacher@example.com", to: "/admin/attendance" },
  teacher2: { email: "teacher2@example.com", to: "/admin/attendance" },
};

export async function GET(req: Request, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const w = WHO[role];
  if (!process.env.DEMO_MODE || !devLoginEnabled() || !w) return new NextResponse("Not found", { status: 404 });
  await setDevSession(w.email);
  return NextResponse.redirect(new URL(w.to, req.url));
}
