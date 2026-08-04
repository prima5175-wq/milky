/************************************************************
 * 시간표 (구글 시트 네이티브 버전)
 *
 *  '일정' 탭에 표로 입력:  지점 | 대상 | 항목 | 요일 | 시작 | 끝 | 색(선택)
 *
 *  메뉴 '📅 시간표' 에서 골라 그림:
 *   - 전체 그리기            : 모두 한 장에 (지점·대상 함께 표시)
 *   - 지점별로 각각 그리기    : 지점마다 탭 하나씩
 *   - 대상별로 각각 그리기    : 대상마다 탭 하나씩
 *   - 골라서 그리기…         : 지점/대상/요일을 골라 그 부분만
 *
 *  전부 시트 안에서 동작하고, 입력한 표는 시트에 그대로 저장됩니다.
 ************************************************************/

var INPUT_SHEET = '일정';
var OUT_PREFIX  = '시간표';      // 출력 탭 이름 접두어
var DAYS  = ['월','화','수','목','금','토','일'];
var SLOT  = 30;
var DEF_START = 9;
var DEF_END   = 22;
var COLOR_BY  = '항목';          // '항목' / '대상' / '지점'
var PALETTE = ['#4f8cff','#ff7a59','#33c48d','#c46bff','#ffb020','#ff5a8a',
  '#20c9d6','#8a7bff','#7bbf3a','#ff9d3a','#3aa0ff','#e05a5a',
  '#5ad1a0','#d98cff','#f2c14e','#6c8cff','#e8746a','#48b3c9'];

/* ---------- 메뉴 ---------- */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📅 시간표')
    .addItem('전체 그리기', 'drawAll')
    .addItem('지점별로 각각 그리기', 'drawByBranch')
    .addItem('대상별로 각각 그리기', 'drawByTarget')
    .addItem('골라서 그리기…', 'drawChoose')
    .addSeparator()
    .addItem('입력 시트 만들기/열기', 'setupInputSheet')
    .addToUi();
}

/* ---------- 입력 시트 ---------- */
function setupInputSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(INPUT_SHEET);
  if (!sh) {
    sh = ss.insertSheet(INPUT_SHEET, 0);
    sh.getRange(1,1,1,7).setValues([['지점','대상','항목','요일','시작','끝','색(선택)']])
      .setFontWeight('bold').setBackground('#1c1c28').setFontColor('#ffffff');
    sh.getRange(2,1,3,7).setValues([
      ['대치점','쿠니','물리 브릿지','월수금','09:30','12:00',''],
      ['대치점','루니','국어 심화','화목','16:30','18:30',''],
      ['구룡초점','다온','영어 회화','월','14:00','15:30','']
    ]);
    sh.setColumnWidth(1,90); sh.setColumnWidth(2,90); sh.setColumnWidth(3,200);
    sh.setColumnWidth(4,90); sh.setColumnWidth(5,70); sh.setColumnWidth(6,70); sh.setColumnWidth(7,90);
    sh.setFrozenRows(1);
    sh.getRange('E2:F1000').setNumberFormat('@');
  }
  ss.setActiveSheet(sh);
  ss.toast('여기에 입력한 뒤 "📅 시간표" 메뉴에서 그리기를 누르세요.', '입력', 6);
}

