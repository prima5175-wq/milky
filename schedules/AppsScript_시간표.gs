/***************************************************************************
 * 강사 시간표 자동화 시스템 (대치 · 도곡 · 구룡초)  —  30분 단위 · 통합 보기
 * 입력 시트에 "강사 / 지점 / 정규·방학 / 요일(체크) / 시작·종료" 한 줄만 적으면
 *   → 통합 정규/방학 시간표 · 지점별 데일리현황 · 지점별 급여(소계·합계) · 대시보드 자동
 * ------------------------------------------------------------------------
 * 설치: 새 스프레드시트 → [확장 프로그램]→[Apps Script] → 코드 붙여넣기 → buildAll 실행
 *       이후 [강사시간표]→[전체 다시 생성] (이름/시급/월급·입력 일정은 유지)
 * 시간: 24시간 숫자(오후1시=13, 3시반=15.5, 7시반=19.5). 요일은 체크박스 클릭.
 ***************************************************************************/

var CONFIG = {
  YEAR: 2026,
  BRANCHES: ['대치', '도곡', '구룡초'],
  PERBR: 12,                                  // ★ 지점별 강사 정원
  지점강사: { '대치': ['이도연','정호암'], '도곡': [], '구룡초': [] }, // 신규생성 시 초기 이름

  LASTIN: 162,
  DAILY_START: new Date(2026, 6, 1),
  DAILY_END:   new Date(2026, 7, 31),

  방학: {
    '대치':  { start: new Date(2026, 6, 24), end: new Date(2026, 7, 20) },
    '도곡':  { start: new Date(2026, 6, 23), end: new Date(2026, 7, 20) },
    '구룡초': { start: new Date(2026, 6, 24), end: new Date(2026, 7, 20) }
  },
  방학운영: { open: 9, close: 19.5, 휴식: [12, 12.5] },
  정규운영: {
    '대치':  { 평일: [9, 21],  토: [9, 17], 일: [9, 14] },   // 대치는 주중 9시부터
    '도곡':  { 평일: [12, 21], 토: [9, 17], 일: [9, 14] },
    '구룡초': { 평일: [12, 21], 토: [9, 17], 일: [9, 14] }
  },

  샘플: [
    ['이도연','대치점','정규','월~금', 13,  21],
    ['이도연','대치점','방학','월~금', 10.5, 19],
    ['정호암','대치점','정규','월화금', 14, 18],
    ['정호암','대치점','정규','토',     10, 15.5],
    ['정호암','대치점','방학','월화금', 9,  15]
  ],

  색: {
    '대치': { head: '#1F4E79', light: '#D6E4F0' },
    '도곡': { head: '#375623', light: '#E2EFD9' },
    '구룡초': { head: '#996600', light: '#F5ECD9' },
    급여:  { head: '#7030A0' },
    closed: '#D9D9D9', vac: '#FCE4D6',
    sat: '#DDEBF7', sun: '#FCE4EC', today: '#FFF2CC', val: '#E2EFDA', input: '#FFF8E1'
  }
};

var SHEETS = {
  대시보드: '대시보드', 급여: '강사_급여', 입력: '입력',
  통합: '통합시간표', 통합방학: '통합방학시간표',
  데일리: { '대치': '데일리현황_대치', '도곡': '데일리현황_도곡', '구룡초': '데일리현황_구룡초' }
};

var WK = ['일','월','화','수','목','금','토'];
var IN = "'" + SHEETS.입력 + "'!";
var DAYCOL = { '월':'D','화':'E','수':'F','목':'G','금':'H','토':'I','일':'J' }; // 입력 요일 체크박스 열, 시작=K 종료=L

/* 급여 시트 레이아웃: 지점별 12행 + 소계행, 마지막 전체합계행 */
function salaryLayout() {
  var blocks = {}, order = [], r = 3;
  CONFIG.BRANCHES.forEach(function (b) {
    var first = r + 1, instr = [];
    for (var i = 0; i < CONFIG.PERBR; i++) instr.push(first + i);
    var blk = { branch: b, headerRow: r, instrRows: instr, subRow: first + CONFIG.PERBR };
    blocks[b] = blk; order.push(blk); r = blk.subRow + 1;
  });
  return { blocks: blocks, order: order, grandRow: r,
           firstInstr: 4, lastInstr: order[order.length - 1].instrRows[CONFIG.PERBR - 1] };
}

