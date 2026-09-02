/**
 * 신규 오픈 매뉴얼 앱 — 원장님 진행상황 수집 스크립트
 *
 * 원장님이 오픈 매뉴얼 앱에서 단계를 체크하면 이 스크립트가 구글시트에
 * 한 줄로 기록합니다. 지사장님은 그 시트만 열어보시면 전체 현황을 볼 수 있어요.
 *
 * 지점마다 배포하는 게 아니라, 지사에 딱 하나만 배포하면 됩니다.
 * 배포 방법은 apps-script/README-progress.md 를 참고하세요.
 *
 * 기록 방식: 지점 하나당 한 줄. 같은 지점이 다시 보내면 그 줄을 덮어씁니다.
 * (매번 새 줄이 쌓이면 시트가 금방 지저분해지기 때문입니다)
 */

// 지사에서 정한 값으로 바꿔주세요. 앱 쪽 설정에도 같은 값을 넣어야 합니다.
const PROGRESS_TOKEN = 'CHANGE_ME';

// 기록할 탭 이름. 없으면 자동으로 만들어집니다.
const PROGRESS_SHEET_NAME = '오픈진행현황';

// 시트 헤더. 순서를 바꾸면 아래 buildRow_ 도 함께 바꿔야 합니다.
const HEADERS = [
  '지점명', '원장님', '오픈예정일', 'D-Day',
  '진행률(%)', '완료단계', '완료한 단계 번호',
  '퀴즈1', '퀴즈2', '퀴즈3',
  '최근 업데이트',
];

function doGet(e) {
  const params = (e && e.parameter) || {};

  if (params.token !== PROGRESS_TOKEN) {
    return jsonp_(params.callback, { status: 'error', message: '인증 실패' });
  }

  try {
    if (params.action === 'report') {
      return jsonp_(params.callback, saveProgress_(params));
    }
    return jsonp_(params.callback, { status: 'error', message: '알 수 없는 요청' });
  } catch (err) {
    return jsonp_(params.callback, { status: 'error', message: String(err) });
  }
}

/** 진행상황 한 건을 시트에 기록(또는 갱신)합니다. */
function saveProgress_(p) {
  const branch = String(p.branch || '').trim();
  const manager = String(p.manager || '').trim();

  // 지점명이 없으면 어느 지점인지 알 수 없어 기록하지 않습니다.
  if (!branch) {
    return { status: 'error', message: '지점명이 비어 있어요' };
  }

  const sheet = getOrCreateSheet_();

  // 같은 지점 + 같은 원장님이면 기존 줄을 갱신합니다.
  const key = branch + '|' + manager;
  const lastRow = sheet.getLastRow();
  let targetRow = -1;

  if (lastRow >= 2) {
    const existing = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (let i = 0; i < existing.length; i++) {
      const rowKey = String(existing[i][0]).trim() + '|' + String(existing[i][1]).trim();
      if (rowKey === key) {
        targetRow = i + 2;
        break;
      }
    }
  }

  const row = buildRow_(p, branch, manager);

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
    targetRow = sheet.getLastRow();
  }

  // 진행률 칸에 막대 느낌의 배경색을 줘서 한눈에 보이게 합니다.
  const pct = Number(p.percent) || 0;
  sheet.getRange(targetRow, 5).setBackground(
    pct >= 100 ? '#B7E1CD' : pct >= 50 ? '#FFF2CC' : '#FFFFFF'
  );

  SpreadsheetApp.flush();
  return { status: 'ok', row: targetRow };
}

function buildRow_(p, branch, manager) {
  return [
    branch,
    manager,
    String(p.openDate || ''),
    String(p.dday || ''),
    Number(p.percent) || 0,
    String(p.doneCount || '') + ' / ' + String(p.totalCount || ''),
    String(p.doneSteps || ''),
    scoreText_(p.quiz1),
    scoreText_(p.quiz2),
    scoreText_(p.quiz3),
    Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm'),
  ];
}

/** 아직 안 푼 퀴즈는 빈칸 대신 '-' 로 표시합니다. */
function scoreText_(v) {
  if (v === undefined || v === null || v === '') return '-';
  return Number(v) + '점';
}

function getOrCreateSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PROGRESS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(PROGRESS_SHEET_NAME);
  }

  // 헤더가 비어 있으면 새로 씁니다.
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    const header = sheet.getRange(1, 1, 1, HEADERS.length);
    header.setFontWeight('bold').setBackground('#0F5E3D').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 140);   // 지점명
    sheet.setColumnWidth(2, 110);   // 원장님
    sheet.setColumnWidth(7, 220);   // 완료한 단계 번호
    sheet.setColumnWidth(11, 140);  // 최근 업데이트
  }

  return sheet;
}

/**
 * JSONP 응답.
 * 앱이 GitHub Pages 등 다른 도메인에서 열리기 때문에 일반 JSON 으로는
 * 브라우저가 막습니다(CORS). 출석 체크인 스크립트와 같은 방식이에요.
 */
function jsonp_(callback, obj) {
  const json = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
