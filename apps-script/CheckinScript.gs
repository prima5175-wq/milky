/**
 * 핸드폰 뒷자리 출석 체크인 스크립트
 *
 * 사용법: 이 스크립트를 "수업일지" 구글시트에 연결된 Apps Script 프로젝트에 붙여넣고
 * 웹앱으로 배포합니다. 지점(수업일지 시트)마다 각각 붙여넣고 배포해야 합니다.
 * 자세한 배포 방법은 apps-script/README.md 를 참고하세요.
 */

// 지점마다 원하는 값으로 바꿔서 사용하세요. (키오스크 설정 화면에 같은 값을 입력해야 합니다)
const SECRET_TOKEN = 'CHANGE_ME';

// 이름/전화번호를 관리할 탭 이름. 컬럼 구성: A=번호, B=이름, C=전화번호
const ROSTER_SHEET_NAME = '수강생명단';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 수업일지 하루 탭의 컬럼 위치 (1-based). docs/index.html 이 읽는 컬럼과 동일합니다.
const COL_NAME = 3;   // C열: 이름
const COL_START = 5;  // E열: 등원(출석) 시간 - 이 스크립트가 채워 넣는 칸
const COL_END = 8;    // H열: 하원 시간 - 이미 세팅된 수식으로 자동 계산됨

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

function getTodayTabName_() {
  const now = new Date();
  return `${now.getMonth() + 1}/${now.getDate()} ${DAY_NAMES[now.getDay()]}`;
}

function checkin_(rawName) {
  const name = String(rawName).trim();
  if (!name) return { status: 'error', message: '이름이 없어요' };

  const tabName = getTodayTabName_();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabName);
  if (!sheet) {
    return { status: 'error', message: `오늘(${tabName}) 시트를 찾을 수 없어요. 선생님께 말씀해주세요.` };
  }

  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    const rowName = String(data[i][COL_NAME - 1] || '').trim();
    if (rowName !== name) continue;

    const startCell = sheet.getRange(i + 1, COL_START);
    if (startCell.getValue()) {
      return { status: 'ok', alreadyDone: true, name: name };
    }

    startCell.setValue(new Date());
    SpreadsheetApp.flush();

    const endValue = sheet.getRange(i + 1, COL_END).getValue();
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
