/**
 * 학원 출결·결제 관리 시트 자동화
 * ------------------------------------------------------------
 * 핵심 기능
 *  1) 횟수(주1·2·3회/매일반)·시간(60·90·120분)·납부(월납/분기납)를 드롭다운으로
 *     고르면  →  금액·총회차·다음결제일이 자동으로 채워지고
 *     회차 칸이 시간별 색(60분 분홍 / 90분 초록 / 120분 노랑)으로 자동 생성됨.
 *  2) 출석은 칸에 날짜를 직접 입력하거나, 칸을 선택 후 메뉴 "오늘 출석"을 누르면 기록.
 *     날짜가 들어간 칸은 '사용됨(회색)'으로 변해, 남아있는 색칸 = 남은 회차가 한눈에 보임.
 *  3) 대시보드에서 '결제 임박'·'회차 소진 위험' 학생이 자동으로 정리됨.
 *
 * 사용법: 빈 구글시트 > 확장프로그램 > Apps Script 에 이 파일 전체를 붙여넣고
 *         메뉴 [학원관리 ▸ 시트 초기화/설치] 를 한 번 실행하세요.
 */

// ===== 설정 상수 ===========================================================
const SHEET_MAIN  = '출결관리';
const SHEET_PRICE = '플랜단가';
const SHEET_DASH  = '대시보드';
const SHEET_HELP  = '사용안내';

const HEADER_ROW      = 2;   // 컬럼 머리글 행
const DATA_START_ROW  = 3;   // 학생 데이터 시작 행
const ROWS_PER_STUDENT = 3;  // 학생 1명당 행 수(분기납·매일반 = 3줄 대응)
const GRID_COLS       = 31;  // 회차(출석) 칸 가로 개수 - 매일반 대응
const INITIAL_STUDENTS = 100; // 초기 생성 학생 블록 수 (메뉴로 추가 가능)

// 컬럼 인덱스(1-base)
const COL = {
  NUM: 1, NAME: 2, GRADE: 3, SCHOOL: 4, PHONE: 5, NOTE: 6,
  REGDATE: 7, FREQ: 8, DUR: 9, CYCLE: 10, PRICE: 11,
  TOTAL: 12, LEFT: 13, DUE: 14, PAYMETHOD: 15, PAYMEMO: 16,
  WPW: 17 // 주당 횟수(도우미, 숨김)
};
const GRID_START_COL = 18; // R열부터 회차 칸

// 색상
const C_DUR = { '60분': '#fce4ec', '90분': '#d9ead3', '120분': '#fff2cc' };
const C_USED   = '#cfcfcf'; // 출석 완료(사용됨)
const C_DUE    = '#fde9d9'; // 다음 결제일 표시 칸
const C_HEADER = '#434343';

const FREQ_LIST  = ['주1회', '주2회', '주3회', '매일반'];
const DUR_LIST   = ['60분', '90분', '120분'];
const CYCLE_LIST = ['월납', '분기납'];

// ===== 메뉴 ================================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📚 학원관리')
    .addItem('① 시트 초기화/설치', 'setup')
    .addSeparator()
    .addItem('✅ 선택 칸 오늘 출석 체크', 'markAttendanceToday')
    .addItem('↩️ 선택 칸 출석 취소', 'unmarkAttendance')
    .addSeparator()
    .addItem('➕ 학생 50명 행 추가', 'addStudents')
    .addItem('🔄 전체 다시 계산', 'recalcAll')
    .addToUi();
}

// ===== 설치/초기화 =========================================================
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  buildPriceSheet_(ss);
  buildMainSheet_(ss);
  buildDashboard_(ss);
  buildHelpSheet_(ss);
  ss.setActiveSheet(ss.getSheetByName(SHEET_MAIN));
  SpreadsheetApp.getUi().alert('설치 완료!\n\n[출결관리] 시트에서 학생 정보를 입력하고\n횟수·시간·납부 드롭다운을 고르면 자동으로 회차 칸이 생성됩니다.');
}

