import "server-only";
import { after } from "next/server";
import { sheetsConfigured, syncUnsynced } from "./sheets";

// 응답을 먼저 돌려준 뒤에 시트로 보내요. 실패해도 신청에는 영향이 없어요.
export function triggerSheetSync() {
  if (!sheetsConfigured()) return;
  after(async () => { try { await syncUnsynced(); } catch {} });
}
