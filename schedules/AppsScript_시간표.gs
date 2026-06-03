/***************************************************************************
 * 강사 시간표 + 데일리 강사현황 + 급여계산 (대치점 · 도곡점)  자동 생성 스크립트
 * ------------------------------------------------------------------------
 * 사용법
 *   1) 새 Google 스프레드시트 → 상단 메뉴 [확장 프로그램] → [Apps Script]
 *   2) 기존 코드 모두 지우고 이 파일 전체를 붙여넣기 → 저장(디스크 아이콘)
 *   3) 함수목록에서 buildAll 선택 후 ▶ 실행 (최초 1회 권한 허용)
 *   4) 스프레드시트로 돌아오면 모든 탭이 색상/서식/수식까지 완성됨
 *      (이후에는 시트 상단 [강사시간표] 메뉴 → [전체 다시 생성] 사용 가능)
 *
 * 구조
 *   - 강사_급여      : 강사1~10, 급여형태(시급제/월급제), 시급·월급 → 급여 자동산출
 *   - 정규시간표_*   : 시간 × 요일 달력. 셀에서 강사 드롭다운 선택
 *   - 방학시간표_*   : 날짜 × 교시(1·2·3부/정규) 배정 → 강사별 방학시간 자동집계
 *   - 데일리현황_*   : 세로 날짜형 달력. 강사별 '근무시간(숫자)' 입력 → 급여 연동
 *
 * 연동 원리
 *   급여 = 월급제면 '월급', 시급제면 (정규시간 + 방학시간) × 시급
 *     · 정규시간 = 데일리현황 두 지점의 강사 열 합계
 *     · 방학시간 = 방학시간표 교시배정 × 각 교시 시간(1·2·3부 1.5h, 정규 5.5h)
 ***************************************************************************/

var CONFIG = {
  YEAR: 2026,
  강사: ['강사1','강사2','강사3','강사4','강사5','강사6','강사7','강사8','강사9','강사10'],

  // 데일리현황(정규) 달력이 다룰 날짜 범위 — 필요시 수정
  DAILY_START: new Date(2026, 6, 1),   // 2026-07-01  (월은 0부터: 6=7월)
  DAILY_END:   new Date(2026, 7, 31),  // 2026-08-31

  // 방학 특강 기간
  방학: {
    '대치': { start: new Date(2026, 6, 24), end: new Date(2026, 7, 20) }, // 7/24~8/20
    '도곡': { start: new Date(2026, 6, 23), end: new Date(2026, 7, 20) }  // 7/23~8/20
  },

  // 방학 교시 정의 (시간/길이h)
  교시: [
    { name: '1부', time: '09:00~10:30', dur: 1.5 },
    { name: '2부', time: '10:30~12:00', dur: 1.5 },
    { name: '3부', time: '12:30~14:00', dur: 1.5 },
    { name: '정규', time: '14:00~19:30', dur: 5.5 }
  ],

  색: {
    '대치': { head: '#1F4E79', light: '#D6E4F0' },   // 파랑 계열
    '도곡': { head: '#375623', light: '#E2EFD9' },   // 초록 계열
    급여:  { head: '#7030A0', light: '#E9DDF2' },     // 보라
    title: '#F2F2F2',
    closed: '#D9D9D9',   // 휴무
    vac:    '#FCE4D6',   // 방학표시
    sat:    '#DDEBF7',   // 토
    sun:    '#FCE4EC',   // 일
    today:  '#FFF2CC',   // 오늘
    val:    '#E2EFDA'    // 근무시간 입력
  }
};

var SHEETS = {
  대시보드: '대시보드',
  급여: '강사_급여',
  정규: { '대치': '정규시간표_대치', '도곡': '정규시간표_도곡' },
  방학: { '대치': '방학시간표_대치', '도곡': '방학시간표_도곡' },
  데일리: { '대치': '데일리현황_대치', '도곡': '데일리현황_도곡' }
};

var WK = ['일','월','화','수','목','금','토']; // getDay(): 0=일

/* ---------------------------- 메뉴 ---------------------------- */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('강사시간표')
    .addItem('전체 다시 생성', 'buildAll')
    .addToUi();
}

