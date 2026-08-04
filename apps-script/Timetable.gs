/************************************************************
 * 주간 시간표 — 웹앱 (Apps Script)
 *
 * 하는 일
 *  - doGet(): Timetable.html 을 웹앱으로 띄움
 *  - loadData()/saveData(): 일정 전체(JSON)를 연결된
 *    구글 시트의 '_시간표데이터' 탭에 저장/불러옴
 *
 * 배포 방법은 README.md 참고.
 ************************************************************/

// 연결할 구글 시트 ID.
//  - 컨테이너 바인딩(시트에서 만든) 스크립트면 '' 로 두세요(활성 시트 사용).
//  - 독립 스크립트면 시트 URL의 /d/ 와 /edit 사이 값을 넣으세요.
var SHEET_ID = '';

var DATA_SHEET = '_시간표데이터';   // 데이터가 저장되는 탭 이름
var CHUNK = 40000;                   // 셀 1칸 최대 5만자 → 4만자로 나눠 저장

/** 시트를 열면 상단에 '📅 시간표' 메뉴를 추가 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📅 시간표')
    .addItem('시간표 열기', 'openTimetableDialog')
    .addToUi();
}

/** 구글 시트 안에서 큰 창(모달)으로 시간표 열기 */
function openTimetableDialog() {
  var html = HtmlService.createHtmlOutputFromFile('Timetable')
    .setWidth(1600)
    .setHeight(1000);
  SpreadsheetApp.getUi().showModalDialog(html, '주간 시간표');
}

/** 웹앱(링크)으로도 열 수 있게 유지 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Timetable')
    .setTitle('주간 시간표')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** 활성/지정 스프레드시트 */
function _ss_() {
  if (SHEET_ID) return SpreadsheetApp.openById(SHEET_ID);
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error("SHEET_ID를 설정하세요 (Timetable.gs 상단).");
}

/** 데이터 탭 (없으면 생성) */
function _dataSheet_() {
  var ss = _ss_();
  var sh = ss.getSheetByName(DATA_SHEET);
  if (!sh) {
    sh = ss.insertSheet(DATA_SHEET);
    sh.getRange('A1').setNote('시간표 웹앱 데이터(JSON). 직접 수정하지 마세요.');
  }
  return sh;
}

/** 저장된 JSON 문자열 반환(없으면 '') */
function loadData() {
  var sh = _dataSheet_();
  var last = sh.getLastRow();
  if (last < 1) return '';
  var vals = sh.getRange(1, 1, last, 1).getValues();
  var s = '';
  for (var i = 0; i < vals.length; i++) s += (vals[i][0] == null ? '' : vals[i][0]);
  return s;
}

/** JSON 문자열을 나눠서 저장 */
function saveData(json) {
  var sh = _dataSheet_();
  sh.clearContents();
  json = String(json == null ? '' : json);
  var rows = [];
  for (var i = 0; i < json.length; i += CHUNK) rows.push([json.substr(i, CHUNK)]);
  if (!rows.length) rows = [['']];
  sh.getRange(1, 1, rows.length, 1).setValues(rows);
  return true;
}
