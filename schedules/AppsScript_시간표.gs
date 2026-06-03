/***************************************************************************
 * 강사 시간표 자동화 시스템 (대치점 · 도곡점)
 * 입력 시트에 "강사 / 지점 / 정규·방학 / 요일 / 시작·종료시간" 한 줄만 적으면
 *   → 정규시간표 · 방학시간표 · 데일리현황 · 급여 · 대시보드가 전부 자동으로 채워짐
 *   → 한 시간대에 여러 강사가 있으면 셀에 "이도연, 정호암" 처럼 모두 표시
 * ------------------------------------------------------------------------
 * 설치
 *   1) 새 Google 스프레드시트 → [확장 프로그램] → [Apps Script]
 *   2) 코드 전체 붙여넣기 → 저장
 *   3) 함수목록 buildAll 선택 → ▶ 실행 (최초 1회 권한 허용)
 *   4) 이후엔 시트 상단 [강사시간표] → [전체 다시 생성]
 *
 * 입력 방법 (입력 시트)
 *   강사명 | 지점 | 구분(정규/방학) | 요일 | 시작 | 종료
 *   · 요일: "월~금" 또는 "월화금" 처럼. (토/일 포함 가능)
 *   · 시간: 24시간 숫자. 오후1시=13, 3시반=15.5, 저녁9시=21, 10시반=10.5
 *   예) 이도연 | 대치점 | 정규 | 월~금 | 13 | 21
 *       정호암 | 대치점 | 정규 | 토   | 10 | 15.5
 *       정호암 | 대치점 | 방학 | 월화금| 9  | 15
 ***************************************************************************/

var CONFIG = {
  YEAR: 2026,
  // 강사 명단(=급여/현황 기준). 실제 이름으로 바꾸면 전부 자동 반영.
  강사: ['이도연','정호암','강사3','강사4','강사5','강사6','강사7','강사8','강사9','강사10'],

  LASTIN: 122,                          // 입력 데이터 행: 3 ~ 122 (120줄)

  DAILY_START: new Date(2026, 6, 1),    // 데일리현황 달력 시작 (2026-07-01)
  DAILY_END:   new Date(2026, 7, 31),   // 끝 (2026-08-31)

  방학: {
    '대치': { start: new Date(2026, 6, 24), end: new Date(2026, 7, 20) }, // 7/24~8/20
    '도곡': { start: new Date(2026, 6, 23), end: new Date(2026, 7, 20) }  // 7/23~8/20
  },

  // 방학 교시: 시간(start~end h, 십진)
  교시: [
    { name: '1부', time: '09:00~10:30', s: 9,    e: 10.5 },
    { name: '2부', time: '10:30~12:00', s: 10.5, e: 12 },
    { name: '3부', time: '12:30~14:00', s: 12.5, e: 14 },
    { name: '정규', time: '14:00~19:30', s: 14,   e: 19.5 }
  ],

  // 샘플 입력(주신 예시) — 그대로 편집/삭제 가능
  샘플: [
    ['이도연','대치점','정규','월~금', 13,  21],
    ['이도연','대치점','방학','월~금', 10.5, 19],
    ['정호암','대치점','정규','월화금', 14, 18],
    ['정호암','대치점','정규','토',     10, 15.5],
    ['정호암','대치점','정규','일',     10, 14],
    ['정호암','대치점','방학','월화금', 9,  15]
  ],

  색: {
    '대치': { head: '#1F4E79', light: '#D6E4F0' },
    '도곡': { head: '#375623', light: '#E2EFD9' },
    급여:  { head: '#7030A0' },
    closed: '#D9D9D9', vac: '#FCE4D6',
    sat: '#DDEBF7', sun: '#FCE4EC', today: '#FFF2CC', val: '#E2EFDA',
    input: '#FFF8E1'
  }
};

