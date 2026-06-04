/***************************************************************************
 * 강사 시간표 자동화 시스템 (대치점 · 도곡점)  —  30분 단위
 * 입력 시트에 "강사 / 지점 / 정규·방학 / 요일 / 시작·종료" 한 줄만 적으면
 *   → 정규·방학 시간표(30분 단위) · 데일리현황 · 급여 · 대시보드가 전부 자동 채워짐
 *   → 한 칸에 강사가 여러 명이면 "이도연, 정호암" 처럼 모두 표시
 * ------------------------------------------------------------------------
 * 설치
 *   1) 새 Google 스프레드시트 → [확장 프로그램] → [Apps Script]
 *   2) 코드 전체 붙여넣기 → 저장 → 함수목록 buildAll 선택 → ▶ 실행 (권한 허용)
 *   3) 이후엔 시트 상단 [강사시간표] → [전체 다시 생성]
 *      (재실행해도 강사_급여 이름/시급·월급, 입력 시트 일정은 그대로 보존됩니다)
 *
 * 입력 방법 (입력 시트)
 *   강사명 | 지점 | 구분(정규/방학) | 요일 | 시작 | 종료
 *   · 시간: 24시간 숫자. 오후1시=13, 3시반=15.5, 7시반=19.5, 10시반=10.5, 저녁9시=21
 *   · 요일: "월~금" 또는 "월화금"
 *   · 요일마다 시간이 다르면 줄을 나눠 입력
 ***************************************************************************/

var CONFIG = {
  YEAR: 2026,
  강사: ['이도연','정호암','강사3','강사4','강사5','강사6','강사7','강사8','강사9','강사10'],
  LASTIN: 122,                          // 입력 데이터 행 3~122

  DAILY_START: new Date(2026, 6, 1),    // 데일리현황 달력 2026-07-01
  DAILY_END:   new Date(2026, 7, 31),   //                ~ 2026-08-31

  방학: {
    '대치': { start: new Date(2026, 6, 24), end: new Date(2026, 7, 20) }, // 7/24~8/20
    '도곡': { start: new Date(2026, 6, 23), end: new Date(2026, 7, 20) }, // 7/23~8/20
    '구룡초': { start: new Date(2026, 6, 24), end: new Date(2026, 7, 20) } // 7/24~8/20 (대치와 동일, 필요시 수정)
  },

  // 방학 운영 시간(30분 그리드용): 09:00~12:00, 12:00~12:30 휴식, 12:30~19:30
  방학운영: { open: 9, close: 19.5, 휴식: [12, 12.5] },
  // 정규 운영
  정규운영: { 평일: [12, 21], 토: [9, 17], 일: [9, 14] },

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
    '구룡초': { head: '#996600', light: '#F5ECD9' },
    급여:  { head: '#7030A0' },
    closed: '#D9D9D9', vac: '#FCE4D6',
    sat: '#DDEBF7', sun: '#FCE4EC', today: '#FFF2CC', val: '#E2EFDA', input: '#FFF8E1'
  }
};

var SHEETS = {
  대시보드: '대시보드', 급여: '강사_급여', 입력: '입력',
  정규: { '대치': '정규시간표_대치', '도곡': '정규시간표_도곡', '구룡초': '정규시간표_구룡초' },
  방학: { '대치': '방학시간표_대치', '도곡': '방학시간표_도곡', '구룡초': '방학시간표_구룡초' },
  데일리: { '대치': '데일리현황_대치', '도곡': '데일리현황_도곡', '구룡초': '데일리현황_구룡초' }
};

