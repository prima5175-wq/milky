import Link from "next/link";
import { demoRepository as repo } from "@/lib/assessments/demo";

export default async function TherapistHome() {
  const children = await repo.listChildren();
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">담당 아동</h1>
      <ul className="space-y-2">
        {children.map((c) => (
          <li key={c.id}><Link className="block rounded-xl border p-4" href={`/therapist/children/${c.id}`}>{c.nickname} · {c.ageBand}세</Link></li>
        ))}
      </ul>
    </main>
  );
}
