// 아동 화면 설정. 감각에 예민한 아동을 위한 저자극 모드와 읽기 보조.
import type { InputMode } from "../practice/engine.ts";
import type { Locale } from "../i18n/index.ts";

export interface ChildUiSettings {
  lowStimulus: boolean;          // 저자극: 애니메이션 최소화, 차분한 색, 효과음 없음
  subtitleSize: "m" | "l" | "xl";
  readAloud: boolean;            // 모든 글자 읽어주기
  speechRate: 0.7 | 0.85 | 1;
  inputMode: InputMode;
  locale: Locale;                // 화면 언어 (연습 이야기는 한국어 콘텐츠)
}
export const DEFAULT_SETTINGS: ChildUiSettings = { lowStimulus: false, subtitleSize: "l", readAloud: true, speechRate: 0.85, inputMode: "choice", locale: "ko" };
const KEY = "toki.childSettings.v1";

export function loadSettings(): ChildUiSettings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return DEFAULT_SETTINGS; }
}
export function saveSettings(s: ChildUiSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 저장소를 못 쓰는 환경에서도 화면은 동작해야 한다 */ }
}
export const SUBTITLE_CLASS = { m: "text-lg", l: "text-2xl", xl: "text-4xl" } as const;
