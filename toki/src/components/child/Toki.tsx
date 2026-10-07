// 안내자 토키(임시 SVG). 귀가 큰 토끼 = 친구 말을 잘 듣는다. 정식 캐릭터는 나중에 교체한다.
export function Toki({ size = 96, mood = "smile", label = "Toki" }: { size?: number; mood?: "smile" | "listen"; label?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label}>
      <ellipse cx="34" cy="26" rx="9" ry="24" fill="#fff" stroke="#6c63ff" strokeWidth="3" />
      <ellipse cx="66" cy="26" rx="9" ry="24" fill="#fff" stroke="#6c63ff" strokeWidth="3" />
      <ellipse cx="34" cy="28" rx="4" ry="16" fill="#ffc9d9" /><ellipse cx="66" cy="28" rx="4" ry="16" fill="#ffc9d9" />
      <circle cx="50" cy="64" r="28" fill="#fff" stroke="#6c63ff" strokeWidth="3" />
      <circle cx="40" cy="60" r="3.5" fill="#2b2a33" /><circle cx="60" cy="60" r="3.5" fill="#2b2a33" />
      <ellipse cx="50" cy="68" rx="3" ry="2.2" fill="#ff8fab" />
      <path d={mood === "listen" ? "M44 75 Q50 78 56 75" : "M43 73 Q50 81 57 73"} stroke="#2b2a33" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