/* ------------------------- 메인 빌더 -------------------------- */
function buildAll() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Seoul');

  buildSalary(ss);                  // 1) 급여(강사명단) 먼저 — 다른 시트가 참조
  buildWeekly(ss, '대치', true);    // 2) 정규시간표
  buildWeekly(ss, '도곡', false);   //    (도곡은 일요일 휴무)
  var vac대치 = buildVacation(ss, '대치');  // 3) 방학시간표 → {ranges}
  var vac도곡 = buildVacation(ss, '도곡');
  var d대치 = buildDaily(ss, '대치', false); // 4) 데일리현황 → {totalRow}
  var d도곡 = buildDaily(ss, '도곡', true);

  // 5) 급여 시트의 연동 수식 채우기 (참조 시트들이 만들어진 뒤)
  linkSalary(ss, d대치.totalRow, vac대치, vac도곡);

  // 6) 경영 대시보드
  buildDashboard(ss, d대치.totalRow);

  cleanupSheets(ss);
  reorderSheets(ss);
  ss.setActiveSheet(ss.getSheetByName(SHEETS.대시보드));
  SpreadsheetApp.getActiveSpreadsheet().toast('완료! 모든 탭이 생성되었습니다.', '강사시간표', 5);
}

// 우리가 만든 시트 외 기본 빈 시트(Sheet1/시트1 등) 정리
function cleanupSheets(ss) {
  var keep = {};
  [SHEETS.대시보드, SHEETS.급여, SHEETS.정규['대치'], SHEETS.정규['도곡'],
   SHEETS.방학['대치'], SHEETS.방학['도곡'], SHEETS.데일리['대치'], SHEETS.데일리['도곡']]
   .forEach(function(n){ keep[n] = true; });
  ss.getSheets().forEach(function(sh){
    if (!keep[sh.getName()]) {
      try { ss.deleteSheet(sh); } catch (e) {}
    }
  });
}

/* ----------------------- 유틸리티 ---------------------------- */
function freshSheet(ss, name) {
  var sh = ss.getSheetByName(name);
  if (sh) ss.deleteSheet(sh);
  return ss.insertSheet(name);
}
function colLetter(n) {
  var s = '';
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
  return s;
}
function titleRow(sh, text, cols, color) {
  sh.getRange(1, 1, 1, cols).merge()
    .setValue(text)
    .setBackground(color || '#404040').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(1, 30);
}
function styleHead(range, bg) {
  range.setBackground(bg).setFontColor('#FFFFFF').setFontWeight('bold')
       .setHorizontalAlignment('center').setVerticalAlignment('middle');
}
function nameDropdown(ss) {
  // 강사_급여!B3:B12 의 강사명을 드롭다운 목록으로
  var src = ss.getSheetByName(SHEETS.급여).getRange('B3:B12');
  return SpreadsheetApp.newDataValidation()
    .requireValueInRange(src, true).setAllowInvalid(true).build();
}

