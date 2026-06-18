/**
 * 학원 명단 시트 - 등록회차 클릭 시 회차 칸 자동 생성
 * ------------------------------------------------------------
 * 시트 구조(열):
 *   A 번호 · B 이름 · C 학교/학년 · D 휴대전화 · E 등록여부 · F 결제방식 · G 결제금액
 *   H 결제일 · I 등록회차 · J 할인 · K 등록일 · L 다음등록일 · M~Q 주차 띠(5주) · R열~ 회차(출석) 칸
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
const COL_PAYDATE = 8;      // H 결제일(달력)
const COL_PLAN  = 9;        // I 등록회차
const COL_SIBLING = 10;     // J 할인
const COL_REGDATE = 11;     // K 등록일(달력)
const COL_NEXTREG = 12;     // L 다음등록일(달력)
const WEEK_START  = 13;     // M열부터 주차 띠(한 줄=한 달, 5주씩)
const WEEK_COLS   = 5;      // 한 달당 주차 칸 수(5주)
const GRID_START  = WEEK_START + WEEK_COLS; // 18(R)열부터 회차 칸
const GRID_COLS   = 15;     // 회차 칸 가로 개수(15칸씩 줄바꿈) — 매일반=15×6줄
const HELPER_COL   = GRID_START + GRID_COLS;     // 연속행 표시용(숨김)
const HELPER_PRICE = GRID_START + GRID_COLS + 1; // 형제할인 전 원가 저장(숨김)
const DISC_SIB  = 0.95;     // 형제할인 5%
const DISC_OPEN = 0.80;     // 오픈할인 20%

// 색상
const C_DUR  = { '60분': '#fce4ec', '90분': '#d9ead3', '120분': '#fff2cc' };
const C_USED = '#cfcfcf';   // 출석 완료
const C_MAKEUP = '#9fc5e8'; // 보강(이월) 칸 — 파란색
const MAKEUP_NOTE = '보강'; // 보강 칸 표시(메모) — 출석 취소 시 색 복원·식별용
const C_CONT = '#f3f3f3';   // 분기납 연속행 표시
const C_WEEK_OK   = '#b6d7a8'; // 그 주 출석 있음
const C_WEEK_MISS = '#ea9999'; // 그 주 결석(지난 주)
const C_NEXT3 = '#ffe599';  // 다음등록일 3일 전 노랑
const C_NEXT1 = '#f6b26b';  // 1일 전 주황
const C_NEXT0 = '#e06666';  // 당일/지남 진한 빨강

const FREQ_PERMONTH = { '주1회': 4, '주2회': 8, '주3회': 12 };
const CONT = 'CONT';

// ===== 수업일지 ↔ 결제 시트 연동 ===========================================
const LOG_SHEET    = '수업일지';     // 같은 파일 안의 수업일지 탭 이름
const LOG_HEADER_ROW = 3;            // 수업일지 머리글 줄(이슈체크·이름 등)
const LOG_NAME_COL = 3;              // 수업일지에서 학생 이름이 있는 열(C)
const ISSUE_HEADER = '이슈체크';      // 수업일지에서 상담/피드백 종류를 고르는 칸 머리글
// ▼▼▼ 이슈(상담/피드백) 항목 목록 — 여기에 따옴표로 추가/삭제하면 드롭다운이 바뀝니다 ▼▼▼
//   예) 새 항목 추가: 맨 끝에  ,'전화상담'  처럼 적고 저장 → 메뉴 '수업일지 연동 설치' 한 번 실행
const ISSUE_OPTIONS = ['대면상담','카톡상담','포트폴리오배부','비문학배부','회비납부',
  '신규','신규2일차','시간표변경','레벨업','긴글쓰기','독서왕'];
// ▲▲▲ 항목 수정 후엔 메뉴 '🔗 수업일지 연동 설치'를 다시 눌러 드롭다운에 반영하세요 ▲▲▲
const PAY_LOG_HEADER = '이슈기록'; // 수강생대장(결제) 이름 오른쪽 C열에 기록되는 칸 머리글
// 수업일지에서 '오후 자동 변환'을 적용할 시간 칸 머리글들(숫자만 쳐도 오후로)
const TIME_HEADERS = ['시작시간', '북토크 시작', '북토크 종료'];

// ===== 메뉴 ================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📚 학원관리')
    .addItem('① 설치 / 드롭다운 적용', 'setupSheet')
    .addSeparator()
    .addItem('✅ 선택 칸 오늘 출석 체크', 'markAttendanceToday')
    .addItem('📋 한꺼번에 출석 (이름 붙여넣기)', 'bulkAttendance')
    .addItem('⏪ 방금 한꺼번에 출석 되돌리기', 'undoLastBulk')
    .addItem('↩️ 선택 칸 출석 취소', 'unmarkAttendance')
    .addItem('➕ 보강(이월) 칸 추가 (파란칸)', 'addMakeup')
    .addSeparator()
    .addItem('🗑 선택 학생 삭제 (휴원)', 'deleteStudent')
    .addItem('🔄 주차 띠 전체 새로고침 (오늘 기준)', 'refreshWeekStrips')
    .addItem('🛠 결제금액·결제일 칸 정리', 'fixPayColumns')
    .addItem('🧹 번호·결제방식·결제일 정리', 'fixRosterBasics')
    .addItem('🧯 이슈기록 칸 삭제 (정렬 복구)', 'removeIssueColumn')
    .addItem('🟥 전체 경계선·번호 다시 그리기', 'redrawAllMarks')
    .addItem('🅰 체크 칸 설정 (상담·비문학·긴글·포폴)', 'setupCheckColumns')
    .addItem('📐 기존 데이터 15칸으로 정리 (사본에서 1회)', 'migrateGridTo15')
    .addItem('🔢 번호·구분선 다시 정리', 'tidyNumberBorders')
    .addSeparator()
    .addItem('📅 한 달치 수업일지 만들기', 'makeMonthLogs')
    .addItem('📦 지난 달 수업일지 보관(이동)', 'archiveMonthLogs')
    .addItem('🔎 코드 버전 확인', 'showVersion')
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

// 🛠 결제금액 복구: ①결제일(H)로 밀린 금액을 결제금액(G)으로 되돌리고 ②비면 플랜단가에서 자동 채움 ③할인 반영 ④결제일 비움
function fixPayColumns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();
  const ui = SpreadsheetApp.getUi();
  if (HELPER_SHEETS.indexOf(sh.getName()) >= 0 || sh.getName() === T_SHEET) {
    ui.alert('명단 시트에서 실행하세요.'); return;
  }
  const last = sh.getLastRow();
  const n = last - DATA_START_ROW + 1;
  if (n < 1) { ui.alert('데이터가 없어요.'); return; }

  const res = ui.alert('결제금액 복구',
    '① 결제일 칸으로 밀려 들어간 금액을 결제금액 칸으로 되돌리고\n② 비어 있는 금액은 플랜단가에서 자동으로 채우고\n③ 할인(형제/오픈) 옵션도 다시 반영하고\n④ 결제일 칸은 달력용으로 비웁니다.\n\n진행할까요?',
    ui.ButtonSet.OK_CANCEL);
  if (res !== ui.Button.OK) return;

  const EPOCH = new Date(1899, 11, 30).getTime();
  let moved = 0, filled = 0, discounted = 0;

  for (let i = 0; i < n; i++) {
    const row = DATA_START_ROW + i;
    if (String(sh.getRange(row, HELPER_COL).getValue()) === CONT) continue; // 연속행 건너뜀

    // 1) 결제일(H)에 숫자(금액)가 박혀 있으면 회수
    let h = sh.getRange(row, COL_PAYDATE).getValue();
    if (h instanceof Date) h = Math.round((h.getTime() - EPOCH) / 86400000);
    const hPrice = (typeof h === 'number' && h > 1000) ? h : null;

    // 2) 현재 결제금액(G)
    let g = sh.getRange(row, COL_PRICE).getValue();
    const gEmpty = (g === '' || g === null);

    // 3) 플랜 기준 정가 조회
    const plan = parsePlan_(sh.getRange(row, COL_PLAN).getValue());
    const full = plan ? priceLookup_(plan.freq, plan.dur, plan.cycle) : undefined;

    // 4) 기준 금액(원가) 결정: 플랜단가 정가 우선(표와 일치) → 없으면 밀린 금액 → 없으면 기존 G
    let base = null;
    if (typeof full === 'number' && full) { base = full; filled++; }
    else if (gEmpty && hPrice) { base = hPrice; moved++; }
    else if (!gEmpty && typeof g === 'number') { base = g; }

    if (base !== null) {
      // 5) 할인 반영
      const disc = String(sh.getRange(row, COL_SIBLING).getValue()).trim();
      const rate = disc === '형제할인' ? DISC_SIB : disc === '오픈할인' ? DISC_OPEN : null;
      if (rate !== null) {
        sh.getRange(row, HELPER_PRICE).setValue(base);                 // 원가 보관
        sh.getRange(row, COL_PRICE).setValue(Math.round(base * rate)).setNumberFormat('#,##0');
        discounted++;
      } else {
        sh.getRange(row, COL_PRICE).setValue(base).setNumberFormat('#,##0');
        sh.getRange(row, HELPER_PRICE).clearContent();
      }
    }
  }

  // 6) 결제일 칸 전체 비우고 달력(날짜선택기) + 날짜서식
  sh.getRange(DATA_START_ROW, COL_PAYDATE, n, 1).clearContent().setNumberFormat('yyyy-mm-dd')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());

  ui.alert('복구 완료',
    '✅ 결제금액을 플랜단가 기준으로 설정: ' + filled + '명\n   (그 중 할인 반영: ' + discounted + '명)\n✅ 플랜이 없어 옛 금액으로 되돌림: ' + moved + '명\n\n이제 결제금액이 플랜단가 표와 일치합니다.\n결제일 칸은 비워졌고 더블클릭하면 달력이 떠요.',
    ui.ButtonSet.OK);
}

// 🧯 이슈기록 칸 삭제: 이미 만들어진 '이슈기록' 칸을 지우고 나머지를 왼쪽으로 당겨 정렬 복구
function removeIssueColumn() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const sh = ss.getActiveSheet();
  const col = findColByHeader_(sh, PAY_LOG_HEADER, 1); // '이슈기록'
  if (!col) {
    ui.alert("'이슈기록' 머리글을 못 찾았어요.\n혹시 머리글이 이미 어긋났다면, 먼저 [파일 ▸ 버전 기록]으로 '이슈기록' 글자가 보이던 시점으로 되돌린 뒤 다시 실행하세요.");
    return;
  }
  const res = ui.alert('이슈기록 칸 삭제',
    "'이슈기록' 칸(" + columnLetter_(col) + "열)을 삭제하고 나머지를 왼쪽으로 당겨 정렬을 되돌립니다.\n진행할까요?",
    ui.ButtonSet.OK_CANCEL);
  if (res !== ui.Button.OK) return;
  sh.deleteColumn(col);
  ui.alert('완료', "'이슈기록' 칸을 삭제했어요. 출석칸·결제칸 정렬이 원래대로 돌아왔습니다.\n이제 정상이면 됩니다. (필요하면 🧹 번호·결제방식·결제일 정리만 한 번 눌러주세요)", ui.ButtonSet.OK);
}

// 🧹 번호(빨간표시 제거+순번) · 결제방식 드롭다운 · 결제일 달력 — 머리글로 찾아 안전하게 정리
function fixRosterBasics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const sh = ss.getActiveSheet();
  const nameCol = findColByHeader_(sh, '이름', 1);
  if (!nameCol) { ui.alert("'이름' 머리글이 있는 수강생대장 시트에서 실행하세요."); return; }
  const last = sh.getLastRow();
  if (last < 2) { ui.alert('데이터가 없어요.'); return; }
  const rows = last - 1;
  let note = '';

  // 1) 번호: 데이터 검증(빨간 삼각형) 제거 + 순번 다시(이름 있는 줄만)
  const numCol = findColByHeader_(sh, '번호', 1) || 1;
  sh.getRange(2, numCol, rows, 1).clearDataValidations();
  const names = sh.getRange(2, nameCol, rows, 1).getValues();
  const nums = []; let c = 0;
  for (let i = 0; i < rows; i++) {
    const nm = String(names[i][0]).trim();
    if (nm) { c++; nums.push([c]); } else nums.push(['']);
  }
  sh.getRange(2, numCol, rows, 1).setValues(nums).setNumberFormat('0');

  // 2) 결제방식 드롭다운(결제선생/카드/현금/서울페이/계좌이체, 직접입력 허용)
  const pmCol = findColByHeader_(sh, '결제방식', 1);
  if (pmCol) {
    sh.getRange(2, pmCol, rows, 1).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(['결제선생', '카드', '현금', '서울페이', '계좌이체'], true)
        .setAllowInvalid(true).build());
  } else note += "\n· '결제방식' 칸을 못 찾아 건너뜀";

  // 3) 결제일 달력(날짜 선택기) + 형식
  const pdCol = findColByHeader_(sh, '결제일', 1);
  if (pdCol) {
    sh.getRange(2, pdCol, rows, 1).clearDataValidations();
    sh.getRange(2, pdCol, rows, 1).setNumberFormat('yyyy-mm-dd').setDataValidation(
      SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());
  } else note += "\n· '결제일' 칸을 못 찾아 건너뜀";

  ui.alert('정리 완료',
    '✅ 번호: 빨간 표시 제거 + 순번 다시 정리\n' +
    '✅ 결제방식: 결제선생·카드·현금·서울페이·계좌이체 드롭다운\n' +
    '✅ 결제일: 더블클릭하면 달력' + (note ? ('\n\n참고:' + note) : ''),
    ui.ButtonSet.OK);
}

function tidyNumberBorders() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  renumber_(sh);
  redrawBorders_(sh);
  SpreadsheetApp.getActiveSpreadsheet().toast('번호·구분선 정리 완료', '학원관리', 3);
}

const CODE_VERSION = 'v48 (2026-06-03) 분기 가운데선 제거+체크칸 박스 묶음';
function showVersion() {
  SpreadsheetApp.getUi().alert('현재 코드 버전\n\n' + CODE_VERSION +
    '\n\n이 문구가 보이면 최신 코드가 잘 들어간 거예요.');
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

  // 머리글 A~L (결제금액 오른쪽 '결제일' 포함)
  sh.getRange(1, 1, 1, COL_NEXTREG).setValues([[
    '번호','이름','학교/학년','휴대전화','등록여부','결제방식','결제금액','결제일','등록회차','할인','등록일','다음등록일']])
    .setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');

  // G 등록회차 드롭다운
  sh.getRange(DATA_START_ROW, COL_PLAN, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(planOptions_(), true).build());

  // E 등록여부 드롭다운 + 색상(조건부 서식)
  const regList = ['결제완료_정상등록', '결제대기 중', '미납중', '재발송1차', '재발송2차', '등록안함'];
  sh.getRange(DATA_START_ROW, COL_REG, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(regList, true).build());
  // 색(조건부서식)은 열 전체(E2:E)에 적용 → 학생을 더 추가해도 자동으로 색 입혀짐
  const regRange = sh.getRange(columnLetter_(COL_REG) + DATA_START_ROW + ':' + columnLetter_(COL_REG));
  const rules = []; // 기존 조건부서식 전부 제거 후 새로 구성(주차칸 빨강 잔재 방지)
  rules.push(cfEq_(regRange, '결제완료_정상등록', '#b6d7a8'));   // 초록
  rules.push(cfEq_(regRange, '결제대기 중', '#ffe599'));         // 노랑
  rules.push(cfEq_(regRange, '미납중', '#f4cccc'));             // 연한 빨강
  rules.push(cfEq_(regRange, '재발송1차', '#ea9999'));          // 빨강
  rules.push(cfEq_(regRange, '재발송2차', '#e06666'));          // 진한 빨강
  rules.push(cfEq_(regRange, '등록안함', '#cc0000'));           // 가장 진한 빨강
  sh.setConditionalFormatRules(rules);

  // F 결제방식 드롭다운 (직접 입력·여러 개 입력 허용)
  sh.getRange(1, COL_PAYMETHOD).setNote('여러 개면 "카드, 현금"처럼 직접 입력 가능. "기타: 무통장입금" 식으로 내용도 적을 수 있어요.\n(진짜 다중선택 칩: 데이터 ▸ 데이터 확인 ▸ 다중 선택 허용 켜기)');
  sh.getRange(DATA_START_ROW, COL_PAYMETHOD, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['결제선생', '카드', '현금', '서울페이', '계좌이체'], true)
      .setAllowInvalid(true).build());
  sh.setColumnWidth(COL_PAYMETHOD, 84);

  // G 결제금액 — 잘못 남은 드롭다운(예전 결제방식) 제거 + 숫자 형식
  sh.getRange(DATA_START_ROW, COL_PRICE, n, 1).clearDataValidations().setNumberFormat('#,##0');

  // H 할인 드롭다운(정상 / 형제할인 5% / 오픈할인 20%)
  sh.getRange(1, COL_SIBLING).setValue('할인').setFontWeight('bold')
    .setNote("'형제할인'=5% 할인, '오픈할인'=20% 할인, '정상'=원래 금액으로 복원.");
  sh.getRange(DATA_START_ROW, COL_SIBLING, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['정상', '형제할인', '오픈할인'], true).build());
  sh.setColumnWidth(COL_SIBLING, 78);

  // H 결제일 · K 등록일 · L 다음등록일 — 달력(날짜 선택기) + 형식
  const dateDV = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build();
  sh.getRange(1, COL_PAYDATE).setNote('결제한 날짜. 칸을 더블클릭하면 달력이 떠요.');
  sh.getRange(1, COL_REGDATE).setNote('칸을 더블클릭하면 달력이 떠요. 등록회차를 고르면 오늘 날짜가 자동 기록됩니다.');
  sh.getRange(1, COL_NEXTREG).setNote('칸을 더블클릭하면 달력이 떠요. 등록회차/등록일을 정하면 자동 계산되고, 직접 고쳐도 됩니다.\n3일 전 노랑·1일 전 주황·당일/지남 빨강.');
  sh.getRange(DATA_START_ROW, COL_PAYDATE, n, 1).setNumberFormat('yyyy-mm-dd').setDataValidation(dateDV);
  sh.getRange(DATA_START_ROW, COL_REGDATE, n, 1).setNumberFormat('yyyy-mm-dd').setDataValidation(dateDV);
  sh.getRange(DATA_START_ROW, COL_NEXTREG, n, 1).setNumberFormat('yyyy-mm-dd').setDataValidation(dateDV);
  sh.setColumnWidth(COL_PAYDATE, 90);
  sh.setColumnWidth(COL_REGDATE, 90);
  sh.setColumnWidth(COL_NEXTREG, 90);

  // 다음등록일(J) 색 경고: 당일/지남 빨강 → 1일전 주황 → 3일전 노랑 (위에서부터 우선)
  const nextRange = sh.getRange(DATA_START_ROW, COL_NEXTREG, n, 1);
  const jCol = columnLetter_(COL_NEXTREG);
  let rules2 = sh.getConditionalFormatRules();
  rules2.push(cfFormula_(nextRange, `=AND($${jCol}2<>"",$${jCol}2<=TODAY())`, C_NEXT0));
  rules2.push(cfFormula_(nextRange, `=AND($${jCol}2<>"",$${jCol}2<=TODAY()+1)`, C_NEXT1));
  rules2.push(cfFormula_(nextRange, `=AND($${jCol}2<>"",$${jCol}2<=TODAY()+3)`, C_NEXT3));
  sh.setConditionalFormatRules(rules2);

  // G 등록회차 — 옵션별 무지개색(차례대로). 선택하면 그 칸이 색칠됩니다.
  let rules3 = sh.getConditionalFormatRules();
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
  // 주차 칸: 잘못 적용된 데이터 검증(날짜 전용) 제거 + 숫자 형식 강제(빨간 오류삼각형 방지)
  sh.getRange(DATA_START_ROW, WEEK_START, n, WEEK_COLS)
    .clearDataValidations().setNumberFormat('0').setHorizontalAlignment('center');
  // 회차 칸도 날짜 검증 제거(날짜 입력 시 오류삼각형 방지)
  sh.getRange(DATA_START_ROW, GRID_START, n, GRID_COLS).clearDataValidations();

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

  sh.getRange(1, 1, 1, GRID_START + GRID_COLS - 1).clearNote();
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
  const numRange = sh.getRange(DATA_START_ROW, COL_NUM, n, 1);
  numRange.clearDataValidations();  // 번호 칸 빨간 삼각형(잘못된 입력값) 방지
  numRange.setValues(out);
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
  const perMonth = daily ? GRID_COLS : FREQ_PERMONTH[freq]; // 매일반=15칸/줄
  const rows = daily ? 6 : (cycle === '분기' ? 3 : 1);      // 매일반=6줄(15×6=90), 분기=3줄, 월=1줄
  const months = (daily || cycle === '분기') ? 3 : 1;        // 다음등록일 계산용
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
  sh.getRange(row, GRID_START, extra + 1, GRID_COLS).setBackground(null).clearContent().clearNote();
}

function drawGrid_(sh, row, plan, extra) {
  const rows = extra + 1;
  const block = sh.getRange(row, GRID_START, rows, GRID_COLS);
  const notes = block.getNotes();                 // 보강 칸 메모 보존용
  // 회차 칸 영역 초기화(보강 메모는 clearContent/배경이 안 지움)
  block.setBackground(null).clearContent();
  const color = C_DUR[plan.dur] || C_DUR['90분'];
  const per = Math.min(plan.perMonth, GRID_COLS);
  for (let r = 0; r <= extra; r++) {
    sh.getRange(row + r, GRID_START, 1, per).setBackground(color);
  }
  // 보강(이월) 칸은 파란색으로 복원(정규 색 위에 덮어씀)
  for (let rr = 0; rr < rows; rr++)
    for (let cc = 0; cc < GRID_COLS; cc++)
      if (notes[rr][cc] === MAKEUP_NOTE) sh.getRange(row + rr, GRID_START + cc).setBackground(C_MAKEUP);
  redrawGridMarks_(sh, row);
}

// 체크 칸(상담~포폴) 머리글 범위 찾기 → {c1, c2} (없으면 null)
function getCheckColRange_(sh) {
  const heads = ['상담', '비문학', '비문학번호', '긴글', '포폴'];
  let c1 = 1e9, c2 = -1;
  heads.forEach(function (h) {
    const c = findColByHeader_(sh, h, 1);
    if (c) { if (c < c1) c1 = c; if (c > c2) c2 = c; }
  });
  return c2 >= 0 ? { c1: c1, c2: c2 } : null;
}

// 학생 블록 표시: 분기 3줄의 '가운데 가로선'을 없애 한 사람으로 보이게 + 체크 칸을 박스로 묶음
//   (셀 병합 안 함 → 모든 줄에 체크·기입 가능). 회차 칸의 잡선/붉은선은 제거.
function redrawGridMarks_(sh, owner, checkRange) {
  const plan = parsePlan_(sh.getRange(owner, COL_PLAN).getValue());
  if (!plan) return;
  const rows = plan.rows;
  const MED = SpreadsheetApp.BorderStyle.SOLID_MEDIUM;
  const cr = checkRange || getCheckColRange_(sh);
  const lastCol = cr ? cr.c2 : (GRID_START + GRID_COLS - 1);

  // 1) 회차 영역의 옛 테두리(붉은선/박스) 제거
  sh.getRange(owner, GRID_START, rows, GRID_COLS).setBorder(false, false, false, false, false, false);
  // 2) 분기(여러 줄) 블록의 내부 '가로선'만 제거 → 가운데 줄 없어져 한 사람처럼 보임
  if (rows > 1)
    sh.getRange(owner, 1, rows, lastCol).setBorder(null, null, null, null, null, false);
  // 3) 체크 칸(상담~포폴)을 박스로 묶음(외곽+세로 칸 구분선, 가운데 가로선은 없음)
  if (cr)
    sh.getRange(owner, cr.c1, rows, cr.c2 - cr.c1 + 1)
      .setBorder(true, true, true, true, true, false, '#666666', MED);
  // 4) 학생 첫 줄 위쪽 굵은 구분선 복원
  setTopBorder_(sh, owner);
}

// 🟥 전체 학생에 정규/보강 경계선 다시 그리기 + 번호 칸 정리(기존 데이터에도 적용)
function redrawAllMarks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();
  const ui = SpreadsheetApp.getUi();
  if (HELPER_SHEETS.indexOf(sh.getName()) >= 0 || sh.getName() === T_SHEET) {
    ui.alert('수강생대장(명단) 시트에서 실행하세요.'); return;
  }
  // 1) 번호 칸 검증(빨간 삼각형) 제거 + 순번 정리
  renumber_(sh);
  // 2) 모든 학생(소유행)에 박스/가운데선 정리
  const last = sh.getLastRow();
  const checkRange = getCheckColRange_(sh); // 한 번만 계산해 넘김(속도)
  let r = DATA_START_ROW, cnt = 0;
  while (r <= last) {
    if (String(sh.getRange(r, HELPER_COL).getValue()) === CONT) { r++; continue; }
    const plan = parsePlan_(sh.getRange(r, COL_PLAN).getValue());
    if (plan) { redrawGridMarks_(sh, r, checkRange); cnt++; }
    r += 1 + countContBelow_(sh, r, last);
  }
  ui.alert('완료', '기존 ' + cnt + '명 정리 완료.\n분기 3줄 가운데 선을 없애고 체크 칸을 박스로 묶었어요.\n번호 칸 빨간 표시도 정리했습니다.', ui.ButtonSet.OK);
}

// 🅰 체크 칸 설정: 상담·긴글·포폴=달력, 비문학=레벨(P,A,B~J)+비문학번호(1~12) — 머리글로 찾음
function setupCheckColumns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();
  const ui = SpreadsheetApp.getUi();
  if (findColByHeader_(sh, '이름', 1) === 0) { ui.alert("'이름' 머리글이 있는 수강생대장 시트에서 실행하세요."); return; }
  const last = sh.getLastRow();
  if (last < 2) { ui.alert('데이터가 없어요.'); return; }
  const rows = last - 1;
  const done = [];

  // 상담·긴글·포폴 → 더블클릭 달력
  ['상담', '긴글', '포폴'].forEach(function (h) {
    const c = findColByHeader_(sh, h, 1);
    if (c) {
      sh.getRange(2, c, rows, 1).clearDataValidations();
      sh.getRange(2, c, rows, 1).setNumberFormat('M/d').setDataValidation(
        SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());
      done.push(h + '=달력');
    }
  });

  // 비문학 → 레벨 드롭다운 + '비문학번호'(1~12) 칸
  const bc = findColByHeader_(sh, '비문학', 1);
  if (bc) {
    sh.getRange(2, bc, rows, 1).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(['P', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'], true).build());
    let nc = findColByHeader_(sh, '비문학번호', 1);
    if (!nc) {
      sh.insertColumnAfter(bc); nc = bc + 1;
      sh.getRange(1, nc).setValue('비문학번호').setFontWeight('bold')
        .setHorizontalAlignment('center').setVerticalAlignment('middle');
      sh.setColumnWidth(nc, 56);
    }
    const nums = [];
    for (let i = 1; i <= 12; i++) nums.push(String(i));
    sh.getRange(2, nc, rows, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(nums, true).build());
    done.push('비문학=레벨+번호');
  }

  if (!done.length) { ui.alert("'상담·비문학·긴글·포폴' 머리글을 못 찾았어요. 머리글 줄(1행)에 그 칸들이 있는지 확인해주세요."); return; }
  ui.alert('체크 칸 설정 완료',
    done.join(' · ') + "\n\n비문학은 레벨(P,A,B~J)과 비문학번호(1~12)를 각각 골라 'B5'처럼 쓰면 돼요.\n분기 3줄 박스는 [🟥 전체 경계선·번호 다시 그리기]로 적용됩니다.",
    ui.ButtonSet.OK);
}

// 📐 기존 데이터(옛 31칸)를 새 15칸 배치로 1회 정리. ※ 반드시 사본에서 먼저!
//   안 쓰는 가로 16칸을 삭제 → 숨은 도우미/출석 날짜가 자동 정렬, 매일반만 6줄로 다시 펴줌
function migrateGridTo15() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();
  const ui = SpreadsheetApp.getUi();
  if (HELPER_SHEETS.indexOf(sh.getName()) >= 0 || sh.getName() === T_SHEET) {
    ui.alert('수강생대장(명단) 시트에서 실행하세요.'); return;
  }
  const OLD_GC = 31;                 // 옛 회차 칸 폭
  const delCount = OLD_GC - GRID_COLS; // 삭제할 칸 수(16)
  if (delCount <= 0) { ui.alert('이미 15칸 배치예요.'); return; }
  const oldHelpCol = GRID_START + OLD_GC; // 옛 도우미 위치(49)

  // 이미 정리됐는지 점검: 옛 도우미 자리에 '_blk'가 없으면 이미 새 배치
  if (String(sh.getRange(1, oldHelpCol).getValue()) !== '_blk') {
    ui.alert('이미 15칸 배치로 정리된 것 같아요. (옛 도우미 칸이 없음)\n그래도 모양이 이상하면 알려주세요.');
    return;
  }

  const res = ui.alert('기존 데이터 15칸으로 정리',
    '⚠️ 반드시 사본에서 실행하세요!\n안 쓰는 가로 ' + delCount + '칸을 삭제해 기존 학생 데이터를 새 15칸 배치로 맞춥니다.\n매일반은 6줄로 다시 펴집니다. 출석 날짜는 보존돼요.\n\n진행할까요?',
    ui.ButtonSet.OK_CANCEL);
  if (res !== ui.Button.OK) return;

  // 1) 매일반 학생 날짜 미리 수집(삭제로 잘릴 수 있으므로) — 컬럼 삭제는 행을 안 바꿈
  const last = sh.getLastRow();
  const dailyData = [];
  let r = DATA_START_ROW;
  while (r <= last) {
    if (String(sh.getRange(r, oldHelpCol).getValue()) === CONT) { r++; continue; }
    const plan = parsePlan_(sh.getRange(r, COL_PLAN).getValue());
    let oldExtra = 0;
    while (String(sh.getRange(r + 1 + oldExtra, oldHelpCol).getValue()) === CONT) oldExtra++;
    if (plan && plan.daily) {
      const block = sh.getRange(r, GRID_START, oldExtra + 1, OLD_GC).getValues();
      const dates = [];
      block.forEach(row => row.forEach(v => { if (v instanceof Date) dates.push(v); }));
      dailyData.push({ row: r, dates: dates });
    }
    r += 1 + oldExtra;
  }

  // 2) 안 쓰는 가로 칸 삭제 → 옛 도우미(49,50)·이후 칸들이 왼쪽으로 당겨져 새 위치(33,34)에 정렬
  sh.deleteColumns(GRID_START + GRID_COLS, delCount); // deleteColumns(33, 16)

  // 3) 매일반 학생만 6줄로 다시 펴고 날짜 복원(행이 늘어나므로 아래쪽부터 처리)
  dailyData.sort((a, b) => b.row - a.row);
  dailyData.forEach(d => {
    const plan = parsePlan_(sh.getRange(d.row, COL_PLAN).getValue());
    if (!plan) return;
    handlePlanChange_(sh, d.row);              // 6줄로 재생성(15칸)
    const newExtra = plan.rows - 1;
    d.dates.sort((a, b) => a - b);
    d.dates.forEach(dt => {
      const t = firstEmptyGridCell_(sh, d.row, newExtra + 1);
      if (t) sh.getRange(t.r, t.c).setValue(dt).setNumberFormat('M/d').setBackground(C_USED);
    });
    recomputeStripOwner_(sh, d.row);
    redrawGridMarks_(sh, d.row);
  });

  renumber_(sh);
  ui.alert('정리 완료',
    '기존 데이터를 15칸 배치로 옮겼어요. 매일반은 6줄로 펴졌습니다.\n' +
    '확인 후, 경계선이 필요하면 [🟥 전체 경계선·번호 다시 그리기]도 한 번 눌러주세요.',
    ui.ButtonSet.OK);
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
  // 수업일지류(이름이 매일 달라져도 '이슈체크' 머리글 구조로 자동 인식)
  if (isLogSheet_(sh)) { handleLogEdit_(e); return; }
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
    // 보강 칸이면 파란색 복원(정규보다 우선)
    if (cell.getNote() === MAKEUP_NOTE) { cell.setBackground(C_MAKEUP); return; }
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

// 이름 정규화: 공백·줄바꿈·괄호·숫자·점 제거 → 매칭 안정화
function normName_(s) {
  return String(s == null ? '' : s)
    .replace(/\(.*?\)/g, '')     // 괄호 내용 제거  김리안(6)→김리안
    .replace(/[\s ]/g, '')  // 모든 공백 제거
    .replace(/[0-9]/g, '')       // 숫자 제거  김지우3→김지우
    .replace(/[.\-_/]/g, '')     // 기호 제거
    .trim();
}

// 📋 한꺼번에 출석: 다른 곳의 이름 목록을 붙여넣기 → 날짜 → 각 학생 빈 회차칸에 기입
function bulkAttendance() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();
  if (HELPER_SHEETS.indexOf(sh.getName()) >= 0 || sh.getName() === T_SHEET) {
    SpreadsheetApp.getUi().alert('명단(포레페이지) 시트에서 사용하세요.'); return;
  }
  const ui = SpreadsheetApp.getUi();

  // 1) 이름 목록 붙여넣기
  const rN = ui.prompt('한꺼번에 출석 — ① 이름 붙여넣기',
    '출석한 학생 이름을 붙여넣으세요.\n(줄바꿈·쉼표·탭·공백 어떤 걸로 구분해도 돼요. 괄호/숫자/공백은 자동 무시)',
    ui.ButtonSet.OK_CANCEL);
  if (rN.getSelectedButton() !== ui.Button.OK) return;
  const rawNames = String(rN.getResponseText()).split(/[\n,\t ]+/)
    .map(s => s.trim()).filter(s => s.length);
  if (!rawNames.length) { ui.alert('이름이 비어 있어요.'); return; }

  // 2) 날짜 입력
  const today = new Date();
  const dStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const rD = ui.prompt('한꺼번에 출석 — ② 날짜 (' + rawNames.length + '명)',
    '출석 날짜를 입력하세요 (예: ' + dStr + ' 또는 5/30).\n비워두면 오늘로 처리됩니다.',
    ui.ButtonSet.OK_CANCEL);
  if (rD.getSelectedButton() !== ui.Button.OK) return;
  const date = parseUserDate_(rD.getResponseText(), today);
  if (!date) { ui.alert('날짜를 이해하지 못했어요. (예: 2026-05-30 또는 5/30)'); return; }
  // 시간대 무관 날짜 글자(노이즈 0시/시간대 변환 없이 입력한 그날 그대로 저장)
  const dateStr = date.getFullYear() + '-' +
    ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2);
  const tz = ss.getSpreadsheetTimeZone();

  // 3) 명단 이름 → 행 매핑(정규화 키)
  const last = sh.getLastRow();
  const nameCol = sh.getRange(DATA_START_ROW, COL_NAME, last - DATA_START_ROW + 1, 1).getValues();
  const helper  = sh.getRange(DATA_START_ROW, HELPER_COL, last - DATA_START_ROW + 1, 1).getValues();
  const normToRows = {};   // 정규화이름 → [행...] (동명이인 대비)
  const allNorm = [];
  for (let i = 0; i < nameCol.length; i++) {
    if (String(helper[i][0]) === CONT) continue;
    const raw = String(nameCol[i][0]).trim();
    if (!raw) continue;
    const key = normName_(raw);
    (normToRows[key] = normToRows[key] || []).push(DATA_START_ROW + i);
    allNorm.push({ key: key, raw: raw });
  }

  let okCnt = 0, dupCnt = 0;
  const full = [], notFound = [], ambiguous = [];
  const done = {};
  const written = [];   // 이번에 실제로 찍은 칸 [r,c] — 되돌리기용
  rawNames.forEach(input => {
    const key = normName_(input);
    let rowsForName = normToRows[key];
    if (!rowsForName) { notFound.push(input); return; }
    if (rowsForName.length > 1) { ambiguous.push(input + '(' + rowsForName.length + '명)'); }
    rowsForName.forEach(owner => {
      const plan = parsePlan_(sh.getRange(owner, COL_PLAN).getValue());
      const rows = plan ? plan.rows : 1;
      const block = sh.getRange(owner, GRID_START, rows, GRID_COLS).getValues();
      let already = false;
      for (let rr = 0; rr < rows && !already; rr++)
        for (let cc = 0; cc < GRID_COLS; cc++) {
          const v = block[rr][cc];
          if (v instanceof Date && Utilities.formatDate(v, tz, 'yyyy-MM-dd') === dateStr) { already = true; break; }
        }
      if (already) { dupCnt++; done[owner] = true; return; }
      const target = firstEmptyGridCell_(sh, owner, rows);
      if (!target) { full.push(sh.getRange(owner, COL_NAME).getValue()); return; }
      // 날짜를 "글자"로 저장 → 시간대 변환 없음(하루 밀림 원천 차단)
      sh.getRange(target.r, target.c).setValue(dateStr).setNumberFormat('M/d').setBackground(C_USED);
      written.push([target.r, target.c]);
      done[owner] = true; okCnt++;
    });
  });
  Object.keys(done).forEach(o => recomputeStripOwner_(sh, Number(o)));
  // 마지막 한꺼번에 출석 기록 저장(되돌리기용)
  PropertiesService.getDocumentProperties().setProperty('LAST_BULK',
    JSON.stringify({ sheet: sh.getName(), date: dateStr, cells: written }));

  let msg = '✅ ' + (date.getMonth() + 1) + '월 ' + date.getDate() + '일 출석 처리: ' + okCnt + '명';
  if (dupCnt) msg += '\n(이미 그 날짜 있음: ' + dupCnt + '명 건너뜀)';
  if (ambiguous.length) msg += '\n⚠️ 동명이인(모두 처리): ' + ambiguous.join(', ');
  if (full.length) msg += '\n⚠️ 칸이 꽉 참: ' + full.join(', ');
  if (notFound.length) {
    msg += '\n\n❓ 못 찾은 이름(' + notFound.length + '):\n' + notFound.join(', ');
    // 비슷한 이름 추천
    const sugg = notFound.slice(0, 5).map(nf => {
      const k = normName_(nf);
      const cand = allNorm.filter(a => a.key.indexOf(k) >= 0 || k.indexOf(a.key) >= 0)
        .map(a => a.raw);
      return cand.length ? ('· ' + nf + ' → ' + cand.slice(0, 3).join('/') + ' ?') : null;
    }).filter(x => x);
    if (sugg.length) msg += '\n\n혹시 이거였나요?\n' + sugg.join('\n');
  }
  ui.alert('한꺼번에 출석 완료', msg, ui.ButtonSet.OK);
}

// ↩️ 방금 한 "한꺼번에 출석" 전체 취소(그 때 찍은 칸만 정확히 지움)
function undoLastBulk() {
  const ui = SpreadsheetApp.getUi();
  const raw = PropertiesService.getDocumentProperties().getProperty('LAST_BULK');
  if (!raw) { ui.alert('되돌릴 "한꺼번에 출석" 기록이 없어요.'); return; }
  let info;
  try { info = JSON.parse(raw); } catch (e) { ui.alert('기록을 읽지 못했어요.'); return; }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(info.sheet);
  if (!sh) { ui.alert('해당 시트(' + info.sheet + ')를 찾지 못했어요.'); return; }
  const cells = info.cells || [];
  if (!cells.length) { ui.alert('취소할 칸이 없어요.'); return; }

  const res = ui.alert('한꺼번에 출석 되돌리기',
    '직전에 처리한 ' + info.date + ' 출석 ' + cells.length + '칸을 지울까요?\n(그때 새로 찍은 칸만 지웁니다. 기존 출석은 안전합니다.)',
    ui.ButtonSet.OK_CANCEL);
  if (res !== ui.Button.OK) return;

  const owners = {};
  let cleared = 0;
  cells.forEach(rc => {
    const r = rc[0], c = rc[1];
    const cell = sh.getRange(r, c);
    const v = cell.getValue();
    const tz = ss.getSpreadsheetTimeZone();
    // 안전장치: 그 칸이 정말 그 날짜이면만 지움
    if (v instanceof Date && Utilities.formatDate(v, tz, 'yyyy-MM-dd') === info.date) {
      cell.clearContent();
      styleGridCell_(sh, r, c);
      owners[ownerRow_(sh, r)] = true;
      cleared++;
    }
  });
  Object.keys(owners).forEach(o => recomputeStripOwner_(sh, Number(o)));
  PropertiesService.getDocumentProperties().deleteProperty('LAST_BULK');
  ui.alert('되돌리기 완료', '✅ ' + cleared + '칸을 지웠어요. (기존 출석은 그대로)', ui.ButtonSet.OK);
}

// 학생 블록에서 첫 번째 빈 회차칸 찾기(색칠 칸 우선)
function firstEmptyGridCell_(sh, owner, rows) {
  const vals = sh.getRange(owner, GRID_START, rows, GRID_COLS).getValues();
  const bgs  = sh.getRange(owner, GRID_START, rows, GRID_COLS).getBackgrounds();
  // 1순위: 시간색(등록된 정규 회차)인데 비어있는 칸 → 정규부터 채움
  for (let rr = 0; rr < rows; rr++)
    for (let cc = 0; cc < GRID_COLS; cc++) {
      const v = vals[rr][cc], bg = String(bgs[rr][cc]).toLowerCase();
      const colored = (bg === C_DUR['60분'] || bg === C_DUR['90분'] || bg === C_DUR['120분']);
      if ((v === '' || v === null) && colored) return { r: owner + rr, c: GRID_START + cc };
    }
  // 2순위: 보강(파란) 칸 중 비어있는 칸 → 정규 다 쓴 뒤 보강 채움
  for (let rr = 0; rr < rows; rr++)
    for (let cc = 0; cc < GRID_COLS; cc++) {
      const v = vals[rr][cc], bg = String(bgs[rr][cc]).toLowerCase();
      if ((v === '' || v === null) && bg === C_MAKEUP) return { r: owner + rr, c: GRID_START + cc };
    }
  // 3순위: 그냥 첫 빈칸
  for (let rr = 0; rr < rows; rr++)
    for (let cc = 0; cc < GRID_COLS; cc++) {
      const v = vals[rr][cc];
      if (v === '' || v === null) return { r: owner + rr, c: GRID_START + cc };
    }
  return null;
}

// ➕ 보강(이월) 칸 추가: 선택한 학생 줄에 보강 회차 개수를 받아 정규 칸 뒤에 파란 칸 생성
function addMakeup() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const ui = SpreadsheetApp.getUi();
  if (HELPER_SHEETS.indexOf(sh.getName()) >= 0 || sh.getName() === T_SHEET) {
    ui.alert('수강생대장(명단) 시트에서 사용하세요.'); return;
  }
  const sel = sh.getActiveRange();
  if (!sel || sel.getRow() < DATA_START_ROW) { ui.alert('보강을 추가할 학생 줄의 칸을 먼저 선택하세요.'); return; }
  const owner = ownerRow_(sh, sel.getRow());
  const name = sh.getRange(owner, COL_NAME).getValue() || '(이름 없음)';

  const r = ui.prompt('보강(이월) 칸 추가 — ' + name,
    '추가할 보강 회차 개수를 입력하세요. (예: 2)\n0을 넣으면 이 학생의 보강 칸을 모두 지웁니다.',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const cnt = parseInt(String(r.getResponseText()).trim(), 10);
  if (isNaN(cnt) || cnt < 0) { ui.alert('숫자를 입력하세요. (예: 2)'); return; }

  const added = setMakeup_(sh, owner, cnt);
  recomputeStripOwner_(sh, owner);
  if (cnt === 0) ui.alert(name + ' 학생의 보강 칸을 모두 지웠어요.');
  else if (added < cnt) ui.alert('칸이 부족해 ' + added + '개만 추가했어요. (그 학생의 빈 칸이 모자람)');
  else ui.alert('✅ ' + name + ' 학생에게 보강(파란) 칸 ' + added + '개를 추가했어요.\n정규 회차를 다 쓴 뒤 이 칸에 출석이 채워집니다.');
}

// 보강 칸 설정: 기존 보강 제거 후 cnt개를 정규 칸 뒤 첫 빈칸들에 파란색+메모로 생성. 반환=실제 추가 수
function setMakeup_(sh, owner, cnt) {
  const plan = parsePlan_(sh.getRange(owner, COL_PLAN).getValue());
  const rows = plan ? plan.rows : 1;

  // 1) 기존 보강 칸 제거: 메모 지우고, 빈 칸이면 색 원상복구
  const notes = sh.getRange(owner, GRID_START, rows, GRID_COLS).getNotes();
  for (let rr = 0; rr < rows; rr++)
    for (let cc = 0; cc < GRID_COLS; cc++)
      if (notes[rr][cc] === MAKEUP_NOTE) {
        sh.getRange(owner + rr, GRID_START + cc).setNote('');
        styleGridCell_(sh, owner + rr, GRID_START + cc); // 빈칸이면 흰색/정규색으로 정리
      }
  if (cnt <= 0) { redrawGridMarks_(sh, owner); return 0; }

  // 2) 새 보강 칸: 정규(시간색)·내용 있는 칸은 건너뛰고 첫 흰 빈칸부터 파란색+메모
  const vals = sh.getRange(owner, GRID_START, rows, GRID_COLS).getValues();
  const bgs  = sh.getRange(owner, GRID_START, rows, GRID_COLS).getBackgrounds();
  let added = 0;
  for (let rr = 0; rr < rows && added < cnt; rr++)
    for (let cc = 0; cc < GRID_COLS && added < cnt; cc++) {
      const v = vals[rr][cc], bg = String(bgs[rr][cc]).toLowerCase();
      const isRegular = (bg === C_DUR['60분'] || bg === C_DUR['90분'] || bg === C_DUR['120분']);
      if ((v === '' || v === null) && !isRegular) {
        sh.getRange(owner + rr, GRID_START + cc).setBackground(C_MAKEUP).setNote(MAKEUP_NOTE);
        added++;
      }
    }
  redrawGridMarks_(sh, owner); // 정규/보강 경계 붉은 선 다시 그림
  return added;
}

function sameDay_(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// "2026-05-30", "5/30", "5.30" 등 → Date
function parseUserDate_(text, today) {
  const t = String(text || '').trim();
  // 정오(12시)로 만들어 시간대 차이로 하루 밀리는 것 방지
  if (!t) return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
  let m = t.match(/^(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0);
  m = t.match(/^(\d{1,2})[-.\/](\d{1,2})$/);
  if (m) return new Date(today.getFullYear(), +m[1] - 1, +m[2], 12, 0, 0);
  return null;
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
  if (HELPER_SHEETS.indexOf(sh.getName()) >= 0 || sh.getName() === T_SHEET) {
    SpreadsheetApp.getUi().alert('명단 시트에서 실행하세요.');
    return;
  }
  const maxRow = sh.getLastRow();
  let r = DATA_START_ROW, done = 0, err = 0;
  while (r <= maxRow) {
    if (String(sh.getRange(r, HELPER_COL).getValue()) === CONT) { r++; continue; }
    const plan = parsePlan_(sh.getRange(r, COL_PLAN).getValue());
    if (plan) {
      try {
        const extra = Math.min(countContBelow_(sh, r, sh.getMaxRows()), plan.rows - 1);
        computeWeekStrip_(sh, r, plan, extra);
        done++;
        r += plan.rows;
      } catch (e) { err++; r += plan.rows; }
    } else {
      r++;
    }
  }
  SpreadsheetApp.getUi().alert('주차 띠 새로고침 완료\n\n처리한 학생: ' + done + '명' +
    (err ? ('\n오류 ' + err + '건') : '') +
    (done === 0 ? '\n\n※ 0명이면: 이 탭이 명단 탭이 맞는지, H열(등록회차)에 값이 있는지 확인하세요.' : ''));
}

// ====================================================================
// ====================================================================
// 📒 수업일지 ↔ 결제 시트 연동
//   수업일지의 '이슈체크' 칸에서 항목을 고르면(예: 카톡상담)
//   → 결제(명단) 시트의 그 학생 '상담·피드백 기록' 칸에 "6/1 카톡상담"처럼 누적 기록
// ====================================================================

// 머리글 줄에서 머리글 텍스트로 열 번호 찾기(없으면 0) — 위치 고정 안 함
function findColByHeader_(sh, headerText, headerRow) {
  const lastCol = sh.getLastColumn();
  if (lastCol < 1) return 0;
  const vals = sh.getRange(headerRow, 1, 1, lastCol).getValues()[0];
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i]).replace(/\s/g, '') === headerText.replace(/\s/g, '')) return i + 1;
  }
  return 0;
}

// 수업일지류 시트인지 판별: 머리글 줄(보통 3행)에 '이슈체크' 칸이 있으면 일지로 봄
//   → 매일 새 탭(날짜 이름 등)이 생겨도 이름과 무관하게 인식
function isLogSheet_(sh) {
  return findColByHeader_(sh, ISSUE_HEADER, LOG_HEADER_ROW) > 0;
}

// 결제(명단=수강생대장) 시트 찾기: 이름(B1='이름') 머리글이 있는 시트
function findPaySheet_(ss) {
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const s = sheets[i], nm = s.getName();
    if (HELPER_SHEETS.indexOf(nm) >= 0 || nm === T_SHEET) continue;
    if (isLogSheet_(s)) continue; // 수업일지류 제외
    if (String(s.getRange(1, COL_NAME).getValue()).trim() === '이름') return s;
  }
  return null;
}

// 수강생대장(결제) 이름 오른쪽(C)에 '이슈기록' 칸 보장(없으면 한 칸 삽입). 반환=열번호
function ensurePayIssueCol_(pay) {
  let c = findColByHeader_(pay, PAY_LOG_HEADER, 1);
  if (!c) {
    pay.insertColumnAfter(COL_NAME);   // 이름(B) 오른쪽에 한 칸 삽입 → 전체 +1
    c = COL_ISSUE;
    pay.getRange(1, c).setValue(PAY_LOG_HEADER)
      .setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
    pay.setColumnWidth(c, 150);
  }
  return c;
}

// 문자열에서 날짜 뽑기: "6/2", "6.2", "6월2일", "2026.06.02" 등 → Date(정오). 없으면 null.
function parseAnyDate_(s, year) {
  s = String(s || '').trim();
  let m = s.match(/(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})/);   // yyyy.mm.dd
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0);
  m = s.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일?/);                   // m월 d일
  if (m) return new Date(year, +m[1] - 1, +m[2], 12, 0, 0);
  m = s.match(/(\d{1,2})[.\-/]\s*(\d{1,2})/);                       // m/d, m.d
  if (m) return new Date(year, +m[1] - 1, +m[2], 12, 0, 0);
  return null;
}

// 수업일지 날짜: ① 탭 이름(6/1·6월2일·2026.06.02 등) 우선 → ② C3 → ③ 오늘
//   탭이 복사돼 C3가 옛 날짜로 남아도, 탭 이름이 정확하므로 먼저 사용
function logSessionDate_(log) {
  const today = new Date();
  const byName = parseAnyDate_(log.getName(), today.getFullYear());
  if (byName) return byName;
  const v = log.getRange(LOG_HEADER_ROW, LOG_NAME_COL).getValue();
  if (v instanceof Date) return v;
  return parseAnyDate_(v, today.getFullYear()) || today;
}

// 시간 칸인지(머리글로 판별)
function isTimeCol_(sh, col) {
  const h = String(sh.getRange(LOG_HEADER_ROW, col).getValue()).replace(/\s/g, '');
  for (let i = 0; i < TIME_HEADERS.length; i++) {
    if (TIME_HEADERS[i].replace(/\s/g, '') === h) return true;
  }
  return false;
}

// 시간 칸: 숫자만 쳐도 오후로(4→오후4:00). '오전'/'am' 적으면 오전, '오후'/'pm' 적으면 오후.
//   기본(표시 없음)은 1~11시를 오후로 보정. 오전 수업은 '오전10' 처럼 적으면 오전 그대로.
function fixPmTime_(e) {
  const range = e.range;
  const cellVal = range.getValue();
  const raw = (e && e.value != null ? String(e.value) : String(cellVal)).trim();
  if (raw === '') return;
  const isAm = /오전|am/i.test(raw);
  const isPm = /오후|pm/i.test(raw);
  let hour, minute;
  if (cellVal instanceof Date) { hour = cellVal.getHours(); minute = cellVal.getMinutes(); }
  else if (typeof cellVal === 'number' && cellVal > 0 && cellVal < 1) { const t = Math.round(cellVal * 1440); hour = Math.floor(t / 60); minute = t % 60; }
  else if (typeof cellVal === 'number' && cellVal >= 1 && cellVal <= 23) { hour = Math.floor(cellVal); minute = Math.round((cellVal - hour) * 60); }
  else {
    const m = raw.match(/(\d{1,2})\s*[:시]?\s*(\d{1,2})?/);
    if (!m) return;
    hour = +m[1]; minute = m[2] ? +m[2] : 0;
  }
  if (hour > 23 || minute > 59) return;
  if (isAm) { if (hour === 12) hour = 0; }            // 오전 명시
  else if (isPm) { if (hour < 12) hour += 12; }       // 오후 명시
  else { if (hour >= 1 && hour <= 11) hour += 12; }   // 표시 없으면 기본 오후
  range.setValue(new Date(1899, 11, 30, hour, minute, 0)).setNumberFormat('오전/오후 h:mm');
}

// 수업일지 편집 처리: 시간 칸(오후 변환) + 이슈체크 칸(결제 시트 기록)
function handleLogEdit_(e) {
  const sh = e.range.getSheet();
  if (e.range.getNumColumns() !== 1 || e.range.getNumRows() !== 1) return;
  const row = e.range.getRow(), col = e.range.getColumn();
  if (row <= LOG_HEADER_ROW) return;

  // 1) 시간 칸 → 오후 자동 변환(오전/오후 표시 존중)
  if (isTimeCol_(sh, col)) { fixPmTime_(e); return; }

  // 2) 이슈체크 칸 → 결제 시트에 기록
  const issueCol = findColByHeader_(sh, ISSUE_HEADER, LOG_HEADER_ROW);
  if (col !== issueCol) return;
  const issue = String(e.range.getValue()).trim();
  if (!issue) return; // 비우면 기록 안 함(기존 기록 유지)
  const name = String(sh.getRange(row, LOG_NAME_COL).getValue()).trim();
  if (!name) return;
  const date = logSessionDate_(sh);
  issue.split(/\s*,\s*/).forEach(function (one) { if (one) recordIssueToPay_(name, one, date); }); // 여러 이슈 각각 누적
}

