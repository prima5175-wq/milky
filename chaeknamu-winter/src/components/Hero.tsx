import { HeroArt } from "@/components/deco";
// 상단 소개 영역. 깊은 색 면, 가는 원형 선, 샴페인 골드 포인트로 고급스럽게 꾸몄어요. (관마다 포인트 색이 바뀌어요)
export default function Hero({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <header className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,var(--accent)_0%,var(--accent-d)_60%,#0c1613_140%)] px-7 pb-12 pt-8 text-white shadow-[0_30px_60px_-28px_var(--accent-d)]">
      <span aria-hidden className="absolute -right-24 -top-24 size-72 rounded-full border border-gold/50" />
      <span aria-hidden className="absolute -right-12 -top-12 size-48 rounded-full border border-gold/35" />
      <span aria-hidden className="absolute -right-2 top-0 size-28 rounded-full border border-gold/25" />
      <span aria-hidden className="absolute -bottom-28 -left-20 size-64 rounded-full bg-white/[0.05]" />
      <HeroArt className="pointer-events-none absolute -bottom-2 right-0 w-44 opacity-95" />
      <p className="relative flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-gold">
        <span aria-hidden className="h-px w-6 bg-gold" />{kicker}
      </p>
      <h1 className="relative mt-5 max-w-[16ch] text-[38px] font-bold leading-[1.2] text-white">{title}</h1>
      {sub && <p className="relative mt-4 max-w-[20ch] border-t border-white/15 pt-4 text-[15px] leading-relaxed text-white/80">{sub}</p>}
    </header>
  );
}