/* ===================== 1) 강사 · 급여 ======================== */
function buildSalary(ss) {
  var sh = freshSheet(ss, SHEETS.급여);
  var headers = ['번호','강사명','소속지점','급여형태','시급(원)','월급(원)',
                 '정규시간(h)','방학시간(h)','총시간(h)','산출급여(원)','비고'];
  var C = CONFIG.색.급여;
  titleRow(sh, '강사 · 급여 계산  (' + CONFIG.YEAR + ')', headers.length, C.head);

  sh.getRange(2, 1, 1, headers.length).setValues([headers]);
  styleHead(sh.getRange(2, 1, 1, headers.length), C.head);

  var rows = [];
  for (var i = 0; i < CONFIG.강사.length; i++) {
    rows.push([ i + 1, CONFIG.강사[i], '', '시급제', '', '', '', '', '', '', '' ]);
  }
  sh.getRange(3, 1, rows.length, headers.length).setValues(rows);

  // 급여형태 드롭다운
  var dv = SpreadsheetApp.newDataValidation()
    .requireValueInList(['시급제','월급제'], true).setAllowInvalid(false).build();
  sh.getRange(3, 4, rows.length, 1).setDataValidation(dv);
  // 소속지점 드롭다운
  var dv2 = SpreadsheetApp.newDataValidation()
    .requireValueInList(['대치점','도곡점','공통'], true).setAllowInvalid(true).build();
  sh.getRange(3, 3, rows.length, 1).setDataValidation(dv2);

  // 숫자서식
  sh.getRange(3, 5, rows.length, 2).setNumberFormat('#,##0"원"');    // 시급/월급
  sh.getRange(3, 7, rows.length, 3).setNumberFormat('0.0');           // 시간
  sh.getRange(3, 10, rows.length, 1).setNumberFormat('#,##0"원"');   // 급여

  // 테두리/정렬/너비
  sh.getRange(2, 1, rows.length + 1, headers.length)
    .setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(3, 1, rows.length, headers.length).setHorizontalAlignment('center');
  sh.getRange(3, 2, rows.length, 1).setHorizontalAlignment('left');
  [60,90,80,80,90,100,90,90,90,110,140].forEach(function(w, idx){ sh.setColumnWidth(idx+1, w); });
  applyBanding(sh, sh.getRange(3, 1, rows.length, headers.length), C.light);
  sh.setFrozenRows(2);

  // 안내 메모
  sh.getRange(rows.length + 4, 1).setValue(
    '※ 급여형태 "시급제" = (정규시간+방학시간)×시급,  "월급제" = 월급 고정. ' +
    '정규시간은 데일리현황, 방학시간은 방학시간표 배정에서 자동 계산됩니다.')
    .setFontColor('#808080').setFontSize(10);
}

// 급여 연동 수식 (참조 시트 생성 후 호출)
function linkSalary(ss, dailyTotalRow, vac대치, vac도곡) {
  var sh = ss.getSheetByName(SHEETS.급여);
  var n = CONFIG.강사.length;
  var Sd1 = "'" + SHEETS.데일리['대치'] + "'";
  var Sd2 = "'" + SHEETS.데일리['도곡'] + "'";
  var Sv1 = "'" + SHEETS.방학['대치'] + "'";
  var Sv2 = "'" + SHEETS.방학['도곡'] + "'";

  for (var k = 0; k < n; k++) {
    var r = 3 + k;                 // 데이터 행
    var dcol = colLetter(3 + k);   // 데일리현황의 해당 강사 열 (C부터)
    var nameRef = '$B' + r;

    // 정규시간 = 두 지점 데일리현황 합계행
    var G = '=' + Sd1 + '!' + dcol + dailyTotalRow + '+' + Sd2 + '!' + dcol + dailyTotalRow;
    // 방학시간 = 교시 배정 COUNTIF × 교시 길이 (두 지점)
    var H = '=' + vacCountFormula(Sv1, vac대치, nameRef) + '+' + vacCountFormula(Sv2, vac도곡, nameRef);
    // 총시간 / 급여
    var I = '=G' + r + '+H' + r;
    var J = '=IF($D' + r + '="월급제",$F' + r + ',I' + r + '*$E' + r + ')';

    sh.getRange(r, 7).setFormula(G);
    sh.getRange(r, 8).setFormula(H);
    sh.getRange(r, 9).setFormula(I);
    sh.getRange(r, 10).setFormula(J);
  }
}
function vacCountFormula(sheetRef, vac, nameRef) {
  // vac: {colLetters:{...}, dataStart, dataEnd}
  var parts = [];
  CONFIG.교시.forEach(function(p, idx) {
    var col = vac.cols[idx];
    parts.push('COUNTIF(' + sheetRef + '!$' + col + '$' + vac.dataStart + ':$' + col + '$' + vac.dataEnd +
               ',' + nameRef + ')*' + p.dur);
  });
  return parts.join('+');
}

