import { ko } from "./ko";
import { en } from "./en";
export type Locale = "ko" | "en";
export const messages = { ko, en } as const;
export const defaultLocale: Locale = "ko";
export const t = (locale: Locale = defaultLocale) => messages[locale];
