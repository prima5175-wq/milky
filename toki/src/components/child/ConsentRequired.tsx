"use client";
import Link from "next/link";
import { Toki } from "./Toki";
import { useChildT } from "./useChildSettings";

export function ConsentRequired() {
  const { t } = useChildT();
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8 text-center">
      <Toki size={96} label={t.mascot} />
      <h1 className="text-2xl font-bold">{t.consent.title}</h1>
      <p className="text-lg">{t.consent.body}</p>
      <p className="text-sm opacity-70">{t.consent.guardianLead} <Link className="underline" href="/guardian">{t.consent.guardianLink}</Link>{t.consent.guardianTail}</p>
    </main>
  );
}