// 결제 시트의 학생 칸에 "M/d 이슈" 누적 기록
function recordIssueToPay_(name, issue, date) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pay = findPaySheet_(ss);
  if (!pay) return;
  const logCol = findColByHeader_(pay, PAY_LOG_HEADER, 1);
  if (!logCol) return; // 아직 설치 전이면 무시('수업일지 연동 설치' 먼저)

  const last = pay.getLastRow();
  if (last < DATA_START_ROW) return;
  const key = normName_(name);
  const names = pay.getRange(DATA_START_ROW, COL_NAME, last - DATA_START_ROW + 1, 1).getValues();
  const helper = pay.getRange(DATA_START_ROW, HELPER_COL, last - DATA_START_ROW + 1, 1).getValues();
  let targetRow = 0;
  for (let i = 0; i < names.length; i++) {
    if (String(helper[i][0]) === CONT) continue;
    if (normName_(names[i][0]) === key) { targetRow = DATA_START_ROW + i; break; }
  }
  if (!targetRow) return; // 결제 시트에 그 학생이 없으면 무시

  const dstr = (date.getMonth() + 1) + '/' + date.getDate();
  const entry = dstr + ' ' + issue;
  const cell = pay.getRange(targetRow, logCol);
  const cur = String(cell.getValue() || '').trim();
  // 같은 날 같은 이슈가 이미 있으면 중복 기록 안 함
  if (cur.split(/\s*,\s*/).indexOf(entry) >= 0) return;
  cell.setValue(cur ? (cur + ', ' + entry) : entry).setNumberFormat('@');
}

