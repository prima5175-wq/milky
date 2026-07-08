/***************************************************************************
 * 방학특강 · 보강관리 시트   (독립 스크립트)
 * ------------------------------------------------------------------------
 * ★ 이 코드는 '강사시간표(학원관리)' 코드와 완전히 분리된 별개 스크립트입니다.
 *   반드시 "새 별도 스프레드시트"를 하나 만들어 거기에만 붙여넣어 주세요.
 *   (같은 스프레드시트/프로젝트에 넣으면 onOpen 메뉴가 서로 충돌합니다.)
 *
 * 사용법
 *   1) 새 Google 스프레드시트 생성 → [확장 프로그램] → [Apps Script]
 *   2) 이 코드 전체 붙여넣기 → 저장 → 함수목록에서 setupBoGang 실행(최초 1회 권한 허용)
 *   3) 이후엔 시트 상단 [방학특강] → [보강관리 시트 만들기/정리]
 *
 * 구성 (한 행 = 학생)
 *   번호 | 이름 | 첫브리핑(☑) | 포폴배부(☑) | 1 ~ 20 회차 | 특이사항
 *   · 회차 칸에 '보강 날짜'를 적으면 그 칸이 회색으로 바뀌며 날짜가 표시됩니다.
 *     (0을 넣어 회차 수를 줄이는 기능 없음 — 오직 날짜 → 회색 표시만)
 *   · 특이사항 칸은 서식/함수가 전혀 없는 자유 입력칸입니다(회색으로 변하지 않음).
 *   · 재실행해도 입력한 데이터(이름/체크/날짜/특이사항)는 지워지지 않습니다.
 ***************************************************************************/

var VS = {
  SHEET: '방학특강 보강관리',
  회차: 20,        // 총 회차 수 (1~20)
  학생수: 40       // 학생(행) 수 — 필요하면 숫자만 바꾸세요
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('방학특강')
    .addItem('보강관리 시트 만들기/정리', 'setupBoGang')
    .addToUi();
}

function setupBoGang() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(VS.SHEET) || ss.insertSheet(VS.SHEET);

  var N = VS.학생수, R = VS.회차;
  var FIRST = 5;                 // 회차 1번 열 (E)
  var NOTE = FIRST + R;          // 특이사항 열
  var NCOLS = NOTE;              // 전체 열 수
  var DS = 3, DE = DS + N - 1;   // 데이터 시작/끝 행

  // 제목
  sh.getRange(1, 1, 1, NCOLS).merge().setValue('방학특강 · 보강관리')
    .setBackground('#7030A0').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(1, 30);

  // 헤더(2행)
  var head = ['번호', '이름', '첫브리핑', '포폴배부'];
  for (var i = 1; i <= R; i++) head.push(String(i));
  head.push('특이사항');
  sh.getRange(2, 1, 1, NCOLS).setValues([head])
    .setBackground('#7030A0').setFontColor('#FFFFFF').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  // 번호 자동 채움
  var nums = [];
  for (var n = 1; n <= N; n++) nums.push([n]);
  sh.getRange(DS, 1, N, 1).setValues(nums).setHorizontalAlignment('center').setFontColor('#808080');

  // 체크박스: 첫브리핑(C), 포폴배부(D)
  sh.getRange(DS, 3, N, 2).insertCheckboxes().setHorizontalAlignment('center');

  // 회차 칸: 날짜 표시형(m/d), 가운데 정렬
  sh.getRange(DS, FIRST, N, R).setNumberFormat('m"/"d').setHorizontalAlignment('center');

  // 조건부서식: 회차 칸에 값이 있으면(=보강 날짜 입력) 회색 배경 + 빨강 굵게.
  //  ※ 범위는 회차 칸(E~X)만. 특이사항 열은 절대 포함하지 않음 → 특이사항은 회색으로 안 변함.
  var sessionRange = sh.getRange(DS, FIRST, N, R);
  var rule = SpreadsheetApp.newConditionalFormatRule()
    .whenCellNotEmpty()
    .setBackground('#D9D9D9').setFontColor('#C00000').setBold(true)
    .setRanges([sessionRange]).build();
  sh.setConditionalFormatRules([rule]);   // 이 시트는 우리 규칙만 사용

  // 특이사항 열: 아무 서식/함수 없음 — 왼쪽 정렬, 넓게만
  sh.getRange(DS, NOTE, N, 1).setHorizontalAlignment('left');

  // 안내 문구
  sh.getRange(DE + 2, 1, 1, NCOLS).merge()
    .setValue('※ 회차 칸에 "보강 날짜"를 적으면 회색으로 표시됩니다. · 특이사항 칸은 자유 입력(서식 없음).')
    .setFontColor('#808080').setFontSize(10);

  // 테두리 / 열너비 / 고정
  sh.getRange(2, 1, DE - 1, NCOLS).setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  sh.setColumnWidth(1, 40);
  sh.setColumnWidth(2, 90);
  sh.setColumnWidth(3, 68);
  sh.setColumnWidth(4, 68);
  for (var c = FIRST; c < FIRST + R; c++) sh.setColumnWidth(c, 46);
  sh.setColumnWidth(NOTE, 240);
  sh.setRowHeight(2, 24);
  sh.setFrozenRows(2);
  sh.setFrozenColumns(2);

  ss.setActiveSheet(sh);
  ss.toast('완료! 회차 칸에 보강 날짜를 적으면 회색으로 표시됩니다.', '방학특강', 5);
}