/* ----------------------------- 메뉴 ----------------------------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('강사시간표').addItem('전체 다시 생성', 'buildAll').addToUi();
}

/* --------------------------- 메인 빌더 -------------------------- */
function buildAll() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Seoul');
  var errs = [];
  function step(name, fn) { try { return fn(); } catch (e) { errs.push('• ' + name + ' → ' + (e && e.message ? e.message : e)); return null; } }

  // 데일리현황 날짜 범위는 결정적이므로 미리 계산 → 급여연동/대시보드를 데일리 성공여부와 분리
  var nd = dateList(CONFIG.DAILY_START, CONFIG.DAILY_END).length;
  var dDS = 3, dDE = 2 + nd, dTR = dDE + 1;

  step('강사_급여', function () { buildSalary(ss); });
  step('입력', function () { buildInput(ss); });
  step('통합 정규시간표', function () { buildCombinedRegular(ss); });
  step('통합 방학시간표', function () { buildCombinedVacation(ss); });
  step('데일리현황_대치', function () { buildDaily(ss, '대치', false); });
  step('데일리현황_도곡', function () { buildDaily(ss, '도곡', true); });
  step('데일리현황_구룡초', function () { buildDaily(ss, '구룡초', false); });
  step('급여 연동', function () { linkSalary(ss, dDS, dDE); });
  step('대시보드', function () { buildDashboard(ss, dTR); });
  step('정리/정렬', function () { cleanupSheets(ss); reorderSheets(ss); });

  if (errs.length) SpreadsheetApp.getUi().alert('일부 단계 오류(나머지는 생성됨):\n\n' + errs.join('\n'));
  else { var d = ss.getSheetByName(SHEETS.입력); if (d) ss.setActiveSheet(d); ss.toast('완료!', '강사시간표', 6); }
}