// 🔁 모든 수업일지(6/1·6/2·… 매일 탭)를 훑어 학생별 이슈를 수강생대장에 한 번에 집계
function aggregateIssues() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const pay = findPaySheet_(ss);
  if (!pay) { ui.alert("수강생대장(결제) 시트를 찾지 못했어요. ('이름' 머리글 필요)"); return; }
  const logCol = ensurePayIssueCol_(pay);

  // 1) 모든 수업일지류 시트에서 (학생→[{날짜,이슈}]) 수집
  const logs = ss.getSheets().filter(function (s) { return isLogSheet_(s); });
  if (!logs.length) { ui.alert('수업일지 시트(이슈체크 칸이 있는 시트)를 찾지 못했어요.'); return; }
  const map = {}; // normName → [{d:Date, t:이슈}]
  logs.forEach(function (log) {
    const date = logSessionDate_(log);
    const issueCol = findColByHeader_(log, ISSUE_HEADER, LOG_HEADER_ROW);
    const last = log.getLastRow();
    if (last <= LOG_HEADER_ROW) return;
    const cnt = last - LOG_HEADER_ROW;
    const names = log.getRange(LOG_HEADER_ROW + 1, LOG_NAME_COL, cnt, 1).getValues();
    const issues = log.getRange(LOG_HEADER_ROW + 1, issueCol, cnt, 1).getValues();
    for (let i = 0; i < cnt; i++) {
      const nm = String(names[i][0]).trim();
      const iss = String(issues[i][0]).trim();
      if (!nm || !iss) continue;
      const key = normName_(nm);
      iss.split(/\s*,\s*/).forEach(function (one) {
        if (one) (map[key] = map[key] || []).push({ d: date, t: one });
      });
    }
  });

  // 2) 수강생대장 학생별로 (기존 기록 + 새로 모은 것) 합쳐 날짜순 정리(중복 제거)
  //    ※ 지난 달 탭을 보관(이동)해도 기존 기록이 지워지지 않도록 '합치기' 방식
  const last = pay.getLastRow();
  const payNames = pay.getRange(DATA_START_ROW, COL_NAME, last - DATA_START_ROW + 1, 1).getValues();
  const helper = pay.getRange(DATA_START_ROW, HELPER_COL, last - DATA_START_ROW + 1, 1).getValues();
  const existing = pay.getRange(DATA_START_ROW, logCol, last - DATA_START_ROW + 1, 1).getValues();
  const yr = new Date().getFullYear();
  let cntStu = 0, cntIssue = 0;
  for (let i = 0; i < payNames.length; i++) {
    if (String(helper[i][0]) === CONT) continue;
    const nm = String(payNames[i][0]).trim();
    if (!nm) continue;
    const seen = {}, items = []; // {key,d,text}
    function add(text, d) {
      text = String(text).trim();
      if (!text || seen[text]) return;
      seen[text] = 1;
      const dd = d || parseAnyDate_(text, yr) || new Date(9999, 0, 1);
      items.push({ d: dd, text: text });
    }
    // 기존 셀 내용 먼저 보존
    String(existing[i][0] || '').split(/\s*,\s*/).forEach(function (t) { add(t); });
    // 수업일지에서 모은 것 추가
    const arr = map[normName_(nm)] || [];
    arr.forEach(function (x) { add((x.d.getMonth() + 1) + '/' + x.d.getDate() + ' ' + x.t, x.d); });
    if (!items.length) continue;
    items.sort(function (a, b) { return a.d - b.d; });
    pay.getRange(DATA_START_ROW + i, logCol).setValue(items.map(function (x) { return x.text; }).join(', ')).setNumberFormat('@');
    cntStu++; cntIssue += items.length;
  }
  ui.alert('이슈 전체 집계 완료',
    logs.length + '개 수업일지에서 모아 정리했어요. (기존 기록 유지 + 합치기)\n학생 ' + cntStu + '명 / 이슈 ' + cntIssue + '건',
    ui.ButtonSet.OK);
}

