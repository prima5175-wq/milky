import { HeroArt, Logo } from "@/components/deco";
// 상단 소개 영역. 짙은 색 면에 기하학 무늬와 브래스 골드 선으로 꾸몄어요. (관마다 짙은 색이 바뀌어요)
export default function Hero({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <header className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(150deg,var(--accent)_0%,var(--accent-d)_100%)] px-7 pb-12 pt-7 text-white shadow-[0_30px_60px_-28px_var(--accent-d)]">
      <span aria-hidden className="absolute inset-[10px] rounded-[18px] border border-gold-l/40" />
      <HeroArt className="pointer-events-none absolute -bottom-3 -right-4 w-60 opacity-95" />
      <Logo light className="relative text-gold-l" />
      <p className="relative mt-7 flex items-center gap-2 font-display text-[12px] font-semibold uppercase tracking-[0.1em] text-gold-l">
        <span aria-hidden className="h-px w-6 bg-gold-l" />{kicker}
      </p>
      <h1 className="relative mt-3 max-w-[14ch] text-[38px] font-bold leading-[1.22] text-white">{title}</h1>
      {sub && <p className="relative mt-4 max-w-[15ch] border-t border-white/15 pt-4 text-[15px] leading-relaxed text-white/80">{sub}</p>}
    </header>
  );
}
