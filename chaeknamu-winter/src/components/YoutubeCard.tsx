// 원장 영상(유튜브) 소개 카드. 주소·제목·설명은 관리자 설정에서 바꿀 수 있어요.
export type Youtube = { url: string; title: string; desc: string };

function YoutubeIcon() {
  return (
    <svg viewBox="0 0 48 34" aria-hidden className="h-8 w-11 shrink-0">
      <rect width="48" height="34" rx="9" fill="#ff0000" />
      <path d="M19 9.5v15L32 17z" fill="#fff" />
    </svg>
  );
}

export default function YoutubeCard({ yt }: { yt: Youtube }) {
  if (!yt.url) return null;
  return (
    <a href={yt.url} target="_blank" rel="noopener noreferrer"
      className="card flex items-center gap-4 !p-4 transition-colors hover:border-pine">
      <YoutubeIcon />
      <span className="min-w-0 flex-1">
        <span className="block font-bold leading-snug">{yt.title}</span>
        <span className="block text-[14px] text-muted">{yt.desc}</span>
      </span>
      <span className="shrink-0 rounded-full bg-mint px-3 py-1.5 text-[13px] font-bold text-pine">영상 보기</span>
    </a>
  );
}