var WK = ['일','월','화','수','목','금','토'];
var IN = "'" + SHEETS.입력 + "'!";
// 입력 시트 요일 체크박스 열: 월=D … 일=J,  시작=K, 종료=L
var DAYCOL = { '월':'D','화':'E','수':'F','목':'G','금':'H','토':'I','일':'J' };

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
    try { return fn(); } catch (e) { errs.push('• ' + name + ' → ' + (e && e.message ? e.message : e)); return null; }
  }

  step('강사_급여', function () { buildSalary(ss); });
  step('입력',      function () { buildInput(ss); });
  step('정규시간표_대치', function () { buildGrid(ss, '대치', '정규', true); });
  step('정규시간표_도곡', function () { buildGrid(ss, '도곡', '정규', false); });
  step('정규시간표_구룡초', function () { buildGrid(ss, '구룡초', '정규', true); });
  step('방학시간표_대치', function () { buildVacationDates(ss, '대치'); });
  step('방학시간표_도곡', function () { buildVacationDates(ss, '도곡'); });
  step('방학시간표_구룡초', function () { buildVacationDates(ss, '구룡초'); });
  var d대치 = step('데일리현황_대치', function () { return buildDaily(ss, '대치', false); });
  var d도곡 = step('데일리현황_도곡', function () { return buildDaily(ss, '도곡', true); });
  var d구룡초 = step('데일리현황_구룡초', function () { return buildDaily(ss, '구룡초', false); });

  step('급여 연동', function () { if (d대치 && d도곡 && d구룡초) linkSalary(ss, d대치.dataStart, d대치.dataEnd); });
  step('대시보드', function () { if (d대치) buildDashboard(ss, d대치.totalRow); });
  step('정리/정렬', function () { cleanupSheets(ss); reorderSheets(ss); });

  if (errs.length) {
    SpreadsheetApp.getUi().alert('일부 단계 오류(나머지는 생성됨). 메시지를 알려주세요.\n\n' + errs.join('\n'));
  } else {
    var d = ss.getSheetByName(SHEETS.입력); if (d) ss.setActiveSheet(d);
    ss.toast('완료! 입력 시트에 일정을 적으면 30분 단위 시간표가 자동으로 채워집니다.', '강사시간표', 6);
  }
}

/* ----------------------------- 유틸 ----------------------------- */
function freshSheet(ss, name) { var sh = ss.getSheetByName(name); if (sh) ss.deleteSheet(sh); return ss.insertSheet(name); }
function colLetter(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; }
function pad(n) { return (n < 10 ? '0' : '') + n; }
function fmtHM(t) { var h = Math.floor(t + 1e-9); var m = (Math.round((t - h) * 60) === 30) ? '30' : '00'; return pad(h) + ':' + m; }
function fmtMD(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }
function dateList(start, end) { var out = [], d = new Date(start); while (d <= end) { out.push(new Date(d)); d.setDate(d.getDate() + 1); } return out; }
// "월~금" 또는 "월화금" → [월,화,수,목,금,토,일] 불리언
function expandDays(text) {
  var order = '월화수목금토일', res = [false, false, false, false, false, false, false];
  if (text === true || text === false) return res;
  text = String(text || '').trim(); if (!text) return res;
  if (text.indexOf('~') >= 0) {
    var p = text.split('~'), a = order.indexOf(p[0].trim().charAt(0)),
        bs = p[1].trim(), b = order.indexOf(bs.charAt(bs.length - 1));
    if (a >= 0 && b >= 0 && a <= b) for (var i = a; i <= b; i++) res[i] = true;
  } else {
    for (var j = 0; j < text.length; j++) { var idx = order.indexOf(text.charAt(j)); if (idx >= 0) res[idx] = true; }
  }
  return res;
}
function titleRow(sh, text, cols, color) {
  sh.getRange(1, 1, 1, cols).merge().setValue(text).setBackground(color || '#404040').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(1, 30);
}
function styleHead(range, bg) { range.setBackground(bg).setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle'); }

/* ===================== 강사 · 급여 (이름/입력 보존) ========= */
function buildSalary(ss) {
  var n = CONFIG.강사.length, prev = null, old = ss.getSheetByName(SHEETS.급여);
  if (old) { try { prev = old.getRange(3, 1, n, 11).getValues(); } catch (e) {} }
  var sh = freshSheet(ss, SHEETS.급여);
  var headers = ['번호','강사명','소속지점','급여형태','시급(원)','월급(원)','정규시간(h)','방학시간(h)','총시간(h)','산출급여(원)','비고'];
  var head = CONFIG.색.급여.head;
  titleRow(sh, '강사 · 급여 계산  (' + CONFIG.YEAR + ')   ※ 이름·시급·월급은 여기서 관리(재생성해도 유지)', headers.length, head);
  sh.getRange(2, 1, 1, headers.length).setValues([headers]);
  styleHead(sh.getRange(2, 1, 1, headers.length), head);

  var rows = [];
  for (var i = 0; i < n; i++) {
    var name = CONFIG.강사[i], 소속 = '', 형태 = '시급제', 시급 = '', 월급 = '', 비고 = '';
    if (prev && prev[i]) {
      if (prev[i][1]) name = prev[i][1];
      소속 = prev[i][2] || ''; 형태 = prev[i][3] || '시급제';
      시급 = prev[i][4] || ''; 월급 = prev[i][5] || ''; 비고 = prev[i][10] || '';
    }
    rows.push([i + 1, name, 소속, 형태, 시급, 월급, '', '', '', '', 비고]);
  }
  sh.getRange(3, 1, n, headers.length).setValues(rows);

  sh.getRange(3, 4, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['시급제','월급제'], true).build());
  sh.getRange(3, 3, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['대치점','도곡점','구룡초점','공통'], true).setAllowInvalid(true).build());
  sh.getRange(3, 5, n, 2).setNumberFormat('#,##0"원"');
  sh.getRange(3, 7, n, 3).setNumberFormat('0.0');
  sh.getRange(3, 10, n, 1).setNumberFormat('#,##0"원"');
  sh.getRange(2, 1, n + 1, headers.length).setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(3, 1, n, headers.length).setHorizontalAlignment('center');
  sh.getRange(3, 2, n, 1).setBackground('#FFF8E1');   // 이름칸 강조(직접 입력)
  [50,100,80,80,90,100,90,90,90,110,120].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.setFrozenRows(2);
  sh.getRange(n + 4, 1).setValue('※ 노란 "강사명" 칸에 실제 이름을 적으세요(강사3~ 포함). 시간·급여는 자동 계산됩니다.').setFontColor('#808080').setFontSize(10);
}

