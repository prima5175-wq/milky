// PDF 렌더러(pdfkit). pdf-lib 는 이 한글 폰트를 부분 포함(subset)할 때 글자가 빠져 보이는 문제가 있어 쓰지 않는다.
import PDFDocument from "pdfkit";
import type { ReportData } from "./data.ts";
import { LEVEL_NAME } from "../practice/levels.ts";
import { KIND_LABEL, KINDS } from "../htp/store.ts";

const PW = 595.28, PH = 841.89, M = 48, CW = PW - M * 2, FOOT = 40;
const INK = "#22222e", MUTED = "#666678", ACCENT = "#5b54e6", LINE = "#d9d9e6", SOFT = "#f0f0fb";
export interface Fonts { regular: Uint8Array; bold: Uint8Array }
type Doc = InstanceType<typeof PDFDocument>;

class Writer {
  hasGlyph: (cp: number) => boolean;
  constructor(readonly d: Doc) {
    d.font("R"); const f = (d as any)._font?.font; // fontkit 글꼴 객체: 폰트에 없는 글자(이모지 등)를 걸러내는 데 쓴다
    this.hasGlyph = (cp) => (f?.hasGlyphForCodePoint ? f.hasGlyphForCodePoint(cp) : true);
  }
  safe(s: string) { return Array.from(s.replace(/\r/g, "")).map((c) => (c === "\n" || this.hasGlyph(c.codePointAt(0)!) ? c : "?")).join(""); }
  get y() { return this.d.y; } set y(v: number) { this.d.y = v; }
  room(h: number) { if (this.d.y + h > PH - FOOT - 10) { this.d.addPage(); this.d.y = M; } }
  text(s: string, o: { size?: number; bold?: boolean; color?: string; indent?: number; gap?: number } = {}) {
    const size = o.size ?? 10, t = this.safe(s), x = M + (o.indent ?? 0), width = CW - (o.indent ?? 0);
    this.d.font(o.bold ? "B" : "R").fontSize(size);
    this.room(this.d.heightOfString(t, { width, lineGap: 2 }));
    this.d.fillColor(o.color ?? INK).text(t, x, this.d.y, { width, lineGap: 2 });
    this.d.y += o.gap ?? 3;
  }
  h(s: string) {
    this.room(46); this.d.y += 8; this.text(s, { size: 14, bold: true, gap: 2 });
    this.d.moveTo(M, this.d.y).lineTo(PW - M, this.d.y).lineWidth(0.8).strokeColor(ACCENT).stroke(); this.d.y += 8;
  }
  sub(s: string) { this.room(30); this.d.y += 4; this.text(s, { size: 11.5, bold: true, gap: 2 }); }
  row(cells: string[], widths: number[], o: { bold?: boolean; fill?: boolean } = {}) {
    const size = 9.5, pad = 4; this.d.font(o.bold ? "B" : "R").fontSize(size);
    const ts = cells.map((c) => this.safe(c)), h = Math.max(...ts.map((t, i) => this.d.heightOfString(t, { width: widths[i] - pad * 2 }))) + 8;
    this.room(h); const y = this.d.y, total = widths.reduce((a, b) => a + b, 0);
    if (o.fill) this.d.rect(M, y, total, h).fill(SOFT);
    let x = M; ts.forEach((t, i) => { this.d.fillColor(INK).font(o.bold ? "B" : "R").fontSize(size).text(t, x + pad, y + 4, { width: widths[i] - pad * 2 }); x += widths[i]; });
    this.d.y = y + h; this.d.moveTo(M, this.d.y).lineTo(M + total, this.d.y).lineWidth(0.4).strokeColor(LINE).stroke();
  }
  chart(points: Array<{ date: string; value: number }>, title: string) {
    const h = 110, padL = 34, padB = 20; this.room(h + 30); this.text(title, { size: 9.5, color: MUTED, gap: 2 });
    const top = this.d.y, x0 = M + padL, x1 = M + CW - 10, yb = top + h - padB, yt = top + 6; // pdfkit 은 y 가 아래로 커진다
    const vs = points.map((p) => p.value), lo = Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1, pad = span * 0.15;
    const t = points.map((p) => Date.parse(p.date + "T00:00:00Z")), tmin = Math.min(...t), tspan = Math.max(...t) - tmin || 1;
    const X = (i: number) => (points.length === 1 ? (x0 + x1) / 2 : x0 + ((t[i] - tmin) / tspan) * (x1 - x0)), Y = (v: number) => yb - ((v - (lo - pad)) / (span + pad * 2)) * (yb - yt);
    const d = this.d; d.lineWidth(0.6).strokeColor(MUTED); d.moveTo(x0, yb).lineTo(x1, yb).stroke(); d.moveTo(x0, yb).lineTo(x0, yt).stroke();
    d.font("R").fontSize(8);
    for (const v of [lo, hi]) { d.lineWidth(0.3).strokeColor(LINE).moveTo(x0, Y(v)).lineTo(x1, Y(v)).stroke(); d.fillColor(MUTED).text(String(v), M, Y(v) - 4, { width: padL - 4, align: "right", lineBreak: false }); }
    d.lineWidth(1.6).strokeColor(ACCENT); points.forEach((p, i) => (i === 0 ? d.moveTo(X(i), Y(p.value)) : d.lineTo(X(i), Y(p.value)))); if (points.length > 1) d.stroke();
    points.forEach((p, i) => d.circle(X(i), Y(p.value), 2.8).fill(ACCENT));
    d.fillColor(MUTED).text(points[0].date, X(0) - 4, yb + 4, { lineBreak: false });
    if (points.length > 1) { const s = points[points.length - 1].date; d.text(s, X(points.length - 1) - d.widthOfString(s) + 4, yb + 4, { lineBreak: false }); }
    d.y = top + h + 4;
  }
  bar(label: string, n: number, max: number) {
    this.room(18); const y = this.d.y, lw = 140, bw = 220; this.d.font("R").fontSize(9.5).fillColor(INK).text(this.safe(label), M, y, { width: lw - 6, lineBreak: false });
    this.d.rect(M + lw, y + 1, bw, 9).fill(SOFT); if (n > 0) this.d.rect(M + lw, y + 1, Math.max(3, (n / Math.max(max, 1)) * bw), 9).fill(ACCENT);
    this.d.fillColor(INK).text(String(n), M + lw + bw + 8, y, { lineBreak: false }); this.d.y = y + 17;
  }
}

