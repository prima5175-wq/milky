// 가짜 Anthropic 서버. 실제 SDK 가 보내는 요청 본문과 응답 파싱을 키 없이 확인하는 데 쓴다.
import http from "node:http";
export function startMock(port = 3199) {
  let mode = "ok"; const reqs = [];
  const server = http.createServer((req, res) => {
    let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => {
      if (req.url === "/__mode") { mode = b.trim(); return res.end("ok"); }
      if (req.url === "/__reqs") return res.end(JSON.stringify(reqs));
      reqs.push({ url: req.url, headers: { "x-api-key": req.headers["x-api-key"] }, body: JSON.parse(b || "{}") });
      const msg = (text, stop = "end_turn") => ({ id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", content: text === null ? [] : [{ type: "text", text }], stop_reason: stop, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } });
      res.setHeader("content-type", "application/json");
      const j = (o) => res.end(JSON.stringify(o));
      if (mode === "ok") return j(msg(JSON.stringify({ friendReply: "응, 진짜 맛있지!", feedback: "친구 말에 질문으로 이어갔네!", detectedLevel: 2, safetyFlag: false })));
      if (mode === "bad") return j(msg(JSON.stringify({ friendReply: "응", feedback: "그건 틀렸어.", detectedLevel: 1, safetyFlag: false })));
      if (mode === "garbage") return j(msg("this is not json"));
      if (mode === "refusal") return j(msg(null, "refusal"));
      if (mode === "model_flag") return j(msg(JSON.stringify({ friendReply: "x", feedback: "y", detectedLevel: 0, safetyFlag: true })));
      res.statusCode = 529; j({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } });
    });
  });
  return new Promise((r) => server.listen(port, () => r({ set: (m) => fetch(`http://127.0.0.1:${port}/__mode`, { method: "POST", body: m }), reqs: async () => (await fetch(`http://127.0.0.1:${port}/__reqs`)).json(), close: () => server.close() })));
}
