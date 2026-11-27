D='/tmp/claude-0/-home-user-Narcis/ba15234f-a731-5aeb-99e4-8712868c2906/scratchpad/mira2/'
FONTS='<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Grenze+Gotisch:wght@600;800&family=Unbounded:wght@400;600;800&family=Archivo+Black&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet">'
IG='@[instagram]'; TEL='777 787 147'
def wrap(W,H,css,body):
    return f'<!doctype html><html lang="cs"><head><meta charset="utf-8">{FONTS}<style>*{{box-sizing:border-box;margin:0;padding:0}}body{{width:{W}px;height:{H}px;overflow:hidden}}{css}</style></head><body>{body}</body></html>'

# ---------- A: flash photo ----------
def A(W,H):
    story=H>1500
    top=300 if story else 76
    photo_top=380 if story else 0
    photo_h=1350 if story else H
    bot=H-(330 if story else 70)
    css=f'''
.p{{position:relative;width:{W}px;height:{H}px;background:#0a0807;overflow:hidden;font-family:'Bricolage Grotesque',sans-serif;color:#fff}}
.ph{{position:absolute;left:0;top:{photo_top}px;width:{W}px;height:{photo_h}px;object-fit:cover}}
.fadeT{{position:absolute;left:0;top:{photo_top}px;width:{W}px;height:260px;background:linear-gradient(#0a0807,rgba(10,8,7,0))}}
.fadeB{{position:absolute;left:0;bottom:0;width:{W}px;height:{620 if story else 560}px;background:linear-gradient(rgba(10,8,7,0),rgba(10,8,7,.92) 62%)}}
h1{{position:absolute;left:68px;top:{top}px;font-weight:800;font-size:{124 if story else 118}px;line-height:.92;letter-spacing:-.035em;font-variation-settings:'opsz' 96}}
.sticker{{position:absolute;right:70px;top:{1180 if story else 760}px;width:250px;height:250px;border-radius:50%;background:#E8322B;transform:rotate(-12deg);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 14px 30px rgba(0,0,0,.45)}}
.sticker b{{font-size:84px;font-weight:800;line-height:.9;letter-spacing:-.04em}}
.sticker span{{font-size:28px;font-weight:700}}
.info{{position:absolute;left:68px;bottom:{H-bot}px}}
.date{{font-size:64px;font-weight:800;letter-spacing:-.02em;line-height:1}}
.who{{margin-top:14px;font-size:34px;font-weight:700}}
.ct{{margin-top:10px;font-size:34px;font-weight:500;display:flex;gap:36px;opacity:.92}}
'''
    body=f'''<div class="p"><img class="ph" src="file://{D}flash.png"><div class="fadeT"></div><div class="fadeB"></div>
<h1>Nová<br>barberka<br>v Prostějově.</h1>
<div class="sticker"><span>střih od</span><b>179 Kč</b></div>
<div class="info"><div class="date">Otevírám 1. 12.</div><div class="who">Kateřina Šťastná, Vlassalon</div><div class="ct"><span>{IG}</span><span>{TEL}</span></div></div></div>'''
    return wrap(W,H,css,body)

# ---------- B: chrome gothic ----------
def B(W,H):
    story=H>1500
    y0=300 if story else 70
    css=f'''
.p{{position:relative;width:{W}px;height:{H}px;background:#000;overflow:hidden;color:#fff;font-family:'Unbounded',sans-serif}}
.glow{{position:absolute;left:50%;top:{y0+420}px;width:900px;height:600px;transform:translate(-50%,-50%);background:radial-gradient(closest-side,rgba(150,170,210,.18),rgba(0,0,0,0))}}
.name{{position:absolute;left:0;top:{y0}px;width:{W}px;text-align:center;font-family:'Grenze Gotisch';font-weight:800;font-size:{124 if story else 116}px;line-height:1}}
.sub{{position:absolute;left:0;top:{y0+150}px;width:{W}px;text-align:center;font-size:30px;font-weight:400;color:#C9CED6}}
.chrome{{position:absolute;left:{(W-(980 if story else 860))//2}px;top:{y0+(200 if story else 175)}px;width:{980 if story else 860}px;height:{980 if story else 860}px;mix-blend-mode:screen}}
.clip{{position:absolute;right:{40 if story else 50}px;top:{y0+(930 if story else 760)}px;height:{660 if story else 600}px;transform:rotate(14deg);filter:drop-shadow(0 30px 40px rgba(0,0,0,.8))}}
.info{{position:absolute;left:70px;top:{y0+(1040 if story else 860)}px}}
.price{{font-size:{50 if story else 46}px;font-weight:800;line-height:1.1}}
.price small{{display:block;font-size:26px;font-weight:400;color:#C9CED6;margin-bottom:6px}}
.where{{margin-top:34px;font-size:26px;color:#C9CED6;line-height:1.4}}
.ct{{margin-top:22px;font-size:30px;font-weight:600;line-height:1.45}}
'''
    body=f'''<div class="p"><div class="glow"></div>
<div class="name">Kateřina Šťastná</div>
<div class="sub">nová barberka v Prostějově otevírá</div>
<img class="chrome" src="file://{D}chrome.png">
<img class="clip" src="file://{D}clipper_rim.png">
<div class="info"><div class="price"><small>pánský střih</small>od 179 Kč</div>
<div class="where">Vlassalon<br>Fanderlíkova 7</div>
<div class="ct">{IG}<br>{TEL}</div></div></div>'''
    return wrap(W,H,css,body)

