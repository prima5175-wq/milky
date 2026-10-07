"use client";
import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type ChildUiSettings } from "@/lib/child/settings";
import { messages } from "@/lib/i18n";

export function useChildSettings() {
  const [settings, setSettings] = useState<ChildUiSettings>(DEFAULT_SETTINGS);
  useEffect(() => setSettings(loadSettings()), []);
  const update = (s: ChildUiSettings) => { setSettings(s); saveSettings(s); };
  return [settings, update] as const;
}

/** 화면 설정과, 그 언어의 아동 화면 문구 */
export function useChildT() {
  const [settings, update] = useChildSettings();
  return { t: messages[settings.locale].child, settings, update };
}