/* ===================== 0) 경영 대시보드 ===================== */
function buildDashboard(ss, dailyTotalRow) {
  var sh = freshSheet(ss, SHEETS.대시보드);
  var n = CONFIG.강사.length;
  var tcol = colLetter(3 + n);                 // 데일리현황 일합계 열
  var SG = "'" + SHEETS.급여 + "'!";
  var Sd1 = "'" + SHEETS.데일리['대치'] + "'!";
  var Sd2 = "'" + SHEETS.데일리['도곡'] + "'!";
  var WON = '#,##0"원"', HH = '0.0"h"', NM = '0"명"', PCT = '0.0%';

  titleRow(sh, '경영 대시보드 · 강사 운영 / 인건비 / 손익  (' + CONFIG.YEAR + ')', 5, '#C55A11');

  function section(p, text) {
    sh.getRange(p, 1, 1, 5).merge().setValue(text)
      .setBackground('#7F7F7F').setFontColor('#FFFFFF').setFontWeight('bold')
      .setHorizontalAlignment('left').setVerticalAlignment('middle');
    sh.setRowHeight(p, 24);
  }
  function kv(p, label, formula, fmt, input, big) {
    sh.getRange(p, 1, 1, 2).merge().setValue(label)
      .setFontWeight('bold').setHorizontalAlignment('left').setVerticalAlignment('middle');
    var vc = sh.getRange(p, 3, 1, 2).merge();
    if (formula !== null) vc.setFormula(formula);
    if (fmt) vc.setNumberFormat(fmt);
    vc.setHorizontalAlignment('right').setVerticalAlignment('middle')
      .setFontSize(big ? 13 : 11);
    if (big) vc.setFontWeight('bold').setFontColor('#C55A11');
    if (input) vc.setBackground(CONFIG.색.today).setFontColor('#1F4E79').setFontWeight('bold');
    sh.getRange(p, 1, 1, 4)
      .setBorder(true, true, true, true, true, true, '#D9D9D9', SpreadsheetApp.BorderStyle.SOLID);
    sh.setRowHeight(p, 22);
  }

  section(2, '■ 핵심 운영 지표');
  kv(3, '강사 수',            '=COUNTA(' + SG + 'B3:B12)', NM);
  kv(4, '시급제 인원',        '=COUNTIF(' + SG + 'D3:D12,"시급제")', NM);
  kv(5, '월급제 인원',        '=COUNTIF(' + SG + 'D3:D12,"월급제")', NM);
  kv(6, '총 정규 근무시간',   '=SUM(' + SG + 'G3:G12)', HH);
  kv(7, '총 방학 근무시간',   '=SUM(' + SG + 'H3:H12)', HH);
  kv(8, '총 근무시간',        '=SUM(' + SG + 'I3:I12)', HH);

  section(9, '■ 인건비');
  kv(10, '시급제 인건비',     '=SUMIF(' + SG + 'D3:D12,"시급제",' + SG + 'J3:J12)', WON);
  kv(11, '월급제 인건비',     '=SUMIF(' + SG + 'D3:D12,"월급제",' + SG + 'J3:J12)', WON);
  kv(12, '총 인건비 (월)',    '=SUM(' + SG + 'J3:J12)', WON, false, true);
  kv(13, '강사 1인 평균급여', '=IFERROR(SUM(' + SG + 'J3:J12)/COUNTA(' + SG + 'B3:B12),0)', WON);
  kv(14, '평균 시급(시급제)', '=IFERROR(AVERAGEIF(' + SG + 'D3:D12,"시급제",' + SG + 'E3:E12),0)', WON);

  section(15, '■ 지점별 정규 근무시간');
  kv(16, '대치점',            '=' + Sd1 + tcol + dailyTotalRow, HH);
  kv(17, '도곡점',            '=' + Sd2 + tcol + dailyTotalRow, HH);

  section(18, '■ 매출 · 손익  (월 매출을 노란칸에 입력하세요)');
  kv(19, '월 매출 (입력)',    null, WON, true);
  kv(20, '총 인건비',         '=SUM(' + SG + 'J3:J12)', WON);
  kv(21, '인건비 비율',       '=IFERROR(C20/C19,0)', PCT);
  kv(22, '인건비 차감 이익',  '=C19-C20', WON, false, true);

  // 인건비 비율 경고(>40% 빨강 / <=30% 초록)
  var rules = [];
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0.4).setBackground('#F8CBAD').setFontColor('#C00000')
    .setRanges([sh.getRange('C21:D21')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThanOrEqualTo(0.3).setBackground('#C6E0B4').setFontColor('#375623')
    .setRanges([sh.getRange('C21:D21')]).build());
  sh.setConditionalFormatRules(rules);

  sh.getRange('E2').setValue('← 시급/월급은 [강사_급여] 탭에서 입력하면 여기 모두 자동 반영됩니다.')
    .setFontColor('#808080').setFontSize(10);

  sh.setColumnWidth(1, 150); sh.setColumnWidth(2, 70);
  sh.setColumnWidth(3, 110); sh.setColumnWidth(4, 50); sh.setColumnWidth(5, 230);
  sh.setFrozenRows(1);
  sh.setHiddenGridlines ? sh.setHiddenGridlines(true) : null;
}

