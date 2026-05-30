/**
 * 학원 명단 시트 - 등록회차 클릭 시 회차 칸 자동 생성
 * ------------------------------------------------------------
 * 시트 구조(열):
 *   A 번호 · B 이름 · C 학교/학년 · D 휴대전화 · E 등록여부 · F 결제금액 · G 등록회차
 *   H 형제할인 · I 등록일 · J 다음등록일 · K~O 주차 띠(5주) · P열~ 회차(출석) 칸
 *
 * 동작:
 *   G(등록회차) 드롭다운을 고르면  →  그 자리에서 바로 회차 칸이 생성됩니다.
 *     · 주1회=4칸 · 주2회=8칸 · 주3회=12칸 (한 달치)
 *     · 분기납 → 아래로 2줄 자동 삽입(총 3줄) · 월납 → 1줄 · 매일반 → 3줄(가득)
 *     · 시간별 색: 60분 분홍 · 90분 초록 · 120분 노랑
 *   회차 칸에 날짜를 입력하거나 메뉴로 출석 체크하면 그 칸이 회색(사용됨)이 됩니다.
 *     → 남아있는 색칸 = 남은 회차.
 *
 * 설치: 확장프로그램 ▸ Apps Script 에 붙여넣고 저장 →
 *       시트로 돌아와 [📚 학원관리 ▸ 설치/드롭다운 적용] 1회 실행.
 */

// ===== 설정 ================================================================
const HELPER_SHEETS = ['플랜단가', '대시보드', '사용안내'];
const SHEET_PRICE   = '플랜단가';

const DATA_START_ROW = 2;   // 머리글이 1행, 데이터는 2행부터
const COL_NUM   = 1;        // A 번호(자동 누적)
const COL_NAME  = 2;        // B 이름
const COL_REG   = 5;        // E 등록여부
const COL_PAYMETHOD = 6;    // F 결제방식
const COL_PRICE = 7;        // G 결제금액
const COL_PLAN  = 8;        // H 등록회차
const COL_SIBLING = 9;      // I 할인
const COL_REGDATE = 10;     // J 등록일(달력)
const COL_NEXTREG = 11;     // K 다음등록일(달력)
const WEEK_START  = 12;     // L열부터 주차 띠(한 줄=한 달, 5주씩)
const WEEK_COLS   = 5;      // 한 달당 주차 칸 수(5주)
const GRID_START  = WEEK_START + WEEK_COLS; // 16(P)열부터 회차 칸
const GRID_COLS   = 31;     // 회차 칸 가로 개수(매일반 대응)
const HELPER_COL   = GRID_START + GRID_COLS;     // 연속행 표시용(숨김)
const HELPER_PRICE = GRID_START + GRID_COLS + 1; // 형제할인 전 원가 저장(숨김)
const DISC_SIB  = 0.95;     // 형제할인 5%
const DISC_OPEN = 0.80;     // 오픈할인 20%

// 색상
const C_DUR  = { '60분': '#fce4ec', '90분': '#d9ead3', '120분': '#fff2cc' };
const C_USED = '#cfcfcf';   // 출석 완료
const C_CONT = '#f3f3f3';   // 분기납 연속행 표시
const C_WEEK_OK   = '#b6d7a8'; // 그 주 출석 있음
const C_WEEK_MISS = '#ea9999'; // 그 주 결석(지난 주)
const C_NEXT3 = '#ffe599';  // 다음등록일 3일 전 노랑
const C_NEXT1 = '#f6b26b';  // 1일 전 주황
const C_NEXT0 = '#e06666';  // 당일/지남 진한 빨강

const FREQ_PERMONTH = { '주1회': 4, '주2회': 8, '주3회': 12 };
const CONT = 'CONT';

// ===== 메뉴 ================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📚 학원관리')
    .addItem('① 설치 / 드롭다운 적용', 'setupSheet')
    .addSeparator()
    .addItem('✅ 선택 칸 오늘 출석 체크', 'markAttendanceToday')
    .addItem('↩️ 선택 칸 출석 취소', 'unmarkAttendance')
    .addSeparator()
    .addItem('🗑 선택 학생 삭제 (휴원)', 'deleteStudent')
    .addItem('🔄 주차 띠 전체 새로고침 (오늘 기준)', 'refreshWeekStrips')
    .addItem('🔢 번호·구분선 다시 정리', 'tidyNumberBorders')
    .addSeparator()
    .addSubMenu(ui.createMenu('🌴 방학특강')
      .addItem('방학특강 시트 만들기', 'makeSpecialSheet')
      .addItem('오늘 출석 (선택 칸)', 'todaySpecial')
      .addItem('🩶 보강 처리 (선택 칸 회색)', 'markMakeupSpecial')
      .addItem('↩️ 출석/보강 취소 (선택 칸)', 'cancelSpecial')
      .addItem('🔄 보강 수 다시 계산', 'recalcAllSpecial'))
    .addToUi();
}

// 선택한 학생(소유행+연속행)을 통째로 삭제하고 번호 재정렬
function deleteStudent() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = sh.getActiveRange().getRow();
  if (row < DATA_START_ROW) return;
  const owner = ownerRow_(sh, row);
  const name = sh.getRange(owner, COL_NAME).getValue() || '(이름 없음)';
  const extra = countContBelow_(sh, owner, sh.getMaxRows());
  const ui = SpreadsheetApp.getUi();
  const res = ui.alert('학생 삭제(휴원)',
    "'" + name + "' 학생을 삭제할까요? (" + (extra + 1) + "줄, 되돌릴 수 없음)",
    ui.ButtonSet.OK_CANCEL);
  if (res !== ui.Button.OK) return;
  sh.deleteRows(owner, extra + 1);
  renumber_(sh);
  SpreadsheetApp.getActiveSpreadsheet().toast(name + ' 삭제 완료', '학원관리', 3);
}