function buildMainSheet_(ss) {
  let sh = ss.getSheetByName(SHEET_MAIN);
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet(SHEET_MAIN, 0);

  const lastCol = GRID_START_COL + GRID_COLS - 1;

  // 제목 행
  sh.getRange(1, 1, 1, lastCol).merge()
    .setValue('출결·결제 관리   |   회차칸 색: 60분 분홍 · 90분 초록 · 120분 노랑   ·   날짜 입력=출석(회색)   ·   남은 색칸=남은 회차')
    .setBackground(C_HEADER).setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('left');

  // 머리글
  const headers = ['번호','이름','학년','학교','연락처','특이사항','등록일',
    '횟수','시간','납부','금액','총회차','남은회차','다음결제일','결제수단','결제메모','주당'];
  sh.getRange(HEADER_ROW, 1, 1, headers.length).setValues([headers])
    .setBackground('#5b9bd5').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  // 회차 칸 머리글
  const gridHead = [];
  for (let i = 1; i <= GRID_COLS; i++) gridHead.push(i);
  sh.getRange(HEADER_ROW, GRID_START_COL, 1, GRID_COLS).setValues([gridHead])
    .setBackground('#9dc3e6').setFontColor('#1f4e79').setFontWeight('bold')
    .setHorizontalAlignment('center').setFontSize(8);

  // 초기 학생 블록 생성
  const lastRow = DATA_START_ROW + INITIAL_STUDENTS * ROWS_PER_STUDENT - 1;
  for (let s = 0; s < INITIAL_STUDENTS; s++) {
    const top = DATA_START_ROW + s * ROWS_PER_STUDENT;
    sh.getRange(top, COL.NUM).setValue(s + 1);
  }

  // 드롭다운(데이터 검증) - 상단 행에만 의미있지만 전체 데이터 행에 적용
  const dvRange = sh.getRange(DATA_START_ROW, COL.FREQ, lastRow - DATA_START_ROW + 1, 1);
  dvRange.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(FREQ_LIST, true).build());
  sh.getRange(DATA_START_ROW, COL.DUR, lastRow - DATA_START_ROW + 1, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(DUR_LIST, true).build());
  sh.getRange(DATA_START_ROW, COL.CYCLE, lastRow - DATA_START_ROW + 1, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(CYCLE_LIST, true).build());

  // 서식
  sh.getRange(DATA_START_ROW, COL.REGDATE, lastRow - DATA_START_ROW + 1, 1).setNumberFormat('yyyy-mm-dd');
  sh.getRange(DATA_START_ROW, COL.DUE, lastRow - DATA_START_ROW + 1, 1).setNumberFormat('yyyy-mm-dd');
  sh.getRange(DATA_START_ROW, COL.PRICE, lastRow - DATA_START_ROW + 1, 1).setNumberFormat('#,##0');
  sh.getRange(DATA_START_ROW, GRID_START_COL, lastRow - DATA_START_ROW + 1, GRID_COLS)
    .setNumberFormat('M/d').setHorizontalAlignment('center').setFontSize(9);

  // 보기 설정
  sh.setFrozenRows(HEADER_ROW);
  sh.setFrozenColumns(2);
  sh.hideColumns(COL.WPW);
  sh.setColumnWidth(COL.NAME, 80);
  sh.setColumnWidth(COL.NOTE, 160);
  sh.setColumnWidth(COL.PAYMEMO, 140);
  for (let c = GRID_START_COL; c <= lastCol; c++) sh.setColumnWidth(c, 34);

  // 조건부 서식: 다음결제일 임박 강조
  const dueRange = sh.getRange(DATA_START_ROW, COL.DUE, lastRow - DATA_START_ROW + 1, 1);
  const rules = sh.getConditionalFormatRules();
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($N3<>"",$N3<=TODAY())')
    .setBackground('#f4cccc').setBold(true).setRanges([dueRange]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($N3<>"",$N3<=TODAY()+7)')
    .setBackground('#fce5cd').setBold(true).setRanges([dueRange]).build());
  sh.setConditionalFormatRules(rules);

  // 블록 구분 테두리
  sh.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, lastCol)
    .setBorder(true, true, true, true, true, true, '#e0e0e0', SpreadsheetApp.BorderStyle.SOLID);
}

