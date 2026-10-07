import type { ScoreField } from "./types";

export interface ValidationResult { ok: boolean; errors: Record<string, string>; scores: Record<string, number> }

/** 입력 문자열을 양식에 맞게 검증한다. 빈 칸은 허용(일부만 입력 가능), 전부 비면 오류. */
export function validateScores(schema: ScoreField[], input: Record<string, string>): ValidationResult {
  const errors: Record<string, string> = {};
  const scores: Record<string, number> = {};
  for (const f of schema) {
    const raw = (input[f.key] ?? "").trim();
    if (raw === "") continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) { errors[f.key] = `${f.label}: 숫자로 입력해 주세요`; continue; }
    if (f.min !== undefined && n < f.min) { errors[f.key] = `${f.label}: ${f.min} 이상이어야 해요`; continue; }
    if (f.max !== undefined && n > f.max) { errors[f.key] = `${f.label}: ${f.max} 이하여야 해요`; continue; }
    scores[f.key] = n;
  }
  if (Object.keys(scores).length === 0 && Object.keys(errors).length === 0) errors._form = "점수를 하나 이상 입력해 주세요";
  return { ok: Object.keys(errors).length === 0, errors, scores };
}
