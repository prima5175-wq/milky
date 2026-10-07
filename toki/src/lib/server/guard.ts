// 보호자 PIN 확인. 헤더 x-guardian-pin. ⚠ 실제 로그인이 아니라 같은 기기에서 아이가 보호자 기능을 쓰지 못하게 하는 간이 장치다.
import { NextResponse } from "next/server";
import { getStores } from "./stores";

export function requireGuardian(req: Request): NextResponse | null {
  const pin = req.headers.get("x-guardian-pin");
  // PIN 을 보내지 않은 요청은 '추측'이 아니므로 시도 횟수에 넣지 않는다 (그렇지 않으면 아무 요청이나 보내 보호자를 잠글 수 있다).
  if (!pin) return NextResponse.json({ error: "pin_required" }, { status: 401 });
  const r = getStores().guardian.check(pin);
  if (r === "ok") return null;
  return NextResponse.json({ error: r === "locked" ? "locked" : "wrong_pin" }, { status: r === "locked" ? 429 : 401 });
}
