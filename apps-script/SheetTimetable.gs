/************************************************************
 * 시간표 (구글 시트 네이티브 버전)
 *
 *  - '일정' 탭에 표로 직접 입력:  대상 | 항목 | 요일 | 시작 | 끝 | 색(선택)
 *  - 메뉴 '📅 시간표 → 시간표 그리기' 를 누르면
 *    '시간표' 탭에 시간(세로)×요일(가로) 격자로 색칸을 그려줌
 *
 *  앱/팝업 없이 전부 시트 안에서 동작하고, 입력한 표는 시트에
 *  그대로 저장됩니다(구글시트 기본 자동저장).
 ************************************************************/

var INPUT_SHEET  = '일정';
var OUTPUT_SHEET = '시간표';
var DAYS  = ['월','화','수','목','금','토','일'];
var SLOT  = 30;        // 한 칸 = 30분
var DEF_START = 9;     // 데이터가 없을 때 기본 시작(시)
var DEF_END   = 22;    // 기본 끝(시)
var COLOR_BY  = '항목'; // '항목' 또는 '대상' — 색을 무엇 기준으로 배정할지
var PALETTE = ['#4f8cff','#ff7a59','#33c48d','#c46bff','#ffb020','#ff5a8a',
  '#20c9d6','#8a7bff','#7bbf3a','#ff9d3a','#3aa0ff','#e05a5a',
  '#5ad1a0','#d98cff','#f2c14e','#6c8cff','#e8746a','#48b3c9'];

/* ---------- 메뉴 ---------- */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📅 시간표')
    .addItem('시간표 그리기', 'drawTimetable')
    .addSeparator()
    .addItem('입력 시트 만들기/열기', 'setupInputSheet')
    .addToUi();
}

/* ---------- 입력 시트 준비 ---------- */
function setupInputSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(INPUT_SHEET);
  if (!sh) {
    sh = ss.insertSheet(INPUT_SHEET, 0);
    var header = [['대상','항목','요일','시작','끝','색(선택)']];
    sh.getRange(1,1,1,6).setValues(header)
      .setFontWeight('bold').setBackground('#1c1c28').setFontColor('#ffffff');
    sh.getRange(2,1,2,6).setValues([
      ['쿠니','물리 브릿지','월수금','09:30','12:00',''],
      ['다온','국어 심화','화목','16:30','18:30','']
    ]);
    sh.setColumnWidth(1,90); sh.setColumnWidth(2,200); sh.setColumnWidth(3,90);
    sh.setColumnWidth(4,70); sh.setColumnWidth(5,70); sh.setColumnWidth(6,90);
    sh.setFrozenRows(1);
    sh.getRange('D2:E1000').setNumberFormat('@'); // 시간은 텍스트로(09:30 유지)
    sh.getRange(1,8,1,1).setValue('※ 요일은 월수금 처럼 붙여쓰기, 항목의 // 는 줄바꿈')
      .setFontColor('#888888');
  }
  ss.setActiveSheet(sh);
  SpreadsheetApp.getActiveSpreadsheet().toast('일정 탭에 입력한 뒤 "📅 시간표 → 시간표 그리기"를 누르세요.', '입력 시트', 6);
}

/* ================= 순수 로직 (테스트 가능) ================= */

/** "월수금" / "월,수,금" / "월 수 금" → [0,2,4] */
function parseDays(str) {
  var out = [], s = String(str == null ? '' : str);
  for (var i = 0; i < s.length; i++) {
    var idx = DAYS.indexOf(s.charAt(i));
    if (idx >= 0) out.push(idx);
  }
  return out;
}

/** 시각값(문자열/Date/숫자) → 분 단위 정수. 실패 시 null */
function parseTimeToMin(v) {
  if (v == null || v === '') return null;
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return v.getHours() * 60 + v.getMinutes();
  }
  if (typeof v === 'number') {
    // 구글시트 시간값(0~1 사이 소수) 또는 정수 '시'
    if (v > 0 && v < 1) return Math.round(v * 24 * 60);
    if (v >= 0 && v <= 24) return Math.round(v * 60);
    return Math.round(v); // 이미 분?
  }
  var s = String(v).trim();
  var m = /^(\d{1,2})\s*[:시]\s*(\d{1,2})?/.exec(s);
  if (m) {
    var h = parseInt(m[1], 10), mi = m[2] ? parseInt(m[2], 10) : 0;
    if (h >= 0 && h <= 24 && mi >= 0 && mi < 60) return h * 60 + mi;
  }
  var only = /^(\d{1,2})$/.exec(s);
  if (only) return parseInt(only[1], 10) * 60;
  return null;
}

