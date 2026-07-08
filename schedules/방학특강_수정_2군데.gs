/***************************************************************************
 * [학원관리 코드] 방학특강 부분만 교체하는 방법 — 딱 2군데
 * ------------------------------------------------------------------------
 * ※ 수강생대장·수업일지 등 나머지 학원관리 코드는 절대 건드리지 마세요.
 *   아래 [교체 A], [교체 B] 두 군데만 바꾸면 됩니다.
 ***************************************************************************/


/* ====================================================================
 * [교체 A]  onOpen 안의 '🌴 방학특강' 서브메뉴
 * --------------------------------------------------------------------
 * 아래 "옛것"을 찾아서 "새것"으로 바꾸세요. (필요없는 메뉴 4개 제거)
 * ==================================================================== */

/* ── 옛것 (지울 부분) ──
    .addSubMenu(ui.createMenu('🌴 방학특강')
      .addItem('방학특강 시트 만들기', 'makeSpecialSheet')
      .addItem('오늘 출석 (선택 칸)', 'todaySpecial')
      .addItem('🩶 보강 처리 (선택 칸 회색)', 'markMakeupSpecial')
      .addItem('↩️ 출석/보강 취소 (선택 칸)', 'cancelSpecial')
      .addItem('🔄 보강 수 다시 계산', 'recalcAllSpecial'))
    .addToUi();
*/

/* ── 새것 (이걸로 교체) ── */
//    .addSubMenu(ui.createMenu('🌴 방학특강')
//      .addItem('방학특강 시트 만들기/정리', 'makeSpecialSheet'))
//    .addToUi();


/* ====================================================================
 * [교체 B]  파일 맨 아래 방학특강 부분 전체
 * --------------------------------------------------------------------
 * 파일 맨 아래
 *     // 🌴 방학특강 시트 (별도 탭) — 부/재원생여부 드롭다운, 20칸(4주 색), 보강 카운트
 * 이 줄부터 파일 "끝까지" 전부 지우고, 아래 코드로 교체하세요.
 * (const T_SHEET · T_onEdit_ · makeSpecialSheet 포함 — 다른 코드가 T_SHEET,
 *  T_onEdit_ 를 참조하므로 이 이름들은 반드시 남아 있어야 합니다.)
 * ==================================================================== */

// ====================================================================
// 🌴 방학특강 · 보강관리 (단순화)
//   · 부 / 재원생여부 = 드롭다운, 결제일 = 달력
//   · 첫브리핑 · 포폴배부 = 체크박스
//   · 1~20 회차 칸: 보강 "날짜"를 적으면 그 칸이 회색으로 표시 (카운트/차감 기능 없음)
//   · 특이사항 = 서식·함수 없는 자유 입력칸 (조건부서식 범위 밖 → 회색으로 안 변함)
//   · 스크립트(onEdit) 개입 없음 — 조건부서식만 사용
// ====================================================================
const T_SHEET = '방학특강';
const T_ROWS  = 200;            // 준비 행 수
const T_GRID  = 10;             // 회차 1번 칸(J열)
const T_N     = 20;             // 회차 칸 개수
const T_NOTE  = T_GRID + T_N;   // 특이사항 열(30, AD)
const T_PARTS   = ['1부', '2부', '3부'];
const T_MEMBERS = ['현재재원생', '비재원생', '예전재원생(현재휴원)', '대치점 재원생'];
const T_PART_COLOR = { '1부': '#fce4ec', '2부': '#fff2cc', '3부': '#ccf2e3' };
const T_GRAY = '#b7b7b7';       // 보강 날짜 입력 시 회색

// 방학특강 시트는 스크립트가 개입하지 않음(조건부서식만 사용)
function T_onEdit_(e) {}

function makeSpecialSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  let sh = ss.getSheetByName(T_SHEET);
  const isNew = !sh;
  if (!sh) sh = ss.insertSheet(T_SHEET);
  const used = isNew ? 0 : Math.max(sh.getLastRow() - 1, 0);
  const rows = Math.max(T_ROWS, used + 20);

  // 머리글
  const head = ['부', '이름', '학년', '학교', '전화번호', '재원생여부', '결제일', '첫브리핑', '포폴배부'];
  for (let i = 1; i <= T_N; i++) head.push(String(i));
  head.push('특이사항');
  sh.getRange(1, 1, 1, T_NOTE).setValues([head])
    .setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setBackground('#674ea7').setFontColor('#ffffff');
  sh.setRowHeight(1, 30);
  sh.getRange(1, T_GRID).setNote('1~20 회차 칸: 보강한 "날짜"를 적으면 그 칸이 회색으로 바뀝니다(그날 보강 완료 표시).');

  // 드롭다운(부·재원생여부)
  sh.getRange(2, 1, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(T_PARTS, true).setAllowInvalid(true).build());
  sh.getRange(2, 6, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(T_MEMBERS, true).setAllowInvalid(true).build());

  // 결제일 달력
  sh.getRange(2, 7, rows, 1).setNumberFormat('yyyy-mm-dd')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build());

  // 첫브리핑 · 포폴배부 = 체크박스(옛 남은회차/보강 자리 정리 후 체크박스)
  sh.getRange(2, 8, rows, 2).clearContent().clearDataValidations().insertCheckboxes().setHorizontalAlignment('center');

  // 회차 칸(J~AC): 날짜서식·흰배경, 잘못된 데이터검증 제거
  sh.getRange(2, T_GRID, rows, T_N).clearDataValidations()
    .setNumberFormat('M/d').setHorizontalAlignment('center').setFontSize(9).setBackground('#ffffff');

  // 특이사항(AD): 서식·함수 없음(왼쪽정렬만) → 무엇을 적어도 회색으로 안 변함
  sh.getRange(2, T_NOTE, rows, 1).setHorizontalAlignment('left');

  // 조건부서식: ①부 색(1·2·3부) ②회차칸에 값 있으면 회색  (특이사항은 범위 밖)
  const rules = [];
  const partRange = sh.getRange(2, 1, rows, 1);
  T_PARTS.forEach(function (p) {
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(p).setBackground(T_PART_COLOR[p]).setRanges([partRange]).build());
  });
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenCellNotEmpty().setBackground(T_GRAY).setFontColor('#000000').setBold(true)
    .setRanges([sh.getRange(2, T_GRID, rows, T_N)]).build());
  sh.setConditionalFormatRules(rules);   // 이 시트의 조건부서식은 이 둘만

  // 열너비 · 고정
  const w = [46, 80, 60, 80, 110, 110, 90, 64, 64];
  for (let c = 1; c <= w.length; c++) sh.setColumnWidth(c, w[c - 1]);
  for (let c = T_GRID; c < T_GRID + T_N; c++) sh.setColumnWidth(c, 34);
  sh.setColumnWidth(T_NOTE, 200);
  sh.getRange(1, 1, rows + 1, T_NOTE)
    .setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
  sh.setFrozenRows(1); sh.setFrozenColumns(2);

  ss.setActiveSheet(sh);
  ui.alert('방학특강 시트 준비 완료 🌴',
    '· 첫브리핑·포폴배부 = 체크박스\n· 1~20 칸에 "보강 날짜"를 적으면 회색으로 표시\n· 특이사항 칸은 자유 입력(회색으로 안 변함)\n\n' +
    (isNew ? '새 시트를 만들었어요.' : '기존 시트에 새 서식을 적용했어요. (입력한 데이터는 유지)'),
    ui.ButtonSet.OK);
}
