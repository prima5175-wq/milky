# -*- coding: utf-8 -*-
import datetime
from PIL import Image, ImageDraw, ImageFont
FONT='/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'; S=2
def F(sz): return ImageFont.truetype(FONT,sz*S)
f_hdr=F(10); f_cell=F(9); f_small=F(8); f_title=F(14)
WEEK=['#fce4ec','#fff2cc','#ccf2e3','#cfe2f3']; GRAY='#cfcfcf'; HDR='#5b9bd5'; GRIDLINE='#cccccc'
D=datetime.date
# (부,이름,학년,학교,전화,재원,결제일, 출석[(idx,'date'|'makeup')...])
def att(reg_dates, makeup_idx):
    return reg_dates, makeup_idx
STUDENTS=[
 ('1부','김민준','6','대도','010-1234','현재재원생','8/1',
   {0:'8/4',1:'8/5',2:'8/6',3:'8/7',5:'8/11',6:'8/12',7:'M8/13'}),  # M=보강
 ('2부','이서아','4','숙명','010-2222','비재원생','8/1',
   {0:'8/4',1:'8/5',2:'8/6',3:'8/7',4:'8/8',5:'8/11',6:'8/12',7:'8/13',8:'8/14'}),
 ('3부','박지호','3','대도','010-3333','예전재원생(현재휴원)','8/2',
   {0:'8/4',2:'8/6',4:'8/8',5:'M8/11'}),
 ('1부','최유나','5','대치','010-4444','대치점 재원생','8/1',
   {0:'8/4',1:'8/5',2:'8/6',3:'8/7',4:'8/8'}),
]
INFO=[('부',38),('이름',64),('학년',40),('학교',60),('전화번호',86),('재원생여부',128),('결제일',60),('남은\n회차',46),('보강',38)]
GC=26; RH=30
info_w=sum(w for _,w in INFO); N=20
W=info_w+N*GC+170; H=70+RH+len(STUDENTS)*RH+50
img=Image.new('RGB',(W*S,H*S),'white'); d=ImageDraw.Draw(img)
def box(x,y,w,h,fill=None,outline=GRIDLINE,wd=1): d.rectangle([x*S,y*S,(x+w)*S,(y+h)*S],fill=fill,outline=outline,width=wd)
def ctext(cx,y,s,font=f_cell,color='#222'):
    bb=d.textbbox((0,0),s,font=font); tw=(bb[2]-bb[0])/S; d.text(((cx-tw/2)*S,y*S),s,font=font,fill=color)
x0=15;y0=14
d.text((x0*S,y0*S),'방학특강 시트 미리보기 🌴  ·  20칸=4주(연분홍/연노랑/민트/연하늘) · 날짜=출석 · 회색=보강',font=f_title,fill='#000')
y=y0+34
gx=x0+info_w
# 헤더
x=x0
for nm,w in INFO:
    box(x,y,w,RH,HDR)
    for li,ln in enumerate(nm.split('\n')): ctext(x+w/2,y+ (5 if '\n' in nm else 9)+li*11,ln,f_hdr,'white')
    x+=w
for i in range(N):
    box(gx+i*GC,y,GC,RH,WEEK[i//5]); ctext(gx+i*GC+GC/2,y+9,str(i+1),f_small,'#555')
box(gx+N*GC,y,140,RH,HDR); ctext(gx+N*GC+70,y+9,'특이사항',f_hdr,'white')
ctext(gx+N*GC/2,y-12,'◀ 1주    2주    3주    4주 ▶',f_small,'#888')
y+=RH
for st in STUDENTS:
    part,name,grade,sch,tel,mem,pay,att=st
    dated=len(att); makeup=sum(1 for v in att.values() if str(v).startswith('M'))
    left=N-dated
    vals=[part,name,grade,sch,tel,mem,pay,str(left),str(makeup) if makeup else '']
    x=x0
    for (nm,w),v in zip(INFO,vals):
        box(x,y,w,RH); ctext(x+w/2,y+9,v,f_cell,'#c0392b' if nm.startswith('보강') and v else '#222'); x+=w
    for i in range(N):
        cell=att.get(i)
        if cell is None:
            box(gx+i*GC,y,GC,RH,WEEK[i//5])
        elif str(cell).startswith('M'):
            box(gx+i*GC,y,GC,RH,GRAY); ctext(gx+i*GC+GC/2,y+9,cell[1:],f_small,'#333')
        else:
            box(gx+i*GC,y,GC,RH,WEEK[i//5]); ctext(gx+i*GC+GC/2,y+9,cell,f_small,'#333')
    box(gx+N*GC,y,140,RH)
    y+=RH
ly=y+8
d.text((x0*S,ly*S),'남은회차 = 20 - (날짜 입력 칸 수)  ·  보강(회색)도 회차 차감에 포함  ·  보강 수는 따로 카운트',font=f_small,fill='#555')
img.save('미리보기_특강.png'); print('saved',img.size)