/* ----------------------------- 유틸 ----------------------------- */
function freshSheet(ss, name) { var sh = ss.getSheetByName(name); if (sh) ss.deleteSheet(sh); return ss.insertSheet(name); }
function colLetter(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; }
function pad(n) { return (n < 10 ? '0' : '') + n; }
function fmtHM(t) { var h = Math.floor(t + 1e-9); var m = (Math.round((t - h) * 60) === 30) ? '30' : '00'; return pad(h) + ':' + m; }
function fmtMD(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }
function dateList(start, end) { var out = [], d = new Date(start); while (d <= end) { out.push(new Date(d)); d.setDate(d.getDate() + 1); } return out; }
function expandDays(text) {
  var order = '월화수목금토일', res = [false, false, false, false, false, false, false];
  if (text === true || text === false) return res;
  text = String(text || '').trim(); if (!text) return res;
  if (text.indexOf('~') >= 0) {
    var p = text.split('~'), a = order.indexOf(p[0].trim().charAt(0)), bs = p[1].trim(), b = order.indexOf(bs.charAt(bs.length - 1));
    if (a >= 0 && b >= 0 && a <= b) for (var i = a; i <= b; i++) res[i] = true;
  } else { for (var j = 0; j < text.length; j++) { var idx = order.indexOf(text.charAt(j)); if (idx >= 0) res[idx] = true; } }
  return res;
}
function titleRow(sh, text, cols, color) {
  sh.getRange(1, 1, 1, cols).merge().setValue(text).setBackground(color || '#404040').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(1, 30);
}
function styleHead(range, bg) { range.setBackground(bg).setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle'); }

/* ===================== 강사 · 급여 (지점별 12 + 소계 + 합계) === */
function buildSalary(ss) {
  var lay = salaryLayout();
  // 기존 데이터 수집(이름/소속/형태/시급/월급/비고)
  var old = ss.getSheetByName(SHEETS.급여), oldInstr = [];
  if (old) {
    try {
      old.getRange(3, 1, 60, 11).getValues().forEach(function (rw) {
        var nm = String(rw[1] || '').trim();
        if (!nm || nm.indexOf('소계') >= 0 || nm.indexOf('합계') >= 0 || nm.indexOf('■') >= 0) return;
        oldInstr.push({ name: nm, 소속: String(rw[2] || '').trim(), 형태: rw[3] || '시급제', 시급: rw[4] || '', 월급: rw[5] || '', 비고: rw[10] || '' });
      });
    } catch (e) {}
  }
  var bucket = { '대치': [], '도곡': [], '구룡초': [] }, leftover = [];
  oldInstr.forEach(function (o) {
    var key = o.소속 === '대치점' ? '대치' : o.소속 === '도곡점' ? '도곡' : o.소속 === '구룡초점' ? '구룡초' : null;
    if (key && bucket[key].length < CONFIG.PERBR) bucket[key].push(o); else leftover.push(o);
  });
  CONFIG.BRANCHES.forEach(function (b) { while (bucket[b].length < CONFIG.PERBR && leftover.length) bucket[b].push(leftover.shift()); });
  if (oldInstr.length === 0) CONFIG.BRANCHES.forEach(function (b) {
    (CONFIG.지점강사[b] || []).forEach(function (nm) { if (bucket[b].length < CONFIG.PERBR) bucket[b].push({ name: nm, 형태: '시급제' }); });
  });

  var sh = freshSheet(ss, SHEETS.급여);
  var headers = ['번호','강사명','소속지점','급여형태','시급(원)','월급(원)','정규시간(h)','방학시간(h)','총시간(h)','산출급여(원)','비고'];
  titleRow(sh, '강사 · 급여 계산  (지점별 ' + CONFIG.PERBR + '명 · 지점 소계 · 전체 합계)', headers.length, CONFIG.색.급여.head);
  sh.getRange(2, 1, 1, headers.length).setValues([headers]);
  styleHead(sh.getRange(2, 1, 1, headers.length), CONFIG.색.급여.head);

  lay.order.forEach(function (blk) {
    var b = blk.branch, C = CONFIG.색[b], f = blk.instrRows[0], l = blk.instrRows[CONFIG.PERBR - 1];
    sh.getRange(blk.headerRow, 1, 1, headers.length).merge().setValue('■ ' + b + '점')
      .setBackground(C.head).setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('left');
    var rows = [];
    for (var i = 0; i < CONFIG.PERBR; i++) {
      var o = bucket[b][i] || {};
      rows.push([i + 1, o.name || '', b + '점', o.형태 || '시급제', o.시급 || '', o.월급 || '', '', '', '', '', o.비고 || '']);
    }
    sh.getRange(f, 1, CONFIG.PERBR, headers.length).setValues(rows);
    sh.getRange(f, 4, CONFIG.PERBR, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['시급제','월급제'], true).build());
    sh.getRange(f, 5, CONFIG.PERBR, 2).setNumberFormat('#,##0"원"');
    sh.getRange(f, 7, CONFIG.PERBR, 3).setNumberFormat('0.0');
    sh.getRange(f, 10, CONFIG.PERBR, 1).setNumberFormat('#,##0"원"');
    sh.getRange(f, 2, CONFIG.PERBR, 1).setBackground(CONFIG.색.input);
    sh.getRange(f, 1, CONFIG.PERBR, headers.length).setHorizontalAlignment('center');
    // 소계행
    sh.getRange(blk.subRow, 1, 1, 6).merge().setValue(b + '점 소계').setHorizontalAlignment('right').setFontWeight('bold');
    ['G','H','I','J'].forEach(function (col, ci) { sh.getRange(blk.subRow, 7 + ci).setFormula('=SUM(' + col + f + ':' + col + l + ')'); });
    sh.getRange(blk.subRow, 7, 1, 3).setNumberFormat('0.0');
    sh.getRange(blk.subRow, 10, 1, 1).setNumberFormat('#,##0"원"');
    sh.getRange(blk.subRow, 1, 1, headers.length).setBackground(C.light).setFontWeight('bold');
  });
  // 전체 합계행
  var g = lay.grandRow;
  sh.getRange(g, 1, 1, 6).merge().setValue('전체 합계').setHorizontalAlignment('right').setFontWeight('bold');
  ['G','H','I','J'].forEach(function (col, ci) {
    sh.getRange(g, 7 + ci).setFormula('=' + lay.order.map(function (blk) { return col + blk.subRow; }).join('+'));
  });
  sh.getRange(g, 7, 1, 3).setNumberFormat('0.0'); sh.getRange(g, 10, 1, 1).setNumberFormat('#,##0"원"');
  sh.getRange(g, 1, 1, headers.length).setBackground('#404040').setFontColor('#FFFFFF').setFontWeight('bold');

  sh.getRange(2, 1, g - 1, headers.length).setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  [50,100,80,80,90,100,90,90,90,110,120].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.setFrozenRows(2);
  sh.getRange(g + 2, 1).setValue('※ 노란 "강사명" 칸에 이름 입력(지점 섹션별). 시간·급여·소계·합계는 자동 계산됩니다.').setFontColor('#808080').setFontSize(10);
}

function linkSalary(ss, ds, de) {
  var lay = salaryLayout(), sh = ss.getSheetByName(SHEETS.급여);
  lay.order.forEach(function (blk) {
    var DB = "'" + SHEETS.데일리[blk.branch] + "'";
    for (var j = 0; j < CONFIG.PERBR; j++) {
      var r = blk.instrRows[j], col = colLetter(3 + j);
      sh.getRange(r, 7).setFormula('=IF($B' + r + '="","",' + sumByGubun(DB, col, ds, de, '정규') + ')');
      sh.getRange(r, 8).setFormula('=IF($B' + r + '="","",' + sumByGubun(DB, col, ds, de, '방학') + ')');
      sh.getRange(r, 9).setFormula('=IF($B' + r + '="","",G' + r + '+H' + r + ')');
      sh.getRange(r, 10).setFormula('=IF($B' + r + '="","",IF($D' + r + '="월급제",$F' + r + ',I' + r + '*$E' + r + '))');
    }
  });
}
function sumByGubun(sheet, col, ds, de, gubun) {
  return 'SUMIF(' + sheet + '!$N$' + ds + ':$N$' + de + ',"' + gubun + '",' + sheet + '!' + col + '$' + ds + ':' + col + '$' + de + ')';
}

