#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""설치 후 시트 모습을 PNG 이미지로 렌더링 (오늘=2026-05-30 가정)."""
import datetime
from PIL import Image, ImageDraw, ImageFont

TODAY = datetime.date(2026, 5, 30)
FONT = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'
S = 2  # 스케일

def F(sz): return ImageFont.truetype(FONT, sz*S)
f_hdr = F(11); f_cell = F(10); f_small = F(8); f_title = F(14)

C_DUR = {'60분':'#fce4ec','90분':'#d9ead3','120분':'#fff2cc'}
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

WEEKN=13; GRIDN=24
INFO=[('이름',90),('등록여부',125),('금액',80),('등록회차',120),('형제\n할인',46),('등록일',86)]
WCELL=26; GCELL=24; RH=30; GAP=10

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

# 전체 크기 계산
info_w=sum(w for _,w in INFO)
total_rows=sum(plan(s[3],s[4],s[5])[1]+1 for s in STUDENTS)  # 학생행+스페이서
W=(info_w + WEEKN*WCELL + GAP + GRIDN*GCELL + 30)
H=(60 + RH + total_rows*RH + 30)
img=Image.new('RGB',(W*S,H*S),'white'); d=ImageDraw.Draw(img)

def box(x,y,w,h,fillc=None,outline=GRID):
    d.rectangle([x*S,y*S,(x+w)*S,(y+h)*S],fill=fillc,outline=outline,width=1)
def text(x,y,s,font=f_cell,color='#222',center=None):
    if center:
        bb=d.textbbox((0,0),s,font=font); tw=bb[2]-bb[0]; th=bb[3]-bb[1]
        d.text(((center[0]-tw/ (2*S))*S, (y)*S),s,font=font,fill=color)
    else:
        d.text((x*S,y*S),s,font=font,fill=color)
def ctext(cx,y,s,font=f_cell,color='#222'):
    bb=d.textbbox((0,0),s,font=font); tw=(bb[2]-bb[0])/S
    d.text(((cx-tw/2)*S,y*S),s,font=font,fill=color)

x0=15; y0=15
d.text((x0*S,y0*S),'설치 후 명단 시트 미리보기  (오늘 = 2026-05-30 기준)',font=f_title,fill='#000')
y=y0+34

# 헤더
x=x0
for name,w in INFO:
    box(x,y,w,RH,'#5b9bd5');
    for li,ln in enumerate(name.split('\n')):
        ctext(x+w/2,y+6+li*12,ln,f_hdr,'white')
    x+=w
for i in range(WEEKN):
    box(x,y,WCELL,RH,C_WHDR); ctext(x+WCELL/2,y+9,f'{i+1}',f_small,'#783f04'); x+=WCELL
x+=GAP
for i in range(GRIDN):
    box(x,y,GCELL,RH,C_GHDR); ctext(x+GCELL/2,y+9,f'{i+1}',f_small,'#1f4e79'); x+=GCELL
# 라벨
ctext(x0+info_w+WEEKN*WCELL/2,y-13,'◀ 주차 띠(월~일) ▶',f_small,'#783f04')
ctext(x0+info_w+WEEKN*WCELL+GAP+GRIDN*GCELL/2,y-13,'◀ 회차 칸 ▶',f_small,'#1f4e79')
y+=RH

for st in STUDENTS:
    name,reg,amt,freq,dur,cyc,sib,regd,dates=st
    per,rows,daily=plan(freq,dur,cyc)
    price=round(amt*0.95) if sib else amt
    # info (첫 줄)
    x=x0
    vals=[name, reg, f'{price:,}', f'{freq} {dur}'+('' if daily else f' {cyc}'), '5%할인' if sib else '', regd.strftime('%y-%m-%d')]
    for (nm,w),v in zip(INFO,vals):
        fillc=None
        if nm=='등록여부': fillc=C_REG.get(v)
        if nm=='등록회차': fillc=C_DUR[dur]
        if nm=='형제\n할인' and sib: fillc='#b6d7a8'
        box(x,y,w,rows*RH if nm in('이름','등록여부','금액','형제\n할인','등록일') else RH, fillc)
        # 등록회차 칩은 첫줄만 색, 아래줄 빈칸
        if nm=='등록회차':
            for rr in range(1,rows): box(x,y+rr*RH,w,RH,None)
        fnt=f_cell
        col='#b06000' if (nm=='금액' and sib) else '#222'
        ctext(x+w/2, y+rows*RH/2-7 if nm in('이름','등록여부','금액','형제\n할인','등록일') else y+8, v, fnt, col)
        x+=w
    # 주차 띠 (첫 줄)
    weeks=WEEKN if (daily or cyc=='분기') else 5
    wc=wcounts(regd,dates,weeks)
    for i in range(WEEKN):
        cnt=wc[i] if i<len(wc) else None
        for rr in range(rows):
            box(x+i*WCELL, y+rr*RH, WCELL, RH, None)
        if cnt is None:
            continue
        fillc=C_OK if cnt>0 else C_MISS
        box(x+i*WCELL,y,WCELL,RH,fillc); ctext(x+i*WCELL+WCELL/2,y+8,str(cnt),f_cell,'#222')
    xg=x0+info_w+WEEKN*WCELL+GAP
    # 회차 칸
    slots=[]
    for rr in range(rows):
        n=GRIDN if daily else per
        for k in range(n): slots.append((rr,k))
    # 빈 색칸 먼저
    for rr in range(rows):
        n=GRIDN if daily else per
        for k in range(n):
            box(xg+k*GCELL, y+rr*RH, GCELL, RH, C_DUR[dur])
        # 미사용 칸 영역 밖은 그리지 않음
    for idx,dt in enumerate(sorted(dates)):
        if idx>=len(slots): break
        rr,k=slots[idx]
        box(xg+k*GCELL, y+rr*RH, GCELL, RH, C_USED)
        ctext(xg+k*GCELL+GCELL/2, y+rr*RH+9, dt.strftime('%-m/%-d'), f_small, '#333')
    y+=rows*RH+ (RH//2)

# 범례
ly=y+4
d.text((x0*S,ly*S),'색: 60분 분홍·90분 초록·120분 노랑   |   회색=출석완료   |   주차 초록=출석/빨강=결석   |   형제할인 ☑=5%할인(강서진 660,000→627,000)',font=f_small,fill='#555')

img.save('미리보기.png')
print('saved 미리보기.png', img.size)