// ====================================================================
// 📅 한 달치 수업일지 미리 만들기 / 지난 달 보관(이동)
// ====================================================================
function pad2_(n) { return ('0' + n).slice(-2); }

// 템플릿이 될 수업일지 시트: '수업일지템플릿' 우선 → 없으면 아무 수업일지류
function findLogTemplate_(ss) {
  return ss.getSheetByName('수업일지템플릿')
      || ss.getSheets().filter(function (s) { return isLogSheet_(s); })[0]
      || null;
}

// 수강생대장 현재 학생 이름들(연속행·빈칸 제외)
function activeStudentNames_(pay) {
  const last = pay.getLastRow();
  if (last < DATA_START_ROW) return [];
  const names = pay.getRange(DATA_START_ROW, COL_NAME, last - DATA_START_ROW + 1, 1).getValues();
  const helper = pay.getRange(DATA_START_ROW, HELPER_COL, last - DATA_START_ROW + 1, 1).getValues();
  const out = [];
  for (let i = 0; i < names.length; i++) {
    if (String(helper[i][0]) === CONT) continue;
    const nm = String(names[i][0]).trim();
    if (nm) out.push(nm);
  }
  return out;
}

// 📅 한 달치 수업일지 탭(M/1 ~ M/말일) 자동 생성
function makeMonthLogs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const today = new Date();

  const r = ui.prompt('한 달치 수업일지 만들기',
    '몇 월을 만들까요?  예: 7  또는  2026-07\n(빈칸이면 다음 달)',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  let year, month;
  const t = String(r.getResponseText()).trim();
  if (!t) { const d = new Date(today.getFullYear(), today.getMonth() + 1, 1); year = d.getFullYear(); month = d.getMonth() + 1; }
  else {
    let m = t.match(/^(\d{4})[.\-/](\d{1,2})$/);
    if (m) { year = +m[1]; month = +m[2]; }
    else if (/^\d{1,2}$/.test(t)) { year = today.getFullYear(); month = +t; }
    else { ui.alert('월을 이해하지 못했어요. (예: 7 또는 2026-07)'); return; }
  }
  if (month < 1 || month > 12) { ui.alert('1~12월로 입력하세요.'); return; }

  const tpl = findLogTemplate_(ss);
  if (!tpl) {
    ui.alert("템플릿이 될 수업일지가 없어요.\n비어 있는 수업일지 한 장을 '수업일지템플릿' 이름으로 두거나,\n'이슈체크' 칸이 있는 수업일지 한 장을 먼저 만들어 주세요.");
    return;
  }

  const lastDay = new Date(year, month, 0).getDate();
  const res = ui.alert('확인',
    year + '년 ' + month + '월 1일 ~ ' + month + '월 ' + lastDay + "일,\n총 " + lastDay + "개 수업일지 탭('" + month + "/1' ~ '" + month + "/" + lastDay + "')을 만듭니다.\n템플릿: '" + tpl.getName() + "'\n진행할까요?",
    ui.ButtonSet.OK_CANCEL);
  if (res !== ui.Button.OK) return;

  let made = 0, skip = 0;
  for (let d = 1; d <= lastDay; d++) {
    const nm = month + '/' + d;
    if (ss.getSheetByName(nm)) { skip++; continue; }
    const sh = tpl.copyTo(ss).setName(nm);
    sh.getRange(LOG_HEADER_ROW, LOG_NAME_COL).setValue(year + '.' + pad2_(month) + '.' + pad2_(d));

    // 학생 데이터(이름·시간·담당강사·이슈·체크 등) 전부 리셋 — 단, 진행률 등 수식은 보존
    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    if (lastRow > LOG_HEADER_ROW && lastCol >= 1) {
      const rng = sh.getRange(LOG_HEADER_ROW + 1, 1, lastRow - LOG_HEADER_ROW, lastCol);
      const formulas = rng.getFormulas();   // 수식 위치 기억
      rng.clearContent();                    // 입력값 모두 비움(이름·시간·담당강사·체크 등)
      rng.setFormulas(formulas);             // 수식 칸만 되살림(진행률 등)
    }
    // 이슈체크 칸 드롭다운 보장
    const issueCol = findColByHeader_(sh, ISSUE_HEADER, LOG_HEADER_ROW);
    if (issueCol) {
      const rows = Math.max(lastRow - LOG_HEADER_ROW, 50);
      sh.getRange(LOG_HEADER_ROW + 1, issueCol, rows, 1).setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(ISSUE_OPTIONS, true).setAllowInvalid(true).build());
    }
    made++;
  }
  ui.alert('완료', made + "개 수업일지 탭을 만들었어요. (각 탭 '" + ISSUE_HEADER + "' 칸에 드롭다운 적용)" + (skip ? ('\n이미 있어 건너뜀: ' + skip + '개') : ''), ui.ButtonSet.OK);
}

