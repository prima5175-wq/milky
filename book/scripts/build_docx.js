// 조립된 마크다운 초고 → 편집장 제출용 .docx
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak,
} = require('docx');

const BOOK = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(BOOK, '북스펙-초고-v2.md'), 'utf8');
const lines = src.split('\n');

// **bold** 인라인 → TextRun[] (본문 크기 기본)
function runs(text, opts = {}) {
  const size = opts.size || 22; // half-points → 11pt
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(s => s !== '');
  return parts.map(p => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return new TextRun({ text: p.slice(2, -2), bold: true, size, font: '맑은 고딕' });
    }
    return new TextRun({ text: p, size, font: '맑은 고딕' });
  });
}

const children = [];

// ── 표지 ──
children.push(new Paragraph({ text: '', spacing: { before: 2400 } }));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: '대치동 윤원장의 북스펙', bold: true, size: 56, font: '맑은 고딕' })],
  spacing: { after: 240 },
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: '대치동 상위 1% 부모들의 선택은 바로 이것!', bold: true, size: 28, color: '444444', font: '맑은 고딕' })],
  spacing: { after: 160 },
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: '읽는 순간, 오너가 된다 · 문답 50', size: 24, italics: true, color: '666666', font: '맑은 고딕' })],
  spacing: { after: 1600 },
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: '저자 윤혜림 (대치동 윤원장)', size: 24, font: '맑은 고딕' })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: '초고 v1 · 편집장 검토용', size: 20, color: '888888', font: '맑은 고딕' })],
  spacing: { after: 200 },
}));
children.push(new Paragraph({ children: [new PageBreak()] }));

let inFrontMatter = true;
for (let raw of lines) {
  const line = raw.replace(/\s+$/, '');
  if (line.startsWith('# ')) { inFrontMatter = true; continue; }      // 표지에서 처리
  if (/^#{3,5} /.test(line) && inFrontMatter) continue;               // 표지 부제들
  if (line.startsWith('> ')) continue;                                 // 내부 메모
  if (line.trim() === '---') { inFrontMatter = false; continue; }

  if (line.startsWith('## ')) {
    // 파트(대단원)
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: runs(line.slice(3).replace(/\*\*/g, ''), { size: 30 }),
      spacing: { before: 200, after: 200 },
    }));
    inFrontMatter = false;
    continue;
  }
  if (line.startsWith('### ')) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: runs(line.slice(4).replace(/\*\*/g, ''), { size: 26 }),
      spacing: { before: 320, after: 120 },
    }));
    inFrontMatter = false;
    continue;
  }
  if (line.trim() === '') continue;

  // 본문
  children.push(new Paragraph({
    children: runs(line, { size: 22 }),
    spacing: { after: 160, line: 360 },
    alignment: AlignmentType.JUSTIFIED,
  }));
}

const doc = new Document({
  creator: '대치동 윤원장',
  title: '대치동 윤원장의 북스펙',
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = path.join(BOOK, '대치동_윤원장의_북스펙_초고v2.docx');
  fs.writeFileSync(out, buf);
  console.log('wrote', out, buf.length, 'bytes');
});
