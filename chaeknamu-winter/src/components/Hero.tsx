// 상단 소개 영역. 단색 면과 작은 도형 두 개만 써서 담백하게 꾸몄어요. (관마다 포인트 색이 바뀌어요)
export default function Hero({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <header className="relative overflow-hidden rounded-[28px] bg-mint px-6 pb-8 pt-7">
      <span aria-hidden className="absolute -right-12 -top-12 size-44 rounded-full bg-white/70" />
      <span aria-hidden className="absolute right-9 top-9 size-3 rounded-full bg-gold" />
      <p className="relative text-sm font-bold text-pine">{kicker}</p>
      <h1 className="relative mt-2 text-[34px] font-black leading-tight text-ink">{title}</h1>
      {sub && <p className="relative mt-2 text-[15px] text-muted">{sub}</p>}
    </header>
  );
}