var SHEETS = {
  대시보드: '대시보드',
  급여: '강사_급여',
  입력: '입력',
  정규: { '대치': '정규시간표_대치', '도곡': '정규시간표_도곡' },
  방학: { '대치': '방학시간표_대치', '도곡': '방학시간표_도곡' },
  데일리: { '대치': '데일리현황_대치', '도곡': '데일리현황_도곡' }
};

var WK = ['일','월','화','수','목','금','토']; // getDay()
var IN = "'" + SHEETS.입력 + "'!";

/* ----------------------------- 메뉴 ----------------------------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('강사시간표')
    .addItem('전체 다시 생성', 'buildAll').addToUi();
}

/* --------------------------- 메인 빌더 -------------------------- */
function buildAll() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Seoul');

  var errs = [];
  function step(name, fn) {
    try { return fn(); }
    catch (e) { errs.push('• ' + name + ' → ' + (e && e.message ? e.message : e)); return null; }
  }

  step('강사_급여', function () { buildSalary(ss); });
  step('입력',      function () { buildInput(ss); });
  step('정규시간표_대치', function () { buildWeekly(ss, '대치', true); });
  step('정규시간표_도곡', function () { buildWeekly(ss, '도곡', false); });
  step('방학시간표_대치', function () { buildVacation(ss, '대치'); });
  step('방학시간표_도곡', function () { buildVacation(ss, '도곡'); });
  var d대치 = step('데일리현황_대치', function () { return buildDaily(ss, '대치', false); });
  var d도곡 = step('데일리현황_도곡', function () { return buildDaily(ss, '도곡', true); });

  step('급여 연동', function () {
    if (d대치 && d도곡) linkSalary(ss, d대치.dataStart, d대치.dataEnd);
  });
  step('대시보드', function () { if (d대치) buildDashboard(ss, d대치.totalRow); });
  step('정리/정렬', function () { cleanupSheets(ss); reorderSheets(ss); });

  if (errs.length) {
    SpreadsheetApp.getUi().alert(
      '일부 단계 오류(나머지는 생성됨). 메시지를 알려주시면 고쳐드립니다.\n\n' + errs.join('\n'));
  } else {
    var d = ss.getSheetByName(SHEETS.입력);
    if (d) ss.setActiveSheet(d);
    ss.toast('완료! 입력 시트에 강사 일정을 적으면 시간표가 자동으로 채워집니다.', '강사시간표', 6);
  }
}

/* ----------------------------- 유틸 ----------------------------- */
function freshSheet(ss, name) {
  var sh = ss.getSheetByName(name);
  if (sh) ss.deleteSheet(sh);
  return ss.insertSheet(name);
}
function colLetter(n) {
  var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s;
}
function titleRow(sh, text, cols, color) {
  sh.getRange(1, 1, 1, cols).merge().setValue(text)
    .setBackground(color || '#404040').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(12)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(1, 30);
}
function styleHead(range, bg) {
  range.setBackground(bg).setFontColor('#FFFFFF').setFontWeight('bold')
       .setHorizontalAlignment('center').setVerticalAlignment('middle');
}
function dateList(start, end) {
  var out = [], d = new Date(start);
  while (d <= end) { out.push(new Date(d)); d.setDate(d.getDate() + 1); } return out;
}
function pad(n) { return (n < 10 ? '0' : '') + n; }
function fmtMD(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }
function isOperating(d, h, sundayOpen) {
  if (d <= 4) return h >= 12 && h <= 20;          // 월~금 12~21
  if (d === 5) return h >= 9 && h <= 16;           // 토 9~17
  if (d === 6) return sundayOpen && h >= 9 && h <= 13; // 일 9~14
  return false;
}