// 📦 지난 달 수업일지 탭을 보관 파일(새 구글시트)로 이동
function archiveMonthLogs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const today = new Date();

  const r = ui.prompt('지난 달 수업일지 보관',
    '어느 달을 보관할까요?  예: 6  또는  2026-06\n(빈칸이면 지난 달)',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  let year, month;
  const t = String(r.getResponseText()).trim();
  if (!t) { const d = new Date(today.getFullYear(), today.getMonth() - 1, 1); year = d.getFullYear(); month = d.getMonth() + 1; }
  else {
    let m = t.match(/^(\d{4})[.\-/](\d{1,2})$/);
    if (m) { year = +m[1]; month = +m[2]; }
    else if (/^\d{1,2}$/.test(t)) { year = today.getFullYear(); month = +t; }
    else { ui.alert('월을 이해하지 못했어요. (예: 6 또는 2026-06)'); return; }
  }

  // 그 달의 수업일지 탭 모으기(탭 이름 M/D 의 M이 일치 + 수업일지류)
  const targets = ss.getSheets().filter(function (s) {
    const dt = parseAnyDate_(s.getName(), year);
    return dt && (dt.getMonth() + 1) === month && isLogSheet_(s);
  });
  if (!targets.length) { ui.alert(month + '월 수업일지 탭을 찾지 못했어요.'); return; }

  const res = ui.alert('확인',
    month + "월 수업일지 " + targets.length + "개 탭을 새 보관 파일로 옮기고, 이 파일에서는 삭제합니다.\n" +
    '※ 옮기기 전에 메뉴 [🔁 이슈 전체 다시 집계]를 먼저 눌러 기록을 수강생대장에 확정해두면 안전해요.\n진행할까요?',
    ui.ButtonSet.OK_CANCEL);
  if (res !== ui.Button.OK) return;

  const archiveName = '수업일지 보관 ' + year + '-' + pad2_(month);
  const archive = SpreadsheetApp.create(archiveName);
  targets.forEach(function (s) {
    const copied = s.copyTo(archive);
    copied.setName(s.getName());
  });
  // 보관본 기본시트(Sheet1/시트1) 정리
  const def = archive.getSheets()[0];
  if (archive.getSheets().length > targets.length && /sheet1|시트1/i.test(def.getName())) archive.deleteSheet(def);
  // 원본 삭제
  targets.forEach(function (s) { ss.deleteSheet(s); });

  ui.alert('보관 완료',
    month + '월 ' + targets.length + "개 탭을 '" + archiveName + "' 파일로 옮겼어요.\n\n보관 파일 주소:\n" + archive.getUrl(),
    ui.ButtonSet.OK);
}