/* ===================== 입력 시트 (일정 보존) =============== */
function buildInput(ss) {
  var L = CONFIG.LASTIN, old = ss.getSheetByName(SHEETS.입력), prevRows = [];
  if (old) {
    try {
      var isNew = (old.getRange(2, 4).getValue() === '월');   // 새 체크박스 포맷 여부
      if (isNew) {
        var ov = old.getRange(3, 1, L - 2, 13).getValues();
        for (var i = 0; i < ov.length; i++) { var a = ov[i];
          if (String(a[0]).trim() === '') continue;
          prevRows.push({ name:a[0], 지점:a[1], 구분:a[2], days:[a[3],a[4],a[5],a[6],a[7],a[8],a[9]], 시작:a[10], 종료:a[11], 비고:a[12] });
        }
      } else {                                                  // 옛 텍스트 요일 포맷 → 변환 보존
        var ov2 = old.getRange(3, 1, L - 2, 6).getValues();
        for (var j = 0; j < ov2.length; j++) { var b = ov2[j];
          if (String(b[0]).trim() === '') continue;
          prevRows.push({ name:b[0], 지점:b[1], 구분:b[2], days:expandDays(b[3]), 시작:b[4], 종료:b[5], 비고:'' });
        }
      }
    } catch (e) {}
  }

  var sh = freshSheet(ss, SHEETS.입력);
  var headers = ['강사명','지점','구분','월','화','수','목','금','토','일','시작','종료','비고'];
  var ncols = headers.length;
  titleRow(sh, '강사 일정 입력  —  요일은 체크박스로 클릭, 시간만 적으면 모든 시간표 자동 완성', ncols, '#C55A11');
  sh.getRange(2, 1, 1, ncols).setValues([headers]);
  styleHead(sh.getRange(2, 1, 1, ncols), '#C55A11');
  sh.getRange(2, 9).setBackground(CONFIG.색.sat).setFontColor('#1F4E79');   // 토
  sh.getRange(2, 10).setBackground(CONFIG.색.sun).setFontColor('#C00000');  // 일
  sh.getRange(2, ncols + 1).setValue('시간=24시간 숫자 (오후1시=13, 3시반=15.5, 7시반=19.5) · 요일은 체크 · 요일별 시간 다르면 줄 나눠 입력')
    .setFontColor('#808080').setFontSize(10);

  // 요일 체크박스 (전체 입력행 D:J)
  sh.getRange(3, 4, L - 2, 7).insertCheckboxes();

  var src = prevRows.length ? prevRows :
    CONFIG.샘플.map(function (s) { return { name:s[0], 지점:s[1], 구분:s[2], days:expandDays(s[3]), 시작:s[4], 종료:s[5], 비고:'' }; });
  if (src.length) {
    var abc = [], dys = [], kl = [], mm = [];
    for (var k = 0; k < src.length; k++) { var s = src[k];
      abc.push([s.name, s.지점, s.구분]);
      dys.push(s.days.map(function (x) { return x === true; }));
      kl.push([s.시작, s.종료]);
      mm.push([s.비고 || '']);
    }
    sh.getRange(3, 1, src.length, 3).setValues(abc);
    sh.getRange(3, 4, src.length, 7).setValues(dys);
    sh.getRange(3, 11, src.length, 2).setValues(kl);
    sh.getRange(3, 13, src.length, 1).setValues(mm);
  }

  sh.getRange(3, 1, L - 2, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInRange(ss.getSheetByName(SHEETS.급여).getRange('B3:B12'), true).setAllowInvalid(true).build());
  sh.getRange(3, 2, L - 2, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['대치점','도곡점','구룡초점'], true).build());
  sh.getRange(3, 3, L - 2, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['정규','방학'], true).build());

  sh.getRange(3, 1, L - 2, 3).setBackground(CONFIG.색.input);
  sh.getRange(3, 11, L - 2, 2).setBackground(CONFIG.색.input).setNumberFormat('0.0##');
  sh.getRange(2, 1, L - 1, ncols).setBorder(true, true, true, true, true, true, '#D9D9D9', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(3, 1, L - 2, ncols).setHorizontalAlignment('center');
  [80,70,55,32,32,32,32,32,32,32,70,70,160].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.setFrozenRows(2); sh.setFrozenColumns(3);
}