/* ===================== 강사 · 급여 ========================= */
function buildSalary(ss) {
  var sh = freshSheet(ss, SHEETS.급여);
  var headers = ['번호','강사명','소속지점','급여형태','시급(원)','월급(원)',
                 '정규시간(h)','방학시간(h)','총시간(h)','산출급여(원)','비고'];
  var head = CONFIG.색.급여.head;
  titleRow(sh, '강사 · 급여 계산  (' + CONFIG.YEAR + ')', headers.length, head);
  sh.getRange(2, 1, 1, headers.length).setValues([headers]);
  styleHead(sh.getRange(2, 1, 1, headers.length), head);

  var rows = CONFIG.강사.map(function (nm, i) {
    return [i + 1, nm, '', '시급제', '', '', '', '', '', '', ''];
  });
  sh.getRange(3, 1, rows.length, headers.length).setValues(rows);

  sh.getRange(3, 4, rows.length, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['시급제','월급제'], true).build());
  sh.getRange(3, 3, rows.length, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['대치점','도곡점','공통'], true).setAllowInvalid(true).build());

  sh.getRange(3, 5, rows.length, 2).setNumberFormat('#,##0"원"');
  sh.getRange(3, 7, rows.length, 3).setNumberFormat('0.0');
  sh.getRange(3, 10, rows.length, 1).setNumberFormat('#,##0"원"');
  sh.getRange(2, 1, rows.length + 1, headers.length)
    .setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(3, 1, rows.length, headers.length).setHorizontalAlignment('center');
  [50,90,80,80,90,100,90,90,90,110,120].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.setFrozenRows(2);
  sh.getRange(rows.length + 4, 1).setValue(
    '※ 시급/월급만 입력하세요. 시간·급여는 데일리현황(=입력 시트)에서 자동 계산됩니다. ' +
    '시급제=(정규+방학)×시급, 월급제=월급 고정.').setFontColor('#808080').setFontSize(10);
}

function linkSalary(ss, ds, de) {
  var sh = ss.getSheetByName(SHEETS.급여);
  var n = CONFIG.강사.length;
  var D1 = "'" + SHEETS.데일리['대치'] + "'", D2 = "'" + SHEETS.데일리['도곡'] + "'";
  for (var k = 0; k < n; k++) {
    var r = 3 + k, col = colLetter(3 + k);
    var reg = sumByGubun(D1, col, ds, de, '정규') + '+' + sumByGubun(D2, col, ds, de, '정규');
    var vac = sumByGubun(D1, col, ds, de, '방학') + '+' + sumByGubun(D2, col, ds, de, '방학');
    sh.getRange(r, 7).setFormula('=' + reg);
    sh.getRange(r, 8).setFormula('=' + vac);
    sh.getRange(r, 9).setFormula('=G' + r + '+H' + r);
    sh.getRange(r, 10).setFormula('=IF($D' + r + '="월급제",$F' + r + ',I' + r + '*$E' + r + ')');
  }
}
function sumByGubun(sheet, col, ds, de, gubun) {
  // 구분(N열) 기준 합계
  return 'SUMIF(' + sheet + '!$N$' + ds + ':$N$' + de + ',"' + gubun + '",' +
         sheet + '!' + col + '$' + ds + ':' + col + '$' + de + ')';
}