function minToStr(m) {
  var h = Math.floor(m / 60), mm = m % 60;
  return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
}

/** 겹치는 일정들을 레인(세로 열)으로 분배 → {lanes, laneOf[]} */
function assignLanes(items) {
  var order = items.map(function (it, i) { return i; })
    .sort(function (a, b) {
      return items[a].s - items[b].s || items[a].e - items[b].e;
    });
  var laneEnd = [];            // 각 레인의 마지막 끝 시각
  var laneOf = new Array(items.length);
  for (var k = 0; k < order.length; k++) {
    var i = order[k], placed = false;
    for (var L = 0; L < laneEnd.length; L++) {
      if (items[i].s >= laneEnd[L]) { laneOf[i] = L; laneEnd[L] = items[i].e; placed = true; break; }
    }
    if (!placed) { laneOf[i] = laneEnd.length; laneEnd.push(items[i].e); }
  }
  return { lanes: Math.max(1, laneEnd.length), laneOf: laneOf };
}

/** 여러 아이템에서 시간 범위(시작/끝 분) 계산 */
function computeRange(items) {
  if (!items.length) return { s: DEF_START * 60, e: DEF_END * 60 };
  var mn = Infinity, mx = -Infinity;
  items.forEach(function (it) { mn = Math.min(mn, it.s); mx = Math.max(mx, it.e); });
  mn = Math.floor(mn / 60) * 60;
  mx = Math.ceil(mx / 60) * 60;
  if (mx - mn < 60) mx = mn + 60;
  return { s: mn, e: mx };
}

/** 입력 행들 → 정규화된 아이템 배열(요일 확장 포함). 오류행 목록도 반환 */
function buildItems(rows) {
  var items = [], errors = [];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var target = String(row[0] == null ? '' : row[0]).trim();
    var name   = String(row[1] == null ? '' : row[1]).trim();
    var dayStr = row[2];
    var s = parseTimeToMin(row[3]);
    var e = parseTimeToMin(row[4]);
    var color = String(row[5] == null ? '' : row[5]).trim();
    // 완전 빈 줄은 조용히 건너뜀
    if (!target && !name && (row[2] == null || row[2] === '') &&
        (row[3] == null || row[3] === '') && (row[4] == null || row[4] === '')) continue;
    var days = parseDays(dayStr);
    if (!days.length) { errors.push((r + 2) + '행: 요일을 못 읽음'); continue; }
    if (s == null || e == null) { errors.push((r + 2) + '행: 시간을 못 읽음'); continue; }
    if (e <= s) { errors.push((r + 2) + '행: 끝이 시작보다 빠름'); continue; }
    days.forEach(function (d) {
      items.push({ target: target, name: name, day: d, s: s, e: e, color: color });
    });
  }
  return { items: items, errors: errors };
}

var _colorState;
function colorFor(item) {
  if (item.color) return item.color;
  var key = (COLOR_BY === '대상') ? (item.target || '(빈)') : (item.name || '(빈)');
  if (!_colorState.map[key]) {
    _colorState.map[key] = PALETTE[_colorState.n % PALETTE.length];
    _colorState.n++;
  }
  return _colorState.map[key];
}

/* ================= 그리기 ================= */

