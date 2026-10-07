// 서버 전용 데모 저장소 모음 (globalThis 에 두어 개발 중 모듈이 다시 읽혀도 유지). 운영 전에 DB 로 대체한다.
import { ConsentStore } from "../consent/consent.ts";
import { hashPin, verifyPin } from "../consent/pin.ts";
import { HtpStore } from "../htp/store.ts";
import { DEMO_CHILD } from "../child/demo.ts";
import { validatePrescription, type Prescription } from "../scenarios/prescription.ts";

export interface ChildConfig extends Prescription { updatedAt: string }
export class ChildConfigStore {
  private cfg = new Map<string, ChildConfig>(); history: Array<{ childId: string; at: string; snapshot: Prescription }> = [];
  get(childId: string): ChildConfig {
    return this.cfg.get(childId) ?? { dailyMinutes: DEMO_CHILD.dailyMinutes, dailyScenarios: 3, targetLevel: DEMO_CHILD.targetLevel, targetDomains: [], updatedAt: "" };
  }
  /** 처방 변경. 변경 이력을 남긴다 (효과 분석용). */
  set(childId: string, p: Prescription, now = new Date()): { ok: true } | { ok: false; errors: string[] } {
    const v = validatePrescription(p); if (v.errors.length) return { ok: false, errors: v.errors };
    this.cfg.set(childId, { ...p, updatedAt: now.toISOString() }); this.history.push({ childId, at: now.toISOString(), snapshot: { ...p } });
    return { ok: true };
  }
}

/** 보호자(데모). 기본 PIN 1234 는 가입 전용 임시값이며 가입(/signup)하면 바뀐다. PIN 을 연속으로 틀리면 잠시 잠근다. */
export const MAX_PIN_FAILS = 5, PIN_LOCK_MS = 60_000;
export class GuardianStore {
  pinHash = hashPin("1234"); name = "데모 보호자"; registered = false;
  profile = { nickname: "예시 아동", ageBand: "7-8" };
  private fails = 0; private lockedUntil = 0;
  check(pin: string, now = Date.now()): "ok" | "wrong" | "locked" {
    if (now < this.lockedUntil) return "locked";
    if (verifyPin(String(pin ?? ""), this.pinHash)) { this.fails = 0; return "ok"; }
    if (++this.fails >= MAX_PIN_FAILS) { this.lockedUntil = now + PIN_LOCK_MS; this.fails = 0; return "locked"; }
    return "wrong";
  }
}

const g = globalThis as unknown as { __tokiMisc?: { consent: ConsentStore; htp: HtpStore; config: ChildConfigStore; guardian: GuardianStore } };
export function getStores() {
  if (!g.__tokiMisc) {
    const consent = new ConsentStore();
    consent.grant(DEMO_CHILD.id, "service"); // 데모 아동은 서비스 동의가 된 상태로 시작 (철회하면 아동 화면이 막힌다)
    g.__tokiMisc = { consent, htp: new HtpStore(), config: new ChildConfigStore(), guardian: new GuardianStore() };
  }
  return g.__tokiMisc;
}