/* ===================== 2) 정규시간표 ======================== */
function buildWeekly(ss, branch, sundayOpen) {
  var sh = freshSheet(ss, SHEETS.정규[branch]);
  var C = CONFIG.색[branch];
  var days = ['월','화','수','목','금','토','일'];
  var cols = 1 + days.length; // 시간 + 7요일
  titleRow(sh, '정규 주간 시간표 · ' + branch + '점   (월~금 12~21시 / 토 9~17시 / 일 9~14시' +
    (sundayOpen ? '' : ' · 일요일 휴무') + ')', cols, C.head);

  sh.getRange(2, 1).setValue('시간');
  sh.getRange(2, 2, 1, days.length).setValues([days]);
  styleHead(sh.getRange(2, 1, 1, cols), C.head);
  // 토/일 헤더 색 구분
  sh.getRange(2, 7).setBackground(CONFIG.색.sat).setFontColor('#1F4E79');
  sh.getRange(2, 8).setBackground(CONFIG.색.sun).setFontColor('#C00000');

  var data = [];
  for (var h = 9; h <= 20; h++) {
    var row = [pad(h) + ':00~' + pad(h + 1) + ':00'];
    for (var d = 0; d < 7; d++) {
      var open = isOperating(d, h, sundayOpen);
      row.push(open ? '' : '휴무');
    }
    data.push(row);
  }
  var R = data.length;
  sh.getRange(3, 1, R, cols).setValues(data);

  // 시간 열 스타일
  sh.getRange(3, 1, R, 1).setBackground('#F2F2F2').setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange(3, 2, R, 7).setHorizontalAlignment('center');

  // 휴무 셀 회색 + 운영 셀 강사 드롭다운
  var dd = nameDropdown(ss);
  for (var i = 0; i < R; i++) {
    var h2 = 9 + i;
    for (var d2 = 0; d2 < 7; d2++) {
      var cell = sh.getRange(3 + i, 2 + d2);
      if (!isOperating(d2, h2, sundayOpen)) {
        cell.setBackground(CONFIG.색.closed).setFontColor('#909090');
      } else {
        cell.setDataValidation(dd);
      }
    }
  }
  sh.getRange(2, 1, R + 1, cols)
    .setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  sh.setColumnWidth(1, 110);
  for (var c = 2; c <= cols; c++) sh.setColumnWidth(c, 90);
  sh.setFrozenRows(2); sh.setFrozenColumns(1);
}
function isOperating(d, h, sundayOpen) {
  // d: 0=월..6=일
  if (d <= 4) return h >= 12 && h <= 20;   // 월~금 12~21
  if (d === 5) return h >= 9 && h <= 16;    // 토 9~17
  if (d === 6) return sundayOpen && h >= 9 && h <= 13; // 일 9~14
  return false;
}

