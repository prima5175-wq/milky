#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""설치 후 시트 모습 PNG 렌더 (번호·다음등록일 색경고·주차 띠 5주 / 오늘=2026-05-30)."""
import datetime
from PIL import Image, ImageDraw, ImageFont

TODAY = datetime.date(2026, 5, 30)
FONT = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'
S = 2
def F(sz): return ImageFont.truetype(FONT, sz*S)
f_hdr=F(11); f_cell=F(10); f_small=F(8); f_title=F(14)

C_DUR={'60분':'#fce4ec','90분':'#d9ead3','120분':'#fff2cc'}
C_USED='#cfcfcf'; C_OK='#b6d7a8'; C_MISS='#ea9999'
C_REG={'결제완료_정상등록':'#b6d7a8','결제대기 중':'#ffe599','등록안함':'#ea9999'}
C_HDR='#5b9bd5'; C_WHDR='#f9cb9c'; C_GHDR='#9dc3e6'; GRID='#cccccc'
C_N3='#ffe599'; C_N1='#f6b26b'; C_N0='#e06666'
FREQ_PM={'주1회':4,'주2회':8,'주3회':12}

def _hsv(h,s,v):
    h=h/60.0; c=v*s; x=c*(1-abs((h%2)-1)); m=v-c
    r,g,b=[(c,x,0),(x,c,0),(0,c,x),(0,x,c),(x,0,c),(c,0,x)][int(h)%6]
    return '#%02x%02x%02x'%(round((r+m)*255),round((g+m)*255),round((b+m)*255))
def rainbow(i,n): return _hsv(i/n*300,0.45,1.0)
PLAN_OPTS=[]
for f in ['주1회','주2회','주3회']:
    for d in ['60분','90분','120분']:
        for c in ['월','분기']: PLAN_OPTS.append(f'{f} {d} {c}')
for d in ['60분','90분','120분']: PLAN_OPTS.append(f'매일반 {d}')
def plan_color(s):
    return rainbow(PLAN_OPTS.index(s), len(PLAN_OPTS)) if s in PLAN_OPTS else '#eeeeee'

D=datetime.date
# (이름, 등록여부, 금액, 횟수, 시간, 납부, 형제할인, 등록일, 출석들, 다음등록일)
STUDENTS=[
 ('정채원','결제완료_정상등록',140000,'주1회','60분','월',False,D(2026,5,4),
   [D(2026,5,6),D(2026,5,13),D(2026,5,27)], D(2026,6,2)),
 ('강서진','결제완료_정상등록',660000,'주2회','90분','분기',True,D(2026,3,10),
   [D(2026,3,11),D(2026,3,28),D(2026,4,8),D(2026,4,15),D(2026,4,22),D(2026,5,6),D(2026,5,20),D(2026,5,27)],
   D(2026,5,31)),
 ('김태윤','결제완료_정상등록',300000,'주2회','120분','월',False,D(2026,5,1),
   [D(2026,5,2),D(2026,5,8),D(2026,5,15),D(2026,5,22),D(2026,5,29)], D(2026,5,30)),
 ('강지후','결제대기 중',990000,'매일반','90분','분기',False,D(2026,5,11),
   [D(2026,5,12),D(2026,5,13),D(2026,5,15),D(2026,5,19),D(2026,5,21),D(2026,5,22),
    D(2026,5,26),D(2026,5,27),D(2026,5,28),D(2026,5,29)], D(2026,8,11)),
]

WEEKN=5; GRIDN=12
INFO=[('번호',42),('이름',82),('등록여부',120),('금액',78),('등록회차',116),
      ('형제\n할인',46),('등록일',80),('다음\n등록일',80)]
WCELL=28; GCELL=26; RH=30; GAP=10

def plan(freq,dur,cyc):
    daily=freq=='매일반'; per=GRIDN if daily else FREQ_PM[freq]
    rows=3 if (daily or cyc=='분기') else 1
    return per,rows,daily
def _monday_of(d): return d-datetime.timedelta(days=d.weekday())
def week_grid(reg,dates,rows):
    firstmon=_monday_of(reg); cells=[]
    for idx in range(5*rows):
        wmon=firstmon+datetime.timedelta(days=7*idx); wsun=wmon+datetime.timedelta(days=6)
        cells.append(None if wmon>TODAY else sum(1 for d in dates if wmon<=d<=wsun))
    return [cells[r*5:(r+1)*5] for r in range(rows)]
def next_color(nextd):
    dd=(nextd-TODAY).days
    if dd<=0: return C_N0
    if dd<=1: return C_N1
    if dd<=3: return C_N3
    return None

info_w=sum(w for _,w in INFO)
total_rows=sum(plan(s[3],s[4],s[5])[1]+1 for s in STUDENTS)
W=info_w + WEEKN*WCELL + GAP + GRIDN*GCELL + 30
H=64 + RH + total_rows*RH + 44 + 150
img=Image.new('RGB',(W*S,H*S),'white'); d=ImageDraw.Draw(img)