# ---------- C: zine collage ----------
def C(W,H):
    story=H>1500
    y0=290 if story else 64
    pol_y=y0+(330 if story else 300)
    css=f'''
.p{{position:relative;width:{W}px;height:{H}px;background:#EFEBE2;overflow:hidden;color:#111}}
.grain{{position:absolute;inset:0;opacity:.35;mix-blend-mode:multiply}}
h1{{position:absolute;left:62px;top:{y0}px;font-family:'Archivo Black';font-size:{116 if story else 108}px;line-height:.94;letter-spacing:-.03em}}
.pol{{position:absolute;background:#fbfaf6;padding:22px 22px 70px;box-shadow:0 12px 26px rgba(0,0,0,.22)}}
.pol img{{display:block;width:100%;height:100%;object-fit:cover;filter:contrast(1.05)}}
.p1{{left:60px;top:{pol_y}px;width:{470 if story else 420}px;height:{540 if story else 470}px;transform:rotate(-6deg)}}
.p2{{left:{470 if story else 450}px;top:{pol_y+60}px;width:{520 if story else 470}px;height:{600 if story else 520}px;transform:rotate(5deg)}}
.tape{{position:absolute;width:190px;height:52px;background:rgba(235,225,200,.75);box-shadow:0 1px 2px rgba(0,0,0,.08)}}
.date{{position:absolute;left:96px;top:{pol_y+(700 if story else 610)}px;font-family:'Archivo Black';font-size:66px;letter-spacing:-.02em}}
.ring{{position:absolute;left:44px;top:{pol_y+(678 if story else 588)}px;width:470px;height:120px;overflow:visible}}
.sticker{{position:absolute;right:66px;top:{pol_y+(690 if story else 600)}px;width:240px;height:240px;border-radius:50%;background:#E8322B;color:#fff;transform:rotate(10deg);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Archivo Black';box-shadow:0 8px 16px rgba(0,0,0,.25)}}
.sticker b{{font-size:60px;line-height:.9;font-weight:400;white-space:nowrap}}
.sticker span{{font-family:'Courier Prime';font-weight:700;font-size:26px}}
.type{{position:absolute;left:96px;top:{pol_y+(810 if story else 715)}px;font-family:'Courier Prime';font-size:31px;line-height:1.4;font-weight:700}}
'''
    ring='<svg class="ring" viewBox="0 0 470 120"><path d="M40 74 C 22 24, 190 4, 320 10 C 440 16, 480 52, 450 88 C 410 124, 150 120, 56 104 C 14 96, 8 62, 64 36" fill="none" stroke="#E8322B" stroke-width="7" stroke-linecap="round"/></svg>'
    body=f'''<div class="p"><svg class="grain" width="{W}" height="{H}"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>
<h1>Nová barberka<br>v Prostějově.</h1>
<div class="pol p1"><img src="file://{D}chair_bw.png"></div>
<div class="pol p2"><img src="file://{D}flash.png"></div>
<div class="tape" style="left:230px;top:{pol_y-28}px;transform:rotate(-8deg)"></div>
<div class="tape" style="left:{720 if story else 680}px;top:{pol_y+30}px;transform:rotate(7deg)"></div>
{ring}<div class="date">Od 1. 12.</div>
<div class="sticker"><span>střih od</span><b>179 Kč</b></div>
<div class="type">Kateřina Šťastná<br>Vlassalon, Fanderlíkova 7<br>{IG}<br>{TEL}</div></div>'''
    return wrap(W,H,css,body)

for k,f in [('A',A),('B',B),('C',C)]:
    open(D+f'{k}_feed.html','w').write(f(1080,1350)); open(D+f'{k}_story.html','w').write(f(1080,1920))
