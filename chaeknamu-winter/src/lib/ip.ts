import "server-only";

export function clientIp(req: Request) {
  const f = req.headers.get("x-forwarded-for");
  return (f ? f.split(",")[0] : req.headers.get("x-real-ip") ?? "local").trim();
}