// 행 삭제/추가 시 번호 자동 재정렬(설치형 트리거)
function onChangeHandler(e) {
  if (!e || (e.changeType !== 'REMOVE_ROW' && e.changeType !== 'INSERT_ROW')) return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();
  if (HELPER_SHEETS.indexOf(sh.getName()) >= 0 || sh.getName() === T_SHEET) return;
  renumber_(sh);
}

function tidyNumberBorders() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  renumber_(sh);
  redrawBorders_(sh);
  SpreadsheetApp.getActiveSpreadsheet().toast('번호·구분선 정리 완료', '학원관리', 3);
}

// 등록회차 드롭다운 항목 만들기
function planOptions_() {
  const opts = [];
  ['주1회', '주2회', '주3회'].forEach(f =>
    ['60분', '90분', '120분'].forEach(d =>
      ['월', '분기'].forEach(c => opts.push(`${f} ${d} ${c}`))));
  ['60분', '90분', '120분'].forEach(d => opts.push(`매일반 ${d}`));
  return opts;
}

// ===== 설치 ================================================================
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();
  if (HELPER_SHEETS.indexOf(sh.getName()) >= 0 || sh.getName() === T_SHEET) {
    SpreadsheetApp.getUi().alert('명단 시트(이름·등록회차가 있는 시트)에서 실행하세요.');
    return;
  }
  const maxRow = sh.getMaxRows();
  const n = maxRow - DATA_START_ROW + 1;

  // 머리글 A~K
  sh.getRange(1, 1, 1, COL_NEXTREG).setValues([[
    '번호','이름','학교/학년','휴대전화','등록여부','결제방식','결제금액','등록회차','할인','등록일','다음등록일']])
    .setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');

  // G 등록회차 드롭다운
  sh.getRange(DATA_START_ROW, COL_PLAN, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(planOptions_(), true).build());

  // E 등록여부 드롭다운 + 색상(조건부 서식)
  const regList = ['결제완료_정상등록', '결제대기 중', '등록안함'];
  sh.getRange(DATA_START_ROW, COL_REG, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(regList, true).build());
  const regRange = sh.getRange(DATA_START_ROW, COL_REG, n, 1);
  const rules = sh.getConditionalFormatRules().filter(r =>
    r.getRanges().every(rg => rg.getColumn() !== COL_REG));
  rules.push(cfEq_(regRange, '결제완료_정상등록', '#b6d7a8'));
  rules.push(cfEq_(regRange, '결제대기 중', '#ffe599'));
  rules.push(cfEq_(regRange, '등록안함', '#ea9999'));
  sh.setConditionalFormatRules(rules);

  // F 결제방식 드롭다운 (직접 입력·여러 개 입력 허용)
  sh.getRange(1, COL_PAYMETHOD).setNote('여러 개면 "카드, 현금"처럼 직접 입력 가능. "기타: 무통장입금" 식으로 내용도 적을 수 있어요.\n(진짜 다중선택 칩: 데이터 ▸ 데이터 확인 ▸ 다중 선택 허용 켜기)');
  sh.getRange(DATA_START_ROW, COL_PAYMETHOD, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['결제선생', '카드', '현금', '서울페이', '기타'], true)
      .setAllowInvalid(true).build());
  sh.setColumnWidth(COL_PAYMETHOD, 84);

  // H 할인 드롭다운(정상 / 형제할인 5% / 오픈할인 20%)
  sh.getRange(1, COL_SIBLING).setValue('할인').setFontWeight('bold')
    .setNote("'형제할인'=5% 할인, '오픈할인'=20% 할인, '정상'=원래 금액으로 복원.");
  sh.getRange(DATA_START_ROW, COL_SIBLING, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['정상', '형제할인', '오픈할인'], true).build());
  sh.setColumnWidth(COL_SIBLING, 78);

  // I 등록일 · J 다음등록일 — 달력(날짜 선택기) + 형식
  const dateDV = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build();
  sh.getRange(1, COL_REGDATE).setNote('칸을 더블클릭하면 달력이 떠요. 등록회차를 고르면 오늘 날짜가 자동 기록됩니다.');
  sh.getRange(1, COL_NEXTREG).setNote('칸을 더블클릭하면 달력이 떠요. 등록회차/등록일을 정하면 자동 계산되고, 직접 고쳐도 됩니다.\n3일 전 노랑·1일 전 주황·당일/지남 빨강.');
  sh.getRange(DATA_START_ROW, COL_REGDATE, n, 1).setNumberFormat('yyyy-mm-dd').setDataValidation(dateDV);
  sh.getRange(DATA_START_ROW, COL_NEXTREG, n, 1).setNumberFormat('yyyy-mm-dd').setDataValidation(dateDV);
  sh.setColumnWidth(COL_REGDATE, 90);
  sh.setColumnWidth(COL_NEXTREG, 90);

  // 다음등록일(J) 색 경고: 당일/지남 빨강 → 1일전 주황 → 3일전 노랑 (위에서부터 우선)
  const nextRange = sh.getRange(DATA_START_ROW, COL_NEXTREG, n, 1);
  const jCol = columnLetter_(COL_NEXTREG);
  let rules2 = sh.getConditionalFormatRules().filter(r =>
    r.getRanges().every(rg => rg.getColumn() !== COL_NEXTREG));
  rules2.push(cfFormula_(nextRange, `=AND($${jCol}2<>"",$${jCol}2<=TODAY())`, C_NEXT0));
  rules2.push(cfFormula_(nextRange, `=AND($${jCol}2<>"",$${jCol}2<=TODAY()+1)`, C_NEXT1));
  rules2.push(cfFormula_(nextRange, `=AND($${jCol}2<>"",$${jCol}2<=TODAY()+3)`, C_NEXT3));
  sh.setConditionalFormatRules(rules2);

  // G 등록회차 — 옵션별 무지개색(차례대로). 선택하면 그 칸이 색칠됩니다.
  let rules3 = sh.getConditionalFormatRules().filter(r =>
    r.getRanges().every(rg => rg.getColumn() !== COL_PLAN));
  const opts = planOptions_();
  const gRange = sh.getRange(DATA_START_ROW, COL_PLAN, n, 1);
  opts.forEach((opt, i) => rules3.push(cfEq_(gRange, opt, rainbow_(i, opts.length))));
  sh.setConditionalFormatRules(rules3);

  // K~ 주차 띠 머리글(1주~5주, 한 줄=한 달)
  const wHead = [];
  for (let i = 1; i <= WEEK_COLS; i++) wHead.push(i + '주');
  sh.getRange(1, WEEK_START, 1, WEEK_COLS).setValues([wHead])
    .setBackground('#f9cb9c').setFontColor('#783f04').setFontWeight('bold')
    .setHorizontalAlignment('center').setFontSize(8);
  sh.getRange(1, WEEK_START).setNote('주차 띠: 한 줄=한 달(5주), 등록일부터 주(7일) 단위로 그 주 출석 횟수를 표시합니다.\n분기납은 3줄(달마다 한 줄)로 회차 칸과 나란히 보입니다.\n지난 주인데 한 번도 안 오면 빨강, 오면 초록입니다.');
  for (let c = WEEK_START; c < WEEK_START + WEEK_COLS; c++) sh.setColumnWidth(c, 28);
  // 주차 칸은 '숫자' 형식으로 강제(가져오기 시 1899-xx 날짜로 잘못 보이는 것 방지)
  sh.getRange(DATA_START_ROW, WEEK_START, n, WEEK_COLS).setNumberFormat('0').setHorizontalAlignment('center');

  // 회차 칸 서식
  sh.getRange(DATA_START_ROW, GRID_START, n, GRID_COLS)
    .setNumberFormat('M/d').setHorizontalAlignment('center').setFontSize(9);
  for (let c = GRID_START; c < GRID_START + GRID_COLS; c++) sh.setColumnWidth(c, 32);

  // 도우미 열 숨김
  sh.getRange(1, HELPER_COL).setValue('_blk');
  sh.getRange(1, HELPER_PRICE).setValue('_orig');
  sh.hideColumns(HELPER_COL, 2);

  // 머리글 안내
  sh.getRange(1, COL_PLAN).setNote('등록회차를 고르면 회차 칸이 자동 생성됩니다.\n분기납=3줄, 월납=1줄, 매일반=3줄.\n색: 60분 분홍·90분 초록·120분 노랑.');

  buildPriceSheet_(ss);
  renumber_(sh);
  redrawBorders_(sh);
  sh.setFrozenRows(1);
  // 행 삭제/추가 시 번호 자동 정리용 트리거(중복 생성 방지)
  try {
    if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'onChangeHandler'))
      ScriptApp.newTrigger('onChangeHandler').forSpreadsheet(ss).onChange().create();
  } catch (err) {}
  SpreadsheetApp.getUi().alert('설치 완료!\nG열 등록회차를 고르면 회차 칸이 자동 생성됩니다.');
}

