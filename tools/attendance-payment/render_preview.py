#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""설치 후 시트 모습 PNG 렌더 (주차 띠: 한 줄=한 달, 5주씩 / 오늘=2026-05-30)."""
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
FREQ_PM={'주1회':4,'주2회':8,'주3회':12}

D=datetime.date
STUDENTS=[
 ('정채원','결제완료_정상등록',240000,'주1회','60분','월',False,D(2026,5,4),
   [D(2026,5,6),D(2026,5,13),D(2026,5,27)]),
 ('강서진','결제완료_정상등록',660000,'주2회','90분','분기',True,D(2026,3,10),
   [D(2026,3,11),D(2026,3,28),D(2026,4,8),D(2026,4,15),D(2026,4,22),D(2026,5,6),D(2026,5,20),D(2026,5,27)]),
 ('김태윤','결제완료_정상등록',270000,'주2회','120분','월',False,D(2026,5,1),
   [D(2026,5,2),D(2026,5,8),D(2026,5,15),D(2026,5,22),D(2026,5,29)]),
 ('강지후','결제대기 중',990000,'매일반','90분','분기',False,D(2026,5,11),
   [D(2026,5,12),D(2026,5,13),D(2026,5,15),D(2026,5,19),D(2026,5,21),D(2026,5,22),
    D(2026,5,26),D(2026,5,27),D(2026,5,28),D(2026,5,29)]),
]

WEEKN=5; GRIDN=12
INFO=[('이름',90),('등록여부',125),('금액',80),('등록회차',120),('형제\n할인',46),('등록일',86)]
WCELL=28; GCELL=26; RH=30; GAP=10

def plan(freq,dur,cyc):
    daily=freq=='매일반'; per=GRIDN if daily else FREQ_PM[freq]
    rows=3 if (daily or cyc=='분기') else 1
    return per,rows,daily
def wcounts(reg,dates,weeks):
    out=[]
    for i in range(weeks):
        ws=reg+datetime.timedelta(days=7*i); we=ws+datetime.timedelta(days=7)
        out.append(None if ws>TODAY else sum(1 for d in dates if ws<=d<we))
    return out

info_w=sum(w for _,w in INFO)
total_rows=sum(plan(s[3],s[4],s[5])[1]+1 for s in STUDENTS)
W=info_w + WEEKN*WCELL + GAP + GRIDN*GCELL + 30
H=60 + RH + total_rows*RH + 40
img=Image.new('RGB',(W*S,H*S),'white'); d=ImageDraw.Draw(img)

def box(x,y,w,h,fillc=None,outline=GRID):
    d.rectangle([x*S,y*S,(x+w)*S,(y+h)*S],fill=fillc,outline=outline,width=1)
def ctext(cx,y,s,font=f_cell,color='#222'):
    bb=d.textbbox((0,0),s,font=font); tw=(bb[2]-bb[0])/S
    d.text(((cx-tw/2)*S,y*S),s,font=font,fill=color)

x0=15; y0=15
d.text((x0*S,y0*S),'설치 후 명단 시트 미리보기  ·  주차 띠 = 한 줄(한 달) × 5주, 분기납 3줄  (오늘 2026-05-30)',font=f_title,fill='#000')
y=y0+34

week_x=x0+info_w; grid_x=week_x+WEEKN*WCELL+GAP
# 헤더
x=x0
for name,w in INFO:
    box(x,y,w,RH,'#5b9bd5')
    for li,ln in enumerate(name.split('\n')): ctext(x+w/2,y+6+li*12,ln,f_hdr,'white')
    x+=w
for i in range(WEEKN):
    box(week_x+i*WCELL,y,WCELL,RH,C_WHDR); ctext(week_x+i*WCELL+WCELL/2,y+9,f'{i+1}주',f_small,'#783f04')
for i in range(GRIDN):
    box(grid_x+i*GCELL,y,GCELL,RH,C_GHDR); ctext(grid_x+i*GCELL+GCELL/2,y+9,f'{i+1}',f_small,'#1f4e79')
ctext(week_x+WEEKN*WCELL/2,y-13,'◀ 주차 띠(한 줄=한 달) ▶',f_small,'#783f04')
ctext(grid_x+GRIDN*GCELL/2,y-13,'◀ 회차 칸 ▶',f_small,'#1f4e79')
y+=RH

for st in STUDENTS:
    name,reg,amt,freq,dur,cyc,sib,regd,dates=st
    per,rows,daily=plan(freq,dur,cyc)
    price=round(amt*0.95) if sib else amt
    # info(첫 줄, rows 높이로 표시)
    vals=[name,reg,f'{price:,}',f'{freq} {dur}'+('' if daily else f' {cyc}'),'5%할인' if sib else '',regd.strftime('%y-%m-%d')]
    x=x0
    for (nm,w),v in zip(INFO,vals):
        fc=None
        if nm=='등록여부': fc=C_REG.get(v)
        if nm=='등록회차': fc=C_DUR[dur]
        if nm=='형제\n할인' and sib: fc='#b6d7a8'
        box(x,y,w,rows*RH,fc)
        ctext(x+w/2,y+rows*RH/2-7,v,f_cell,'#b06000' if (nm=='금액' and sib) else '#222')
        x+=w
    # 주차 띠 + 회차 칸 (행별)
    wc=wcounts(regd,dates,WEEKN*rows)
    slots=[]
    for r in range(rows):
        # 주차
        for c in range(WEEKN):
            box(week_x+c*WCELL,y+r*RH,WCELL,RH,None)
            w=r*WEEKN+c; cnt=wc[w] if w<len(wc) else None
            if cnt is not None:
                box(week_x+c*WCELL,y+r*RH,WCELL,RH,C_OK if cnt>0 else C_MISS)
                ctext(week_x+c*WCELL+WCELL/2,y+r*RH+8,str(cnt),f_cell,'#222')
        # 회차
        n=GRIDN if daily else per
        for k in range(n):
            box(grid_x+k*GCELL,y+r*RH,GCELL,RH,C_DUR[dur]); slots.append((y+r*RH,grid_x+k*GCELL))
    for idx,dt in enumerate(sorted(dates)):
        if idx>=len(slots): break
        yy,xx=slots[idx]; box(xx,yy,GCELL,RH,C_USED); ctext(xx+GCELL/2,yy+9,dt.strftime('%-m/%-d'),f_small,'#333')
    y+=rows*RH+RH//2

ly=y+4
d.text((x0*S,ly*S),'색: 60분 분홍·90분 초록·120분 노랑  |  회색=출석완료  |  주차 초록=출석/빨강=결석(0)  |  형제할인=5%할인(강서진 660,000→627,000)',font=f_small,fill='#555')
img.save('미리보기.png'); print('saved', img.size)