/* ===================== 입력 시트 =========================== */
function buildInput(ss) {
  var sh = freshSheet(ss, SHEETS.입력);
  var headers = ['강사명','지점','구분','요일','시작(24h)','종료(24h)','요일(자동)','비고'];
  titleRow(sh, '강사 일정 입력  —  여기에 적으면 모든 시간표가 자동으로 채워집니다', headers.length, '#C55A11');
  sh.getRange(2, 1, 1, headers.length).setValues([headers]);
  styleHead(sh.getRange(2, 1, 1, headers.length), '#C55A11');

  // 안내
  sh.getRange(2, 9).setValue('① 시간은 24시간 숫자 (오후1시=13, 3시반=15.5, 저녁9시=21)  ② 요일은 "월~금" 또는 "월화금"  ③ 한 강사가 요일별로 시간이 다르면 줄을 나눠 입력');
  sh.getRange(2, 9).setFontColor('#808080').setFontSize(10);

  // 샘플 입력
  var s = CONFIG.샘플;
  sh.getRange(3, 1, s.length, 6).setValues(s);

  var L = CONFIG.LASTIN;
  // 요일 자동정규화 수식 (G열): "월~금" → "월화수목금"
  var gForm = [];
  for (var r = 3; r <= L; r++) {
    gForm.push(['=IF($D' + r + '="","",IF(ISNUMBER(SEARCH("~",$D' + r + ')),' +
      'MID("월화수목금토일",FIND(LEFT($D' + r + ',1),"월화수목금토일"),' +
      'FIND(RIGHT($D' + r + ',1),"월화수목금토일")-FIND(LEFT($D' + r + ',1),"월화수목금토일")+1),$D' + r + '))']);
  }
  sh.getRange(3, 7, gForm.length, 1).setFormulas(gForm);

  // 드롭다운
  sh.getRange(3, 1, L - 2, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(ss.getSheetByName(SHEETS.급여).getRange('B3:B12'), true).setAllowInvalid(true).build());
  sh.getRange(3, 2, L - 2, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['대치점','도곡점'], true).build());
  sh.getRange(3, 3, L - 2, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['정규','방학'], true).build());

  // 서식
  sh.getRange(3, 1, L - 2, 6).setBackground(CONFIG.색.input);
  sh.getRange(3, 5, L - 2, 2).setNumberFormat('0.0##');
  sh.getRange(2, 1, L - 1, headers.length)
    .setBorder(true, true, true, true, true, true, '#D9D9D9', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(3, 1, L - 2, headers.length).setHorizontalAlignment('center');
  [80,70,60,90,80,80,110,200].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.setFrozenRows(2);
}

/* ===================== 정규 시간표 ========================= */
function buildWeekly(ss, branch, sundayOpen) {
  var sh = freshSheet(ss, SHEETS.정규[branch]);
  var C = CONFIG.색[branch], BF = branch + '점', L = CONFIG.LASTIN;
  var days = ['월','화','수','목','금','토','일'], cols = 8;
  titleRow(sh, '정규 주간 시간표 · ' + branch + '점   (입력 시트에 적으면 자동 표시 · 한 칸에 여러 강사)' +
    (sundayOpen ? '' : ' · 일요일 휴무'), cols, C.head);

  sh.getRange(2, 1).setValue('시간');
  sh.getRange(2, 2, 1, 7).setValues([days]);
  styleHead(sh.getRange(2, 1, 1, cols), C.head);
  sh.getRange(2, 7).setBackground(CONFIG.색.sat).setFontColor('#1F4E79');
  sh.getRange(2, 8).setBackground(CONFIG.색.sun).setFontColor('#C00000');

  var labels = [], grid = [];
  for (var h = 9; h <= 20; h++) {
    labels.push([pad(h) + ':00~' + pad(h + 1) + ':00']);
    var row = [];
    for (var d = 0; d < 7; d++) {
      if (!isOperating(d, h, sundayOpen)) { row.push(''); }
      else {
        row.push('=IFERROR(TEXTJOIN(", ",TRUE,FILTER(' + IN + '$A$3:$A$' + L + ',(' +
          IN + '$B$3:$B$' + L + '="' + BF + '")*(' + IN + '$C$3:$C$' + L + '="정규")*(ISNUMBER(SEARCH("' +
          days[d] + '",' + IN + '$G$3:$G$' + L + ')))*(' + IN + '$E$3:$E$' + L + '<=' + h + ')*(' +
          IN + '$F$3:$F$' + L + '>' + h + '))),"")');
      }
    }
    grid.push(row);
  }
  sh.getRange(3, 1, 12, 1).setValues(labels);
  sh.getRange(3, 2, 12, 7).setFormulas(grid);

  // 시간열/휴무 스타일
  sh.getRange(3, 1, 12, 1).setBackground('#F2F2F2').setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange(3, 2, 12, 7).setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setWrap(true).setFontSize(10);
  for (var i = 0; i < 12; i++) {
    var hh = 9 + i;
    for (var d2 = 0; d2 < 7; d2++) {
      if (!isOperating(d2, hh, sundayOpen))
        sh.getRange(3 + i, 2 + d2).setValue('휴무').setBackground(CONFIG.색.closed).setFontColor('#909090');
    }
    sh.setRowHeight(3 + i, 34);
  }
  sh.getRange(2, 1, 13, cols).setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  sh.setColumnWidth(1, 110);
  for (var c = 2; c <= cols; c++) sh.setColumnWidth(c, 110);
  sh.setFrozenRows(2); sh.setFrozenColumns(1);
}

