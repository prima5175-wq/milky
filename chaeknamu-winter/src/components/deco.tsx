// 화면을 풍성하게 꾸미는 그림과 아이콘 모음. 모두 코드로 그린 가벼운 SVG라 이미지 파일이 필요 없어요.
import type { ReactNode } from "react";

const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export type IconName = "calendar" | "clock" | "book" | "cap" | "bell" | "sparkle" | "ticket" | "pen" | "check" | "heart";
export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    calendar: <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
    book: <><path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V18c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z" /><path d="M12 6v12.5" /></>,
    cap: <><path d="M2.5 9.5 12 5l9.5 4.5L12 14z" /><path d="M6.5 11.5V16c1.5 1.6 3.4 2.5 5.5 2.5s4-.9 5.5-2.5v-4.5" /></>,
    bell: <><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
    sparkle: <><path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z" /><path d="M18.5 17l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></>,
    ticket: <><path d="M3.5 8.5a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4V18a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-1.5a2 2 0 0 1 0-4v0a2 2 0 0 0 0-4V6a1 1 0 0 0-1-1h-15a1 1 0 0 0-1 1z" /><path d="M14.5 5v14" strokeDasharray="2 2.5" /></>,
    pen: <><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" /><path d="M14.5 6.5l3 3" /></>,
    check: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.3l2.4 2.4 4.6-5" /></>,
    heart: <path d="M12 19.5S4 14.8 4 9.2A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 20 9.2c0 5.6-8 10.3-8 10.3z" />,
  };
  return <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>{paths[name]}</svg>;
}

// 번호 + 아이콘 + 세리프 제목 + 금빛 선으로 이루어진 구역 제목
export function SectionTitle({ no, title, icon, sub }: { no?: string; title: string; icon: IconName; sub?: string }) {
  return (
    <div className="mt-12">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 rotate-45 place-items-center rounded-lg bg-mint text-pine ring-1 ring-gold/60"><span className="-rotate-45"><Icon name={icon} /></span></span>
        <div className="min-w-0 flex-1">
          {no && <p className="font-display text-[13px] font-semibold uppercase tracking-[0.3em] text-gold">{no}</p>}
          <h2 className="text-[22px] leading-tight text-ink">{title}</h2>
        </div>
      </div>
      <div aria-hidden className="mt-3 flex items-center gap-2"><span className="h-px flex-1 bg-gradient-to-r from-gold/70 to-transparent" /><span className="size-1.5 rotate-45 bg-gold" /></div>
      {sub && <p className="mt-2 text-[14px] text-muted">{sub}</p>}
    </div>
  );
}

// 원·반원·마름모를 겹쳐 그린 기하학 무늬 (히어로 오른쪽)
export function HeroArt({ className = "" }: { className?: string }) {
  const g = "#dcc08a";
  return (
    <svg viewBox="0 0 220 200" className={className} aria-hidden fill="none" stroke={g} strokeWidth="1.1">
      <g opacity=".9">
        <circle cx="150" cy="100" r="70" />
        <circle cx="150" cy="100" r="52" strokeOpacity=".6" />
        <circle cx="150" cy="100" r="34" strokeOpacity=".4" />
        <path d="M150 30v140M80 100h140" strokeOpacity=".35" />
        <path d="M100.5 50.5l99 99M199.5 50.5l-99 99" strokeOpacity=".2" />
      </g>
      <path d="M150 62l38 38-38 38-38-38z" fill={g} fillOpacity=".16" />
      <path d="M150 80l20 20-20 20-20-20z" fill={g} fillOpacity=".5" stroke="none" />
      <path d="M30 200a60 60 0 0 1 60-60v60z" fill="#fff" fillOpacity=".09" stroke="none" />
      <path d="M30 200a60 60 0 0 1 60-60M30 180a40 40 0 0 1 40-40" strokeOpacity=".5" />
      <path d="M200 30a30 30 0 0 0-30-30v30z" fill={g} fillOpacity=".3" stroke="none" />
      <circle cx="40" cy="60" r="3" fill={g} stroke="none" />
      <circle cx="88" cy="28" r="1.8" fill="#fff" stroke="none" opacity=".8" />
      <path d="M62 112l6 6-6 6-6-6z" fill="none" />
    </svg>
  );
}

// 로고: 기하학 마크 + 영문 워드마크
export function Logo({ className = "", light = false }: { className?: string; light?: boolean }) {
  const c = light ? "#dcc08a" : "var(--color-gold)";
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden fill="none" stroke={c} strokeWidth="1.3">
        <circle cx="16" cy="16" r="14" />
        <path d="M16 5l11 11-11 11L5 16z" />
        <path d="M16 11l5 5-5 5-5-5z" fill={c} stroke="none" />
      </svg>
      <span className="leading-none">
        <span className="block font-display text-[19px] font-semibold uppercase tracking-[0.28em]">Chaeknamu</span>
        <span className="mt-1 block font-display text-[10px] uppercase tracking-[0.4em] opacity-70">Winter Class 2027</span>
      </span>
    </span>
  );
}

// 핵심 숫자 세 가지를 보여주는 띠
export function KeyFacts({ items }: { items: { big: string; small: string }[] }) {
  return (
    <div className="mt-4 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_14px_34px_-18px_rgba(60,45,20,0.28)]">
      {items.map((x) => (
        <div key={x.small} className="px-2 py-4 text-center">
          <p className="whitespace-nowrap font-display text-[28px] font-bold leading-none text-pine">{x.big}</p>
          <p className="mt-1.5 text-[12px] tracking-wide text-muted">{x.small}</p>
        </div>
      ))}
    </div>
  );
}

// 기하학 구분선: 선 + 마름모 + 원
export function Wave({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center justify-center gap-3 text-gold ${className}`}>
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/70" />
      <span className="size-1.5 rotate-45 border border-current" />
      <span className="size-2.5 rotate-45 bg-current" />
      <span className="size-1.5 rotate-45 border border-current" />
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/70" />
    </div>
  );
}