function buildPriceSheet_(ss) {
  let sh = ss.getSheetByName(SHEET_PRICE);
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet(SHEET_PRICE);
  sh.getRange(1, 1, 1, 4).setValues([['횟수','시간','납부','금액(편집하세요)']])
    .setBackground(C_HEADER).setFontColor('#fff').setFontWeight('bold');

  // 예시 단가 (실제 금액으로 수정해서 쓰세요)
  // [횟수, 시간, 월납, 분기납]
  const base = [
    ['주1회','60분',120000,342000],
    ['주1회','90분',160000,480000],
    ['주1회','120분',210000,630000],
    ['주2회','60분',180000,513000],
    ['주2회','90분',220000,660000],
    ['주2회','120분',270000,810000],
    ['주3회','60분',240000,684000],
    ['주3회','90분',300000,855000],
    ['주3회','120분',360000,999000],
    ['매일반','60분',300000,855000],
    ['매일반','90분',350000,990000],
    ['매일반','120분',420000,1190000],
  ];
  const rows = [];
  base.forEach(b => {
    rows.push([b[0], b[1], '월납', b[2]]);
    rows.push([b[0], b[1], '분기납', b[3]]);
  });
  sh.getRange(2, 1, rows.length, 4).setValues(rows);
  sh.getRange(2, 4, rows.length, 1).setNumberFormat('#,##0');
  sh.setFrozenRows(1);
  sh.getRange(1,6).setValue('※ 횟수+시간+납부 조합으로 금액을 자동으로 찾아옵니다. 금액만 실제 값으로 바꾸세요.')
    .setFontColor('#888');
}

function buildDashboard_(ss) {
  let sh = ss.getSheetByName(SHEET_DASH);
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet(SHEET_DASH);
  const M = SHEET_MAIN;

  sh.getRange(1,1).setValue('📊 운영 대시보드 (자동 갱신)').setFontSize(14).setFontWeight('bold');

  // KPI
  sh.getRange(3,1,4,1).setValues([['총 등록생'],['이번달 결제예정 합계'],['결제 임박(7일내) 인원'],['회차 소진 위험 인원']])
    .setFontWeight('bold');
  sh.getRange(3,2).setFormula(`=COUNTIF('${M}'!B3:B,"?*")`);
  sh.getRange(4,2).setFormula(`=SUMPRODUCT(('${M}'!N3:N>=DATE(YEAR(TODAY()),MONTH(TODAY()),1))*('${M}'!N3:N<=EOMONTH(TODAY(),0))*N('${M}'!K3:K))`).setNumberFormat('#,##0');
  sh.getRange(5,2).setFormula(`=SUMPRODUCT(('${M}'!B3:B<>"")*('${M}'!N3:N<>"")*('${M}'!N3:N<=TODAY()+7))`);
  sh.getRange(6,2).setFormula(`=SUMPRODUCT(('${M}'!B3:B<>"")*('${M}'!Q3:Q>0)*(N('${M}'!M3:M)>0)*((('${M}'!N3:N-TODAY())/7)*'${M}'!Q3:Q<N('${M}'!M3:M)))`);

  // 결제 임박 목록
  sh.getRange(8,1).setValue('💳 결제 임박 / 지난 학생 (다음결제일 빠른 순)').setFontWeight('bold').setBackground('#fce5cd');
  sh.getRange(9,1,1,5).setValues([['이름','연락처','다음결제일','금액','D-day(남은일)']]).setFontWeight('bold').setBackground('#f3f3f3');
  sh.getRange(10,1).setFormula(
    `=IFERROR(SORT(FILTER({'${M}'!B3:B,'${M}'!E3:E,'${M}'!N3:N,'${M}'!K3:K,'${M}'!N3:N-TODAY()},`+
    `('${M}'!B3:B<>"")*('${M}'!N3:N<>"")*('${M}'!N3:N<=TODAY()+7)),3,TRUE),"결제 임박 학생 없음")`);
  sh.getRange(10,3,200,1).setNumberFormat('yyyy-mm-dd');
  sh.getRange(10,4,200,1).setNumberFormat('#,##0');

  // 회차 소진 위험 목록
  sh.getRange(8,7).setValue('⚠️ 회차 소진 위험 (정상 페이스로 기간 내 소진 어려움)').setFontWeight('bold').setBackground('#f4cccc');
  sh.getRange(9,7,1,5).setValues([['이름','연락처','남은회차','다음결제일','남은일']]).setFontWeight('bold').setBackground('#f3f3f3');
  sh.getRange(10,7).setFormula(
    `=IFERROR(SORT(FILTER({'${M}'!B3:B,'${M}'!E3:E,'${M}'!M3:M,'${M}'!N3:N,'${M}'!N3:N-TODAY()},`+
    `('${M}'!B3:B<>"")*('${M}'!Q3:Q>0)*(N('${M}'!M3:M)>0)*((('${M}'!N3:N-TODAY())/7)*'${M}'!Q3:Q<N('${M}'!M3:M))),5,TRUE),"소진 위험 학생 없음")`);
  sh.getRange(10,9,200,1).setNumberFormat('yyyy-mm-dd');

  sh.setColumnWidth(1,90); sh.setColumnWidth(2,130); sh.setColumnWidth(7,90); sh.setColumnWidth(8,130);
}