/* ================= 순수 로직 ================= */
function parseDays(str) {
  var out = [], s = String(str == null ? '' : str);
  for (var i = 0; i < s.length; i++) { var idx = DAYS.indexOf(s.charAt(i)); if (idx >= 0) out.push(idx); }
  return out;
}
function parseTimeToMin(v) {
  if (v == null || v === '') return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return v.getHours()*60 + v.getMinutes();
  if (typeof v === 'number') {
    if (v > 0 && v < 1) return Math.round(v*24*60);
    if (v >= 0 && v <= 24) return Math.round(v*60);
    return Math.round(v);
  }
  var s = String(v).trim();
  var m = /^(\d{1,2})\s*[:시]\s*(\d{1,2})?/.exec(s);
  if (m) { var h=parseInt(m[1],10), mi=m[2]?parseInt(m[2],10):0; if (h>=0&&h<=24&&mi>=0&&mi<60) return h*60+mi; }
  var only = /^(\d{1,2})$/.exec(s);
  if (only) return parseInt(only[1],10)*60;
  return null;
}
function minToStr(m) { var h=Math.floor(m/60), mm=m%60; return (h<10?'0':'')+h+':'+(mm<10?'0':'')+mm; }
function assignLanes(items) {
  var order = items.map(function(it,i){return i;}).sort(function(a,b){return items[a].s-items[b].s || items[a].e-items[b].e;});
  var laneEnd = [], laneOf = new Array(items.length);
  for (var k=0;k<order.length;k++){ var i=order[k], placed=false;
    for (var L=0;L<laneEnd.length;L++){ if (items[i].s>=laneEnd[L]){ laneOf[i]=L; laneEnd[L]=items[i].e; placed=true; break; } }
    if (!placed){ laneOf[i]=laneEnd.length; laneEnd.push(items[i].e); } }
  return { lanes: Math.max(1,laneEnd.length), laneOf: laneOf };
}
function computeRange(items) {
  if (!items.length) return { s: DEF_START*60, e: DEF_END*60 };
  var mn=Infinity, mx=-Infinity;
  items.forEach(function(it){ mn=Math.min(mn,it.s); mx=Math.max(mx,it.e); });
  mn=Math.floor(mn/60)*60; mx=Math.ceil(mx/60)*60; if (mx-mn<60) mx=mn+60;
  return { s: mn, e: mx };
}
function buildItems(rows) {
  var items=[], errors=[];
  for (var r=0;r<rows.length;r++){
    var row=rows[r];
    var branch=String(row[0]==null?'':row[0]).trim();
    var target=String(row[1]==null?'':row[1]).trim();
    var name=String(row[2]==null?'':row[2]).trim();
    var s=parseTimeToMin(row[4]), e=parseTimeToMin(row[5]);
    var color=String(row[6]==null?'':row[6]).trim();
    var blank = !branch && !target && !name && (row[3]==null||row[3]==='') && (row[4]==null||row[4]==='') && (row[5]==null||row[5]==='');
    if (blank) continue;
    var days=parseDays(row[3]);
    if (!days.length){ errors.push((r+2)+'행: 요일을 못 읽음'); continue; }
    if (s==null||e==null){ errors.push((r+2)+'행: 시간을 못 읽음'); continue; }
    if (e<=s){ errors.push((r+2)+'행: 끝이 시작보다 빠름'); continue; }
    days.forEach(function(d){ items.push({branch:branch,target:target,name:name,day:d,s:s,e:e,color:color}); });
  }
  return { items: items, errors: errors };
}
var _colorState;
function colorFor(item) {
  if (item.color) return item.color;
  var key = COLOR_BY==='대상' ? (item.target||'(빈)') : COLOR_BY==='지점' ? (item.branch||'(빈)') : (item.name||'(빈)');
  if (!_colorState.map[key]){ _colorState.map[key]=PALETTE[_colorState.n%PALETTE.length]; _colorState.n++; }
  return _colorState.map[key];
}
function distinct(items, field) {
  var seen={}, out=[];
  items.forEach(function(it){ var v=it[field]||'(빈)'; if(!seen[v]){ seen[v]=1; out.push(v); } });
  return out;
}

