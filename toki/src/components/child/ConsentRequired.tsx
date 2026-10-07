import Link from "next/link";
import { Toki } from "./Toki";

export function ConsentRequired() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8 text-center">
      <Toki size={96} />
      <h1 className="text-2xl font-bold">어른과 함께 시작해 주세요</h1>
      <p className="text-lg">토키를 쓰려면 보호자의 동의가 필요해요. 어른에게 알려 주세요.</p>
      <p className="text-sm opacity-70">보호자님: <Link className="underline" href="/guardian">보호자 화면</Link>에서 동의 상태를 확인하실 수 있어요.</p>
    </main>
  );
}
