/* 토키 서비스 워커
 * - 아이 화면(/child/*)은 네트워크 우선, 실패하면 저장해 둔 화면으로. 그래서 한 번 열어 본(또는 미리 불러 둔) 이야기는 오프라인에서도 연습할 수 있다.
 * - 정적 파일(/_next/static, /icons)은 캐시 우선.
 * - /api, 보호자·검사자·관리자·가입 화면은 절대 저장하지 않는다 (개인정보·권한이 걸린 화면이라서).
 * 배포할 때 구조가 바뀌면 VERSION 을 올리면 예전 캐시가 지워진다. */
const VERSION = "v2";
const STATIC = `toki-static-${VERSION}`, PAGES = `toki-pages-${VERSION}`;
const PRECACHE = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];
const MAX_STATIC = 300; // 오래된 정적 파일이 끝없이 쌓이지 않게 한다
const NET_TIMEOUT_MS = 5000;

self.addEventListener("install", (e) => { e.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== STATIC && k !== PAGES) await caches.delete(k); await self.clients.claim(); })());
});

const isChild = (u) => u.pathname === "/child" || u.pathname.startsWith("/child/");
const isStatic = (u) => u.pathname.startsWith("/_next/static/") || u.pathname.startsWith("/icons/");
const wantsHtml = (req) => req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

async function trim(cache, max) { const keys = await cache.keys(); for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]); }

async function networkFirstPage(req, url) {
  const cache = await caches.open(PAGES), key = url.pathname; // 쿼리는 무시하고 경로로 저장
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), NET_TIMEOUT_MS);
    const res = await fetch(req, { signal: ctl.signal }); clearTimeout(t);
    if (res.ok && !res.redirected && (res.headers.get("content-type") || "").includes("text/html")) await cache.put(key, res.clone());
    return res;
  } catch (_) {
    return (await cache.match(key)) || (await caches.match("/offline.html"));
  }
}
async function cacheFirstStatic(req) {
  const cache = await caches.open(STATIC), hit = await cache.match(req); if (hit) return hit;
  const res = await fetch(req); if (res.ok) { await cache.put(req, res.clone()); trim(cache, MAX_STATIC); } return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url); if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;                       // API 는 절대 저장하지 않는다
  if (isStatic(url)) { e.respondWith(cacheFirstStatic(req)); return; }
  if (isChild(url) && !req.headers.get("rsc") && wantsHtml(req)) e.respondWith(networkFirstPage(req, url));
});

/* 페이지가 보내는 메시지: 'cache' = 이미 불러온 정적 파일 저장, 'warm' = 이야기 화면과 거기에 필요한 파일을 미리 저장 */
self.addEventListener("message", (e) => {
  const d = e.data || {}; const sameOrigin = (u) => { try { return new URL(u, self.location.origin).origin === self.location.origin; } catch (_) { return false; } };
  if (d.type === "cache" && Array.isArray(d.urls)) {
    e.waitUntil((async () => { const c = await caches.open(STATIC); for (const u of d.urls.filter(sameOrigin).slice(0, 200)) { try { if (!(await c.match(u))) { const r = await fetch(u); if (r.ok) await c.put(u, r); } } catch (_) {} } })());
  }
  if (d.type === "warm" && Array.isArray(d.urls)) {
    e.waitUntil((async () => {
      const pages = await caches.open(PAGES), stat = await caches.open(STATIC);
      for (const u of d.urls.filter((x) => typeof x === "string" && sameOrigin(x) && isChild(new URL(x, self.location.origin))).slice(0, 12)) {
        try {
          const res = await fetch(u, { headers: { accept: "text/html" } }); if (!res.ok || res.redirected) continue;
          const html = await res.clone().text(); await pages.put(new URL(u, self.location.origin).pathname, res);
          // 그 화면이 쓰는 JS·CSS 도 함께 저장해야 오프라인에서 열린다
          // HTML 에는 /_next/static/... (절대 경로)와, 화면 컴포넌트 목록 안의 static/chunks/... (앞에 /_next/ 가 없는 경로)가 함께 들어 있다. 둘 다 저장해야 오프라인에서 화면이 열린다.
          const found = html.match(/(?:\/_next\/)?static\/(?:chunks|media)\/[^"'\s\\)]+\.(?:js|css|woff2?)/g) || [];
          const files = [...new Set(found.map((f) => (f.startsWith("/_next/") ? f : "/_next/" + f)))];
          for (const f of files) { if (!(await stat.match(f))) { try { const r = await fetch(f); if (r.ok) await stat.put(f, r); else console.warn("[sw] 정적 파일 저장 실패", f, r.status); } catch (err) { console.warn("[sw] 정적 파일 저장 실패", f, String(err)); } } }
        } catch (err) { console.debug("[sw] 화면 저장 실패(연결이 없을 수 있어요)", u, String(err)); }
      }
    })());
  }
});