// 🔗 연동 설치: 수강생대장 이슈기록 칸 준비 + (가능하면) 현재 수업일지에 이슈 드롭다운
function setupIssueLink() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // 1) 수강생대장 이슈기록 칸 보장(가장 중요)
  const pay = findPaySheet_(ss);
  if (!pay) { ui.alert("수강생대장(결제) 시트를 찾지 못했어요. ('이름' 머리글이 있는 시트가 필요해요)"); return; }
  ensurePayIssueCol_(pay);

  // 2) 이슈체크 드롭다운: 활성 시트가 수업일지면 거기에, 아니면 '수업일지' 탭이 있으면 거기에
  let log = isLogSheet_(ss.getActiveSheet()) ? ss.getActiveSheet()
          : (ss.getSheetByName(LOG_SHEET) || null);
  let dropMsg = "';' 수업일지의 이슈체크 칸은 자동 인식됩니다(이름 무관).";
  if (log && isLogSheet_(log)) {
    const issueCol = findColByHeader_(log, ISSUE_HEADER, LOG_HEADER_ROW);
    const lastR = Math.max(log.getLastRow(), LOG_HEADER_ROW + 1);
    log.getRange(LOG_HEADER_ROW + 1, issueCol, lastR - LOG_HEADER_ROW, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(ISSUE_OPTIONS, true).setAllowInvalid(true).build());
    dropMsg = "'" + log.getName() + "' 시트의 이슈체크 칸에 12개 드롭다운을 넣었어요.";
  }

  ui.alert('수업일지 연동 설치 완료',
    "이제 어떤 수업일지 시트든(매일 새로 생기는 날짜 탭 포함) '" + ISSUE_HEADER + "' 칸에서\n" +
    "항목(예: 카톡상담)을 고르면, 수강생대장 이름 옆 '" + PAY_LOG_HEADER + "' 칸에\n" +
    "그 시트의 날짜와 함께 자동 기록됩니다. 예) 6/1 카톡상담\n\n" + dropMsg,
    ui.ButtonSet.OK);
}