/* ===================== 방학 시간표 ========================= */
function buildVacation(ss, branch) {
  var sh = freshSheet(ss, SHEETS.방학[branch]);
  var C = CONFIG.색[branch], BF = branch + '점', L = CONFIG.LASTIN, v = CONFIG.방학[branch];
  var noSunday = (branch === '도곡');
  var headers = ['날짜','요일'].concat(CONFIG.교시.map(function (p) { return p.name + '\n' + p.time; })).concat(['비고']);
  var cols = headers.length; // 7
  titleRow(sh, '방학 특강 시간표 · ' + branch + '점   (' + fmtMD(v.start) + '~' + fmtMD(v.end) +
    ' · 입력 시트 자동 표시 · 한 칸에 여러 강사)', cols, C.head);
  sh.getRange(2, 1, 1, cols).setValues([headers]);
  styleHead(sh.getRange(2, 1, 1, cols), C.head);
  sh.getRange(2, 1, 1, cols).setWrap(true);
  sh.setRowHeight(2, 34);

  var dates = dateList(v.start, v.end), dataStart = 3, dataEnd = 2 + dates.length;
  var aCol = [], bCol = [], gCol = [], grid = [];
  for (var i = 0; i < dates.length; i++) {
    var dt = dates[i], w = WK[dt.getDay()];
    aCol.push([dt]); bCol.push([w]);
    var closed = noSunday && w === '일';
    gCol.push([closed ? '휴무' : '']);
    var row = [];
    CONFIG.교시.forEach(function (p) {
      if (closed) { row.push(''); }
      else {
        // 교시 중간 시각에 실제 근무 중인 강사만 그 교시에 표시 (부분 걸침 오표시 방지)
        var mid = (p.s + p.e) / 2;
        row.push('=IFERROR(TEXTJOIN(", ",TRUE,FILTER(' + IN + '$A$3:$A$' + L + ',(' +
          IN + '$B$3:$B$' + L + '="' + BF + '")*(' + IN + '$C$3:$C$' + L + '="방학")*(ISNUMBER(SEARCH("' +
          w + '",' + IN + '$G$3:$G$' + L + ')))*(' + IN + '$E$3:$E$' + L + '<=' + mid + ')*(' +
          IN + '$F$3:$F$' + L + '>' + mid + '))),"")');
      }
    });
    grid.push(row);
  }
  sh.getRange(dataStart, 1, dates.length, 1).setValues(aCol).setNumberFormat('m"/"d').setHorizontalAlignment('center');
  sh.getRange(dataStart, 2, dates.length, 1).setValues(bCol).setHorizontalAlignment('center');
  sh.getRange(dataStart, 3, dates.length, 4).setFormulas(grid)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true).setFontSize(10);
  sh.getRange(dataStart, 7, dates.length, 1).setValues(gCol).setHorizontalAlignment('center');

  for (var j = 0; j < dates.length; j++) {
    var w2 = bCol[j][0], r = dataStart + j;
    if (noSunday && w2 === '일') sh.getRange(r, 3, 1, 4).setBackground(CONFIG.색.closed);
    if (w2 === '토') sh.getRange(r, 2).setBackground(CONFIG.색.sat).setFontColor('#1F4E79');
    if (w2 === '일') sh.getRange(r, 2).setBackground(CONFIG.색.sun).setFontColor('#C00000');
    sh.setRowHeight(r, 30);
  }
  sh.getRange(2, 1, dates.length + 1, cols).setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  sh.setColumnWidth(1, 60); sh.setColumnWidth(2, 42);
  for (var c = 3; c <= 6; c++) sh.setColumnWidth(c, 120);
  sh.setColumnWidth(7, 70);
  sh.setFrozenRows(2); sh.setFrozenColumns(2);
  addTodayRule(sh, dataStart, dataEnd, cols);
}

