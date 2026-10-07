import Link from "next/link";
import { Toki } from "./Toki";

export function TimeUp({ lowStimulus }: { lowStimulus: boolean }) {
  return (
    <div className={lowStimulus ? "low-stim min-h-screen" : "min-h-screen"} style={{ background: "var(--bg)" }}>
      <main className="mx-auto max-w-2xl space-y-6 p-8 text-center">
        <Toki size={120} />
        <h1 className="text-3xl font-bold">오늘은 여기까지!</h1>
        <p className="text-2xl">이제 진짜 친구에게 해 볼 시간이야.<br />오늘 배운 한 마디를 친구에게 해 보자!</p>
        <Link href="/child/stickers" className="block rounded-2xl bg-[var(--accent)] p-4 text-xl text-white">내 스티커 보기</Link>
      </main>
    </div>
  );
}
