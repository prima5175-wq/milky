// 그림 검사(HTP 등) 기록. 앱은 기록·비교만 하고 해석이나 점수화는 하지 않는다. 해석은 검사자가 한다.
// 그림 파일은 보호자의 'drawing_storage' 동의가 있을 때만 저장한다.
export const KINDS = ["house", "tree", "person"] as const;
export type DrawingKind = (typeof KINDS)[number];
export const KIND_LABEL: Record<DrawingKind, string> = { house: "집", tree: "나무", person: "사람" };
/** 관찰 기록용 항목(해석 아님). 센터가 바꿀 수 있게 후속 단계에서 설정 화면을 둔다. */
export const DEFAULT_CHECKLIST = ["그리기 전에 망설였다", "지우개를 썼다", "그리면서 말을 했다", "지시를 이해하고 바로 시작했다", "끝까지 완성했다", "도움을 요청했다"];
export const MAX_IMAGE_BYTES = 700_000;

export interface HtpRecord {
  id: string; childId: string; date: string; examiner: string; durationMin: number | null;
  checklist: Record<string, boolean>; note: string; images: Partial<Record<DrawingKind, string>>;
}
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
const decodedBytes = (b64: string) => Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);

export function validateHtp(i: { date: string; durationMin?: number | null; note?: string; images?: Record<string, string> }, drawingConsent: boolean): string[] {
  const e: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.date) || Number.isNaN(Date.parse(i.date))) e.push("시행일을 확인해 주세요");
  if (i.durationMin != null && (!Number.isFinite(i.durationMin) || i.durationMin < 0 || i.durationMin > 180)) e.push("소요 시간은 0~180분이에요");
  if ((i.note ?? "").length > 2000) e.push("메모는 2000자 이하예요");
  const imgs = Object.entries(i.images ?? {});
  if (imgs.length > 0 && !drawingConsent) e.push("그림 저장에 대한 보호자 동의가 없어서 그림을 저장할 수 없어요 (점수·메모 기록은 가능해요)");
  for (const [k, v] of imgs) {
    if (!(KINDS as readonly string[]).includes(k)) { e.push(`알 수 없는 그림 종류: ${k}`); continue; }
    const m = DATA_URL.exec(v);
    if (!m) e.push(`${KIND_LABEL[k as DrawingKind]} 그림: jpg·png·webp 이미지만 가능해요`);
    else if (decodedBytes(m[2]) > MAX_IMAGE_BYTES) e.push(`${KIND_LABEL[k as DrawingKind]} 그림이 너무 커요 (700KB 이하)`);
  }
  return e;
}

export class HtpStore {
  recs: HtpRecord[] = []; private seq = 0;
  add(i: Omit<HtpRecord, "id">): HtpRecord { const r = { ...i, id: `htp-${++this.seq}` }; this.recs.push(r); return r; }
  list(childId: string) { return this.recs.filter((r) => r.childId === childId).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)); }
  /** 보호자가 그림 저장 동의를 철회하면 저장된 그림 파일을 지운다 (기록과 메모는 남긴다). */
  purgeImages(childId: string): number {
    let n = 0; for (const r of this.recs) if (r.childId === childId) { n += Object.keys(r.images).length; r.images = {}; } return n;
  }
}