function buildHelpSheet_(ss) {
  let sh = ss.getSheetByName(SHEET_HELP);
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet(SHEET_HELP);
  const lines = [
    ['📚 사용 안내'],
    [''],
    ['[1] 학생 등록'],
    ['  · [출결관리] 시트에 이름/학년/학교/연락처/등록일을 입력합니다.'],
    ['  · 횟수(주1·2·3회/매일반), 시간(60·90·120분), 납부(월납/분기납)를 드롭다운에서 고릅니다.'],
    ['  · → 금액·총회차·다음결제일이 자동으로 채워지고, 회차 칸이 시간별 색으로 생성됩니다.'],
    ['      (60분 분홍 · 90분 초록 · 120분 노랑)'],
    ['  · 월납=1줄, 분기납=3줄(월별 1줄씩), 매일반=3줄 가득.'],
    [''],
    ['[2] 출석 체크 (두 가지 방법)'],
    ['  · 방법A: 회차 칸에 온 날짜를 직접 입력 (예: 3/4).'],
    ['  · 방법B: 칸(여러 개 가능)을 선택하고 메뉴 [학원관리 ▸ 선택 칸 오늘 출석 체크].'],
    ['  · 날짜가 들어간 칸은 회색(사용됨)으로 변하고, 남아있는 색칸 = 남은 회차입니다.'],
    ['  · 취소: 칸 선택 후 [학원관리 ▸ 선택 칸 출석 취소] (또는 칸 내용 삭제).'],
    [''],
    ['[3] 결제 / 회차 관리'],
    ['  · [대시보드] 시트에서 결제 임박(7일내·지난) 학생과 회차 소진 위험 학생을 자동으로 봅니다.'],
    ['  · 소진 위험 = 남은 기간 동안 정상 페이스로 와도 등록 회차를 다 못 쓰는 학생 → 연락 대상.'],
    ['  · 금액은 [플랜단가] 시트의 표에서 자동으로 찾아옵니다. 실제 금액으로 수정하세요.'],
    [''],
    ['[4] 재등록 / 학생 추가'],
    ['  · 다음 분기/월에 재등록하면 같은 행에서 횟수·납부·등록일만 바꾸면 회차 칸이 새로 생성됩니다.'],
    ['  · 학생이 더 필요하면 메뉴 [학원관리 ▸ 학생 50명 행 추가].'],
    [''],
    ['[참고] 한 학생은 3줄을 차지합니다(분기납·매일반 대응). 플랜은 맨 윗줄에서 고르세요.'],
  ];
  lines.forEach((l,i)=> sh.getRange(i+1,1).setValue(l[0]));
  sh.getRange(1,1).setFontSize(14).setFontWeight('bold');
  sh.setColumnWidth(1,720);
}

// ===== 핵심: 플랜 계산 =====================================================
function computePlan_(freq, dur, cycle) {
  const map = { '주1회':1, '주2회':2, '주3회':3 };
  if (freq === '매일반') {
    const months = (cycle === '월납') ? 1 : 3;
    return { daily:true, wpw:0, perMonth:GRID_COLS, months:months,
             rowsUsed:ROWS_PER_STUDENT, perRow:GRID_COLS, total:null };
  }
  const wpw = map[freq];
  if (!wpw) return null;
  const months = (cycle === '분기납') ? 3 : 1;
  const perMonth = wpw * 4;
  return { daily:false, wpw:wpw, perMonth:perMonth, months:months,
           rowsUsed:months, perRow:perMonth, total:perMonth*months };
}

