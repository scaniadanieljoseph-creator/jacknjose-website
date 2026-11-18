"""Website logo files: the crown-over-JG mark (from jg_logo.py) in the pink and blue website colours.
Run: python3 jg_site_crown.py <fonts dir with Cinzel-wght-600.ttf>   (writes into ../img and ./final)"""
import os, sys
sys.argv = sys.argv[:2]
import jg_logo as L

HERE = os.path.dirname(os.path.abspath(__file__)); IMG = os.path.join(HERE, '..', 'img')
PINK = '#e43d82'; NAVY = '#173a8a'; HOT = '#ff6aa6'
DEFS = ('<defs><linearGradient id="pk" gradientUnits="userSpaceOnUse" x1="40" y1="20" x2="760" y2="340">'
        '<stop offset="0" stop-color="#ff8fbf"/><stop offset=".45" stop-color="#e43d82"/><stop offset=".8" stop-color="#c22468"/><stop offset="1" stop-color="#ff7fb3"/></linearGradient>'
        '<linearGradient id="bl" gradientUnits="userSpaceOnUse" x1="0" y1="340" x2="0" y2="680">'
        '<stop offset="0" stop-color="#2d6be4"/><stop offset="1" stop-color="#14306b"/></linearGradient></defs>')

def svg(w, h, body, bg=None):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{DEFS}{f"<rect width=\"{w}\" height=\"{h}\" rx=\"{w * .22:.0f}\" fill=\"{bg}\"/>" if bg else ""}{body}</svg>'

def horizontal(crown, jg, sub, name):
    d1, w1, _ = L.text_path(L.CINZEL, 'HOTEL', 34, tracking=0.85); d2, w2, _ = L.text_path(L.CINZEL, 'JOTHI GRAND', 96, tracking=0.12)
    W = int(40 + 300 + 50 + max(w1, w2) + 40)
    return svg(W, 290, f'<g transform="translate(40 25) scale(.375)">{L.mark(crown, jg)}</g><path d="M372 52V246" stroke="{sub}" stroke-width="2.5"/>'
                       f'<path d="{d1}" fill="{sub}" transform="translate(400 70)"/><path d="{d2}" fill="{name}" transform="translate(396 132)"/>')

files = {
    'logo-mark.svg': svg(800, 680, L.mark('url(#pk)', 'url(#bl)')),                       # header, on white
    'logo-horizontal.svg': horizontal('url(#pk)', 'url(#bl)', PINK, NAVY),               # on white
    'logo-horizontal-light.svg': horizontal('url(#pk)', '#ffffff', HOT, '#ffffff'),      # footer, on blue
    'icon.svg': svg(1024, 1024, f'<g transform="translate(152 176) scale(.9)">{L.mark("url(#pk)", "url(#bl)")}</g>', '#ffffff'),
}
for n, s in files.items():
    open(os.path.join(IMG, n), 'w').write(s)
    open(os.path.join(HERE, 'final', 'site-crown-' + n), 'w').write(s)
print('wrote', list(files))
