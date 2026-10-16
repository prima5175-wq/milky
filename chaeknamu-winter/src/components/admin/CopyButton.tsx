"use client";
import { useState } from "react";

export default function CopyButton({ text, label = "안내 문구 복사" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch {} }}>
      {done ? "복사됐어요" : label}
    </button>
  );
}