function cfEq_(range, text, color) {
  return SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(text).setBackground(color).setRanges([range]).build();
}

function cfFormula_(range, formula, color) {
  return SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(formula).setBackground(color).setRanges([range]).build();
}

// 무지개색: i번째/전체 n개 → 파스텔 HSV 색
function rainbow_(i, n) {
  return hsvToHex_((i / n) * 300, 0.45, 1.0);
}
function hsvToHex_(h, s, v) {
  h = h / 60;
  const c = v * s, x = c * (1 - Math.abs((h % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 1) { r = c; g = x; } else if (h < 2) { r = x; g = c; }
  else if (h < 3) { g = c; b = x; } else if (h < 4) { g = x; b = c; }
  else if (h < 5) { r = x; b = c; } else { r = c; b = x; }
  const to = t => ('0' + Math.round((t + m) * 255).toString(16)).slice(-2);
  return '#' + to(r) + to(g) + to(b);
}

function columnLetter_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
  return s;
}

// 학생 번호 자동 매기기(연속행·빈 이름 제외, 위에서부터 1,2,3…)
function renumber_(sh) {
  const last = sh.getLastRow();
  if (last < DATA_START_ROW) return;
  const n = last - DATA_START_ROW + 1;
  const helper = sh.getRange(DATA_START_ROW, HELPER_COL, n, 1).getValues();
  const names = sh.getRange(DATA_START_ROW, COL_NAME, n, 1).getValues();
  const out = [];
  let c = 0;
  for (let i = 0; i < n; i++) {
    if (String(helper[i][0]) === CONT || String(names[i][0]).trim() === '') out.push(['']);
    else { c++; out.push([c]); }
  }
  sh.getRange(DATA_START_ROW, COL_NUM, n, 1).setValues(out);
}

// 학생 첫 줄마다 위쪽 굵은 구분선
function setTopBorder_(sh, row) {
  sh.getRange(row, 1, 1, GRID_START + GRID_COLS - 1)
    .setBorder(true, null, null, null, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID_THICK);
}

function redrawBorders_(sh) {
  const last = sh.getLastRow();
  if (last < DATA_START_ROW) return;
  const n = last - DATA_START_ROW + 1;
  const helper = sh.getRange(DATA_START_ROW, HELPER_COL, n, 1).getValues();
  const names = sh.getRange(DATA_START_ROW, COL_NAME, n, 1).getValues();
  for (let i = 0; i < n; i++) {
    const r = DATA_START_ROW + i;
    if (String(helper[i][0]) === CONT || String(names[i][0]).trim() === '') continue;
    setTopBorder_(sh, r);
  }
}

function buildPriceSheet_(ss) {
  if (ss.getSheetByName(SHEET_PRICE)) return;
  const sh = ss.insertSheet(SHEET_PRICE);
  sh.getRange(1, 1, 1, 4).setValues([['횟수', '시간', '납부', '금액(편집하세요)']])
    .setBackground('#434343').setFontColor('#fff').setFontWeight('bold');
  // 책나무 교육비표 (월납, 분기납) — 유치부=60분 / 초등부=90분 / 중등=120분
  const base = [
    ['주1회','60분',140000,390000],['주1회','90분',180000,480000],['주1회','120분',220000,630000],
    ['주2회','60분',200000,570000],['주2회','90분',240000,660000],['주2회','120분',300000,810000],
    ['주3회','60분',300000,750000],['주3회','90분',340000,840000],['주3회','120분',400000,990000],
    ['매일반','60분','',870000],['매일반','90분','',990000],['매일반','120분','',1110000],
  ];
  const rows = [];
  base.forEach(b => { rows.push([b[0],b[1],'월',b[2]]); rows.push([b[0],b[1],'분기',b[3]]); });
  sh.getRange(2,1,rows.length,4).setValues(rows);
  sh.getRange(2,4,rows.length,1).setNumberFormat('#,##0');
  sh.setFrozenRows(1);
  sh.getRange(1,6).setValue('※ 등록회차 선택 시 금액이 비어있으면 여기 표에서 자동 입력됩니다. 실제 금액으로 수정하세요.').setFontColor('#888');
}

// ===== 플랜 파싱 ===========================================================
function parsePlan_(text) {
  const t = String(text || '');
  if (!t.trim()) return null;
  let freq = null;
  if (t.indexOf('매일') >= 0) freq = '매일반';
  else if (t.indexOf('주1') >= 0) freq = '주1회';
  else if (t.indexOf('주2') >= 0) freq = '주2회';
  else if (t.indexOf('주3') >= 0) freq = '주3회';
  if (!freq) return null;

  let dur = '90분';
  if (t.indexOf('120') >= 0) dur = '120분';
  else if (t.indexOf('60') >= 0) dur = '60분';
  else if (t.indexOf('90') >= 0) dur = '90분';

  const daily = (freq === '매일반');
  const cycle = (daily || t.indexOf('분기') >= 0) ? '분기' : '월';
  const perMonth = daily ? GRID_COLS : FREQ_PERMONTH[freq];
  const rows = (daily || cycle === '분기') ? 3 : 1;
  const months = (daily || cycle === '분기') ? 3 : 1; // 다음등록일 계산용
  return { freq, dur, cycle, daily, perMonth, rows, months };
}

// 날짜에 개월 더하기(말일 보정)
function addMonths_(date, n) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

// ===== 핵심: 등록회차 변경 처리 ===========================================
function handlePlanChange_(sh, row) {
  const maxRow = sh.getMaxRows();
  const val = sh.getRange(row, COL_PLAN).getValue();
  const existingExtra = countContBelow_(sh, row, maxRow);

  // 비우면 → 연속행 제거 + 회차 칸/주차 띠 정리
  if (!String(val).trim()) {
    if (existingExtra > 0) sh.deleteRows(row + 1, existingExtra);
    clearGrid_(sh, row, 0);
    sh.getRange(row, WEEK_START, 1, WEEK_COLS).setBackground(null).clearContent();
    return;
  }
  const plan = parsePlan_(val);
  if (!plan) return;

  // 등록일 자동 기록(비어있을 때만)
  if (!(sh.getRange(row, COL_REGDATE).getValue() instanceof Date)) {
    sh.getRange(row, COL_REGDATE).setValue(new Date()).setNumberFormat('yyyy-mm-dd');
  }
  // 다음등록일 = 등록일 + 개월(월납 1 / 분기·매일반 3)
  const regForNext = sh.getRange(row, COL_REGDATE).getValue();
  if (regForNext instanceof Date) {
    sh.getRange(row, COL_NEXTREG).setValue(addMonths_(regForNext, plan.months)).setNumberFormat('yyyy-mm-dd');
  }

  const desiredExtra = plan.rows - 1;

  // 줄 수 맞추기 (분기납/매일반=3줄, 월납=1줄)
  if (desiredExtra > existingExtra) {
    const add = desiredExtra - existingExtra;
    sh.insertRowsAfter(row + existingExtra, add);
    for (let i = 0; i < add; i++) {
      const rr = row + existingExtra + 1 + i;
      sh.getRange(rr, HELPER_COL).setValue(CONT);
      sh.getRange(rr, 1, 1, WEEK_START - 1).setBackground(C_CONT).clearContent().clearDataValidations();
      sh.getRange(rr, GRID_START, 1, GRID_COLS)
        .setNumberFormat('M/d').setHorizontalAlignment('center').setFontSize(9);
    }
  } else if (desiredExtra < existingExtra) {
    sh.deleteRows(row + 1 + desiredExtra, existingExtra - desiredExtra);
  }

  drawGrid_(sh, row, plan, desiredExtra);
  autofillPrice_(sh, row, plan);
  computeWeekStrip_(sh, row, plan, desiredExtra);
}

// ===== 주차 띠: 등록 주(월~일)부터 첫 칸부터 차례로 채움 =================
//   각 주는 달력의 월~일(월요일 시작) 주. 1주·2주…15주를 첫 칸부터 연속으로.
function mondayOf_(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // 월요일로 당기기
  return x;
}

function computeWeekStrip_(sh, owner, plan, extra) {
  const rows = extra + 1;
  sh.getRange(owner, WEEK_START, rows, WEEK_COLS).setBackground(null).clearContent();
  const reg = sh.getRange(owner, COL_REGDATE).getValue();
  if (!(reg instanceof Date) || !plan) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dates = scanDates_(sh, owner, extra);
  const firstMon = mondayOf_(reg);
  const DAY = 86400000;
  const weeksTotal = WEEK_COLS * rows; // 5 또는 15

  for (let idx = 0; idx < weeksTotal; idx++) {
    const wMon = new Date(firstMon.getTime() + idx * 7 * DAY);
    const wSun = new Date(wMon.getTime() + 6 * DAY);
    if (wMon > today) continue; // 아직 안 지난 주는 빈칸
    let cnt = 0;
    dates.forEach(d => { if (d >= wMon && d <= wSun) cnt++; });
    const r = Math.floor(idx / WEEK_COLS), c = idx % WEEK_COLS;
    sh.getRange(owner + r, WEEK_START + c).setValue(cnt)
      .setBackground(cnt > 0 ? C_WEEK_OK : C_WEEK_MISS)
      .setHorizontalAlignment('center').setFontSize(9);
  }
}

// 학생 블록(소유행+연속행)의 회차 칸에서 출석 날짜를 모음
function scanDates_(sh, owner, extra) {
  const vals = sh.getRange(owner, GRID_START, extra + 1, GRID_COLS).getValues();
  const out = [];
  vals.forEach(row => row.forEach(v => {
    if (v instanceof Date) { const d = new Date(v.getFullYear(), v.getMonth(), v.getDate()); out.push(d); }
  }));
  return out;
}

function countContBelow_(sh, row, maxRow) {
  let n = 0;
  while (row + 1 + n <= maxRow) {
    if (String(sh.getRange(row + 1 + n, HELPER_COL).getValue()) === CONT) n++;
    else break;
  }
  return n;
}

function clearGrid_(sh, row, extra) {
  sh.getRange(row, GRID_START, extra + 1, GRID_COLS).setBackground(null).clearContent();
}

function drawGrid_(sh, row, plan, extra) {
  // 회차 칸 영역 초기화 후 색칠
  sh.getRange(row, GRID_START, extra + 1, GRID_COLS).setBackground(null).clearContent();
  const color = C_DUR[plan.dur] || C_DUR['90분'];
  for (let r = 0; r <= extra; r++) {
    const n = Math.min(plan.perMonth, GRID_COLS);
    sh.getRange(row + r, GRID_START, 1, n).setBackground(color);
  }
}

// 할인: '형제할인'=5%, '오픈할인'=20%, '정상'=원가 복원
function applySiblingDiscount_(sh, row) {
  const v = String(sh.getRange(row, COL_SIBLING).getValue()).trim();
  const rate = v === '형제할인' ? DISC_SIB : v === '오픈할인' ? DISC_OPEN : null;
  const fCell = sh.getRange(row, COL_PRICE);
  const hCell = sh.getRange(row, HELPER_PRICE);
  const stored = hCell.getValue();
  if (rate !== null) {
    const base = (typeof stored === 'number' && stored) ? stored : fCell.getValue();
    if (typeof base !== 'number' || !base) return; // 금액이 없으면 무시
    hCell.setValue(base);                          // 원가 보관(중복 할인 방지)
    fCell.setValue(Math.round(base * rate)).setNumberFormat('#,##0');
  } else {
    if (typeof stored === 'number' && stored) fCell.setValue(stored).setNumberFormat('#,##0');
    hCell.clearContent();
  }
}

function autofillPrice_(sh, row, plan) {
  const cur = sh.getRange(row, COL_PRICE).getValue();
  if (cur !== '' && cur !== null) return; // 이미 금액이 있으면 건드리지 않음
  const price = priceLookup_(plan.freq, plan.dur, plan.cycle);
  if (price !== undefined && price !== '') {
    sh.getRange(row, COL_PRICE).setValue(price).setNumberFormat('#,##0');
  }
}

let _priceCache = null;
function priceLookup_(freq, dur, cycle) {
  if (!_priceCache) {
    _priceCache = {};
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRICE);
    if (sh && sh.getLastRow() > 1) {
      sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues()
        .forEach(r => { if (r[0]) _priceCache[r[0] + '|' + r[1] + '|' + r[2]] = r[3]; });
    }
  }
  return _priceCache[freq + '|' + dur + '|' + cycle];
}