/* ===================== 입력 시트 (요일 체크박스) =========== */
function buildInput(ss) {
  var L = CONFIG.LASTIN, lay = salaryLayout(), old = ss.getSheetByName(SHEETS.입력), prevRows = [];
  if (old) {
    try {
      var isNew = (old.getRange(2, 4).getValue() === '월');
      if (isNew) {
        old.getRange(3, 1, L - 2, 13).getValues().forEach(function (a) {
          if (String(a[0]).trim() === '') return;
          prevRows.push({ name:a[0], 지점:a[1], 구분:a[2], days:[a[3],a[4],a[5],a[6],a[7],a[8],a[9]], 시작:a[10], 종료:a[11], 비고:a[12] });
        });
      } else {
        old.getRange(3, 1, L - 2, 6).getValues().forEach(function (b) {
          if (String(b[0]).trim() === '') return;
          prevRows.push({ name:b[0], 지점:b[1], 구분:b[2], days:expandDays(b[3]), 시작:b[4], 종료:b[5], 비고:'' });
        });
      }
    } catch (e) {}
  }
  var sh = freshSheet(ss, SHEETS.입력);
  var headers = ['강사명','지점','구분','월','화','수','목','금','토','일','시작','종료','비고'];
  var ncols = headers.length;
  titleRow(sh, '강사 일정 입력  —  요일은 체크박스 클릭, 시간만 적으면 모든 시간표 자동 완성', ncols, '#C55A11');
  sh.getRange(2, 1, 1, ncols).setValues([headers]);
  styleHead(sh.getRange(2, 1, 1, ncols), '#C55A11');
  sh.getRange(2, 9).setBackground(CONFIG.색.sat).setFontColor('#1F4E79');
  sh.getRange(2, 10).setBackground(CONFIG.색.sun).setFontColor('#C00000');
  sh.getRange(2, ncols + 1).setValue('시간=24시간 숫자(오후1시=13, 3시반=15.5, 7시반=19.5) · 요일은 체크 · 요일별 시간 다르면 줄 나눠 입력').setFontColor('#808080').setFontSize(10);

  sh.getRange(3, 4, L - 2, 7).insertCheckboxes();
  var src = prevRows.length ? prevRows :
    CONFIG.샘플.map(function (s) { return { name:s[0], 지점:s[1], 구분:s[2], days:expandDays(s[3]), 시작:s[4], 종료:s[5], 비고:'' }; });
  if (src.length) {
    var abc = [], dys = [], kl = [], mm = [];
    src.forEach(function (s) { abc.push([s.name, s.지점, s.구분]); dys.push(s.days.map(function (x) { return x === true; })); kl.push([s.시작, s.종료]); mm.push([s.비고 || '']); });
    sh.getRange(3, 1, src.length, 3).setValues(abc);
    sh.getRange(3, 4, src.length, 7).setValues(dys);
    sh.getRange(3, 11, src.length, 2).setValues(kl);
    sh.getRange(3, 13, src.length, 1).setValues(mm);
  }
  sh.getRange(3, 1, L - 2, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInRange(ss.getSheetByName(SHEETS.급여).getRange('B' + lay.firstInstr + ':B' + lay.lastInstr), true).setAllowInvalid(true).build());
  sh.getRange(3, 2, L - 2, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['대치점','도곡점','구룡초점'], true).build());
  sh.getRange(3, 3, L - 2, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['정규','방학'], true).build());
  sh.getRange(3, 1, L - 2, 3).setBackground(CONFIG.색.input);
  sh.getRange(3, 11, L - 2, 2).setBackground(CONFIG.색.input).setNumberFormat('0.0##');
  sh.getRange(2, 1, L - 1, ncols).setBorder(true, true, true, true, true, true, '#D9D9D9', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(3, 1, L - 2, ncols).setHorizontalAlignment('center');
  [80,70,55,32,32,32,32,32,32,32,70,70,160].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.setFrozenRows(2); sh.setFrozenColumns(3);
}

