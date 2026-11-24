from PIL import Image
OUT='docs/art-drafts/out/'
PAL={'K':'#24170e','w':'#fbf7ec','l':'#cfd4dc','m':'#8f98a8','d':'#555e70',
'G':'#fff0a0','g':'#f0b838','o':'#a8661c','t':'#d0924c','b':'#8c5a2c','B':'#5a361a',
'R':'#ff8a74','r':'#d8382c','q':'#821c1c','E':'#a8e070','e':'#4ea83a','f':'#26682a',
'C':'#eefcff','c':'#9be0ff','v':'#4a98e0','n':'#23508e','Y':'#fff4a8','y':'#ffc83a','O':'#ff7a1a',
'P':'#d09af6','p':'#8a48b0','s':'#f8eac4','S':'#dcc08a','u':'#a8884e','x':'#3a3a48'}
def grid(rows, outline=True):
    h=len(rows); w=max(len(r) for r in rows)
    im=Image.new('RGBA',(w+2,h+2),(0,0,0,0)); px=im.load()
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            if ch in PAL: px[x+1,y+1]=Image.new('RGB',(1,1),PAL[ch]).getpixel((0,0))+(255,)
    if outline:
        src=im.copy(); sp=src.load(); k=Image.new('RGB',(1,1),PAL['K']).getpixel((0,0))+(255,)
        for y in range(h+2):
            for x in range(w+2):
                if sp[x,y][3]==0 and any(0<=x+dx<w+2 and 0<=y+dy<h+2 and sp[x+dx,y+dy][3] and sp[x+dx,y+dy][:3]!=k[:3] for dx,dy in ((1,0),(-1,0),(0,1),(0,-1))): px[x,y]=k
    return im
ICONS={}
ICONS['widowmaker']=[ # crossbow, seen from above
"......w.......",
".....wlw......",
"......m.......",
".Bbb..m..bbB..",
"B..bbbtbbb..B.",
"m.....tt.....m",
".m....tt....m.",
"..m...tt...m..",
"...mm.tt.mm...",
".....mtbm.....",
"......tb......",
"......tb......",
".....Bbb......",
"......BB......",]
ICONS['rapier']=[
"............wl",
"...........wl.",
"..........wl..",
".........wl...",
"........wl....",
".......wl.....",
"..g...wl......",
"..gg.wl.......",
"...gGl........",
"...gGg........",
"..oo.gg.......",
".oo...g.......",
"Go............",
"G.............",]
ICONS['broth']=[ # cauldron with green brew
".....e..E.....",
"...E..e...e...",
"....eE..E.....",
"..xxxxxxxxxx..",
".xeEEEeeeeeex.",
".xxxxxxxxxxxx.",
"..xdmmmddddx..",
".xdmlmdddddddx",
".xdmmddddddddx",
".xddddddddddxx",
"..xddddddddx..",
"...xxxxxxxx...",
"...xx....xx...",
"..............",]
ICONS['bloodring']=[
"......RR......",
".....RRrr.....",
"....Rrrrrq....",
"....rrrrqq....",
".....qqqq.....",
"....gGGGgg....",
"...gG....go...",
"..gG......go..",
"..gG......go..",
"..gg......oo..",
"...go....oo...",
"....oooooo....",
"..............",
"..............",]
ICONS['fireball']=[
"..............",
"...........Y..",
".......y..Y...",
"....OOyyYY....",
"...OyyYYYy....",
"..OyYYwYYyO...",
".OyYYwwYYyO.y.",
".OyYYYYYyyO...",
".OyyYYYyyO....",
"..OOyyyyOO....",
"..r.OOOOr.....",
".r...rr.......",
"..............",
"..............",]
ICONS['frostnova']=[
"......c.......",
"...c..C..c....",
"....c.C.c.....",
".....cCc......",
"..c..CwC..c...",
"cCCCCwwwCCCCc.",
"..c..CwC..c...",
".....cCc......",
"....c.C.c.....",
"...c..C..c....",
"......c.......",
"..............",
".v..........v.",
"..............",]
ICONS['gift']=[
"...r.....r....",
"..rqr...rqr...",
"...rrr.rrr....",
".....rRr......",
".gggggrggggg..",
".gGGGGrGGGGo..",
".ooooorooooo..",
"..gGGGrGGGo...",
"..gGGGrGGGo...",
"..gGGGrGGGo...",
"..gGGGrGGGo...",
"..ooooroooo...",
"..............",
"..............",]
ICONS['crown']=[
"..............",
"..............",
"..r...g...r...",
"..g..gGg..g...",
"..gg.gGg.gg...",
"..gGggGggGg...",
"..gGGGGGGGg...",
"..gGrGGvGrg...",
"..gGGGGGGGg...",
"..oooooooooo..",
"..............",
"..............",
"..............",
"..............",]
ICONS['swords']=[
"w............w",
".wl........lw.",
"..wl......lw..",
"...wl....lw...",
"....wl..lw....",
".....wllw.....",
"......lw......",
".....wllw.....",
"..g.lw..wl.g..",
"...gw....wg...",
"...og....go...",
"..B.oo..oo.B..",
".BB........BB.",
"..............",]
ICONS['scroll']=[
"..............",
"..StsssssssS..",
".Stu.......u..",
".Ssssssssssu..",
"..suuuuuuusu..",
"..ssssssssss..",
"..suuuuuuusu..",
"..ssssssssss..",
"..suuuusssss..",
"..sssssssssS..",
".SssssssssssS.",
".uSSSSSSSSSu..",
"..uuuuuuuuu...",
"..............",]
ICONS['bomb']=[
"...........y..",
"..........YO..",
".........y....",
"........b.....",
".......bb.....",
".....xxxx.....",
"...xxxxxxxx...",
"..xxmlxxxxxx..",
"..xmlxxxxxxx..",
"..xxxxxxxxxx..",
"..xxxxxxxxxx..",
"...xxxxxxxx...",
".....xxxx.....",
"..............",]
if __name__=='__main__':
    S=6; names=list(ICONS)
    sheet=Image.new('RGBA',(len(names)*(16*S+12),16*S+12),(58,40,24,255))
    for i,n in enumerate(names):
        im=grid(ICONS[n]); big=im.resize((im.width*S,im.height*S),Image.NEAREST); big.save(OUT+n+'.png')
        sheet.paste(big,(i*(16*S+12)+6,6),big)
    sheet.save(OUT+'sheet.png')