/* ================= 그리기 (핵심) ================= */
/** items 를 sheetName 탭에 그림. showBranch=true 면 칸에 지점도 표시 */
function drawGrid(ss, items, sheetName, showBranch) {
  _colorState = { map:{}, n:0 };
  var perDay={}, laneCount={}, dayStartCol={};
  DAYS.forEach(function(_,d){ perDay[d]=[]; });
  items.forEach(function(it){ perDay[it.day].push(it); });
  DAYS.forEach(function(_,d){
    var res=assignLanes(perDay[d]); laneCount[d]=res.lanes;
    perDay[d].forEach(function(it,i){ it._lane=res.laneOf[i]; });
  });

  var range=computeRange(items);
  var slots=(range.e-range.s)/SLOT;

  var out=ss.getSheetByName(sheetName);
  if (out) ss.deleteSheet(out);
  out=ss.insertSheet(sheetName);

  var col=2;
  DAYS.forEach(function(_,d){ dayStartCol[d]=col; col+=laneCount[d]; });
  var totalCols=col-1, headerRows=1, totalRows=headerRows+slots;

  var values=[];
  for (var r=0;r<totalRows;r++){ values.push(new Array(totalCols).fill('')); }
  values[0][0]='시간';
  for (var i=0;i<slots;i++){ var mAbs=range.s+i*SLOT; if (mAbs%60===0) values[headerRows+i][0]=minToStr(mAbs); }
  DAYS.forEach(function(name,d){ values[0][dayStartCol[d]-1]=name; });
  out.getRange(1,1,totalRows,totalCols).setValues(values);

  out.setFrozenRows(1); out.setFrozenColumns(1);
  out.setColumnWidth(1,56);
  for (var c=2;c<=totalCols;c++) out.setColumnWidth(c,96);
  out.setRowHeight(1,30);
  for (var r2=2;r2<=totalRows;r2++) out.setRowHeight(r2,18);

  out.getRange(1,1,totalRows,totalCols)
    .setVerticalAlignment('top').setHorizontalAlignment('center')
    .setFontSize(9).setWrap(true)
    .setBorder(true,true,true,true,true,true,'#e3e3ea',SpreadsheetApp.BorderStyle.SOLID);

  DAYS.forEach(function(name,d){
    var start=dayStartCol[d], n=laneCount[d];
    var hc=out.getRange(1,start,1,n); if (n>1) hc.merge();
    hc.setFontWeight('bold').setBackground('#f4f4f8')
      .setFontColor(d===5?'#3a7bd5':d===6?'#d64545':'#222222');
    out.getRange(1,start).setValue(name+'  ('+perDay[d].length+')');
  });
  out.getRange(1,1).setFontWeight('bold').setBackground('#f4f4f8').setFontColor('#222222');

  for (var i2=0;i2<slots;i2++){
    var mAbs2=range.s+i2*SLOT, rr=headerRows+i2+1;
    if (mAbs2%60===0) out.getRange(rr,1,1,totalCols)
      .setBorder(true,null,null,null,null,null,'#c9c9d6',SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    out.getRange(rr,1).setFontColor('#666666').setFontSize(9);
  }

  DAYS.forEach(function(_,d){
    perDay[d].forEach(function(it){
      var cc=dayStartCol[d]+it._lane;
      var rStart=headerRows+(it.s-range.s)/SLOT+1;
      var span=(it.e-it.s)/SLOT;
      var cell=out.getRange(rStart,cc,span,1); cell.merge();
      var head = showBranch && it.branch ? (it.branch + (it.target ? ' ' + it.target : ''))
                                         : (it.target || '');
      var txt=(head?head+'\n':'')+String(it.name).replace(/\/\//g,'\n')+'\n'+minToStr(it.s)+'~'+minToStr(it.e);
      cell.setValue(txt).setBackground(colorFor(it))
        .setFontColor('#ffffff').setFontWeight('bold').setVerticalAlignment('middle');
    });
  });

  return out;
}

/* ---- 출력 탭 정리 ---- */
function clearOutputs(ss) {
  ss.getSheets().forEach(function(sh){
    var nm=sh.getName();
    if (nm===OUT_PREFIX || nm.indexOf(OUT_PREFIX + '·')===0) {
      // 최소 1개 시트는 남겨야 하므로 삭제 전 다른 시트 존재 보장
      if (ss.getSheets().length>1) ss.deleteSheet(sh);
    }
  });
}

/* ---- 입력 읽기 ---- */
function readAll_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var input = ss.getSheetByName(INPUT_SHEET);
  if (!input) { setupInputSheet(); return null; }
  var last = input.getLastRow();
  var rows = last>=2 ? input.getRange(2,1,last-1,7).getValues() : [];
  return { ss: ss, built: buildItems(rows) };
}
function toastDone_(ss, count, errors, extra) {
  var msg=(extra?extra+'  ':'')+count+'개 일정을 그렸어요.';
  if (errors && errors.length) msg+='\n건너뛴 줄: '+errors.join(' / ');
  ss.toast(msg,'시간표',8);
}

/* ================= 메뉴 동작 ================= */
function drawAll() {
  var d=readAll_(); if(!d) return;
  clearOutputs(d.ss);
  var out=drawGrid(d.ss, d.built.items, OUT_PREFIX, true);
  d.ss.setActiveSheet(out);
  toastDone_(d.ss, d.built.items.length, d.built.errors, '전체');
}

function drawByBranch() {
  var d=readAll_(); if(!d) return;
  clearOutputs(d.ss);
  var branches=distinct(d.built.items,'branch');
  if(!branches.length){ d.ss.toast('그릴 지점이 없어요. 입력을 확인하세요.','시간표',6); return; }
  var first=null;
  branches.forEach(function(b){
    var sub=d.built.items.filter(function(it){ return (it.branch||'(빈)')===b; });
    var out=drawGrid(d.ss, sub, OUT_PREFIX+'·'+b, false);
    if(!first) first=out;
  });
  if(first) d.ss.setActiveSheet(first);
  toastDone_(d.ss, d.built.items.length, d.built.errors, branches.length+'개 지점');
}

function drawByTarget() {
  var d=readAll_(); if(!d) return;
  clearOutputs(d.ss);
  var targets=distinct(d.built.items,'target');
  if(!targets.length){ d.ss.toast('그릴 대상이 없어요.','시간표',6); return; }
  var first=null;
  targets.forEach(function(t){
    var sub=d.built.items.filter(function(it){ return (it.target||'(빈)')===t; });
    var out=drawGrid(d.ss, sub, OUT_PREFIX+'·'+t, true);
    if(!first) first=out;
  });
  if(first) d.ss.setActiveSheet(first);
  toastDone_(d.ss, d.built.items.length, d.built.errors, targets.length+'명 대상');
}

function drawChoose() {
  var d=readAll_(); if(!d) return;
  var ui=SpreadsheetApp.getUi();
  var r1=ui.prompt('① 지점 (비우면 전체)','예: 대치점', ui.ButtonSet.OK_CANCEL);
  if(r1.getSelectedButton()!==ui.Button.OK) return;
  var r2=ui.prompt('② 대상 (비우면 전체)','예: 쿠니', ui.ButtonSet.OK_CANCEL);
  if(r2.getSelectedButton()!==ui.Button.OK) return;
  var r3=ui.prompt('③ 요일 (비우면 전체)','예: 월  또는  월수금', ui.ButtonSet.OK_CANCEL);
  if(r3.getSelectedButton()!==ui.Button.OK) return;

  var fb=r1.getResponseText().trim();
  var ft=r2.getResponseText().trim();
  var fdDays=parseDays(r3.getResponseText());
  var items=d.built.items.filter(function(it){
    if(fb && (it.branch||'')!==fb) return false;
    if(ft && (it.target||'')!==ft) return false;
    if(fdDays.length && fdDays.indexOf(it.day)<0) return false;
    return true;
  });
  if(!items.length){ d.ss.toast('조건에 맞는 일정이 없어요.','시간표',6); return; }
  var nameBits=[fb,ft,r3.getResponseText().trim()].filter(function(x){return x;});
  var nm=OUT_PREFIX+'·'+(nameBits.length?nameBits.join(' '):'선택');
  var out=drawGrid(d.ss, items, nm.substring(0,90), !fb);
  d.ss.setActiveSheet(out);
  toastDone_(d.ss, items.length, d.built.errors, '골라 그리기');
}