/* ===================== 통합 정규시간표 (3지점 좌우) ========= */
function regOper(d, t, sun, branch) {
  var h = CONFIG.정규운영[branch] || CONFIG.정규운영['대치'];
  if (d <= 4) return t >= h.평일[0] && t < h.평일[1];
  if (d === 5) return t >= h.토[0] && t < h.토[1];
  if (d === 6) return sun && t >= h.일[0] && t < h.일[1];
  return false;
}
function vacCell(BF, w, t, L) {
  var dc = DAYCOL[w];
  return '=IFERROR(TEXTJOIN(", ",TRUE,FILTER(' + IN + '$A$3:$A$' + L + ',(' + IN + '$B$3:$B$' + L + '="' + BF +
    '")*(' + IN + '$C$3:$C$' + L + '="방학")*(' + IN + '$' + dc + '$3:$' + dc + '$' + L + '=TRUE)*(' +
    IN + '$K$3:$K$' + L + '<=' + t + ')*(' + IN + '$L$3:$L$' + L + '>' + t + '))),"")';
}
function buildCombinedRegular(ss) {
  var sh = freshSheet(ss, SHEETS.통합), L = CONFIG.LASTIN, days = ['월','화','수','목','금','토','일'];
  var brs = [{ b:'대치', sun:true }, { b:'도곡', sun:false }, { b:'구룡초', sun:true }];
  var ncols = 1 + brs.length * 7;
  titleRow(sh, '통합 정규시간표 (대치 · 도곡 · 구룡초)   30분 단위 · 한 칸 여러 강사 · 입력시트 자동', ncols, '#C55A11');
  sh.getRange(2, 1, 2, 1).merge().setValue('시간'); styleHead(sh.getRange(2, 1, 2, 1), '#404040');
  for (var bi = 0; bi < brs.length; bi++) {
    var sc = 2 + bi * 7, C = CONFIG.색[brs[bi].b];
    sh.getRange(2, sc, 1, 7).merge().setValue(brs[bi].b + '점'); styleHead(sh.getRange(2, sc, 1, 7), C.head);
    sh.getRange(3, sc, 1, 7).setValues([days]); styleHead(sh.getRange(3, sc, 1, 7), C.head);
    sh.getRange(3, sc + 5).setBackground(CONFIG.색.sat).setFontColor('#1F4E79');
    sh.getRange(3, sc + 6).setBackground(CONFIG.색.sun).setFontColor('#C00000');
  }
  var slots = [], steps = Math.round((20.5 - 9) / 0.5); for (var s = 0; s <= steps; s++) slots.push(9 + s * 0.5);
  var dataStart = 4, labels = [], grid = [];
  for (var i = 0; i < slots.length; i++) {
    var t = slots[i]; labels.push([fmtHM(t) + '~' + fmtHM(t + 0.5)]); var row = [];
    for (var bj = 0; bj < brs.length; bj++) {
      var BF = brs[bj].b + '점';
      for (var d = 0; d < 7; d++) {
        if (!regOper(d, t, brs[bj].sun, brs[bj].b)) { row.push(''); }
        else {
          var dc = DAYCOL[days[d]];
          row.push('=IFERROR(TEXTJOIN(", ",TRUE,FILTER(' + IN + '$A$3:$A$' + L + ',(' + IN + '$B$3:$B$' + L + '="' + BF +
            '")*(' + IN + '$C$3:$C$' + L + '="정규")*(' + IN + '$' + dc + '$3:$' + dc + '$' + L + '=TRUE)*(' +
            IN + '$K$3:$K$' + L + '<=' + t + ')*(' + IN + '$L$3:$L$' + L + '>' + t + '))),"")');
        }
      }
    }
    grid.push(row);
  }
  var R = slots.length;
  sh.getRange(dataStart, 1, R, 1).setValues(labels).setBackground('#F2F2F2').setFontWeight('bold').setHorizontalAlignment('center').setFontSize(9);
  sh.getRange(dataStart, 2, R, ncols - 1).setFormulas(grid).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true).setFontSize(9);
  for (var k = 0; k < R; k++) {
    for (var bk = 0; bk < brs.length; bk++) for (var d2 = 0; d2 < 7; d2++)
      if (!regOper(d2, slots[k], brs[bk].sun, brs[bk].b)) sh.getRange(dataStart + k, 2 + bk * 7 + d2).setBackground(CONFIG.색.closed);
    sh.setRowHeight(dataStart + k, 30);
  }
  sh.getRange(2, 1, R + 2, ncols).setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  sh.setColumnWidth(1, 95); for (var c = 2; c <= ncols; c++) sh.setColumnWidth(c, 78);
  sh.setFrozenRows(3); sh.setFrozenColumns(1);
}