function decodeImage(dataUrl: string): { buf: Buffer } | null {
  const m = /^data:image\/(jpeg|png);base64,(.+)$/.exec(dataUrl); // webp 는 PDF 에 넣지 않는다
  return m ? { buf: Buffer.from(m[2], "base64") } : null;
}

export async function renderReportPdf(d: ReportData, fonts: Fonts): Promise<Uint8Array> {
  const doc = new PDFDocument({ size: "A4", margin: M, bufferPages: true, info: { Title: "토키 진도 보고서", Producer: "Toki", Creator: "Toki" } });
  const chunks: Buffer[] = []; doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Uint8Array>((res, rej) => { doc.on("end", () => res(new Uint8Array(Buffer.concat(chunks)))); doc.on("error", rej); });
  doc.registerFont("R", Buffer.from(fonts.regular)); doc.registerFont("B", Buffer.from(fonts.bold));
  const w = new Writer(doc); doc.y = M;

  w.text("토키 진도 보고서", { size: 22, bold: true, gap: 4 });
  w.text(`${d.child.nickname} · 만 ${d.child.ageBand}세`, { size: 12, gap: 2 });
  w.text(`작성일 ${d.generatedOn} · 연습 기록 기간 ${d.periodFrom} ~ ${d.periodTo}`, { size: 9.5, color: MUTED, gap: 8 });
  w.text("이 보고서는 토키(화용언어·사회성 연습 및 교육 보조 도구)에 기록된 내용을 정리한 것이에요. 검사 결과의 해석과 판단은 담당 전문가가 합니다.", { size: 9, color: MUTED, gap: 6 });

  w.h("검사 결과 변화");
  if (d.assessments.length === 0) w.text("기록된 검사 결과가 없어요.", { color: MUTED });
  const PHASE = { pre: "사전", follow_up: "추적", post: "사후" } as const;
  for (const a of d.assessments) {
    w.room(120); // 제목·머리글·몇 행이 함께 있도록 공간 확보 (표가 쪽 끝에서 잘리는 것 방지)
    w.sub(`${a.name} (${a.category})`);
    const fixed = [74, 44], rest = (CW - fixed[0] - fixed[1]) / a.fields.length, widths = [...fixed, ...a.fields.map(() => rest)];
    w.row(["날짜", "시점", ...a.fields.map((f) => f.label)], widths, { bold: true, fill: true });
    for (const r of a.records) w.row([r.administeredOn, PHASE[r.phase], ...a.fields.map((f) => String(r.scores[f.key] ?? "-"))], widths);
    doc.y += 6;
    for (const s of a.series) {
      if (s.points.length === 0) continue;
      const dir = s.field.higherIsBetter === undefined ? "" : s.field.higherIsBetter ? " · 높을수록 좋은 점수" : " · 낮을수록 좋은 점수";
      if (s.points.length >= 2) w.chart(s.points, `${s.field.label}${dir}${s.changeText ? " · " + s.changeText : ""}`);
      else w.text(`${s.field.label}: ${s.points[0].value} (${s.points[0].date}) — 비교할 이전 기록이 아직 없어요.`, { size: 9.5, color: MUTED });
    }
  }
  for (const a of d.drawingAssessments) w.text(`${a.name}: ${a.dates.join(", ")} 시행`, { size: 10 });

  w.h("앱 연습 요약");
  const p = d.practice, max = Math.max(...Object.values(p.levelCounts), 1);
  w.text(p.count === 0 ? "이 기간에는 연습한 이야기가 없어요." : `${p.activeDays}일 동안 이야기 ${p.count}개를 연습했어요. 실제 생활 미션은 ${p.missionsDone}개를 보호자가 확인했고, ${p.missionsOpen}개가 확인을 기다려요.`);
  if (p.count > 0) { w.text("아이가 한 말의 종류 (횟수)", { size: 9.5, color: MUTED, gap: 2 }); ([1, 2, 3, 4] as const).forEach((l) => w.bar(`${l}단계 ${LEVEL_NAME[l]}`, p.levelCounts[l], max)); w.bar("분류되지 않음", p.noLevel, max); }

  w.h("그림 검사 기록");
  if (d.htp.length === 0) w.text("기록이 없어요.", { color: MUTED });
  for (const h of d.htp) w.text(`${h.date}${h.durationMin != null ? ` · ${h.durationMin}분` : ""}${h.checked.length ? ` · 관찰 체크: ${h.checked.join(", ")}` : ""}${h.note ? ` · 메모: ${h.note}` : ""}`, { size: 9.5 });
  // 그림이 있는 가장 최근 두 시점을, 오래된 것이 왼쪽에 오도록
  const withImg = d.htp.filter((h) => Object.keys(h.images).length > 0).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2).sort((a, b) => a.date.localeCompare(b.date));
  if (withImg.length >= 1) {
    w.sub(withImg.length === 2 ? `그림 비교 (${withImg[0].date} → ${withImg[1].date})` : `그림 (${withImg[0].date})`);
    const colW = (CW - 20) / 3, cell = colW / withImg.length - 4; w.room(cell + 24); const top = doc.y;
    withImg.forEach((h, ri) => KINDS.forEach((k, ki) => {
      const img = h.images[k] ? decodeImage(h.images[k]!) : null; if (!img) return;
      const x = M + ki * (colW + 10) + ri * (cell + 6);
      try { doc.image(img.buf, x, top, { fit: [cell, cell] }); } catch { return; }
      doc.font("R").fontSize(7.5).fillColor(MUTED).text(w.safe(`${KIND_LABEL[k]} ${h.date.slice(5)}`), x, top + cell + 3, { lineBreak: false });
    }));
    doc.y = top + cell + 18;
  }

  w.h("회기 메모");
  if (d.notes.length === 0) w.text("메모가 없어요.", { color: MUTED });
  for (const n of d.notes) w.text(`${n.date}  ${n.body}`, { size: 9.5 });

  // 쪽 번호·안내 (마지막에 모든 쪽에 그린다. 아래 여백에 그릴 때 자동 쪽 넘김이 일어나지 않게 여백을 잠시 0 으로)
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i); const bm = doc.page.margins.bottom; doc.page.margins.bottom = 0;
    doc.font("R").fontSize(7.5).fillColor(MUTED);
    doc.text("토키 · 연습·교육 보조 도구 · 해석은 전문가가 합니다", M, PH - 30, { lineBreak: false });
    const s = `${i + 1} / ${range.count}`; doc.text(s, PW - M - doc.widthOfString(s), PH - 30, { lineBreak: false });
    doc.page.margins.bottom = bm;
  }
  doc.end();
  return done;
}