// 🧪 데모: 빈 새 시트에 샘플 수강생대장+수업일지 만들고 연동까지 시연(기존 시트 영향 없음)
function makeDemo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const res = ui.alert('연동 데모 만들기',
    "이 스프레드시트에 샘플 '수강생대장'·'" + LOG_SHEET + "' 탭을 만들어 연동을 시연합니다.\n" +
    '※ 반드시 빈 새 구글시트에서 실행하세요. (실제 파일에서 하지 마세요)\n\n진행할까요?',
    ui.ButtonSet.OK_CANCEL);
  if (res !== ui.Button.OK) return;

  const students = [
    ['유준', '주2회 90분 월'],
    ['박민하', '주1회 60분 월'],
    ['이승욱', '주2회 120분 월'],
    ['김라희', '주3회 90분 월'],
    ['고은', '주1회 90분 월'],
  ];

  // 1) 수강생대장(데모) — 깨끗이 다시 생성
  let pay = ss.getSheetByName('수강생대장');
  if (pay) ss.deleteSheet(pay);
  pay = ss.insertSheet('수강생대장');
  ss.setActiveSheet(pay);
  setupSheet(); // 머리글·이슈기록칸·드롭다운·플랜단가·서식 생성
  students.forEach(function (s, i) {
    const row = DATA_START_ROW + i;
    pay.getRange(row, COL_NAME).setValue(s[0]);
    pay.getRange(row, COL_REG).setValue('결제완료_정상등록');
    pay.getRange(row, COL_PLAN).setValue(s[1]);
    handlePlanChange_(pay, row); // 회차칸·금액 자동
  });

  // 2) 매일 생기는 수업일지 흉내: 6/1, 6/2 두 개 탭 + 샘플 이슈 미리 입력
  //    유준=이틀 다 이슈(여러 개 누적 시연), 김라희=하루
  const days = [
    { tab: '6월1일', date: '2026.06.01', issues: { '유준': '카톡상담', '박민하': '대면상담', '김라희': '신규' } },
    { tab: '6월2일', date: '2026.06.02', issues: { '유준': '회비납부', '이승욱': '시간표변경' } },
  ];
  days.forEach(function (day) {
    let log = ss.getSheetByName(day.tab);
    if (log) ss.deleteSheet(log);
    log = ss.insertSheet(day.tab);
    log.getRange(LOG_HEADER_ROW, 1).setValue('번호');
    log.getRange(LOG_HEADER_ROW, 2).setValue(ISSUE_HEADER);             // B3 = 이슈체크
    log.getRange(LOG_HEADER_ROW, LOG_NAME_COL).setValue(day.date);      // C3 = 날짜+이름열 머리글
    log.getRange(LOG_HEADER_ROW, 4).setValue('특이사항');
    log.getRange(LOG_HEADER_ROW, 1, 1, 4).setFontWeight('bold').setBackground('#fff2cc')
      .setHorizontalAlignment('center');
    students.forEach(function (s, i) {
      const row = LOG_HEADER_ROW + 1 + i;
      log.getRange(row, 1).setValue(i + 1);
      log.getRange(row, LOG_NAME_COL).setValue(s[0]);
      if (day.issues[s[0]]) log.getRange(row, 2).setValue(day.issues[s[0]]);
    });
    // 이슈체크 드롭다운
    log.getRange(LOG_HEADER_ROW + 1, 2, students.length, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(ISSUE_OPTIONS, true).setAllowInvalid(true).build());
    log.setColumnWidth(2, 110);
    log.setColumnWidth(LOG_NAME_COL, 90);
    log.setFrozenRows(LOG_HEADER_ROW);
  });

  // 3) 연동 설치 + 미리 넣은 이슈를 한 번에 집계(누적 시연)
  setupIssueLink();
  aggregateIssues();

  ss.setActiveSheet(pay);
  ui.alert('데모 준비 완료 🎉',
    "'수강생대장' 이름 옆 '" + PAY_LOG_HEADER + "' 칸을 보세요.\n" +
    "유준 → '6/1 카톡상담, 6/2 회비납부' 처럼 여러 날 이슈가 모두 모여 있어요.\n\n" +
    "직접 테스트: '6월1일'/'6월2일' 탭에서 학생의 '" + ISSUE_HEADER + "'를 바꾸면\n" +
    "수강생대장에 바로 누적됩니다. (안 보이면 '🔁 이슈 전체 다시 집계' 클릭)",
    ui.ButtonSet.OK);
}

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

