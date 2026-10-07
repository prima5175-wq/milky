// 아동 화면이 쓰는 서버 공통 정보 (프로필·동의·처방)
import { DEMO_CHILD } from "../child/demo";
import { getStores } from "./stores";

export function childContext() {
  const { guardian, consent, config } = getStores();
  const cfg = config.get(DEMO_CHILD.id);
  return {
    childId: DEMO_CHILD.id, nickname: guardian.profile.nickname, ageBand: guardian.profile.ageBand,
    hasConsent: consent.has(DEMO_CHILD.id, "service"), cfg,
  };
}
