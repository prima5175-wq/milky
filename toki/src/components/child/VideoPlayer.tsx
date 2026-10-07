"use client";
import { useRef, useState } from "react";

/** 영상 플레이어(영상이 업로드되면 사용). 재생 속도 조절, 자막 기본 표시, 미리 불러오기. */
export function VideoPlayer({ src, caption, captionClass }: { src: string; caption: string; captionClass: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [rate, setRate] = useState(1);
  return (
    <div>
      <video ref={ref} src={src} controls preload="auto" playsInline className="w-full rounded-2xl" aria-label={caption} />
      <p className={`mt-2 text-center ${captionClass}`}>{caption}</p>
      <div className="mt-2 flex justify-center gap-2" role="group" aria-label="재생 속도">
        {[0.5, 0.75, 1].map((r) => (
          <button key={r} className={`rounded-full border px-4 py-2 ${rate === r ? "bg-[var(--accent)] text-white" : ""}`}
            onClick={() => { setRate(r); if (ref.current) ref.current.playbackRate = r; }}>{r === 1 ? "보통" : `${r}배`}</button>
        ))}
      </div>
    </div>
  );
}
