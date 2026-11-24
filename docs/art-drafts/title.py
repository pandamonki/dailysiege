from PIL import Image
import math, random
OUT='docs/art-drafts/out/'
W,H=192,344
im=Image.new('RGB',(W,H)); P=im.load()
hx=lambda h:(int(h[1:3],16),int(h[3:5],16),int(h[5:7],16))
B4=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]
def put(x,y,c):
    if 0<=x<W and 0<=y<H: P[x,y]=hx(c) if isinstance(c,str) else c
def band(y0,y1,cols,xr=(0,W),mask=None):
    # dithered vertical gradient across a list of colours
    n=len(cols)-1
    for y in range(y0,y1):
        t=(y-y0)/max(1,(y1-y0))*n; i=min(int(t),n-1); f=t-i
        for x in range(*xr):
            if mask and not mask(x,y): continue
            put(x,y,cols[i+1] if f*16>B4[y%4][x%4]+.5 else cols[i])
# sky
HOR=150
band(0,HOR,['#2a1f48','#3d2a5e','#5c3770','#8a4a72','#c4625e','#ec8f58','#f8bd6a','#ffdf8e'])
# sun
for y in range(HOR-22,HOR+2):
    for x in range(70,123):
        d=math.hypot(x-96,y-HOR+6)
        if d<15: put(x,y,'#fff6c8' if d<11 else '#ffe9a0')
        elif d<17 and (x+y)%2==0: put(x,y,'#ffe9a0')
# clouds
random.seed(7)
def cloud(cx,cy,w,lit,dark):
    for x in range(cx-w,cx+w):
        top=int(2.5*math.sin((x-cx)/w*math.pi/1.0+1.6)**2+1+ (2 if abs(x-cx)<w*.45 else 0))
        for y in range(cy-top,cy+2):
            put(x,y,dark if y>=cy else lit)
cloud(36,40,26,'#8a5a86','#6a4278'); cloud(150,26,30,'#8a5a86','#6a4278')
cloud(160,88,24,'#e7906c','#c06a62'); cloud(28,104,20,'#f0a66a','#cd7a62'); cloud(120,116,16,'#ffc883','#ec9a6a')
# far mountains
for x in range(W):
    h=int(10+6*math.sin(x*.07)+4*math.sin(x*.19+1)+3*math.sin(x*.41))
    for y in range(HOR-h,HOR+6): put(x,y,'#7a4a6e' if y<HOR-h+2 else '#5e3a62')
# distant forest line
for x in range(W):
    h=int(3+2*math.sin(x*.9)+2*math.sin(x*.37))
    for y in range(HOR+2-h,HOR+12): put(x,y,'#2c3e34' if (x+y)%5 else '#24342c')
# plain
G0=HOR+8
band(G0,H,['#5e7a3a','#5a8a3a','#4f8a36','#457c30','#3a6a2a','#2d5524'])
# grass specks
for i in range(900):
    x=random.randrange(W); y=random.randrange(G0+4,H)
    put(x,y,'#6fa04a' if random.random()<.6 else '#36602a')
# central hill
HCX,HCY=96,212
for y in range(HCY-26,HCY+22):
    for x in range(HCX-56,HCX+57):
        e=((x-HCX)/56)**2+((y-HCY-6)/24)**2
        if e<1:
            c='#7aa848' if e<.35 else '#6a9a40' if e<.7 else '#5c8c3a'
            if y<HCY-10 and x<HCX: c='#88b852' if e<.5 else c
            if e>.85 and (x+y)%2: c='#4f8034'
            put(x,y,c)
