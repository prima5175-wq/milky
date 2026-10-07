// 간이 보호자 PIN (아이가 같은 기기에서 보호자 화면·미션 확인을 열지 못하게 하는 용도). 실제 로그인을 대체하지 않는다.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
export function hashPin(pin: string): string { const salt = randomBytes(16); return `${salt.toString("hex")}:${scryptSync(pin, salt, 32).toString("hex")}`; }
export function verifyPin(pin: string, stored: string): boolean {
  const [s, h] = stored.split(":"); if (!s || !h) return false;
  const a = scryptSync(String(pin), Buffer.from(s, "hex"), 32), b = Buffer.from(h, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