// 부(A열) 값에 따라 칸 색칠: 1부 분홍·2부 연노랑·3부 민트·정규시간방특 하늘색
function T_applyPartColors_(sh, n) {
  const partRange = sh.getRange(2, TC_PART, n, 1);
  const rules = (sh.getConditionalFormatRules() || []).filter(r =>
    r.getRanges().every(rg => rg.getColumn() !== TC_PART));
  T_PARTS.forEach(p => rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(p).setBackground(T_PARTS_COLOR[p]).setRanges([partRange]).build()));
  sh.setConditionalFormatRules(rules);
}

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
  T_applyPartColors_(sh, n); // 부 색칠(1부 분홍·2부 연노랑·3부 민트·정규시간방특 하늘색)
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
  const n = Math.max(last - 1, 1);
  // 기존 시트에도 '정규시간방특' 옵션 + 부 색을 다시 적용
  sh.getRange(2, TC_PART, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(T_PARTS, true).build());
  T_applyPartColors_(sh, n);
  for (let r = 2; r <= last; r++) T_recalcMakeup_(sh, r);
  _toastT_('정규시간방특 옵션·부 색·보강 수 적용 완료');
}

function _toastT_(msg) { SpreadsheetApp.getActiveSpreadsheet().toast(msg, '방학특강', 3); }
