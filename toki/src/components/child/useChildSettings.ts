"use client";
import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type ChildUiSettings } from "@/lib/child/settings";

export function useChildSettings() {
  const [settings, setSettings] = useState<ChildUiSettings>(DEFAULT_SETTINGS);
  useEffect(() => setSettings(loadSettings()), []);
  const update = (s: ChildUiSettings) => { setSettings(s); saveSettings(s); };
  return [settings, update] as const;
}
