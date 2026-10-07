// 보호자 동의. 만 14세 미만 아동 정보는 법정대리인(보호자)의 동의가 있어야 한다.
// ⚠ 문구·절차는 법률 검토 전 초안이다.
export const POLICY_VERSION = "draft-0.1";
export type ConsentKind = "service" | "voice_storage" | "drawing_storage" | "research";
export const CONSENT_LABEL: Record<ConsentKind, string> = {
  service: "서비스 이용 및 개인정보 수집·이용 (필수)",
  voice_storage: "음성 원본 저장 (선택, 기본 저장 안 함)",
  drawing_storage: "그림 파일 저장 (선택, HTP 등 그림 검사 기록용)",
  research: "익명화된 연구 활용 (선택)",
};
export const AGE_BANDS = ["5-6", "7-8", "9-10", "11-12"] as const;

export interface SignupInput {
  guardianName: string; email: string; pin: string; childNickname: string; ageBand: string;
  isLegalGuardian: boolean; consents: Partial<Record<ConsentKind, boolean>>;
}
export function validateSignup(i: SignupInput): { ok: boolean; errors: Record<string, string> } {
  const e: Record<string, string> = {};
  if (!i.guardianName.trim() || i.guardianName.length > 30) e.guardianName = "보호자 이름을 입력해 주세요";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.email)) e.email = "이메일 형식을 확인해 주세요";
  if (!/^\d{4,6}$/.test(i.pin)) e.pin = "보호자 PIN은 숫자 4~6자리예요";
  if (!i.childNickname.trim() || i.childNickname.length > 20) e.childNickname = "아이 별명을 입력해 주세요 (실명 대신 별명을 권장해요)";
  if (!(AGE_BANDS as readonly string[]).includes(i.ageBand)) e.ageBand = "연령대를 골라 주세요";
  if (!i.isLegalGuardian) e.isLegalGuardian = "법정대리인(보호자)만 가입할 수 있어요";
  if (!i.consents.service) e.service = "서비스 이용 동의가 필요해요";
  return { ok: Object.keys(e).length === 0, errors: e };
}

export interface ConsentRec { id: string; childId: string; kind: ConsentKind; version: string; grantedAt: string; revokedAt: string | null }
export class ConsentStore {
  recs: ConsentRec[] = []; private seq = 0;
  grant(childId: string, kind: ConsentKind, now = new Date()) {
    if (this.has(childId, kind)) return;
    this.recs.push({ id: `con-${++this.seq}`, childId, kind, version: POLICY_VERSION, grantedAt: now.toISOString(), revokedAt: null });
  }
  /** 동의는 언제든 철회할 수 있다. 철회 기록은 남긴다. */
  revoke(childId: string, kind: ConsentKind, now = new Date()) {
    const r = this.recs.find((x) => x.childId === childId && x.kind === kind && !x.revokedAt);
    if (!r) return false; r.revokedAt = now.toISOString(); return true;
  }
  has(childId: string, kind: ConsentKind) { return this.recs.some((x) => x.childId === childId && x.kind === kind && !x.revokedAt); }
  active(childId: string) { return (Object.keys(CONSENT_LABEL) as ConsentKind[]).filter((k) => this.has(childId, k)); }
}
