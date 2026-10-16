import { POLICY_INTRO, policyItems } from "@/lib/texts";

export default function PolicyBox({ refundDeadline, makeupLimit, makeupStart }: { refundDeadline: string; makeupLimit: number; makeupStart?: string | null }) {
  return (
    <div className="space-y-2 text-[15px] leading-relaxed">
      <p>{POLICY_INTRO}</p>
      <ol className="list-decimal space-y-1.5 pl-5">
        {policyItems(refundDeadline, makeupLimit, makeupStart).map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
    </div>
  );
}