// ===== onEdit ==============================================================
function onEdit(e) {
  const sh = e.range.getSheet();
  if (sh.getName() === T_SHEET) { T_onEdit_(e); return; }
  if (HELPER_SHEETS.indexOf(sh.getName()) >= 0) return;
  const row = e.range.getRow();
  const col = e.range.getColumn();
  if (row < DATA_START_ROW) return;

  // 이름(B) 변경 → 번호 자동 매기기 + 구분선
  if (col === COL_NAME && e.range.getNumColumns() === 1) {
    if (String(sh.getRange(row, HELPER_COL).getValue()) !== CONT) {
      renumber_(sh);
      if (String(sh.getRange(row, COL_NAME).getValue()).trim() !== '') setTopBorder_(sh, row);
    }
    return;
  }

  // 형제할인(H) 체크 → 결제금액 5% 할인/복원
  if (col === COL_SIBLING && e.range.getNumColumns() === 1 && e.range.getNumRows() === 1) {
    applySiblingDiscount_(sh, row);
    return;
  }

  // 등록회차(G) 변경 → 회차 칸 생성 (학생 첫 줄에서만)
  if (col === COL_PLAN && e.range.getNumColumns() === 1) {
    if (String(sh.getRange(row, HELPER_COL).getValue()) === CONT) return; // 연속행이면 무시
    handlePlanChange_(sh, row);
    return;
  }

  // 등록일(I) 변경 → 다음등록일 다시 계산 + 주차 띠 다시 계산
  if (col === COL_REGDATE && e.range.getNumColumns() === 1) {
    if (String(sh.getRange(row, HELPER_COL).getValue()) !== CONT) {
      const reg = sh.getRange(row, COL_REGDATE).getValue();
      const plan = parsePlan_(sh.getRange(row, COL_PLAN).getValue());
      if (reg instanceof Date && plan) {
        sh.getRange(row, COL_NEXTREG).setValue(addMonths_(reg, plan.months)).setNumberFormat('yyyy-mm-dd');
      }
      recomputeStripOwner_(sh, row);
    }
    return;
  }

  // 회차 칸 편집 → 출석 처리 + 주차 띠 갱신
  const c0 = col, c1 = col + e.range.getNumColumns() - 1;
  if (c1 >= GRID_START && c0 <= GRID_START + GRID_COLS - 1) {
    const owners = {};
    for (let r = row; r < row + e.range.getNumRows(); r++) {
      for (let c = Math.max(c0, GRID_START); c <= Math.min(c1, GRID_START + GRID_COLS - 1); c++) {
        styleGridCell_(sh, r, c);
      }
      owners[ownerRow_(sh, r)] = true;
    }
    Object.keys(owners).forEach(o => recomputeStripOwner_(sh, Number(o)));
  }
}

