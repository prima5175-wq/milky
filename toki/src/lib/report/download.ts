/** 서버가 만든 PDF 를 브라우저에서 내려받는다. */
export async function downloadReport(init: { records?: unknown[]; pin?: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/report", { method: "POST", headers: { "content-type": "application/json", ...(init.pin ? { "x-guardian-pin": init.pin } : {}) }, body: JSON.stringify({ records: init.records }) });
    if (!res.ok) return { ok: false, error: res.status === 401 || res.status === 429 ? "PIN을 확인해 주세요" : "보고서를 만들지 못했어요" };
    const url = URL.createObjectURL(await res.blob()); const a = document.createElement("a");
    a.href = url; a.download = (/filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "") ?? [])[1] ?? "toki-report.pdf"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000); return { ok: true };
  } catch { return { ok: false, error: "연결을 확인해 주세요" }; }
}
