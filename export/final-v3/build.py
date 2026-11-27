import re
P='/tmp/claude-0/-home-user-Narcis/ba15234f-a731-5aeb-99e4-8712868c2906/scratchpad/'
FONTS='''<link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">'''
PAL={'light':dict(ink='#222323',acc='#a51c29',mut='#5f5b55',map=dict(ink='#3a3a38',mapBlock='#e2dcd2',mapStreet='#faf8f4',mapPark='#d9d3c8',mapTree='#cbc4b8'),card='rgba(34,35,35,0.15)',sh='0 12px 28px rgba(60,20,20,0.22)'),
     'dark':dict(ink='#efe9df',acc='#ec5a45',mut='#b8b0a5',map=dict(ink='#c9c2b7',mapBlock='#1f1d1c',mapStreet='#3b3835',mapPark='#262422',mapTree='#2e2b28'),card='rgba(239,233,223,0.2)',sh='0 14px 32px rgba(0,0,0,0.5)')}
src=open(P+'gen/r8.py').read(); ms=src.index("MAP='''"); me=src.index("'''",ms+7)+3
MAPSRC=re.sub(r'  <g transform="rotate\(-3 145 130\)">.*?</g>\n','',src[ms:me],flags=re.S); MAPSRC=MAPSRC[MAPSRC.index("'''")+3:-3]
def mapsvg(p,w,h):
    t=re.sub(r'<svg width="[0-9]+" height="[0-9]+" viewBox="[^"]*"',f'<svg width="{w}" height="{h}" viewBox="40 150 440 264"',MAPSRC,count=1)
    for k,v in dict(p['map'],accent=p['acc']).items(): t=t.replace('{'+k+'}',v)
    t=re.sub(r'<g fill="[^"]*" font-family="Schibsted Grotesk, Arial, sans-serif" font-size="12".*?</g>\n?','',t,flags=re.S)
    t=re.sub(r'(<text[^>]*?)font-size="13"([^>]*>ZÁMEK</text>)',r'\1font-size="22"\2',t)
    t=re.sub(r'<path d="M380 372[^>]*></path>\s*','',t)
    t=re.sub(r'<circle cx="(398|446|488)"[^>]*></circle>\s*','',t)
    return t
def column(p,W,top,s=1.0,g=1.0):
    z=lambda v:round(v*s)
    m=lambda v:round(v*s*g)
    return f'''<div style="position:absolute;left:0;top:{top}px;width:{W}px;display:flex;flex-direction:column;align-items:center;text-align:center;color:{p['ink']}">
  <span style="font-size:{z(30)}px;font-weight:600">Nová barberka ve Vlassalonu, Prostějov</span>
  <span style="margin-top:{m(22)}px;font-size:{z(135)}px;font-weight:900;line-height:.94;letter-spacing:-.04em;text-transform:uppercase">Přijď<br>nakrátko.</span>
  <span style="margin-top:{m(40)}px;font-size:{z(62)}px;font-weight:800;letter-spacing:-.02em;line-height:1">Kateřina Šťastná</span>
  <span style="margin-top:{z(10)}px;font-size:{z(40)}px;font-weight:700">Otevírám 1. 12.</span>
  <span style="margin-top:{m(44)}px;font-size:{z(104)}px;font-weight:900;line-height:1;letter-spacing:-.035em;color:{p['acc']}">od 179 Kč</span>
  <span style="margin-top:{z(6)}px;font-size:{z(26)}px;font-weight:500;color:{p['mut']}">celý ceník v salonu</span>
  <span style="margin-top:{m(44)}px;font-size:{z(46)}px;font-weight:800;letter-spacing:-.01em">777 787 147</span>
  <span style="margin-top:{z(4)}px;font-size:{z(32)}px;font-weight:600">@[instagram]</span>
  <span style="margin-top:{m(40)}px;font-size:{z(28)}px;font-weight:700;line-height:1.25">Fanderlíkova 4600/7<br><span style="font-weight:500">3 minuty od zámku</span></span>
  <div style="margin-top:{m(16)}px;width:{z(330)}px;height:{z(198)}px;border-radius:{z(12)}px;overflow:hidden;border:1px solid {p['card']};box-shadow:{p['sh']}">{mapsvg(p,z(330),z(198))}</div>
</div>'''
def page(W,H,bg,p,top,s=1.0,g=1.0):
    return f'''<!doctype html><html lang="cs"><head><meta charset="utf-8">{FONTS}<style>*{{margin:0;padding:0;box-sizing:border-box}}body{{width:{W}px;height:{H}px;overflow:hidden}}</style></head><body>
<div style="position:relative;width:{W}px;height:{H}px;overflow:hidden;font-family:'Schibsted Grotesk',sans-serif">
<img src="file://{P}tools/{bg}" style="position:absolute;left:0;top:0;width:{W}px;height:{H}px">
{column(p,W,top,s,g)}</div></body></html>'''
for k,p in PAL.items():
    open(P+f'render/v3_a3_{k}.html','w').write(page(1123,1587,f'bg_sada_{k}.jpg',p,62))
    open(P+f'render/v3_story_{k}.html','w').write(page(1080,1920,f'bg_story_{k}.jpg',p,262,1.06,1.5))