# dirt paths from hill to castles
CAST=[(28,182,'#2f5fa8'),(164,178,'#b8322a'),(14,240,'#3d7a35'),(178,236,'#7a3d8f'),(40,288,'#c9862f'),(152,292,'#2d8a8a')]
def path(x0,y0,x1,y1,wid=2):
    n=int(max(abs(x1-x0),abs(y1-y0)))
    for i in range(n+1):
        x=round(x0+(x1-x0)*i/n); y=round(y0+(y1-y0)*i/n)
        for d in range(-wid//2,wid-wid//2): put(x+d,y,'#b08a56' if d else '#c29a62'); put(x+d,y+1,'#9a7646')
for cx,cy,_ in CAST: path(HCX,HCY,cx+6,cy+8,3)
# hill top patch + banner
for x in range(HCX-6,HCX+7):
    for y in range(HCY-6,HCY+1): 
        if ((x-HCX)/6)**2+((y-HCY+3)/3.5)**2<1: put(x,y,'#c29a62')
for y in range(HCY-30,HCY-2): put(HCX,y,'#3a2414'); put(HCX+1,y,'#5a3a1e')
put(HCX,HCY-31,'#ffe27a'); put(HCX+1,HCY-31,'#ffe27a')
for i,row in enumerate(["GGGGGGGGGgg","GgggggggggG.","Ggggggggg..","GggggggggGg","oooooooooo"]):
    for j,ch in enumerate(row):
        if ch!='.': put(HCX+2+j,HCY-29+i+(1 if j>6 and i>2 else 0),{'G':'#ffe27a','g':'#f0b838','o':'#a8661c'}[ch])
# castle sprite
def castle(x0,y0,team):
    S=["kk.kk.....kk.kk",
       "kRRRk.....kRRRk",
       "kRRRRk...kRRRRk",
       ".kSSk.....kSSk.",
       ".kSSkkkkkkkSSk.",
       ".kSLkSkSkSkSLk.",
       ".kSSSSSSSSSSSk.",
       ".kSSSkTTTkSSSk.",
       ".kSLSkTTTkSLSk.",
       ".kSSSSkTkSSSSk.",
       ".kSSSSSSSSSSSk.",
       ".kSLSSkddkSSLk.",
       ".kSSSkddddkSSk.",
       ".kSSSkddddkSSk.",
       ".kkkkkkkkkkkkk."]
    for y,r in enumerate(S):
        for x,ch in enumerate(r):
            c={'k':'#24170e','R':team,'S':'#d2cdc0','L':'#8f8a80','T':team,'d':'#5a3a1e'}.get(ch)
            if c: put(x0-2+x,y0+y-2,c)
    for y in range(y0-9,y0-1): put(x0+5,y,'#24170e')
    for x in range(6,10):
        for yy in range(3): put(x0+x,y0-9+yy,team)
for cx,cy,t in CAST: castle(cx,cy,t)
# smoke from two castles
for (sx,sy) in [(30,178),(166,174)]:
    for i in range(16):
        put(sx+int(2*math.sin(i*.6))+i//4,sy-i,'#7a6a6a' if i%3 else '#9a8a86')
# soldiers marching toward the hill
def soldier(x,y,team):
    put(x,y,'#f0c8a0'); put(x,y+1,team); put(x-1,y+1,'#24170e'); put(x+1,y+1,'#24170e'); put(x,y+2,'#3a2a1a')
    put(x+1,y-1,'#cfd4dc')
random.seed(3)
for cx,cy,t in CAST:
    for k in range(14):
        f=.25+.55*(k/14)
        x=cx+6+(HCX-cx-6)*f+random.uniform(-6,6); y=cy+8+(HCY-cy-8)*f+random.uniform(-5,5)
        soldier(int(x),int(y),t)
# trees
def pine(x0,y0,dark=False):
    rows=["...g...","..ggg..","...g...","..gGg..",".ggggg.","..ggg..",".gggGg.","ggggggg",".ggggG.","ggggggg","...b...","...b..."]
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            if ch=='.': continue
            c={'g':'#1d4428' if dark else '#2a6232','G':'#3e8a40' if not dark else '#2c5a32','b':'#4a2e18'}[ch]
            if ch=='g' and x<3 and not dark: c='#357a3a'
            put(x0+x,y0+y,c)
random.seed(11)
for i in range(90):
    side=random.choice([0,1]); x=random.randrange(0,40) if side==0 else random.randrange(152,190)
    y=random.randrange(G0+6,H-6)
    if any(abs(x-cx-4)<14 and abs(y-cy-2)<18 for cx,cy,_ in CAST) or abs(x-96)<44: continue
    pine(x,y,dark=y>300)
for i in range(40):
    x=random.randrange(0,W); y=random.randrange(306,H-6)
    if abs(x-96)<40: continue
    pine(x,y,True)
# foreground rock with lord silhouette
RX,RY=96,318
for y in range(RY-4,H):
    for x in range(RX-38,RX+39):
        e=((x-RX)/38)**2+((y-RY-16)/20)**2
        if e<1:
            c='#3e3646' if e<.55 else ('#2e2836' if (x+y)%2 else '#3e3646')
            if e>.75 and y<RY+6: c='#c47a5a' if (x+y)%2==0 else '#8a5a56'
            put(x,y,c)
LORD=[".....kkk.......",
      "....kkkkk......",
      "....kkkkk......",
      ".....kkk.......",
      "...kkkkkkk.....",
      "..kkkkkkkkk....",
      ".kkkkkkkkkkk...",
      ".kkkkkkkkkkk...",
      "kkkkkkkkkkkk...",
      "kkkkkkkkkkkkk..",
      "kkkkkkkkkkkkk..",
      ".kkkkkkkkkkk...",
      "..kkkkkkkkk....",
      "..kkkkkkkkk....",
      "..kkk...kkk....",
      "..kkk...kkk....",
      ".kkkk...kkkk..."]
for y,r in enumerate(LORD):
    for x,ch in enumerate(r):
        if ch=='k': put(RX-8+x,RY-20+y,'#1a1218')
for y in range(RY-52,RY-3): put(RX+6,y,'#1a1218'); put(RX+7,y,'#1a1218')
for i in range(8):
    for j in range(16-i//2):
        put(RX+8+j,RY-52+i+int(2*math.sin(j*.45)),'#1a1218')
for (x,y) in [(RX-8,RY-14),(RX-9,RY-12),(RX-9,RY-10),(RX-3,RY-20),(RX-4,RY-19)]: put(x,y,'#c47a5a')
# title text: chunky 5x7 font
F={'D':["1110.","1001.","10001","10001","10001","1001.","1110."],'A':[".111.","10001","10001","11111","10001","10001","10001"],
'I':["111","010","010","010","010","010","111"],'L':["100..","100..","100..","100..","100..","100..","11111"],
'Y':["10001","10001",".1.1.","..1..","..1..","..1..","..1.."],'S':[".1111","1....","1....",".111.","....1","....1","1111."],
'E':["11111","1....","1....","1111.","1....","1....","11111"],'G':[".1111","1....","1....","1.111","1...1","1...1",".111."]}
def text(word,y0,sc):
    wid=sum(len(F[c][0])*sc+sc for c in word)-sc; x=(W-wid)//2
    cells=set()
    for c in word:
        g=F[c]
        for gy,r in enumerate(g):
            for gx,ch in enumerate(r):
                if ch=='1':
                    for a in range(sc):
                        for b in range(sc): cells.add((x+gx*sc+a,y0+gy*sc+b))
        x+=len(g[0])*sc+sc
    H7=7*sc
    for (x,y) in cells:  # shadow
        for d in range(1,4): put(x+d//2,y+d,'#24170e')
    for (x,y) in cells:
        for dx in (-2,-1,0,1,2):
            for dy in (-2,-1,0,1,2):
                if abs(dx)+abs(dy)<=2 and (x+dx,y+dy) not in cells: put(x+dx,y+dy,'#24170e')
    for (x,y) in cells:
        t=(y-y0)/H7
        c='#fff3b0' if t<.18 else '#ffd860' if t<.45 else '#f4ae32' if t<.75 else '#d27a1c'
        if (x,y-1) not in cells and t<.5: c='#fffbe0'
        put(x,y,c)
text("DAILY",20,5); text("SIEGE",66,5)
im.save(OUT+'title_px.png')
im.resize((W*4,H*4),Image.NEAREST).save(OUT+'title_px_x4.png')
