import sys
def tape(length, h, labels):
    # yellow tailor's tape: mm ticks, cm numbers, two printed labels with red marks
    ticks=[]; px_cm=40
    n=int(length/ (px_cm/10))
    for i in range(n+1):
        x=i*px_cm/10
        if i%10==0: L=h*0.30; w=2.4
        elif i%5==0: L=h*0.2; w=1.6
        else: L=h*0.12; w=1.1
        ticks.append(f'<line x1="{x:.1f}" y1="0" x2="{x:.1f}" y2="{L:.1f}" stroke="#1C2433" stroke-width="{w}"/>')
        ticks.append(f'<line x1="{x:.1f}" y1="{h}" x2="{x:.1f}" y2="{h-L:.1f}" stroke="#1C2433" stroke-width="{w}"/>')
        if i%10==0 and i>0:
            cm=i//10+20
            ticks.append(f'<text x="{x-3:.1f}" y="{h*0.30+20:.1f}" text-anchor="end" font-family="IBM Plex Sans Condensed" font-weight="600" font-size="17" fill="#1C2433">{cm}</text>')
    lab=''
    for (x,text) in labels:
        lab+=f'''<rect x="{x-18}" y="{h*0.34}" width="{len(text)*27+36}" height="{h*0.46}" fill="#E9C440"/>
<line x1="{x-10}" y1="2" x2="{x-10}" y2="{h-2}" stroke="#B8322A" stroke-width="5"/>
<text x="{x+6}" y="{h*0.70:.1f}" font-family="Big Shoulders Display" font-weight="800" font-size="{h*0.40:.0f}" fill="#1C2433">{text}</text>'''
    return f'''<svg width="{length}" height="{h}" viewBox="0 0 {length} {h}" xmlns="http://www.w3.org/2000/svg">
<rect width="{length}" height="{h}" fill="#E9C440"/>
<rect width="{length}" height="{h}" fill="url(#sheen)"/>
<defs><linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient></defs>
{''.join(ticks)}{lab}</svg>'''

def page(W,H,cfg):
    t=tape(1700,cfg['th'],[(cfg['l1x'],'Otevírám 1. 12.'),(cfg['l2x'],'Střih od 179 Kč')])
    return f'''<!doctype html><html lang="cs"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=IBM+Plex+Sans+Condensed:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{{--navy:#1C2433;--chalk:#EDE8DC;--tape:#E9C440;--thread:#B8322A;}}
*{{box-sizing:border-box;margin:0}}
body{{width:{W}px;height:{H}px;overflow:hidden;background:var(--navy)}}
.poster{{position:relative;width:{W}px;height:{H}px;overflow:hidden;color:var(--chalk);font-family:'IBM Plex Sans Condensed',sans-serif;
 background:
  repeating-linear-gradient(45deg, rgba(255,255,255,.035) 0 2px, transparent 2px 7px),
  repeating-linear-gradient(-45deg, rgba(0,0,0,.10) 0 1px, transparent 1px 9px),
  radial-gradient(120% 80% at 30% 20%, #26314A 0%, #1C2433 55%, #151B27 100%);}}
.grain{{position:absolute;inset:0;opacity:.18;mix-blend-mode:overlay}}
h1{{position:absolute;white-space:nowrap;left:{cfg['hx']}px;top:{cfg['hy']}px;font-family:'Big Shoulders Display';font-weight:900;font-size:{cfg['hs']}px;line-height:.86;letter-spacing:-.01em;color:var(--chalk)}}
.sub{{position:absolute;left:{cfg['hx']+8}px;top:{cfg['sy']}px;font-size:{cfg['ss']}px;font-weight:500;line-height:1.15;color:var(--chalk)}}
.tape{{position:absolute;left:{cfg['tx']}px;top:{cfg['ty']}px;transform:rotate({cfg['ta']}deg);transform-origin:0 0;filter:drop-shadow(0 18px 22px rgba(0,0,0,.45))}}
.who{{position:absolute;left:{cfg['hx']+8}px;top:{cfg['wy']}px}}
.name{{font-family:'Big Shoulders Display';font-weight:800;font-size:{cfg['ns']}px;line-height:1}}
.place{{margin-top:10px;font-size:{cfg['ps']}px;font-weight:500;opacity:.9}}
.contact{{margin-top:{cfg['cg']}px;display:flex;gap:44px;font-size:{cfg['cs']}px;font-weight:700}}
.contact span:first-child{{color:var(--tape)}}
</style></head><body><div class="poster">
<svg class="grain" width="{W}" height="{H}"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>
<h1>Střih<br>na míru.</h1>
<p class="sub">Nová barberka<br>v Prostějově.</p>
<div class="tape">{t}</div>
<div class="who">
  <div class="name">Kateřina Šťastná</div>
  <div class="place">Vlassalon, Fanderlíkova 4600/7</div>
  <div class="contact"><span>@[instagram]</span><span>777 787 147</span></div>
</div>
</div></body></html>'''
feed=dict(hx=72,hy=70,hs=300,sy=598,ss=62,tx=-120,ty=975,ta=-17,th=150,l1x=330,l2x=860,wy=1068,ns=72,ps=32,cg=26,cs=40)
story=dict(hx=72,hy=290,hs=300,sy=828,ss=66,tx=-120,ty=1125,ta=-13,th=160,l1x=300,l2x=770,wy=1355,ns=76,ps=34,cg=28,cs=42)
open('feed.html','w').write(page(1080,1350,feed)); open('story.html','w').write(page(1080,1920,story))