function drawTimetable() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var input = ss.getSheetByName(INPUT_SHEET);
  if (!input) { setupInputSheet(); return; }

  var last = input.getLastRow();
  var rows = last >= 2 ? input.getRange(2, 1, last - 1, 6).getValues() : [];
  var built = buildItems(rows);
  var items = built.items;

  _colorState = { map: {}, n: 0 };

  // 요일별 아이템 + 레인 계산
  var perDay = {}, laneCount = {}, laneOf = {};
  DAYS.forEach(function (_, d) { perDay[d] = []; });
  items.forEach(function (it) { perDay[it.day].push(it); });
  DAYS.forEach(function (_, d) {
    var res = assignLanes(perDay[d]);
    laneCount[d] = res.lanes;
    // laneOf 저장(아이템 객체에 직접)
    perDay[d].forEach(function (it, i) { it._lane = res.laneOf[i]; });
  });

  var range = computeRange(items);
  var slots = (range.e - range.s) / SLOT;   // 데이터 행 수

  // 출력 시트 재생성
  var out = ss.getSheetByName(OUTPUT_SHEET);
  if (out) ss.deleteSheet(out);
  out = ss.insertSheet(OUTPUT_SHEET);

  // 열 구성: 1열=시간, 이후 요일마다 lane 수만큼
  var dayStartCol = {}, col = 2;
  DAYS.forEach(function (_, d) { dayStartCol[d] = col; col += laneCount[d]; });
  var totalCols = col - 1;
  var headerRows = 1;
  var totalRows = headerRows + slots;

  // 그리드 값/서식 준비
  var values = [];
  for (var r = 0; r < totalRows; r++) { values.push(new Array(totalCols).fill('')); }

  // 헤더(요일명)
  values[0][0] = '시간';
  // 시간 라벨
  for (var i = 0; i < slots; i++) {
    var mAbs = range.s + i * SLOT;
    if (mAbs % 60 === 0) values[headerRows + i][0] = minToStr(mAbs);
  }
  DAYS.forEach(function (name, d) { values[0][dayStartCol[d] - 1] = name; });

  out.getRange(1, 1, totalRows, totalCols).setValues(values);

  // 기본 서식
  out.setFrozenRows(1);
  out.setFrozenColumns(1);
  out.setColumnWidth(1, 56);
  for (var c = 2; c <= totalCols; c++) out.setColumnWidth(c, 96);
  out.setRowHeight(1, 30);
  for (var r2 = 2; r2 <= totalRows; r2++) out.setRowHeight(r2, 18);

  var full = out.getRange(1, 1, totalRows, totalCols);
  full.setVerticalAlignment('top').setHorizontalAlignment('center')
    .setFontSize(9).setWrap(true)
    .setBorder(true, true, true, true, true, true, '#e3e3ea', SpreadsheetApp.BorderStyle.SOLID);

  // 헤더 배경/색 + 요일 병합
  DAYS.forEach(function (name, d) {
    var start = dayStartCol[d], n = laneCount[d];
    var hc = out.getRange(1, start, 1, n);
    if (n > 1) hc.merge();
    hc.setFontWeight('bold').setBackground('#f4f4f8')
      .setFontColor(d === 5 ? '#3a7bd5' : d === 6 ? '#d64545' : '#222222');
    // 개수 표시
    var cnt = perDay[d].length;
    out.getRange(1, start).setValue(name + '  (' + cnt + ')');
  });
  out.getRange(1, 1).setFontWeight('bold').setBackground('#f4f4f8').setFontColor('#222222');

  // 정각 줄 진하게
  for (var i2 = 0; i2 < slots; i2++) {
    var mAbs2 = range.s + i2 * SLOT;
    var rr = headerRows + i2 + 1;
    if (mAbs2 % 60 === 0) {
      out.getRange(rr, 1, 1, totalCols)
        .setBorder(true, null, null, null, null, null, '#c9c9d6', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    }
    out.getRange(rr, 1).setFontColor('#666666').setFontSize(9);
  }

  // 일정 블록
  DAYS.forEach(function (_, d) {
    perDay[d].forEach(function (it) {
      var cc = dayStartCol[d] + it._lane;
      var rStart = headerRows + (it.s - range.s) / SLOT + 1;
      var span = (it.e - it.s) / SLOT;
      var cell = out.getRange(rStart, cc, span, 1);
      cell.merge();
      var txt = (it.target ? it.target + '\n' : '') +
                String(it.name).replace(/\/\//g, '\n') + '\n' +
                minToStr(it.s) + '~' + minToStr(it.e);
      cell.setValue(txt)
        .setBackground(colorFor(it))
        .setFontColor('#ffffff').setFontWeight('bold')
        .setVerticalAlignment('middle');
    });
  });

  ss.setActiveSheet(out);

  var msg = items.length + '개 일정을 그렸어요.';
  if (built.errors.length) msg += '\n건너뛴 줄: ' + built.errors.join(' / ');
  SpreadsheetApp.getActiveSpreadsheet().toast(msg, '시간표', 8);
}