/* ===================== 시간표 그리드 (30분 · 정규/방학 공용) === */
function buildGrid(ss, branch, gubun, sundayOpen) {
  var isVac = (gubun === '방학');
  var sh = freshSheet(ss, (isVac ? SHEETS.방학 : SHEETS.정규)[branch]);
  var C = CONFIG.색[branch], BF = branch + '점', L = CONFIG.LASTIN;
  var days = ['월','화','수','목','금','토','일'], cols = 8;
  var v = CONFIG.방학[branch];

  function oper(d, t) {
    if (isVac) {
      if (branch === '도곡' && d === 6) return false;            // 도곡 일 휴무
      if (t >= CONFIG.방학운영.휴식[0] && t < CONFIG.방학운영.휴식[1]) return false; // 점심
      return t >= CONFIG.방학운영.open && t < CONFIG.방학운영.close;
    }
    if (d <= 4) return t >= CONFIG.정규운영.평일[0] && t < CONFIG.정규운영.평일[1];
    if (d === 5) return t >= CONFIG.정규운영.토[0] && t < CONFIG.정규운영.토[1];
    if (d === 6) return sundayOpen && t >= CONFIG.정규운영.일[0] && t < CONFIG.정규운영.일[1];
    return false;
  }

  var startT = 9, endT = isVac ? 19 : 20.5;
  var slots = [], steps = Math.round((endT - startT) / 0.5);
  for (var s = 0; s <= steps; s++) slots.push(startT + s * 0.5);

  var title = (isVac ? '방학 시간표 · ' + branch + '점  (' + fmtMD(v.start) + '~' + fmtMD(v.end) + ')'
                     : '정규 시간표 · ' + branch + '점') +
              '   30분 단위 · 입력시트 자동 · 한 칸 여러 강사' + (sundayOpen ? '' : ' · 일요일 휴무');
  titleRow(sh, title, cols, C.head);
  sh.getRange(2, 1).setValue('시간');
  sh.getRange(2, 2, 1, 7).setValues([days]);
  styleHead(sh.getRange(2, 1, 1, cols), C.head);
  sh.getRange(2, 7).setBackground(CONFIG.색.sat).setFontColor('#1F4E79');
  sh.getRange(2, 8).setBackground(CONFIG.색.sun).setFontColor('#C00000');

  var labels = [], grid = [];
  for (var i = 0; i < slots.length; i++) {
    var t = slots[i];
    labels.push([fmtHM(t) + '~' + fmtHM(t + 0.5)]);
    var row = [];
    for (var d = 0; d < 7; d++) {
      if (!oper(d, t)) { row.push(''); }
      else {
        var dc = DAYCOL[days[d]];
        row.push('=IFERROR(TEXTJOIN(", ",TRUE,FILTER(' + IN + '$A$3:$A$' + L + ',(' +
          IN + '$B$3:$B$' + L + '="' + BF + '")*(' + IN + '$C$3:$C$' + L + '="' + gubun + '")*(' +
          IN + '$' + dc + '$3:$' + dc + '$' + L + '=TRUE)*(' + IN + '$K$3:$K$' + L + '<=' + t + ')*(' +
          IN + '$L$3:$L$' + L + '>' + t + '))),"")');
      }
    }
    grid.push(row);
  }
  var R = slots.length;
  sh.getRange(3, 1, R, 1).setValues(labels).setBackground('#F2F2F2').setFontWeight('bold').setHorizontalAlignment('center').setFontSize(9);
  sh.getRange(3, 2, R, 7).setFormulas(grid).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true).setFontSize(10);

  for (var k = 0; k < R; k++) {
    var tt = slots[k];
    for (var d2 = 0; d2 < 7; d2++) if (!oper(d2, tt)) sh.getRange(3 + k, 2 + d2).setBackground(CONFIG.색.closed);
    sh.setRowHeight(3 + k, 24);
  }
  sh.getRange(2, 1, R + 1, cols).setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  sh.setColumnWidth(1, 100);
  for (var c = 2; c <= cols; c++) sh.setColumnWidth(c, 100);
  sh.setFrozenRows(2); sh.setFrozenColumns(1);
}

