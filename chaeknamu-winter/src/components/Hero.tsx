// 상단 소개 영역. 단색 면과 작은 도형만 써서 가볍게 꾸몄어요.
export default function Hero({ kicker, title }: { kicker: string; title: string }) {
  return (
    <header className="relative overflow-hidden rounded-[24px] bg-mint px-5 pb-7 pt-6">
      <span aria-hidden className="absolute -right-6 -top-6 size-24 rounded-full bg-gold/80" />
      <span aria-hidden className="absolute right-16 top-14 size-3 rounded-full bg-white" />
      <span aria-hidden className="absolute right-6 top-28 size-2 rounded-full bg-white" />
      <span aria-hidden className="absolute -bottom-10 -left-8 size-28 rounded-full bg-sky" />
      <p className="relative text-sm font-medium text-pine">{kicker}</p>
      <h1 className="relative mt-1 text-4xl font-black leading-tight text-ink">{title}</h1>
      <p className="relative mt-2 text-[15px] text-muted">아이를 바꾸는 건 &lsquo;많이&rsquo;가 아니라 &lsquo;매일&rsquo;이에요.</p>
    </header>
  );
}