/* ===================== 데일리 현황 ========================= */
function buildDaily(ss, branch, noSunday) {
  var sh = freshSheet(ss, SHEETS.데일리[branch]);
  var C = CONFIG.색[branch], BF = branch + '점', L = CONFIG.LASTIN, v = CONFIG.방학[branch];
  var n = CONFIG.강사.length;
  var cols = 2 + n + 2; // 날짜,요일 + 강사n + 일합계 + 구분
  var mCol = 3 + n, nCol = 4 + n;       // 일합계, 구분 열번호
  titleRow(sh, '데일리 강사현황 · ' + branch + '점   (입력 시트 기준 자동 계산 · 숫자=근무시간h)', cols, C.head);

  sh.getRange(2, 1).setValue('날짜'); sh.getRange(2, 2).setValue('요일');
  var hForm = [];
  for (var k = 0; k < n; k++) hForm.push("='" + SHEETS.급여 + "'!B" + (3 + k));
  sh.getRange(2, 3, 1, n).setFormulas([hForm]);
  sh.getRange(2, mCol).setValue('일합계'); sh.getRange(2, nCol).setValue('구분');
  styleHead(sh.getRange(2, 1, 1, cols), C.head);

  var dates = dateList(CONFIG.DAILY_START, CONFIG.DAILY_END);
  var dataStart = 3, dataEnd = 2 + dates.length;
  var aCol = [], bCol = [], nColV = [], instr = [], mColF = [];
  for (var i = 0; i < dates.length; i++) {
    var dt = dates[i], w = WK[dt.getDay()], r = dataStart + i;
    var closed = noSunday && w === '일';
    var vacation = (dt >= v.start && dt <= v.end);
    var gubun = closed ? '휴무' : (vacation ? '방학' : '정규');
    aCol.push([dt]); bCol.push([w]); nColV.push([gubun]);

    var row = [];
    for (var c = 0; c < n; c++) {
      if (closed) { row.push(''); }
      else {
        var hcell = colLetter(3 + c) + '$2';
        row.push('=IFERROR(SUMPRODUCT((' + IN + '$A$3:$A$' + L + '=' + hcell + ')*(' +
          IN + '$B$3:$B$' + L + '="' + BF + '")*(' + IN + '$C$3:$C$' + L + '="' + gubun + '")*(ISNUMBER(SEARCH("' +
          w + '",' + IN + '$G$3:$G$' + L + ')))*(' + IN + '$F$3:$F$' + L + '-' + IN + '$E$3:$E$' + L + ')),0)');
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

  // 휴무/방학 음영
  for (var j = 0; j < dates.length; j++) {
    var g = nColV[j][0], r2 = dataStart + j;
    if (g === '휴무') sh.getRange(r2, 3, 1, n).setBackground(CONFIG.색.closed);
    else if (g === '방학') sh.getRange(r2, 3, 1, n).setBackground(CONFIG.색.vac);
  }

  // 합계행
  var totalRow = dataEnd + 1;
  sh.getRange(totalRow, 2).setValue('합계');
  var tF = [];
  for (var k2 = 0; k2 < n + 1; k2++) {
    var cl = colLetter(3 + k2);
    tF.push('=SUM(' + cl + dataStart + ':' + cl + dataEnd + ')');
  }
  sh.getRange(totalRow, 3, 1, n + 1).setFormulas([tF]).setNumberFormat('0.0');
  styleHead(sh.getRange(totalRow, 1, 1, cols), '#595959');

  sh.getRange(2, 1, totalRow - 1, cols).setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  sh.setColumnWidth(1, 56); sh.setColumnWidth(2, 40);
  for (var c2 = 3; c2 <= 2 + n; c2++) sh.setColumnWidth(c2, 60);
  sh.setColumnWidth(mCol, 60); sh.setColumnWidth(nCol, 50);
  sh.setFrozenRows(2); sh.setFrozenColumns(2);

  var rules = [];
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$A' + dataStart + '=TODAY()')
    .setBackground(CONFIG.색.today).setRanges([sh.getRange(dataStart, 1, dates.length, cols)]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0)
    .setBackground(CONFIG.색.val).setRanges([sh.getRange(dataStart, 3, dates.length, n)]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$B' + dataStart + '="토"')
    .setBackground(CONFIG.색.sat).setRanges([sh.getRange(dataStart, 1, dates.length, 2)]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$B' + dataStart + '="일"')
    .setBackground(CONFIG.색.sun).setRanges([sh.getRange(dataStart, 1, dates.length, 2)]).build());
  sh.setConditionalFormatRules(rules);

  return { dataStart: dataStart, dataEnd: dataEnd, totalRow: totalRow };
}

/* ===================== 경영 대시보드 ======================= */
function buildDashboard(ss, dailyTotalRow) {
  var sh = freshSheet(ss, SHEETS.대시보드);
  var n = CONFIG.강사.length, tcol = colLetter(3 + n);
  var SG = "'" + SHEETS.급여 + "'!";
  var D1 = "'" + SHEETS.데일리['대치'] + "'!", D2 = "'" + SHEETS.데일리['도곡'] + "'!";
  var WON = '#,##0"원"', HH = '0.0"h"', NM = '0"명"', PCT = '0.0%';
  titleRow(sh, '경영 대시보드 · 강사 운영 / 인건비 / 손익  (' + CONFIG.YEAR + ')', 5, '#C55A11');

  function section(p, t) {
    sh.getRange(p, 1, 1, 5).merge().setValue(t).setBackground('#7F7F7F').setFontColor('#FFFFFF')
      .setFontWeight('bold').setVerticalAlignment('middle'); sh.setRowHeight(p, 24);
  }
  function kv(p, label, formula, fmt, input, big) {
    sh.getRange(p, 1, 1, 2).merge().setValue(label).setFontWeight('bold').setVerticalAlignment('middle');
    var vc = sh.getRange(p, 3, 1, 2).merge();
    if (formula !== null) vc.setFormula(formula);
    if (fmt) vc.setNumberFormat(fmt);
    vc.setHorizontalAlignment('right').setVerticalAlignment('middle').setFontSize(big ? 13 : 11);
    if (big) vc.setFontWeight('bold').setFontColor('#C55A11');
    if (input) vc.setBackground(CONFIG.색.today).setFontColor('#1F4E79').setFontWeight('bold');
    sh.getRange(p, 1, 1, 4).setBorder(true, true, true, true, true, true, '#D9D9D9', SpreadsheetApp.BorderStyle.SOLID);
    sh.setRowHeight(p, 22);
  }
  section(2, '■ 핵심 운영 지표');
  kv(3, '강사 수',          '=COUNTA(' + SG + 'B3:B12)', NM);
  kv(4, '시급제 인원',      '=COUNTIF(' + SG + 'D3:D12,"시급제")', NM);
  kv(5, '월급제 인원',      '=COUNTIF(' + SG + 'D3:D12,"월급제")', NM);
  kv(6, '총 정규 근무시간', '=SUM(' + SG + 'G3:G12)', HH);
  kv(7, '총 방학 근무시간', '=SUM(' + SG + 'H3:H12)', HH);
  kv(8, '총 근무시간',      '=SUM(' + SG + 'I3:I12)', HH);
  section(9, '■ 인건비');
  kv(10, '시급제 인건비',   '=SUMIF(' + SG + 'D3:D12,"시급제",' + SG + 'J3:J12)', WON);
  kv(11, '월급제 인건비',   '=SUMIF(' + SG + 'D3:D12,"월급제",' + SG + 'J3:J12)', WON);
  kv(12, '총 인건비 (월)',  '=SUM(' + SG + 'J3:J12)', WON, false, true);
  kv(13, '강사 1인 평균급여','=IFERROR(SUM(' + SG + 'J3:J12)/COUNTA(' + SG + 'B3:B12),0)', WON);
  section(14, '■ 지점별 총 근무시간');
  kv(15, '대치점',          '=' + D1 + tcol + dailyTotalRow, HH);
  kv(16, '도곡점',          '=' + D2 + tcol + dailyTotalRow, HH);
  section(17, '■ 매출 · 손익  (월 매출을 노란칸에 입력)');
  kv(18, '월 매출 (입력)',  null, WON, true);
  kv(19, '총 인건비',       '=SUM(' + SG + 'J3:J12)', WON);
  kv(20, '인건비 비율',     '=IFERROR(C19/C18,0)', PCT);
  kv(21, '인건비 차감 이익','=C18-C19', WON, false, true);

  var rules = [];
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0.4)
    .setBackground('#F8CBAD').setFontColor('#C00000').setRanges([sh.getRange('C20:D20')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThanOrEqualTo(0.3)
    .setBackground('#C6E0B4').setFontColor('#375623').setRanges([sh.getRange('C20:D20')]).build());
  sh.setConditionalFormatRules(rules);

  sh.getRange('E2').setValue('← 시급/월급은 [강사_급여] 탭, 일정은 [입력] 탭에 적으면 모두 자동 반영');
  sh.getRange('E2').setFontColor('#808080').setFontSize(10);
  sh.setColumnWidth(1, 150); sh.setColumnWidth(2, 70); sh.setColumnWidth(3, 110);
  sh.setColumnWidth(4, 50); sh.setColumnWidth(5, 250);
  sh.setFrozenRows(1);
}

/* ----------------------- 공통 ----------------------------- */
function addTodayRule(sh, dataStart, dataEnd, cols) {
  var rules = sh.getConditionalFormatRules();
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$A' + dataStart + '=TODAY()')
    .setBackground(CONFIG.색.today).setRanges([sh.getRange(dataStart, 1, dataEnd - dataStart + 1, cols)]).build());
  sh.setConditionalFormatRules(rules);
}
function cleanupSheets(ss) {
  var keep = {};
  [SHEETS.대시보드, SHEETS.급여, SHEETS.입력, SHEETS.정규['대치'], SHEETS.정규['도곡'],
   SHEETS.방학['대치'], SHEETS.방학['도곡'], SHEETS.데일리['대치'], SHEETS.데일리['도곡']]
   .forEach(function (n) { keep[n] = true; });
  ss.getSheets().forEach(function (sh) { if (!keep[sh.getName()]) { try { ss.deleteSheet(sh); } catch (e) {} } });
}
function reorderSheets(ss) {
  [SHEETS.대시보드, SHEETS.급여, SHEETS.입력, SHEETS.정규['대치'], SHEETS.정규['도곡'],
   SHEETS.방학['대치'], SHEETS.방학['도곡'], SHEETS.데일리['대치'], SHEETS.데일리['도곡']]
   .forEach(function (name, idx) {
     var sh = ss.getSheetByName(name);
     if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(idx + 1); }
   });
}
