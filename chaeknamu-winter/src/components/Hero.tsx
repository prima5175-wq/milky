// 상단 소개 영역. 깊은 색 면과 은은한 원형 포인트로 차분하고 고급스럽게 꾸몄어요. (관마다 포인트 색이 바뀌어요)
export default function Hero({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <header className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-pine to-pine-dark px-6 pb-9 pt-7 text-white shadow-[0_24px_50px_-24px_var(--accent-d)]">
      <span aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full bg-white/10" />
      <span aria-hidden className="absolute -bottom-20 right-10 size-44 rounded-full bg-white/[0.07]" />
      <span aria-hidden className="absolute right-8 top-9 size-2.5 rounded-full bg-gold" />
      <p className="relative inline-block rounded-full bg-white/15 px-3 py-1 text-[13px] font-medium tracking-wide text-white backdrop-blur">{kicker}</p>
      <h1 className="relative mt-4 text-[36px] font-extrabold leading-[1.18] text-white">{title}</h1>
      {sub && <p className="relative mt-3 text-[15px] text-white/85">{sub}</p>}
    </header>
  );
}