// 임의의 학생 소유행에 대해 주차 띠 다시 계산
function recomputeStripOwner_(sh, ownerRow) {
  const plan = parsePlan_(sh.getRange(ownerRow, COL_PLAN).getValue());
  if (!plan) {
    sh.getRange(ownerRow, WEEK_START, 1, WEEK_COLS).setBackground(null).clearContent();
    return;
  }
  const extra = Math.min(countContBelow_(sh, ownerRow, sh.getMaxRows()), plan.rows - 1);
  computeWeekStrip_(sh, ownerRow, plan, extra);
}

function styleGridCell_(sh, r, c) {
  const cell = sh.getRange(r, c);
  const v = cell.getValue();
  if (v === '' || v === null) {
    // 비움 → 등록된 회차칸이면 시간색 복원
    const owner = ownerRow_(sh, r);
    const plan = parsePlan_(sh.getRange(owner, COL_PLAN).getValue());
    const extra = r - owner;
    if (plan && extra >= 0 && extra <= plan.rows - 1 && (c - GRID_START) < plan.perMonth) {
      cell.setBackground(C_DUR[plan.dur] || C_DUR['90분']);
    } else {
      cell.setBackground(null);
    }
  } else if (v instanceof Date) {
    cell.setBackground(C_USED);
  } else {
    cell.setValue(new Date()).setBackground(C_USED); // 날짜 외 입력 → 오늘 출석
  }
}

