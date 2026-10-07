import { AGE_BANDS, DOMAINS, EMOTIONS, SETTINGS, type Scenario } from "./schema.ts";

const BANNED = [/치료(한다|합니다|해요)/, /진단(한다|합니다|해요)/];
const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const inList = (list: readonly string[], v: unknown) => typeof v === "string" && list.includes(v);

/** 시나리오 한 개의 오류 목록을 돌려준다. 비어 있으면 통과. */
export function validateScenario(s: Partial<Scenario> & Record<string, any>): string[] {
  const e: string[] = [];
  const need = (ok: boolean, msg: string) => { if (!ok) e.push(msg); };

  need(/^[a-z]+-\d{3}$/.test(s.id ?? ""), "id 는 영문소문자-세자리숫자 (예: lun-001)");
  need(inList(SETTINGS, s.setting), "setting 이 허용 목록에 없음");
  need(inList(AGE_BANDS, s.ageBand), "ageBand 가 허용 목록에 없음");
  need(Array.isArray(s.domain) && s.domain.length > 0 && s.domain.every((d) => inList(DOMAINS, d)), "domain 은 허용된 4개 영역 중 1개 이상");
  need([1, 2, 3, 4].includes(s.targetLevel as number), "targetLevel 은 1~4");
  for (const k of ["situation", "partnerLine", "mission"] as const) need(isStr(s[k]), `${k} 필요`);
  need(inList(EMOTIONS, s.partnerEmotion), "partnerEmotion 이 허용 목록에 없음");
  need(isStr(s.awkwardExample?.line) && isStr(s.awkwardExample?.whyAwkward), "awkwardExample.line / whyAwkward 필요");

  const g = s.goodResponses;
  for (const lv of ["1", "2", "3", "4"] as const) {
    need(Array.isArray(g?.[lv]) && g![lv].length >= 1 && g![lv].every(isStr), `goodResponses.${lv} 에 1개 이상 필요`);
  }
  const opts = s.choiceOptions;
  need(Array.isArray(opts) && opts.length === 4 && opts.every(isStr), "choiceOptions 는 정확히 4개");
  if (Array.isArray(opts) && opts.length === 4) {
    need(new Set(opts).size === 4, "choiceOptions 에 중복이 있음");
    const good = Object.values(g ?? {}).flat();
    need(opts.some((o) => good.includes(o)), "choiceOptions 에 goodResponses 가 하나는 포함돼야 함");
    need(!good.includes(s.awkwardExample?.line as string), "어색한 예가 goodResponses 에 들어 있음");
    need(opts.filter((o) => good.includes(o)).length <= 2, "choiceOptions 에 좋은 응답이 3개 이상이면 변별력이 없음");
  }
  need(!!s.media && s.media.cartoon === null && s.media.videoAwkward === null && s.media.videoGood === null, "media 는 모두 null (영상은 나중에 업로드)");
  need(s.reviewStatus === "draft", "seed 는 reviewStatus 'draft' 여야 함");

  // 길이: 아동이 읽고 듣는 문장이므로 짧게
  need((s.partnerLine?.length ?? 0) <= 60, "partnerLine 은 60자 이하");
  const all = [s.situation, s.partnerLine, s.mission, s.awkwardExample?.line, s.awkwardExample?.whyAwkward, ...Object.values(g ?? {}).flat(), ...(opts ?? [])];
  for (const t of all) {
    if (isStr(t) && BANNED.some((r) => r.test(t))) e.push(`금지 표현: ${t}`);
  }
  for (const lv of ["1", "2", "3", "4"] as const) for (const t of g?.[lv] ?? []) need(t.length <= 80, `goodResponses.${lv} 80자 초과: ${t}`);
  return e;
}

/** 여러 시나리오(파일 전체) 검증: 개별 검사 + id·partnerLine 중복 + 단계 분포 */
export function validateAll(list: Array<Partial<Scenario> & Record<string, any>>): { errors: string[]; stats: Record<string, number> } {
  const errors: string[] = [];
  const ids = new Set<string>(), lines = new Set<string>();
  const stats: Record<string, number> = { total: list.length, conflict: 0 };
  for (const s of list) {
    for (const m of validateScenario(s)) errors.push(`${s.id ?? "(id없음)"}: ${m}`);
    if (s.id) { if (ids.has(s.id)) errors.push(`${s.id}: id 중복`); ids.add(s.id); }
    if (s.partnerLine) { if (lines.has(s.partnerLine)) errors.push(`${s.id}: partnerLine 중복`); lines.add(s.partnerLine); }
    if (s.conflict) stats.conflict++;
    for (const k of [`level${s.targetLevel}`, `age:${s.ageBand}`, ...(s.domain ?? []).map((d: string) => `domain:${d}`)]) stats[k] = (stats[k] ?? 0) + 1;
  }
  return { errors, stats };
}
