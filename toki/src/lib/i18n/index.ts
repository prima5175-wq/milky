import { ko } from "./ko";
import { en } from "./en";
export type Locale = "ko" | "en";
export type Messages = typeof ko;
export const messages: Record<Locale, Messages> = { ko, en };
export const defaultLocale: Locale = "ko";
export const t = (locale: Locale = defaultLocale): Messages => messages[locale];