// 연속행이면 위로 올라가 학생 첫 줄을 찾음
function ownerRow_(sh, row) {
  let r = row;
  while (r > DATA_START_ROW && String(sh.getRange(r, HELPER_COL).getValue()) === CONT) r--;
  return r;
}

// ===== 메뉴 동작 ===========================================================
function markAttendanceToday() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const today = new Date();
  const owners = {};
  sh.getActiveRangeList().getRanges().forEach(rg => {
    const sr = rg.getRow(), sc = rg.getColumn();
    for (let r = sr; r < sr + rg.getNumRows(); r++) {
      for (let c = sc; c < sc + rg.getNumColumns(); c++) {
        if (c < GRID_START || c > GRID_START + GRID_COLS - 1 || r < DATA_START_ROW) continue;
        const cell = sh.getRange(r, c);
        if (cell.getValue() === '' || cell.getValue() === null) cell.setValue(today).setBackground(C_USED);
        owners[ownerRow_(sh, r)] = true;
      }
    }
  });
  Object.keys(owners).forEach(o => recomputeStripOwner_(sh, Number(o)));
  SpreadsheetApp.getActiveSpreadsheet().toast('오늘 출석 체크 완료', '학원관리', 3);
}

function unmarkAttendance() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const owners = {};
  sh.getActiveRangeList().getRanges().forEach(rg => {
    const sr = rg.getRow(), sc = rg.getColumn();
    for (let r = sr; r < sr + rg.getNumRows(); r++) {
      for (let c = sc; c < sc + rg.getNumColumns(); c++) {
        if (c < GRID_START || c > GRID_START + GRID_COLS - 1 || r < DATA_START_ROW) continue;
        sh.getRange(r, c).clearContent();
        styleGridCell_(sh, r, c);
        owners[ownerRow_(sh, r)] = true;
      }
    }
  });
  Object.keys(owners).forEach(o => recomputeStripOwner_(sh, Number(o)));
  SpreadsheetApp.getActiveSpreadsheet().toast('출석 취소 완료', '학원관리', 3);
}

