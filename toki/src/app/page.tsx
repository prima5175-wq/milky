import { t } from "@/lib/i18n";

export default function Home() {
  const m = t();
  return (
    <main className="mx-auto max-w-2xl p-8 text-center">
      <h1 className="text-4xl font-bold">🐰 {m.app.name}</h1>
      <p className="mt-2 text-lg">{m.home.intro}</p>
      <ul className="mt-8 grid grid-cols-2 gap-4">
        {Object.values(m.home.roles).map((r) => (
          <li key={r} className="rounded-2xl border p-6 text-xl">{r}</li>
        ))}
      </ul>
      <p className="mt-8 text-sm opacity-70">{m.notice}</p>
    </main>
  );
}
