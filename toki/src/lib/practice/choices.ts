import type { Level, Scenario } from "../scenarios/schema.ts";

function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);
}
export function shuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr], rnd = seeded(seed);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * 턴별 선택지(항상 4개, 중복 없음, 같은 입력이면 같은 순서).
 * 1번째: 시나리오의 기본 선택지. 2·3번째: 아직 쓰지 않은 좋은 응답 2개 + 어색한 예 + 대답 안 함.
 */
export function buildChoices(s: Scenario, turnNo: number, used: string[], target: Level): string[] {
  if (turnNo <= 1) return shuffle(s.choiceOptions, `${s.id}:1`);
  const order = ([1, 2, 3, 4] as Level[]).sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || a - b);
  const goods: string[] = [];
  for (const lv of order) for (const g of s.goodResponses[String(lv) as "1"]) if (!used.includes(g) && !goods.includes(g)) goods.push(g);
  const picked = goods.slice(0, 2);
  const extra = ["...", s.awkwardExample.line];
  const pool = [...picked, ...extra, ...s.choiceOptions].filter((x, i, arr) => arr.indexOf(x) === i && !used.includes(x) || extra.includes(x));
  const four = [...picked, ...extra, ...pool].filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 4);
  return shuffle(four, `${s.id}:${turnNo}`);
}