function addMonths_(date, n) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  if (d.getDate() < day) d.setDate(0); // 말일 보정
  return d;
}

let _priceCache = null;
function priceLookup_(freq, dur, cycle) {
  if (!_priceCache) {
    _priceCache = {};
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRICE);
    if (sh) {
      const vals = sh.getRange(2,1,Math.max(sh.getLastRow()-1,1),4).getValues();
      vals.forEach(r => { if (r[0]) _priceCache[r[0]+'|'+r[1]+'|'+r[2]] = r[3]; });
    }
  }
  return _priceCache[freq+'|'+dur+'|'+cycle];
}

// ===== 블록(학생) 회차 칸 생성 ============================================
function rebuildBlock_(sh, top) {
  const freq  = String(sh.getRange(top, COL.FREQ).getValue()).trim();
  const dur   = String(sh.getRange(top, COL.DUR).getValue()).trim();
  const cycle = String(sh.getRange(top, COL.CYCLE).getValue()).trim();
  const reg   = sh.getRange(top, COL.REGDATE).getValue();

  // 회차 칸 영역 초기화(배경/내용/노트)
  const grid = sh.getRange(top, GRID_START_COL, ROWS_PER_STUDENT, GRID_COLS);
  grid.setBackground(null).clearContent().clearNote();

  if (!freq || !dur) { // 플랜 미정 → 통계도 비움
    sh.getRange(top, COL.TOTAL, 1, 3).clearContent(); // 총회차/남은회차/다음결제일
    sh.getRange(top, COL.WPW).clearContent();
    return;
  }
  const plan = computePlan_(freq, dur, cycle);
  if (!plan) return;
  const color = C_DUR[dur] || C_DUR['90분'];

  // 회차 칸 색칠 (행=월, 칸=그 달 회차수)
  for (let r = 0; r < plan.rowsUsed && r < ROWS_PER_STUDENT; r++) {
    const n = Math.min(plan.perRow, GRID_COLS);
    sh.getRange(top + r, GRID_START_COL, 1, n).setBackground(color);
  }

  // 통계
  sh.getRange(top, COL.WPW).setValue(plan.wpw);
  sh.getRange(top, COL.TOTAL).setValue(plan.daily ? '매일반' : plan.total);

  const price = priceLookup_(freq, dur, cycle);
  if (price !== undefined && price !== '' ) sh.getRange(top, COL.PRICE).setValue(price);

  // 다음 결제일 = 등록일 + (월납 1개월 / 분기·매일반 해당 개월)
  if (reg instanceof Date) {
    const due = addMonths_(reg, plan.months);
    sh.getRange(top, COL.DUE).setValue(due);
    // 마지막 회차 칸 다음에 결제일 표시(자리가 있으면)
    if (!plan.daily) {
      const lastRow = top + plan.rowsUsed - 1;
      const markCol = GRID_START_COL + plan.perRow; // 회차칸 바로 다음
      if (markCol < GRID_START_COL + GRID_COLS) {
        sh.getRange(lastRow, markCol).setBackground(C_DUE)
          .setNote('다음 결제일: ' + Utilities.formatDate(due, 'Asia/Seoul', 'yyyy-MM-dd'));
      }
    }
  } else {
    sh.getRange(top, COL.DUE).clearContent();
  }

  recomputeBlock_(sh, top);
}

// 등록일만 바뀐 경우: 회차 칸은 유지하고 다음 결제일만 갱신
function updateDueOnly_(sh, top) {
  const freq  = String(sh.getRange(top, COL.FREQ).getValue()).trim();
  const dur   = String(sh.getRange(top, COL.DUR).getValue()).trim();
  const cycle = String(sh.getRange(top, COL.CYCLE).getValue()).trim();
  const reg   = sh.getRange(top, COL.REGDATE).getValue();
  if (!freq || !dur || !(reg instanceof Date)) return;
  const plan = computePlan_(freq, dur, cycle);
  if (!plan) return;
  sh.getRange(top, COL.DUE).setValue(addMonths_(reg, plan.months));
}

