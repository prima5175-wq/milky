/**
 * 학원 명단 시트 - 등록회차 클릭 시 회차 칸 자동 생성
 * ------------------------------------------------------------
 * 시트 구조(열):
 *   A 테스트날짜 · B 이름 · C 학교/학년 · D 휴대전화 · E 등록여부 · F 결제금액 · G 등록회차
 *   H열~ : 회차(출석) 칸
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
const COL_NAME  = 2;        // B 이름
const COL_REG   = 5;        // E 등록여부
const COL_PRICE = 6;        // F 결제금액
const COL_PLAN  = 7;        // G 등록회차
const GRID_START = 8;       // H열부터 회차 칸
const GRID_COLS  = 31;      // 회차 칸 가로 개수(매일반 대응)
const HELPER_COL = GRID_START + GRID_COLS; // 연속행 표시용(숨김)

// 색상
const C_DUR  = { '60분': '#fce4ec', '90분': '#d9ead3', '120분': '#fff2cc' };
const C_USED = '#cfcfcf';   // 출석 완료
const C_CONT = '#f3f3f3';   // 분기납 연속행 표시

const FREQ_PERMONTH = { '주1회': 4, '주2회': 8, '주3회': 12 };
const CONT = 'CONT';

// ===== 메뉴 ================================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📚 학원관리')
    .addItem('① 설치 / 드롭다운 적용', 'setupSheet')
    .addSeparator()
    .addItem('✅ 선택 칸 오늘 출석 체크', 'markAttendanceToday')
    .addItem('↩️ 선택 칸 출석 취소', 'unmarkAttendance')
    .addSeparator()
    .addItem('🔄 보이는 모든 학생 회차칸 다시 그리기', 'redrawAll')
    .addToUi();
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
  if (HELPER_SHEETS.indexOf(sh.getName()) >= 0) {
    SpreadsheetApp.getUi().alert('명단 시트(이름·등록회차가 있는 시트)에서 실행하세요.');
    return;
  }
  const maxRow = sh.getMaxRows();
  const n = maxRow - DATA_START_ROW + 1;

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

  // 회차 칸 서식
  sh.getRange(DATA_START_ROW, GRID_START, n, GRID_COLS)
    .setNumberFormat('M/d').setHorizontalAlignment('center').setFontSize(9);
  for (let c = GRID_START; c < GRID_START + GRID_COLS; c++) sh.setColumnWidth(c, 32);

  // 도우미 열 숨김
  sh.getRange(1, HELPER_COL).setValue('_blk');
  sh.hideColumns(HELPER_COL);

  // 머리글 안내
  sh.getRange(1, COL_PLAN).setNote('등록회차를 고르면 회차 칸이 자동 생성됩니다.\n분기납=3줄, 월납=1줄, 매일반=3줄.\n색: 60분 분홍·90분 초록·120분 노랑.');

  buildPriceSheet_(ss);
  SpreadsheetApp.getUi().alert('설치 완료!\nG열 등록회차를 고르면 회차 칸이 자동 생성됩니다.');
}

function cfEq_(range, text, color) {
  return SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(text).setBackground(color).setRanges([range]).build();
}

function buildPriceSheet_(ss) {
  if (ss.getSheetByName(SHEET_PRICE)) return;
  const sh = ss.insertSheet(SHEET_PRICE);
  sh.getRange(1, 1, 1, 4).setValues([['횟수', '시간', '납부', '금액(편집하세요)']])
    .setBackground('#434343').setFontColor('#fff').setFontWeight('bold');
  const base = [
    ['주1회','60분',120000,342000],['주1회','90분',160000,480000],['주1회','120분',210000,630000],
    ['주2회','60분',180000,513000],['주2회','90분',220000,660000],['주2회','120분',270000,810000],
    ['주3회','60분',240000,684000],['주3회','90분',300000,855000],['주3회','120분',360000,999000],
    ['매일반','60분',300000,855000],['매일반','90분',350000,990000],['매일반','120분',420000,1190000],
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
  return { freq, dur, cycle, daily, perMonth, rows };
}

// ===== 핵심: 등록회차 변경 처리 ===========================================
function handlePlanChange_(sh, row) {
  const maxRow = sh.getMaxRows();
  const val = sh.getRange(row, COL_PLAN).getValue();
  const existingExtra = countContBelow_(sh, row, maxRow);

  // 비우면 → 연속행 제거 + 회차 칸 정리
  if (!String(val).trim()) {
    if (existingExtra > 0) sh.deleteRows(row + 1, existingExtra);
    clearGrid_(sh, row, 0);
    return;
  }
  const plan = parsePlan_(val);
  if (!plan) return;

  const desiredExtra = plan.rows - 1;

  // 줄 수 맞추기 (분기납/매일반=3줄, 월납=1줄)
  if (desiredExtra > existingExtra) {
    const add = desiredExtra - existingExtra;
    sh.insertRowsAfter(row + existingExtra, add);
    for (let i = 0; i < add; i++) {
      const rr = row + existingExtra + 1 + i;
      sh.getRange(rr, HELPER_COL).setValue(CONT);
      sh.getRange(rr, 1, 1, COL_PLAN).setBackground(C_CONT).clearContent();
      sh.getRange(rr, GRID_START, 1, GRID_COLS)
        .setNumberFormat('M/d').setHorizontalAlignment('center').setFontSize(9);
    }
  } else if (desiredExtra < existingExtra) {
    sh.deleteRows(row + 1 + desiredExtra, existingExtra - desiredExtra);
  }

  drawGrid_(sh, row, plan, desiredExtra);
  autofillPrice_(sh, row, plan);
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
  if (HELPER_SHEETS.indexOf(sh.getName()) >= 0) return;
  const row = e.range.getRow();
  const col = e.range.getColumn();
  if (row < DATA_START_ROW) return;

  // 등록회차(G) 변경 → 회차 칸 생성 (학생 첫 줄에서만)
  if (col === COL_PLAN && e.range.getNumColumns() === 1) {
    if (String(sh.getRange(row, HELPER_COL).getValue()) === CONT) return; // 연속행이면 무시
    handlePlanChange_(sh, row);
    return;
  }

  // 회차 칸 편집 → 출석 처리
  const c0 = col, c1 = col + e.range.getNumColumns() - 1;
  if (c1 >= GRID_START && c0 <= GRID_START + GRID_COLS - 1) {
    for (let r = row; r < row + e.range.getNumRows(); r++) {
      for (let c = Math.max(c0, GRID_START); c <= Math.min(c1, GRID_START + GRID_COLS - 1); c++) {
        styleGridCell_(sh, r, c);
      }
    }
  }
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
  sh.getActiveRangeList().getRanges().forEach(rg => {
    const sr = rg.getRow(), sc = rg.getColumn();
    for (let r = sr; r < sr + rg.getNumRows(); r++) {
      for (let c = sc; c < sc + rg.getNumColumns(); c++) {
        if (c < GRID_START || c > GRID_START + GRID_COLS - 1 || r < DATA_START_ROW) continue;
        const cell = sh.getRange(r, c);
        if (cell.getValue() === '' || cell.getValue() === null) cell.setValue(today).setBackground(C_USED);
      }
    }
  });
  SpreadsheetApp.getActiveSpreadsheet().toast('오늘 출석 체크 완료', '학원관리', 3);
}

function unmarkAttendance() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sh.getActiveRangeList().getRanges().forEach(rg => {
    const sr = rg.getRow(), sc = rg.getColumn();
    for (let r = sr; r < sr + rg.getNumRows(); r++) {
      for (let c = sc; c < sc + rg.getNumColumns(); c++) {
        if (c < GRID_START || c > GRID_START + GRID_COLS - 1 || r < DATA_START_ROW) continue;
        sh.getRange(r, c).clearContent();
        styleGridCell_(sh, r, c);
      }
    }
  });
  SpreadsheetApp.getActiveSpreadsheet().toast('출석 취소 완료', '학원관리', 3);
}

function redrawAll() {
  _priceCache = null;
  const sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const maxRow = sh.getLastRow();
  let r = DATA_START_ROW;
  while (r <= maxRow) {
    if (String(sh.getRange(r, HELPER_COL).getValue()) === CONT) { r++; continue; }
    const val = sh.getRange(r, COL_PLAN).getValue();
    const plan = parsePlan_(val);
    if (plan) {
      const extra = countContBelow_(sh, r, sh.getMaxRows());
      drawGrid_(sh, r, plan, Math.min(extra, plan.rows - 1));
      r += plan.rows;
    } else {
      r++;
    }
  }
  SpreadsheetApp.getActiveSpreadsheet().toast('다시 그리기 완료', '학원관리', 3);
}