/* ===================== 방학 시간표 (날짜별 · 30분) ========= */
function buildVacationDates(ss, branch) {
  var sh = freshSheet(ss, SHEETS.방학[branch]);
  var C = CONFIG.색[branch], BF = branch + '점', L = CONFIG.LASTIN, v = CONFIG.방학[branch];
  var noSunday = (branch === '도곡');
  var brk = CONFIG.방학운영.휴식;                       // [12, 12.5] 점심

  var startT = 9, endT = 19, steps = Math.round((endT - startT) / 0.5);
  var slots = []; for (var s = 0; s <= steps; s++) slots.push(startT + s * 0.5);
  var ncols = 2 + slots.length;                         // 날짜,요일 + 시간슬롯

  titleRow(sh, '방학 시간표(날짜별) · ' + branch + '점   (' + fmtMD(v.start) + '~' + fmtMD(v.end) +
    ')  30분 단위 · 입력시트 자동 · 한 칸 여러 강사', ncols, C.head);
  var hdr = ['날짜', '요일'].concat(slots.map(function (t) { return fmtHM(t); }));
  sh.getRange(2, 1, 1, ncols).setValues([hdr]);
  styleHead(sh.getRange(2, 1, 1, ncols), C.head);
  sh.getRange(2, 3, 1, slots.length).setFontSize(8);

  var dates = dateList(v.start, v.end), dataStart = 3;
  var aCol = [], bCol = [], grid = [];
  for (var i = 0; i < dates.length; i++) {
    var dt = dates[i], w = WK[dt.getDay()];
    aCol.push([dt]); bCol.push([w]);
    var closed = noSunday && w === '일';
    var row = [];
    for (var j = 0; j < slots.length; j++) {
      var t = slots[j], isBreak = (t >= brk[0] && t < brk[1]);
      if (closed || isBreak) { row.push(''); }
      else {
        var dcv = DAYCOL[w];
        row.push('=IFERROR(TEXTJOIN(", ",TRUE,FILTER(' + IN + '$A$3:$A$' + L + ',(' +
          IN + '$B$3:$B$' + L + '="' + BF + '")*(' + IN + '$C$3:$C$' + L + '="방학")*(' +
          IN + '$' + dcv + '$3:$' + dcv + '$' + L + '=TRUE)*(' + IN + '$K$3:$K$' + L + '<=' + t + ')*(' +
          IN + '$L$3:$L$' + L + '>' + t + '))),"")');
      }
    }
    grid.push(row);
  }
  sh.getRange(dataStart, 1, dates.length, 1).setValues(aCol).setNumberFormat('m"/"d').setHorizontalAlignment('center');
  sh.getRange(dataStart, 2, dates.length, 1).setValues(bCol).setHorizontalAlignment('center');
  sh.getRange(dataStart, 3, dates.length, slots.length).setFormulas(grid)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true).setFontSize(8);

  // 점심 열 음영
  for (var j2 = 0; j2 < slots.length; j2++)
    if (slots[j2] >= brk[0] && slots[j2] < brk[1]) sh.getRange(dataStart, 3 + j2, dates.length, 1).setBackground(CONFIG.색.closed);
  // 휴무행 / 주말 색
  for (var i2 = 0; i2 < dates.length; i2++) {
    var w2 = bCol[i2][0], r = dataStart + i2;
    if (noSunday && w2 === '일') sh.getRange(r, 3, 1, slots.length).setBackground(CONFIG.색.closed);
    if (w2 === '토') sh.getRange(r, 2).setBackground(CONFIG.색.sat).setFontColor('#1F4E79');
    if (w2 === '일') sh.getRange(r, 2).setBackground(CONFIG.색.sun).setFontColor('#C00000');
    sh.setRowHeight(r, 30);
  }
  sh.getRange(2, 1, dates.length + 1, ncols).setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  sh.setColumnWidth(1, 52); sh.setColumnWidth(2, 38);
  for (var c = 3; c <= ncols; c++) sh.setColumnWidth(c, 54);
  sh.setFrozenRows(2); sh.setFrozenColumns(2);

  var rules = [SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$A' + dataStart + '=TODAY()')
    .setBackground(CONFIG.색.today).setRanges([sh.getRange(dataStart, 1, dates.length, ncols)]).build()];
  sh.setConditionalFormatRules(rules);
}

