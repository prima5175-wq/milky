/**
 * 핸드폰 뒷자리 출석 체크인 스크립트
 *
 * 사용법: 이 스크립트를 "수업일지" 구글시트에 연결된 Apps Script 프로젝트에 붙여넣고
 * 웹앱으로 배포합니다. 지점(수업일지 시트)마다 각각 붙여넣고 배포해야 합니다.
 * 자세한 배포 방법은 apps-script/README.md 를 참고하세요.
 *
 * 지점마다 하루 탭의 컬럼 배치(이름/시작시간/종료시간 열의 위치)가 다를 수 있어서,
 * 컬럼 번호를 코드에 고정하지 않고 매번 헤더 행에서 "이름", "시작시간", "종료시간"
 * 텍스트를 찾아 위치를 자동으로 파악합니다.
 */

// 지점마다 원하는 값으로 바꿔서 사용하세요. (키오스크 설정 화면에 같은 값을 입력해야 합니다)
const SECRET_TOKEN = 'CHANGE_ME';

// 이름/전화번호를 관리할 탭 이름. 컬럼 구성: A=번호, B=이름, C=전화번호
const ROSTER_SHEET_NAME = '수강생명단';

// 하루 탭 헤더에서 이름/등원시간/하원시간 열을 찾을 때 사용할 후보 텍스트
const NAME_HEADER_CANDIDATES = ['이름'];
const START_HEADER_CANDIDATES = ['시작시간', '등원시간', '등원'];
const END_HEADER_CANDIDATES = ['종료시간', '하원시간', '하원'];

// 헤더를 찾기 위해 검사할 최대 행 수 (안내문구 등이 위에 몇 줄 더 있을 수 있어 넉넉하게 설정)
const MAX_HEADER_SCAN_ROWS = 15;

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.token !== SECRET_TOKEN) {
    return jsonpResponse_(params.callback, { status: 'error', message: '인증 실패' });
  }

  try {
    if (params.action === 'lookup') {
      return jsonpResponse_(params.callback, lookupByLast4_(params.last4 || ''));
    }
    if (params.action === 'checkin') {
      return jsonpResponse_(params.callback, checkin_(params.name || ''));
    }
    return jsonpResponse_(params.callback, { status: 'error', message: '알 수 없는 요청' });
  } catch (err) {
    return jsonpResponse_(params.callback, { status: 'error', message: String(err) });
  }
}

function jsonpResponse_(callback, obj) {
  const json = JSON.stringify(obj);
  const body = callback ? `${callback}(${json})` : json;
  return ContentService.createTextOutput(body)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

function lookupByLast4_(rawLast4) {
  const last4 = String(rawLast4).replace(/\D/g, '');
  if (last4.length !== 4) {
    return { status: 'error', message: '뒷자리 4자리를 입력해주세요' };
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ROSTER_SHEET_NAME);
  if (!sheet) {
    return { status: 'error', message: `'${ROSTER_SHEET_NAME}' 시트를 찾을 수 없어요` };
  }

  const data = sheet.getDataRange().getValues();
  const matches = [];
  for (let i = 1; i < data.length; i++) {
    const name = String(data[i][1] || '').trim();
    const phone = String(data[i][2] || '').replace(/\D/g, '');
    if (!name || phone.length < 4) continue;
    if (phone.slice(-4) === last4) matches.push(name);
  }
  return { status: 'ok', matches };
}

// 오늘 날짜(M/D)로 시작하는 탭을 찾는다. "7/17 금", "7/17 (금)", "7/20(월)" 처럼
// 지점마다 표기 방식이 달라서, 정확한 이름을 만들어 찾지 않고 접두어로 검색한다.
function findTodaySheet_() {
  const now = new Date();
  const prefix = `${now.getMonth() + 1}/${now.getDate()}`;
  const re = new RegExp('^' + prefix.replace('/', '\\/') + '(?!\\d)');

  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  for (const sheet of sheets) {
    if (re.test(sheet.getName().trim())) return sheet;
  }
  return null;
}

function findHeaderInfo_(sheet) {
  const numRows = Math.min(sheet.getLastRow(), MAX_HEADER_SCAN_ROWS);
  const numCols = sheet.getLastColumn();
  if (numRows < 1 || numCols < 1) return null;

  const values = sheet.getRange(1, 1, numRows, numCols).getValues();

  for (let r = 0; r < values.length; r++) {
    const row = values[r];
    const nameCol = findColumn_(row, NAME_HEADER_CANDIDATES, true);
    if (nameCol === -1) continue;

    const startCol = findColumn_(row, START_HEADER_CANDIDATES, false);
    const endCol = findColumn_(row, END_HEADER_CANDIDATES, false);
    if (startCol === -1 || endCol === -1) continue;

    return { headerRow: r, nameCol, startCol, endCol };
  }
  return null;
}

function findColumn_(row, candidates, exact) {
  for (const candidate of candidates) {
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim();
      if (!cell) continue;
      if (exact ? cell === candidate : cell.indexOf(candidate) !== -1) return c;
    }
  }
  return -1;
}

function checkin_(rawName) {
  const name = String(rawName).trim();
  if (!name) return { status: 'error', message: '이름이 없어요' };

  const sheet = findTodaySheet_();
  if (!sheet) {
    return { status: 'error', message: '오늘 날짜의 시트를 찾을 수 없어요. 선생님께 말씀해주세요.' };
  }

  const headerInfo = findHeaderInfo_(sheet);
  if (!headerInfo) {
    return { status: 'error', message: `'${sheet.getName()}' 시트에서 이름/시작시간/종료시간 열을 찾지 못했어요. 선생님께 말씀해주세요.` };
  }

  const data = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  for (let i = headerInfo.headerRow + 1; i < data.length; i++) {
    const rowName = String(data[i][headerInfo.nameCol] || '').trim();
    if (rowName !== name) continue;

    const startCell = sheet.getRange(i + 1, headerInfo.startCol + 1);
    if (startCell.getValue()) {
      return { status: 'ok', alreadyDone: true, name: name };
    }

    startCell.setValue(new Date());
    SpreadsheetApp.flush();

    const endValue = sheet.getRange(i + 1, headerInfo.endCol + 1).getValue();
    return { status: 'ok', alreadyDone: false, name: name, endTime: formatTime_(endValue) };
  }

  return { status: 'error', message: `오늘 시트에서 '${name}' 학생을 찾을 수 없어요. 선생님께 말씀해주세요.` };
}

function formatTime_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
  }
  return String(value);
}