/* ===================== 통합 방학시간표 (3지점 위아래·날짜별) = */
function buildCombinedVacation(ss) {
  var sh = freshSheet(ss, SHEETS.통합방학), L = CONFIG.LASTIN;
  var slots = [], steps = Math.round((19 - 9) / 0.5); for (var s = 0; s <= steps; s++) slots.push(9 + s * 0.5);
  var ncols = 2 + slots.length, brk = CONFIG.방학운영.휴식;
  titleRow(sh, '통합 방학시간표 (대치 · 도곡 · 구룡초)   날짜별 · 30분 단위 · 입력시트 자동', ncols, '#C55A11');

  var rowPtr = 2;
  CONFIG.BRANCHES.forEach(function (branch) {
    var C = CONFIG.색[branch], BF = branch + '점', v = CONFIG.방학[branch], noSunday = (branch === '도곡');
    // 섹션 제목
    sh.getRange(rowPtr, 1, 1, ncols).merge().setValue('■ ' + branch + '점  방학 (' + fmtMD(v.start) + '~' + fmtMD(v.end) + ')')
      .setBackground(C.head).setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('left');
    var hRow = rowPtr + 1;
    sh.getRange(hRow, 1, 1, 2).setValues([['날짜','요일']]);
    sh.getRange(hRow, 3, 1, slots.length).setValues([slots.map(function (t) { return fmtHM(t); })]);
    styleHead(sh.getRange(hRow, 1, 1, ncols), C.head); sh.getRange(hRow, 3, 1, slots.length).setFontSize(8);

    var dates = dateList(v.start, v.end), dataStart = hRow + 1, aCol = [], bCol = [], grid = [];
    for (var i = 0; i < dates.length; i++) {
      var dt = dates[i], w = WK[dt.getDay()], closed = noSunday && w === '일';
      aCol.push([dt]); bCol.push([w]); var row = [];
      for (var j = 0; j < slots.length; j++) {
        var t = slots[j], isBreak = (t >= brk[0] && t < brk[1]);
        row.push((closed || isBreak) ? '' : vacCell(BF, w, t, L));
      }
      grid.push(row);
    }
    sh.getRange(dataStart, 1, dates.length, 1).setValues(aCol).setNumberFormat('m"/"d').setHorizontalAlignment('center');
    sh.getRange(dataStart, 2, dates.length, 1).setValues(bCol).setHorizontalAlignment('center');
    sh.getRange(dataStart, 3, dates.length, slots.length).setFormulas(grid).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true).setFontSize(8);
    for (var j2 = 0; j2 < slots.length; j2++) if (slots[j2] >= brk[0] && slots[j2] < brk[1]) sh.getRange(dataStart, 3 + j2, dates.length, 1).setBackground(CONFIG.색.closed);
    for (var i2 = 0; i2 < dates.length; i2++) {
      var w2 = bCol[i2][0], r = dataStart + i2;
      if (noSunday && w2 === '일') sh.getRange(r, 3, 1, slots.length).setBackground(CONFIG.색.closed);
      if (w2 === '토') sh.getRange(r, 2).setBackground(CONFIG.색.sat).setFontColor('#1F4E79');
      if (w2 === '일') sh.getRange(r, 2).setBackground(CONFIG.색.sun).setFontColor('#C00000');
      sh.setRowHeight(r, 28);
    }
    sh.getRange(rowPtr, 1, dates.length + 2, ncols).setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
    rowPtr = dataStart + dates.length + 1; // 한 줄 띄움
  });
  sh.setColumnWidth(1, 52); sh.setColumnWidth(2, 38);
  for (var c = 3; c <= ncols; c++) sh.setColumnWidth(c, 54);
  sh.setFrozenColumns(2);
}

