// 상단 소개 영역. 두꺼운 테두리와 스티커 같은 도형으로 또렷하게 꾸몄어요. (관마다 포인트 색이 바뀌어요)
export default function Hero({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <header className="relative overflow-hidden rounded-[28px] border-2 border-ink bg-pine px-6 pb-9 pt-7 text-white shadow-[5px_5px_0_0_var(--color-ink)]">
      <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-lime" />
      <span aria-hidden className="absolute right-6 top-16 size-9 rotate-12 rounded-lg border-2 border-ink bg-gold" />
      <span aria-hidden className="absolute -bottom-10 -right-6 size-24 rounded-full border-2 border-ink bg-white/90" />
      <p className="relative inline-block -rotate-2 rounded-full border-2 border-ink bg-lime px-3 py-0.5 text-sm font-black text-ink">{kicker}</p>
      <h1 className="relative mt-3 text-[38px] font-black leading-[1.15] text-white [text-shadow:2px_2px_0_var(--color-ink)]">{title}</h1>
      {sub && <p className="relative mt-3 text-[15px] font-medium text-white/95">{sub}</p>}
    </header>
  );
}
