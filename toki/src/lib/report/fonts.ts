// 서버 전용: PDF 에 넣을 한글 폰트(Noto Sans KR, OFL)를 npm 패키지에서 읽는다.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Fonts } from "./pdf.ts";

export async function loadFonts(): Promise<Fonts> {
  const base = join(process.cwd(), "node_modules", "@expo-google-fonts", "noto-sans-kr");
  const [regular, bold] = await Promise.all([readFile(join(base, "400Regular", "NotoSansKR_400Regular.ttf")), readFile(join(base, "700Bold", "NotoSansKR_700Bold.ttf"))]);
  return { regular: new Uint8Array(regular), bold: new Uint8Array(bold) };
}