/* ===================== 데일리 현황 (지점별 12명) =========== */
function buildDaily(ss, branch, noSunday) {
  var lay = salaryLayout(), blk = lay.blocks[branch];
  var sh = freshSheet(ss, SHEETS.데일리[branch]);
  var C = CONFIG.색[branch], BF = branch + '점', L = CONFIG.LASTIN, v = CONFIG.방학[branch];
  var n = CONFIG.PERBR, cols = 2 + n + 2, mCol = 3 + n, nCol = 4 + n;
  titleRow(sh, '데일리 강사현황 · ' + branch + '점   (입력 시트 기준 자동 계산 · 숫자=근무시간h)', cols, C.head);
  sh.getRange(2, 1).setValue('날짜'); sh.getRange(2, 2).setValue('요일');
  var hForm = [];
  for (var k = 0; k < n; k++) { var sref = "'" + SHEETS.급여 + "'!B" + blk.instrRows[k]; hForm.push("=IF(" + sref + '="","",' + sref + ")"); }
  sh.getRange(2, 3, 1, n).setFormulas([hForm]);
  sh.getRange(2, mCol).setValue('일합계'); sh.getRange(2, nCol).setValue('구분');
  styleHead(sh.getRange(2, 1, 1, cols), C.head);

  var dates = dateList(CONFIG.DAILY_START, CONFIG.DAILY_END), dataStart = 3, dataEnd = 2 + dates.length;
  var aCol = [], bCol = [], nColV = [], instr = [], mColF = [];
  for (var i = 0; i < dates.length; i++) {
    var dt = dates[i], w = WK[dt.getDay()], r = dataStart + i;
    var closed = noSunday && w === '일', vacation = (dt >= v.start && dt <= v.end);
    var gubun = closed ? '휴무' : (vacation ? '방학' : '정규');
    aCol.push([dt]); bCol.push([w]); nColV.push([gubun]); var row = [];
    for (var c = 0; c < n; c++) {
      if (closed) { row.push(''); }
      else {
        var hcell = colLetter(3 + c) + '$2', dcd = DAYCOL[w];
        row.push('=IF(' + hcell + '="","",IFERROR(SUMPRODUCT((' + IN + '$A$3:$A$' + L + '=' + hcell + ')*(' +
          IN + '$B$3:$B$' + L + '="' + BF + '")*(' + IN + '$C$3:$C$' + L + '="' + gubun + '")*(' +
          IN + '$' + dcd + '$3:$' + dcd + '$' + L + '=TRUE)*(' + IN + '$L$3:$L$' + L + '-' + IN + '$K$3:$K$' + L + ')),0))');
      }
    }
    instr.push(row);
    mColF.push(['=SUM(' + colLetter(3) + r + ':' + colLetter(2 + n) + r + ')']);
  }
  sh.getRange(dataStart, 1, dates.length, 1).setValues(aCol).setNumberFormat('m"/"d').setHorizontalAlignment('center');
  sh.getRange(dataStart, 2, dates.length, 1).setValues(bCol).setHorizontalAlignment('center');
  sh.getRange(dataStart, 3, dates.length, n).setFormulas(instr).setNumberFormat('0.#').setHorizontalAlignment('center');
  sh.getRange(dataStart, mCol, dates.length, 1).setFormulas(mColF).setNumberFormat('0.#').setHorizontalAlignment('center');
  sh.getRange(dataStart, nCol, dates.length, 1).setValues(nColV).setHorizontalAlignment('center').setFontColor('#909090');
  for (var j = 0; j < dates.length; j++) {
    var gg = nColV[j][0], r2 = dataStart + j;
    if (gg === '휴무') sh.getRange(r2, 3, 1, n).setBackground(CONFIG.색.closed);
    else if (gg === '방학') sh.getRange(r2, 3, 1, n).setBackground(CONFIG.색.vac);
  }
  var totalRow = dataEnd + 1;
  sh.getRange(totalRow, 2).setValue('합계');
  var tF = []; for (var k2 = 0; k2 < n + 1; k2++) { var cl = colLetter(3 + k2); tF.push('=SUM(' + cl + dataStart + ':' + cl + dataEnd + ')'); }
  sh.getRange(totalRow, 3, 1, n + 1).setFormulas([tF]).setNumberFormat('0.0');
  styleHead(sh.getRange(totalRow, 1, 1, cols), '#595959');
  sh.getRange(2, 1, totalRow - 1, cols).setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  sh.setColumnWidth(1, 56); sh.setColumnWidth(2, 40);
  for (var c2 = 3; c2 <= 2 + n; c2++) sh.setColumnWidth(c2, 62);
  sh.setColumnWidth(mCol, 60); sh.setColumnWidth(nCol, 50);
  sh.setFrozenRows(2); sh.setFrozenColumns(2);
  var rules = [];
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$A' + dataStart + '=TODAY()').setBackground(CONFIG.색.today).setRanges([sh.getRange(dataStart, 1, dates.length, cols)]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setBackground(CONFIG.색.val).setRanges([sh.getRange(dataStart, 3, dates.length, n)]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$B' + dataStart + '="토"').setBackground(CONFIG.색.sat).setRanges([sh.getRange(dataStart, 1, dates.length, 2)]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$B' + dataStart + '="일"').setBackground(CONFIG.색.sun).setRanges([sh.getRange(dataStart, 1, dates.length, 2)]).build());
  sh.setConditionalFormatRules(rules);
  return { dataStart: dataStart, dataEnd: dataEnd, totalRow: totalRow };
}