/* ===================== 3) 방학시간표 ======================== */
function buildVacation(ss, branch) {
  var sh = freshSheet(ss, SHEETS.방학[branch]);
  var C = CONFIG.색[branch];
  var v = CONFIG.방학[branch];
  var noSunday = (branch === '도곡');

  var headers = ['날짜','요일'].concat(CONFIG.교시.map(function(p){ return p.name + '\n' + p.time; })).concat(['비고']);
  var cols = headers.length; // 2 + 4 + 1 = 7
  titleRow(sh, '방학 특강 시간표 · ' + branch + '점   (' +
    fmtMD(v.start) + '~' + fmtMD(v.end) + ' · 교시별 강사 배정)', cols, C.head);

  sh.getRange(2, 1, 1, cols).setValues([headers]);
  styleHead(sh.getRange(2, 1, 1, cols), C.head);
  sh.getRange(2, 1, 1, cols).setWrap(true);
  sh.setRowHeight(2, 34);

  var dates = dateList(v.start, v.end);
  var rows = dates.map(function(dt){
    var w = WK[dt.getDay()];
    return [dt, w, '', '', '', '', (noSunday && w === '일') ? '휴무' : ''];
  });
  var dataStart = 3, dataEnd = 2 + rows.length;
  sh.getRange(dataStart, 1, rows.length, cols).setValues(rows);
  sh.getRange(dataStart, 1, rows.length, 1).setNumberFormat('m"/"d').setHorizontalAlignment('center');
  sh.getRange(dataStart, 2, rows.length, cols - 1).setHorizontalAlignment('center');
  applyBanding(sh, sh.getRange(dataStart, 1, rows.length, cols), C.light);

  // 교시 셀 드롭다운 / 도곡 일요일 휴무 회색
  var dd = nameDropdown(ss);
  for (var i = 0; i < rows.length; i++) {
    var w = rows[i][1];
    var r = dataStart + i;
    if (noSunday && w === '일') {
      sh.getRange(r, 3, 1, 4).setBackground(CONFIG.색.closed).setFontColor('#909090');
    } else {
      sh.getRange(r, 3, 1, 4).setDataValidation(dd);
    }
    // 주말 요일 색
    if (w === '토') sh.getRange(r, 2).setBackground(CONFIG.색.sat).setFontColor('#1F4E79');
    if (w === '일') sh.getRange(r, 2).setBackground(CONFIG.색.sun).setFontColor('#C00000');
  }

  sh.getRange(2, 1, rows.length + 1, cols)
    .setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  sh.setColumnWidth(1, 60); sh.setColumnWidth(2, 45);
  for (var c = 3; c <= 6; c++) sh.setColumnWidth(c, 95);
  sh.setColumnWidth(7, 90);
  sh.setFrozenRows(2); sh.setFrozenColumns(2);

  // 오늘 강조
  addTodayRule(sh, dataStart, dataEnd, cols);

  // 급여 연동에 필요한 좌표 반환 (교시 열 = C,D,E,F)
  return { cols: ['C','D','E','F'], dataStart: dataStart, dataEnd: dataEnd };
}