/* ===================== 데일리 현황 ========================= */
function buildDaily(ss, branch, noSunday) {
  var sh = freshSheet(ss, SHEETS.데일리[branch]);
  var C = CONFIG.색[branch], BF = branch + '점', L = CONFIG.LASTIN, v = CONFIG.방학[branch];
  var n = CONFIG.강사.length, cols = 2 + n + 2, mCol = 3 + n, nCol = 4 + n;
  titleRow(sh, '데일리 강사현황 · ' + branch + '점   (입력 시트 기준 자동 계산 · 숫자=근무시간h)', cols, C.head);
  sh.getRange(2, 1).setValue('날짜'); sh.getRange(2, 2).setValue('요일');
  var hForm = [];
  for (var k = 0; k < n; k++) hForm.push("='" + SHEETS.급여 + "'!B" + (3 + k));
  sh.getRange(2, 3, 1, n).setFormulas([hForm]);
  sh.getRange(2, mCol).setValue('일합계'); sh.getRange(2, nCol).setValue('구분');
  styleHead(sh.getRange(2, 1, 1, cols), C.head);

  var dates = dateList(CONFIG.DAILY_START, CONFIG.DAILY_END), dataStart = 3, dataEnd = 2 + dates.length;
  var aCol = [], bCol = [], nColV = [], instr = [], mColF = [];
  for (var i = 0; i < dates.length; i++) {
    var dt = dates[i], w = WK[dt.getDay()], r = dataStart + i;
    var closed = noSunday && w === '일', vacation = (dt >= v.start && dt <= v.end);
    var gubun = closed ? '휴무' : (vacation ? '방학' : '정규');
    aCol.push([dt]); bCol.push([w]); nColV.push([gubun]);
    var row = [];
    for (var c = 0; c < n; c++) {
      if (closed) { row.push(''); }
      else {
        var hcell = colLetter(3 + c) + '$2', dcd = DAYCOL[w];
        row.push('=IFERROR(SUMPRODUCT((' + IN + '$A$3:$A$' + L + '=' + hcell + ')*(' +
          IN + '$B$3:$B$' + L + '="' + BF + '")*(' + IN + '$C$3:$C$' + L + '="' + gubun + '")*(' +
          IN + '$' + dcd + '$3:$' + dcd + '$' + L + '=TRUE)*(' + IN + '$L$3:$L$' + L + '-' + IN + '$K$3:$K$' + L + ')),0)');
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
    var g = nColV[j][0], r2 = dataStart + j;
    if (g === '휴무') sh.getRange(r2, 3, 1, n).setBackground(CONFIG.색.closed);
    else if (g === '방학') sh.getRange(r2, 3, 1, n).setBackground(CONFIG.색.vac);
  }
  var totalRow = dataEnd + 1;
  sh.getRange(totalRow, 2).setValue('합계');
  var tF = [];
  for (var k2 = 0; k2 < n + 1; k2++) { var cl = colLetter(3 + k2); tF.push('=SUM(' + cl + dataStart + ':' + cl + dataEnd + ')'); }
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

/* ===================== 급여 연동 =========================== */
function linkSalary(ss, ds, de) {
  var sh = ss.getSheetByName(SHEETS.급여), n = CONFIG.강사.length;
  var D1 = "'" + SHEETS.데일리['대치'] + "'", D2 = "'" + SHEETS.데일리['도곡'] + "'", D3 = "'" + SHEETS.데일리['구룡초'] + "'";
  for (var k = 0; k < n; k++) {
    var r = 3 + k, col = colLetter(3 + k);
    var reg = sumByGubun(D1, col, ds, de, '정규') + '+' + sumByGubun(D2, col, ds, de, '정규') + '+' + sumByGubun(D3, col, ds, de, '정규');
    var vac = sumByGubun(D1, col, ds, de, '방학') + '+' + sumByGubun(D2, col, ds, de, '방학') + '+' + sumByGubun(D3, col, ds, de, '방학');
    sh.getRange(r, 7).setFormula('=' + reg);
    sh.getRange(r, 8).setFormula('=' + vac);
    sh.getRange(r, 9).setFormula('=G' + r + '+H' + r);
    sh.getRange(r, 10).setFormula('=IF($D' + r + '="월급제",$F' + r + ',I' + r + '*$E' + r + ')');
  }
}
function sumByGubun(sheet, col, ds, de, gubun) {
  return 'SUMIF(' + sheet + '!$N$' + ds + ':$N$' + de + ',"' + gubun + '",' + sheet + '!' + col + '$' + ds + ':' + col + '$' + de + ')';
}

/* ===================== 경영 대시보드 ======================= */
function buildDashboard(ss, dailyTotalRow) {
  var sh = freshSheet(ss, SHEETS.대시보드);
  var n = CONFIG.강사.length, tcol = colLetter(3 + n);
  var SG = "'" + SHEETS.급여 + "'!", D1 = "'" + SHEETS.데일리['대치'] + "'!", D2 = "'" + SHEETS.데일리['도곡'] + "'!", D3 = "'" + SHEETS.데일리['구룡초'] + "'!";
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
    sh.getRange(p, 1, 1, 4).setBorder(true, true, true, true, true, true, '#D9D9D9', SpreadsheetApp.BorderStyle.SOLID);
    sh.setRowHeight(p, 22);
  }
  section(2, '■ 핵심 운영 지표');
  kv(3, '강사 수', '=COUNTA(' + SG + 'B3:B12)', NM);
  kv(4, '시급제 인원', '=COUNTIF(' + SG + 'D3:D12,"시급제")', NM);
  kv(5, '월급제 인원', '=COUNTIF(' + SG + 'D3:D12,"월급제")', NM);
  kv(6, '총 정규 근무시간', '=SUM(' + SG + 'G3:G12)', HH);
  kv(7, '총 방학 근무시간', '=SUM(' + SG + 'H3:H12)', HH);
  kv(8, '총 근무시간', '=SUM(' + SG + 'I3:I12)', HH);
  section(9, '■ 인건비');
  kv(10, '시급제 인건비', '=SUMIF(' + SG + 'D3:D12,"시급제",' + SG + 'J3:J12)', WON);
  kv(11, '월급제 인건비', '=SUMIF(' + SG + 'D3:D12,"월급제",' + SG + 'J3:J12)', WON);
  kv(12, '총 인건비 (월)', '=SUM(' + SG + 'J3:J12)', WON, false, true);
  kv(13, '강사 1인 평균급여', '=IFERROR(SUM(' + SG + 'J3:J12)/COUNTA(' + SG + 'B3:B12),0)', WON);
  section(14, '■ 지점별 총 근무시간');
  kv(15, '대치점', '=' + D1 + tcol + dailyTotalRow, HH);
  kv(16, '도곡점', '=' + D2 + tcol + dailyTotalRow, HH);
  kv(17, '구룡초점', '=' + D3 + tcol + dailyTotalRow, HH);
  section(18, '■ 매출 · 손익  (월 매출을 노란칸에 입력)');
  kv(19, '월 매출 (입력)', null, WON, true);
  kv(20, '총 인건비', '=SUM(' + SG + 'J3:J12)', WON);
  kv(21, '인건비 비율', '=IFERROR(C20/C19,0)', PCT);
  kv(22, '인건비 차감 이익', '=C19-C20', WON, false, true);

  var rules = [];
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0.4).setBackground('#F8CBAD').setFontColor('#C00000').setRanges([sh.getRange('C21:D21')]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThanOrEqualTo(0.3).setBackground('#C6E0B4').setFontColor('#375623').setRanges([sh.getRange('C21:D21')]).build());
  sh.setConditionalFormatRules(rules);
  sh.getRange('E2').setValue('← 이름·시급/월급은 [강사_급여], 일정은 [입력] 탭에서 관리하면 자동 반영').setFontColor('#808080').setFontSize(10);
  sh.setColumnWidth(1, 150); sh.setColumnWidth(2, 70); sh.setColumnWidth(3, 110); sh.setColumnWidth(4, 50); sh.setColumnWidth(5, 250);
  sh.setFrozenRows(1);
}

/* ----------------------- 정리/정렬 ------------------------- */
function cleanupSheets(ss) {
  var keep = {};
  [SHEETS.대시보드, SHEETS.급여, SHEETS.입력,
   SHEETS.정규['대치'], SHEETS.정규['도곡'], SHEETS.정규['구룡초'],
   SHEETS.방학['대치'], SHEETS.방학['도곡'], SHEETS.방학['구룡초'],
   SHEETS.데일리['대치'], SHEETS.데일리['도곡'], SHEETS.데일리['구룡초']]
   .forEach(function (n) { keep[n] = true; });
  ss.getSheets().forEach(function (sh) { if (!keep[sh.getName()]) { try { ss.deleteSheet(sh); } catch (e) {} } });
}
function reorderSheets(ss) {
  [SHEETS.대시보드, SHEETS.급여, SHEETS.입력,
   SHEETS.정규['대치'], SHEETS.정규['도곡'], SHEETS.정규['구룡초'],
   SHEETS.방학['대치'], SHEETS.방학['도곡'], SHEETS.방학['구룡초'],
   SHEETS.데일리['대치'], SHEETS.데일리['도곡'], SHEETS.데일리['구룡초']]
   .forEach(function (name, idx) { var sh = ss.getSheetByName(name); if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(idx + 1); } });
}