// ===== 출석수/남은회차 재계산 =============================================
function recomputeBlock_(sh, top) {
  const total = sh.getRange(top, COL.TOTAL).getValue();
  const grid = sh.getRange(top, GRID_START_COL, ROWS_PER_STUDENT, GRID_COLS).getValues();
  let used = 0;
  grid.forEach(row => row.forEach(v => { if (v instanceof Date) used++; }));

  if (total === '매일반' || total === '' ) {
    sh.getRange(top, COL.LEFT).setValue(total === '매일반' ? ('출석 ' + used) : '');
  } else {
    sh.getRange(top, COL.LEFT).setValue(Number(total) - used);
  }
}

// 학생 블록의 맨 윗줄 행 번호
function blockTop_(row) {
  if (row < DATA_START_ROW) return DATA_START_ROW;
  const idx = Math.floor((row - DATA_START_ROW) / ROWS_PER_STUDENT);
  return DATA_START_ROW + idx * ROWS_PER_STUDENT;
}

// ===== onEdit: 자동 반응 ===================================================
function onEdit(e) {
  const sh = e.range.getSheet();
  if (sh.getName() !== SHEET_MAIN) return;
  const row = e.range.getRow();
  const col = e.range.getColumn();
  const numRows = e.range.getNumRows();
  const numCols = e.range.getNumColumns();
  if (row <= HEADER_ROW) return;

  // 영향받는 블록 모음
  const tops = new Set();
  for (let r = row; r < row + numRows; r++) tops.add(blockTop_(r));

  // 횟수/시간/납부 변경 → 회차 칸 재생성(출석 표시 초기화)
  const planCols = [COL.FREQ, COL.DUR, COL.CYCLE];
  let planChanged = false, regChanged = false;
  for (let c = col; c < col + numCols; c++) {
    if (planCols.indexOf(c) >= 0) planChanged = true;
    if (c === COL.REGDATE) regChanged = true;
  }

  if (planChanged) {
    tops.forEach(t => rebuildBlock_(sh, t));
    return;
  }
  // 등록일만 변경 → 회차 칸은 그대로 두고 다음 결제일만 다시 계산
  if (regChanged) {
    tops.forEach(t => updateDueOnly_(sh, t));
    return;
  }

  // 회차 칸 편집 → 출석 처리
  if (col + numCols - 1 >= GRID_START_COL && col <= GRID_START_COL + GRID_COLS - 1) {
    for (let r = row; r < row + numRows; r++) {
      for (let c = Math.max(col, GRID_START_COL); c < col + numCols && c < GRID_START_COL + GRID_COLS; c++) {
        styleGridCell_(sh, r, c);
      }
    }
    tops.forEach(t => recomputeBlock_(sh, t));
  }
}

// 회차 칸 1개의 상태에 따라 서식 적용
function styleGridCell_(sh, r, c) {
  const cell = sh.getRange(r, c);
  const v = cell.getValue();
  const top = blockTop_(r);
  const dur = String(sh.getRange(top, COL.DUR).getValue()).trim();
  const freq = String(sh.getRange(top, COL.FREQ).getValue()).trim();

  if (v === '' || v === null) {
    // 비움 → 등록된 회차칸이면 시간색 복원, 아니면 흰색
    const plan = (freq && dur) ? computePlan_(freq, dur, String(sh.getRange(top,COL.CYCLE).getValue()).trim()) : null;
    const rIdx = r - top;
    const cIdx = c - GRID_START_COL;
    if (plan && rIdx < plan.rowsUsed && cIdx < plan.perRow) {
      cell.setBackground(C_DUR[dur] || C_DUR['90분']);
    } else {
      cell.setBackground(null);
    }
  } else if (v instanceof Date) {
    cell.setBackground(C_USED); // 날짜 = 출석 완료
  } else {
    // 날짜가 아닌 값을 입력 → 오늘 날짜로 출석 처리
    cell.setValue(new Date()).setBackground(C_USED);
  }
}