/* ===================== 4) 데일리현황 ======================== */
function buildDaily(ss, branch, noSunday) {
  var sh = freshSheet(ss, SHEETS.데일리[branch]);
  var C = CONFIG.색[branch];
  var n = CONFIG.강사.length;
  var cols = 2 + n + 1; // 날짜,요일 + 강사10 + 일합계

  titleRow(sh, '데일리 강사현황 · ' + branch + '점   (강사별 ‘근무시간(h)’ 입력 → 급여 자동연동)', cols, C.head);

  // 헤더
  sh.getRange(2, 1).setValue('날짜');
  sh.getRange(2, 2).setValue('요일');
  for (var k = 0; k < n; k++) {
    // 강사명은 강사_급여 시트 참조 (이름 바꾸면 자동 반영)
    sh.getRange(2, 3 + k).setFormula("='" + SHEETS.급여 + "'!B" + (3 + k));
  }
  sh.getRange(2, 3 + n).setValue('일합계');
  styleHead(sh.getRange(2, 1, 1, cols), C.head);

  var dates = dateList(CONFIG.DAILY_START, CONFIG.DAILY_END);
  var dataStart = 3, dataEnd = 2 + dates.length;
  var v = CONFIG.방학[branch];

  var values = [];
  for (var i = 0; i < dates.length; i++) {
    var dt = dates[i];
    var w = WK[dt.getDay()];
    var row = [dt, w];
    var closed = noSunday && w === '일';
    var vacation = (dt >= v.start && dt <= v.end);
    for (var j = 0; j < n; j++) {
      row.push(closed ? '휴무' : (vacation ? '방학' : ''));
    }
    // 일합계 (근무시간 합) — 휴무/방학 행은 0
    var rr = dataStart + i;
    row.push('=SUM(' + colLetter(3) + rr + ':' + colLetter(2 + n) + rr + ')');
    values.push(row);
  }
  sh.getRange(dataStart, 1, values.length, cols).setValues(values);

  // 서식
  sh.getRange(dataStart, 1, values.length, 1).setNumberFormat('m"/"d').setHorizontalAlignment('center');
  sh.getRange(dataStart, 2, values.length, cols - 1).setHorizontalAlignment('center');
  sh.getRange(dataStart, 3, values.length, n).setNumberFormat('0.#');

  // 휴무/방학 셀 색
  for (var i2 = 0; i2 < dates.length; i2++) {
    var w2 = WK[dates[i2].getDay()];
    var r2 = dataStart + i2;
    var closed2 = noSunday && w2 === '일';
    var vac2 = (dates[i2] >= v.start && dates[i2] <= v.end);
    if (closed2) sh.getRange(r2, 3, 1, n).setBackground(CONFIG.색.closed).setFontColor('#909090');
    else if (vac2) sh.getRange(r2, 3, 1, n).setBackground(CONFIG.색.vac).setFontColor('#A6610A');
  }

  // 합계행
  var totalRow = dataEnd + 1;
  sh.getRange(totalRow, 2).setValue('월 합계');
  for (var k2 = 0; k2 < n; k2++) {
    var cl = colLetter(3 + k2);
    sh.getRange(totalRow, 3 + k2)
      .setFormula('=SUM(' + cl + dataStart + ':' + cl + dataEnd + ')')
      .setNumberFormat('0.0');
  }
  sh.getRange(totalRow, 3 + n).setFormula('=SUM(' + colLetter(3) + totalRow + ':' + colLetter(2 + n) + totalRow + ')');
  styleHead(sh.getRange(totalRow, 1, 1, cols), '#595959');
  sh.getRange(totalRow, 3, 1, n + 1).setNumberFormat('0.0');

  // 테두리/너비/고정
  sh.getRange(2, 1, totalRow - 1, cols)
    .setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  sh.setColumnWidth(1, 60); sh.setColumnWidth(2, 42);
  for (var c2 = 3; c2 <= 2 + n; c2++) sh.setColumnWidth(c2, 56);
  sh.setColumnWidth(3 + n, 62);
  sh.setFrozenRows(2); sh.setFrozenColumns(2);

  // 조건부서식: 오늘 → 토 → 일 → 근무시간>0
  var rules = [];
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$A' + dataStart + '=TODAY()')
    .setBackground(CONFIG.색.today)
    .setRanges([sh.getRange(dataStart, 1, dates.length, cols)]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0).setBackground(CONFIG.색.val)
    .setRanges([sh.getRange(dataStart, 3, dates.length, n)]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$B' + dataStart + '="토"').setBackground(CONFIG.색.sat)
    .setRanges([sh.getRange(dataStart, 1, dates.length, 2)]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$B' + dataStart + '="일"').setBackground(CONFIG.색.sun)
    .setRanges([sh.getRange(dataStart, 1, dates.length, 2)]).build());
  sh.setConditionalFormatRules(rules);

  return { totalRow: totalRow };
}

/* ----------------------- 공통 헬퍼 -------------------------- */
function addTodayRule(sh, dataStart, dataEnd, cols) {
  var rules = sh.getConditionalFormatRules();
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$A' + dataStart + '=TODAY()')
    .setBackground(CONFIG.색.today)
    .setRanges([sh.getRange(dataStart, 1, dataEnd - dataStart + 1, cols)]).build());
  sh.setConditionalFormatRules(rules);
}
function applyBanding(sh, range, lightColor) {
  try {
    range.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
  } catch (e) { /* 이미 밴딩 있으면 무시 */ }
}
function dateList(start, end) {
  var out = [], d = new Date(start);
  while (d <= end) { out.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return out;
}
function pad(n) { return (n < 10 ? '0' : '') + n; }
function fmtMD(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }

function reorderSheets(ss) {
  var order = [SHEETS.대시보드, SHEETS.급여, SHEETS.정규['대치'], SHEETS.정규['도곡'],
               SHEETS.방학['대치'], SHEETS.방학['도곡'],
               SHEETS.데일리['대치'], SHEETS.데일리['도곡']];
  order.forEach(function(name, idx) {
    var sh = ss.getSheetByName(name);
    if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(idx + 1); }
  });
}
