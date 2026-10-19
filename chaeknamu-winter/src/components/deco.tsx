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
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mint text-pine ring-1 ring-gold/60"><Icon name={icon} /></span>
        <div className="min-w-0 flex-1">
          {no && <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gold">{no}</p>}
          <h2 className="text-[22px] leading-tight text-ink">{title}</h2>
        </div>
      </div>
      <div aria-hidden className="mt-3 flex items-center gap-2"><span className="h-px flex-1 bg-gradient-to-r from-gold/70 to-transparent" /><span className="size-1.5 rotate-45 bg-gold" /></div>
      {sub && <p className="mt-2 text-[14px] text-muted">{sub}</p>}
    </div>
  );
}

// 책 더미와 새싹, 반짝이는 별을 그린 대표 그림 (히어로 오른쪽 아래)
export function HeroArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 190" className={className} aria-hidden>
      <g fill="#fff" opacity=".9"><circle cx="30" cy="40" r="2.2" /><circle cx="190" cy="30" r="1.6" /><circle cx="160" cy="70" r="1.4" /><circle cx="55" cy="95" r="1.4" /></g>
      <g stroke="#e3c887" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M185 52v14M178 59h14M180 54l10 10M190 54l-10 10" />
        <path d="M40 58v10M35 63h10" />
      </g>
      <ellipse cx="112" cy="172" rx="82" ry="8" fill="#000" opacity=".16" />
      <rect x="38" y="142" width="144" height="26" rx="5" fill="#f6efe0" />
      <rect x="38" y="142" width="144" height="7" rx="3" fill="#e3c887" />
      <rect x="56" y="114" width="118" height="26" rx="5" fill="#fff" />
      <rect x="56" y="114" width="118" height="6" rx="3" fill="#c9a45c" opacity=".85" />
      <rect x="72" y="86" width="92" height="26" rx="5" fill="#f6efe0" />
      <rect x="72" y="86" width="92" height="6" rx="3" fill="#e3c887" />
      <path d="M118 86V62" stroke="#f6efe0" strokeWidth="3" strokeLinecap="round" />
      <path d="M118 66c-2-14-14-20-26-18 0 13 10 21 26 18z" fill="#fff" opacity=".95" />
      <path d="M118 62c2-16 15-24 30-20-1 16-13 24-30 20z" fill="#e3c887" />
      <path d="M118 66c-6-6-12-9-19-10" stroke="#0a4a3d" strokeOpacity=".25" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// 핵심 숫자 세 가지를 보여주는 띠
export function KeyFacts({ items }: { items: { big: string; small: string }[] }) {
  return (
    <div className="mt-4 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_14px_34px_-18px_rgba(60,45,20,0.28)]">
      {items.map((x) => (
        <div key={x.small} className="px-2 py-4 text-center">
          <p className="whitespace-nowrap font-serif text-[23px] font-bold leading-none text-pine">{x.big}</p>
          <p className="mt-1.5 text-[12px] tracking-wide text-muted">{x.small}</p>
        </div>
      ))}
    </div>
  );
}

// 물결 모양 구분선
export function Wave({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 24" preserveAspectRatio="none" className={`h-5 w-full text-pine/15 ${className}`} aria-hidden>
      <path d="M0 12c25-14 50-14 75 0s50 14 75 0 50-14 75 0 50 14 75 0 50-14 75 0V24H0z" fill="currentColor" />
    </svg>
  );
}