// 오늘 기준으로 모든 학생의 주차 띠를 다시 계산(출석 데이터는 보존)
function refreshWeekStrips() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const maxRow = sh.getLastRow();
  let r = DATA_START_ROW;
  while (r <= maxRow) {
    if (String(sh.getRange(r, HELPER_COL).getValue()) === CONT) { r++; continue; }
    const plan = parsePlan_(sh.getRange(r, COL_PLAN).getValue());
    if (plan) {
      const extra = Math.min(countContBelow_(sh, r, sh.getMaxRows()), plan.rows - 1);
      computeWeekStrip_(sh, r, plan, extra);
      r += plan.rows;
    } else {
      r++;
    }
  }
  SpreadsheetApp.getActiveSpreadsheet().toast('주차 띠 새로고침 완료', '학원관리', 3);
}

// ====================================================================
// 🌴 방학특강 시트 (별도 탭) — 부/재원생여부 드롭다운, 20칸(4주 색), 보강 카운트
// ====================================================================
const T_SHEET = '방학특강';
const TC_PART = 1, TC_NAME = 2, TC_GRADE = 3, TC_SCHOOL = 4, TC_PHONE = 5,
      TC_MEMBER = 6, TC_PAY = 7, TC_LEFT = 8, TC_MAKEUP = 9;
const T_GRID = 10, T_N = 20, T_NOTE = T_GRID + T_N; // 특이사항 = 30
const T_TOTAL = 20;
const T_ROWS_INIT = 80;
const T_WEEK = ['#fce4ec', '#fff2cc', '#ccf2e3', '#cfe2f3']; // 연분홍·연노랑·민트·연하늘
const T_GRAY = '#b7b7b7';                                    // 보강(팔레트 윗줄 5번째 회색)
const T_PARTS = ['1부', '2부', '3부'];
const T_MEMBERS = ['현재재원생', '비재원생', '예전재원생(현재휴원)', '대치점 재원생'];

function T_weekColor_(c) { return T_WEEK[Math.floor((c - T_GRID) / 5)]; }

// 방학특강 시트 생성
function makeSpecialSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(T_SHEET);
  if (sh) { ss.setActiveSheet(sh); SpreadsheetApp.getUi().alert('이미 "방학특강" 시트가 있어요.'); return; }
  sh = ss.insertSheet(T_SHEET);
  const n = T_ROWS_INIT;

  const head = ['부', '이름', '학년', '학교', '전화번호', '재원생여부', '결제일', '남은회차', '보강'];
  for (let i = 1; i <= T_N; i++) head.push(String(i));
  head.push('특이사항');
  sh.getRange(1, 1, 1, T_NOTE).setValues([head])
    .setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
  // 헤더 주차색
  for (let i = 0; i < T_N; i++) sh.getRange(1, T_GRID + i).setBackground(T_weekColor_(T_GRID + i));
  sh.getRange(1, T_GRID).setNote('20칸 = 4주 × 주중 5일. 5칸씩 연분홍·연노랑·민트·연하늘.\n칸에 날짜 입력 = 출석(남은회차 차감).\n회색 = 보강(보강 수 +, 회차에도 포함).');

  // 드롭다운
  sh.getRange(2, TC_PART, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(T_PARTS, true).build());
  sh.getRange(2, TC_MEMBER, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(T_MEMBERS, true).build());
  // 결제일 달력
  sh.getRange(2, TC_PAY, n, 1).setNumberFormat('yyyy-mm-dd')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().build());

  // 남은회차 수식(=20 - 날짜 들어간 칸 수, 보강 포함)
  const gA = columnLetter_(T_GRID), gB = columnLetter_(T_GRID + T_N - 1);
  for (let r = 2; r < 2 + n; r++) {
    sh.getRange(r, TC_LEFT).setFormula('=IF($B' + r + '="","",' + T_TOTAL + '-COUNT($' + gA + r + ':$' + gB + r + '))');
  }
  sh.getRange(2, TC_LEFT, n, 1).setHorizontalAlignment('center');
  sh.getRange(2, TC_MAKEUP, n, 1).setHorizontalAlignment('center');

  // 20칸 색칠 + 서식
  for (let i = 0; i < T_N; i++) {
    sh.getRange(2, T_GRID + i, n, 1).setBackground(T_weekColor_(T_GRID + i))
      .setNumberFormat('M/d').setHorizontalAlignment('center').setFontSize(9);
    sh.setColumnWidth(T_GRID + i, 32);
  }
  sh.setColumnWidth(TC_PAY, 90); sh.setColumnWidth(TC_NAME, 80); sh.setColumnWidth(T_NOTE, 160);
  sh.setFrozenRows(1); sh.setFrozenColumns(2);

  ss.setActiveSheet(sh);
  SpreadsheetApp.getUi().alert('방학특강 시트 생성 완료! 🌴\n부·재원생여부 드롭다운, 20칸(4주 색), 회차 차감, 보강 카운트가 적용됐어요.');
}