/* ===================== 경영 대시보드 ======================= */
function buildDashboard(ss, dailyTotalRow) {
  var lay = salaryLayout(), sh = freshSheet(ss, SHEETS.대시보드);
  var SG = "'" + SHEETS.급여 + "'!";
  var Dd = { '대치': "'" + SHEETS.데일리['대치'] + "'!", '도곡': "'" + SHEETS.데일리['도곡'] + "'!", '구룡초': "'" + SHEETS.데일리['구룡초'] + "'!" };
  var tcol = colLetter(3 + CONFIG.PERBR);
  var g = lay.grandRow, RB = 'B' + lay.firstInstr + ':B' + lay.lastInstr, RD = 'D' + lay.firstInstr + ':D' + lay.lastInstr, RJ = 'J' + lay.firstInstr + ':J' + lay.lastInstr;
  var WON = '#,##0"원"', HH = '0.0"h"', NM = '0"명"', PCT = '0.0%';
  titleRow(sh, '경영 대시보드 · 강사 운영 / 인건비 / 손익  (' + CONFIG.YEAR + ')', 5, '#C55A11');
  function section(p, t) { sh.getRange(p, 1, 1, 5).merge().setValue(t).setBackground('#7F7F7F').setFontColor('#FFFFFF').setFontWeight('bold').setVerticalAlignment('middle'); sh.setRowHeight(p, 24); }
  function kv(p, label, formula, fmt, input, big) {
    sh.getRange(p, 1, 1, 2).merge().setValue(label).setFontWeight('bold').setVerticalAlignment('middle');
    var vc = sh.getRange(p, 3, 1, 2).merge();
    if (formula !== null) vc.setFormula(formula);
    if (fmt) vc.setNumberFormat(fmt);
    vc.setHorizontalAlignment('right').setVerticalAlignment('middle').setFontSize(big ? 13 : 11);
    if (big) vc.setFontWeight('bold').setFontColor('#C55A11');
    if (input) vc.setBackground(CONFIG.색.today).setFontColor('#1F4E79').setFontWeight('bold');
    sh.getRange(p, 1, 1, 4).setBorder(true, true, true, true, true, true, '#D9D9D9', SpreadsheetApp.BorderStyle.SOLID); sh.setRowHeight(p, 22);
  }
  section(2, '■ 핵심 운영 지표');
  kv(3, '강사 수', '=COUNTA(' + SG + RB + ')', NM);
  kv(4, '시급제 인원', '=COUNTIF(' + SG + RD + ',"시급제")', NM);
  kv(5, '월급제 인원', '=COUNTIF(' + SG + RD + ',"월급제")', NM);
  kv(6, '총 정규 근무시간', '=' + SG + 'G' + g, HH);
  kv(7, '총 방학 근무시간', '=' + SG + 'H' + g, HH);
  kv(8, '총 근무시간', '=' + SG + 'I' + g, HH);
  section(9, '■ 인건비');
  kv(10, '시급제 인건비', '=SUMIF(' + SG + RD + ',"시급제",' + SG + RJ + ')', WON);
  kv(11, '월급제 인건비', '=SUMIF(' + SG + RD + ',"월급제",' + SG + RJ + ')', WON);
  kv(12, '총 인건비 (월)', '=' + SG + 'J' + g, WON, false, true);
  kv(13, '강사 1인 평균급여', '=IFERROR(' + SG + 'J' + g + '/COUNTA(' + SG + RB + '),0)', WON);
  section(14, '■ 지점별 급여 (소계)');
  kv(15, '대치점', '=' + SG + 'J' + lay.blocks['대치'].subRow, WON);
  kv(16, '도곡점', '=' + SG + 'J' + lay.blocks['도곡'].subRow, WON);
  kv(17, '구룡초점', '=' + SG + 'J' + lay.blocks['구룡초'].subRow, WON);
  section(18, '■ 지점별 총 근무시간');
  kv(19, '대치점', '=' + Dd['대치'] + tcol + dailyTotalRow, HH);
  kv(20, '도곡점', '=' + Dd['도곡'] + tcol + dailyTotalRow, HH);
  kv(21, '구룡초점', '=' + Dd['구룡초'] + tcol + dailyTotalRow, HH);
  section(22, '■ 매출 · 손익  (월 매출을 노란칸에 입력)');
  kv(23, '월 매출 (입력)', null, WON, true);
  kv(24, '총 인건비', '=' + SG + 'J' + g, WON);
  kv(25, '인건비 비율', '=IFERROR(C24/C23,0)', PCT);
  kv(26, '인건비 차감 이익', '=C23-C24', WON, false, true);
  var rules = [];
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0.4).setBackground('#F8CBAD').setFontColor('#C00000').setRanges([sh.getRange('C25:D25')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThanOrEqualTo(0.3).setBackground('#C6E0B4').setFontColor('#375623').setRanges([sh.getRange('C25:D25')]).build());
  sh.setConditionalFormatRules(rules);
  sh.getRange('E2').setValue('← 이름·시급/월급은 [강사_급여], 일정은 [입력] 탭에서 관리하면 자동 반영').setFontColor('#808080').setFontSize(10);
  sh.setColumnWidth(1, 150); sh.setColumnWidth(2, 70); sh.setColumnWidth(3, 110); sh.setColumnWidth(4, 50); sh.setColumnWidth(5, 250);
  sh.setFrozenRows(1);
}

/* ----------------------- 정리/정렬 ------------------------- */
function cleanupSheets(ss) {
  var keep = {};
  [SHEETS.대시보드, SHEETS.급여, SHEETS.입력, SHEETS.통합, SHEETS.통합방학,
   SHEETS.데일리['대치'], SHEETS.데일리['도곡'], SHEETS.데일리['구룡초']].forEach(function (n) { keep[n] = true; });
  ss.getSheets().forEach(function (sh) { if (!keep[sh.getName()]) { try { ss.deleteSheet(sh); } catch (e) {} } });
}
function reorderSheets(ss) {
  [SHEETS.대시보드, SHEETS.급여, SHEETS.입력, SHEETS.통합, SHEETS.통합방학,
   SHEETS.데일리['대치'], SHEETS.데일리['도곡'], SHEETS.데일리['구룡초']]
   .forEach(function (name, idx) { var sh = ss.getSheetByName(name); if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(idx + 1); } });
}