def box(x,y,w,h,fillc=None,outline=GRID,wd=1):
    d.rectangle([x*S,y*S,(x+w)*S,(y+h)*S],fill=fillc,outline=outline,width=wd)
def ctext(cx,y,s,font=f_cell,color='#222'):
    bb=d.textbbox((0,0),s,font=font); tw=(bb[2]-bb[0])/S
    d.text(((cx-tw/2)*S,y*S),s,font=font,fill=color)

x0=15; y0=15
d.text((x0*S,y0*S),'설치 후 명단 시트 미리보기  ·  번호 자동 · 다음등록일 색경고 · 주차 띠 5주×줄  (오늘 2026-05-30)',font=f_title,fill='#000')
y=y0+38

week_x=x0+info_w; grid_x=week_x+WEEKN*WCELL+GAP
x=x0
for name,w in INFO:
    box(x,y,w,RH,'#5b9bd5')
    for li,ln in enumerate(name.split('\n')): ctext(x+w/2,y+6+li*12,ln,f_hdr,'white')
    x+=w
for i in range(WEEKN):
    box(week_x+i*WCELL,y,WCELL,RH,C_WHDR); ctext(week_x+i*WCELL+WCELL/2,y+9,f'{i+1}주',f_small,'#783f04')
for i in range(GRIDN):
    box(grid_x+i*GCELL,y,GCELL,RH,C_GHDR); ctext(grid_x+i*GCELL+GCELL/2,y+9,f'{i+1}',f_small,'#1f4e79')
ctext(week_x+WEEKN*WCELL/2,y-14,'◀ 주차 띠(한 줄=한 달) ▶',f_small,'#783f04')
ctext(grid_x+GRIDN*GCELL/2,y-14,'◀ 회차 칸 ▶',f_small,'#1f4e79')
y+=RH

for idx,st in enumerate(STUDENTS):
    name,reg,amt,freq,dur,cyc,sib,regd,dates,nextd=st
    per,rows,daily=plan(freq,dur,cyc)
    price=round(amt*0.95) if sib else amt
    blockw=info_w+WEEKN*WCELL+GAP+GRIDN*GCELL
    # 굵은 구분선(학생 첫 줄 위)
    d.line([x0*S,y*S,(x0+blockw)*S,y*S],fill='#000000',width=3)
    vals=[str(idx+1),name,reg,f'{price:,}',f'{freq} {dur}'+('' if daily else f' {cyc}'),
          '형제할인' if sib else '정상',regd.strftime('%y-%m-%d'),nextd.strftime('%y-%m-%d')]
    x=x0
    for (nm,w),v in zip(INFO,vals):
        fc=None
        if nm=='등록여부': fc=C_REG.get(v)
        if nm=='등록회차': fc=plan_color(v)
        if nm=='형제\n할인' and sib: fc='#b6d7a8'
        if nm=='다음\n등록일': fc=next_color(nextd)
        box(x,y,w,rows*RH,fc)
        ctext(x+w/2,y+rows*RH/2-7,v,f_cell,'#b06000' if (nm=='금액' and sib) else '#222')
        x+=w
    wg=week_grid(regd,dates,rows); slots=[]
    for r in range(rows):
        for c in range(WEEKN):
            box(week_x+c*WCELL,y+r*RH,WCELL,RH,None)
            cnt=wg[r][c]
            if cnt is not None:
                box(week_x+c*WCELL,y+r*RH,WCELL,RH,C_OK if cnt>0 else C_MISS)
                ctext(week_x+c*WCELL+WCELL/2,y+r*RH+8,str(cnt),f_cell,'#222')
        n=GRIDN if daily else per
        for k in range(n):
            box(grid_x+k*GCELL,y+r*RH,GCELL,RH,C_DUR[dur]); slots.append((y+r*RH,grid_x+k*GCELL))
    for i2,dt in enumerate(sorted(dates)):
        if i2>=len(slots): break
        yy,xx=slots[i2]; box(xx,yy,GCELL,RH,C_USED); ctext(xx+GCELL/2,yy+9,dt.strftime('%-m/%-d'),f_small,'#333')
    y+=rows*RH+RH//2

ly=y+4
d.text((x0*S,ly*S),'다음등록일 색: 3일전 노랑·1일전 주황·당일/지남 진한 빨강   |   주차 초록=출석/빨강=결석   |   형제할인=5%할인',font=f_small,fill='#555')

# 등록회차 드롭다운 무지개 색상표
ly2=ly+26
d.text((x0*S,ly2*S),'▼ 등록회차 드롭다운 색(무지개 순) — 고르면 그 칸이 이 색으로 칠해집니다',font=f_cell,fill='#000')
lx=x0; lyy=ly2+22; cw=150; chh=24; perrow=7
for i,opt in enumerate(PLAN_OPTS):
    col=i%perrow; rr=i//perrow
    bx=x0+col*cw; by=lyy+rr*(chh+4)
    box(bx,by,cw-6,chh,plan_color(opt))
    ctext(bx+(cw-6)/2,by+6,opt,f_small,'#222')
img.save('미리보기.png'); print('saved', img.size)
H_EXTRA=True