// 방학특강 onEdit (회차 칸 편집)
function T_onEdit_(e) {
  const sh = e.range.getSheet();
  const row = e.range.getRow(), col = e.range.getColumn();
  if (row < 2) return;
  const c0 = col, c1 = col + e.range.getNumColumns() - 1;
  if (c1 < T_GRID || c0 > T_GRID + T_N - 1) return;
  const rows = {};
  for (let r = row; r < row + e.range.getNumRows(); r++) {
    for (let c = Math.max(c0, T_GRID); c <= Math.min(c1, T_GRID + T_N - 1); c++) T_styleCell_(sh, r, c);
    rows[r] = true;
  }
  Object.keys(rows).forEach(r => T_recalcMakeup_(sh, Number(r)));
}

function T_styleCell_(sh, r, c) {
  const cell = sh.getRange(r, c);
  const v = cell.getValue();
  if (v === '' || v === null) {
    cell.setBackground(T_weekColor_(c));               // 비우면 주차색 복원
  } else if (v instanceof Date) {
    if (!T_isGray_(cell.getBackground()))             // 보강(회색)이면 그대로, 아니면 정규=주차색
      cell.setBackground(T_weekColor_(c));
  } else {
    cell.setValue(new Date()).setBackground(T_weekColor_(c)); // 날짜 아닌 입력 → 오늘 출석(정규)
  }
}

// 회색 계열인지 판별(흰색·연한 주차색 제외). 어떤 회색을 칠해도 보강으로 인식.
function T_isGray_(hex) {
  if (!hex) return false;
  const h = String(hex).replace('#', '');
  if (h.length < 6) return false;
  const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return (mx - mn) <= 14 && mx >= 0x66 && mx <= 0xe1; // R≈G≈B(무채색) + 흰색/검정 제외
}

function T_recalcMakeup_(sh, row) {
  const bg = sh.getRange(row, T_GRID, 1, T_N).getBackgrounds()[0];
  const vals = sh.getRange(row, T_GRID, 1, T_N).getValues()[0];
  let m = 0;
  for (let i = 0; i < T_N; i++)
    if (T_isGray_(bg[i]) && vals[i] !== '' && vals[i] !== null) m++;
  sh.getRange(row, TC_MAKEUP).setValue(m || '');
}

// 메뉴: 오늘 출석(정규) — 선택 칸에 오늘 날짜, 주차색 유지
function todaySpecial() { T_fillSelected_(false); }
// 메뉴: 보강 처리 — 선택 칸 회색 + (비어있으면)오늘 날짜
function markMakeupSpecial() { T_fillSelected_(true); }

function T_fillSelected_(isMakeup) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sh.getName() !== T_SHEET) { _toastT_('방학특강 시트에서 사용하세요'); return; }
  const today = new Date(); const rows = {};
  sh.getActiveRangeList().getRanges().forEach(rg => {
    for (let r = rg.getRow(); r < rg.getRow() + rg.getNumRows(); r++)
      for (let c = rg.getColumn(); c < rg.getColumn() + rg.getNumColumns(); c++) {
        if (c < T_GRID || c > T_GRID + T_N - 1 || r < 2) continue;
        const cell = sh.getRange(r, c);
        if (cell.getValue() === '' || cell.getValue() === null) cell.setValue(today);
        cell.setBackground(isMakeup ? T_GRAY : T_weekColor_(c));
        rows[r] = true;
      }
  });
  Object.keys(rows).forEach(r => T_recalcMakeup_(sh, Number(r)));
  _toastT_(isMakeup ? '보강 처리 완료' : '오늘 출석 완료');
}

// 메뉴: 출석/보강 취소 — 선택 칸 비우고 주차색 복원
function cancelSpecial() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sh.getName() !== T_SHEET) { _toastT_('방학특강 시트에서 사용하세요'); return; }
  const rows = {};
  sh.getActiveRangeList().getRanges().forEach(rg => {
    for (let r = rg.getRow(); r < rg.getRow() + rg.getNumRows(); r++)
      for (let c = rg.getColumn(); c < rg.getColumn() + rg.getNumColumns(); c++) {
        if (c < T_GRID || c > T_GRID + T_N - 1 || r < 2) continue;
        sh.getRange(r, c).clearContent().setBackground(T_weekColor_(c));
        rows[r] = true;
      }
  });
  Object.keys(rows).forEach(r => T_recalcMakeup_(sh, Number(r)));
  _toastT_('취소 완료');
}

function recalcAllSpecial() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sh.getName() !== T_SHEET) { _toastT_('방학특강 시트에서 사용하세요'); return; }
  const last = sh.getLastRow();
  for (let r = 2; r <= last; r++) T_recalcMakeup_(sh, r);
  _toastT_('보강 수 다시 계산 완료');
}

function _toastT_(msg) { SpreadsheetApp.getActiveSpreadsheet().toast(msg, '방학특강', 3); }
