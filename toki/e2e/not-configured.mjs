// 환경변수가 없을 때 연구용 내보내기는 기본으로 막혀 있어야 한다.
import { B, ok, finish, startServer, stopServer } from "./helpers.mjs";
await startServer({ TOKI_ADMIN_TOKEN: "", TOKI_EXPORT_SALT: "" });
try {
  const r = await fetch(B + "/api/export", { headers: { "x-admin-token": "" } });
  ok("관리자 토큰이 설정되지 않으면 503 (열려 있지 않다)", r.status === 503, `status ${r.status}`);
  const r2 = await fetch(B + "/api/export"); ok("토큰 없이도 열리지 않는다", r2.status === 503);
} finally { await stopServer(); process.exit(finish() ? 0 : 1); }