// ===== 메뉴 동작 ===========================================================
function markAttendanceToday() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sh.getName() !== SHEET_MAIN) { _toast_('출결관리 시트에서 사용하세요'); return; }
  const ranges = sh.getActiveRangeList().getRanges();
  const today = new Date();
  const tops = new Set();
  ranges.forEach(rg => {
    const sr = rg.getRow(), sc = rg.getColumn();
    for (let r = sr; r < sr + rg.getNumRows(); r++) {
      for (let c = sc; c < sc + rg.getNumColumns(); c++) {
        if (c < GRID_START_COL || c > GRID_START_COL + GRID_COLS - 1) continue;
        if (r <= HEADER_ROW) continue;
        const cell = sh.getRange(r, c);
        if (cell.getValue() === '' || cell.getValue() === null) {
          cell.setValue(today).setBackground(C_USED);
        }
        tops.add(blockTop_(r));
      }
    }
  });
  tops.forEach(t => recomputeBlock_(sh, t));
  _toast_('오늘 출석 체크 완료');
}

function unmarkAttendance() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sh.getName() !== SHEET_MAIN) { _toast_('출결관리 시트에서 사용하세요'); return; }
  const ranges = sh.getActiveRangeList().getRanges();
  const tops = new Set();
  ranges.forEach(rg => {
    const sr = rg.getRow(), sc = rg.getColumn();
    for (let r = sr; r < sr + rg.getNumRows(); r++) {
      for (let c = sc; c < sc + rg.getNumColumns(); c++) {
        if (c < GRID_START_COL || c > GRID_START_COL + GRID_COLS - 1) continue;
        if (r <= HEADER_ROW) continue;
        sh.getRange(r, c).clearContent();
        styleGridCell_(sh, r, c);
        tops.add(blockTop_(r));
      }
    }
  });
  tops.forEach(t => recomputeBlock_(sh, t));
  _toast_('출석 취소 완료');
}

function addStudents() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_MAIN);
  const add = 50;
  const lastCol = GRID_START_COL + GRID_COLS - 1;
  // 현재 마지막 번호 찾기
  const lastRow = sh.getLastRow();
  const startRow = Math.max(lastRow + 1, DATA_START_ROW);
  const startNo = Math.floor((startRow - DATA_START_ROW) / ROWS_PER_STUDENT) + 1;

  for (let s = 0; s < add; s++) {
    const top = startRow + s * ROWS_PER_STUDENT;
    sh.getRange(top, COL.NUM).setValue(startNo + s);
  }
  const newRows = add * ROWS_PER_STUDENT;
  // 드롭다운/서식 확장
  sh.getRange(startRow, COL.FREQ, newRows, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(FREQ_LIST, true).build());
  sh.getRange(startRow, COL.DUR, newRows, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(DUR_LIST, true).build());
  sh.getRange(startRow, COL.CYCLE, newRows, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(CYCLE_LIST, true).build());
  sh.getRange(startRow, COL.REGDATE, newRows, 1).setNumberFormat('yyyy-mm-dd');
  sh.getRange(startRow, COL.DUE, newRows, 1).setNumberFormat('yyyy-mm-dd');
  sh.getRange(startRow, COL.PRICE, newRows, 1).setNumberFormat('#,##0');
  sh.getRange(startRow, GRID_START_COL, newRows, GRID_COLS).setNumberFormat('M/d').setHorizontalAlignment('center').setFontSize(9);
  sh.getRange(startRow, 1, newRows, lastCol).setBorder(true,true,true,true,true,true,'#e0e0e0',SpreadsheetApp.BorderStyle.SOLID);
  _toast_(add + '명 행 추가 완료');
}

function recalcAll() {
  _priceCache = null;
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MAIN);
  const lastRow = sh.getLastRow();
  for (let top = DATA_START_ROW; top <= lastRow; top += ROWS_PER_STUDENT) {
    const freq = String(sh.getRange(top, COL.FREQ).getValue()).trim();
    if (freq) rebuildBlock_(sh, top);
  }
  _toast_('전체 다시 계산 완료');
}

function _toast_(msg) {
  SpreadsheetApp.getActiveSpreadsheet().toast(msg, '학원관리', 3);
}
