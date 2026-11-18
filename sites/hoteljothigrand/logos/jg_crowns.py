"""Three solid-crown options for the Hotel Jothi Grand mark (crown over JG). Writes crown-option-*.svg into ./final."""
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'final')
SERIF = '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'
MAROON = '#6b1a2e'

def text_path(font_file, text, size, tracking=0.0):
    f = TTFont(font_file); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm
    cap = getattr(f['OS/2'], 'sCapHeight', 0) or upm * 0.7; sc = size / cap; pen = SVGPathPen(gs); x = 0.0
    for ch in text:
        g = cmap[ord(ch)]; gs[g].draw(TransformPen(pen, (sc, 0, 0, -sc, x, size))); x += gs[g].width * sc + tracking * size
    return pen.getCommands(), x - tracking * size

DEFS = '''<defs>
<linearGradient id="gold" gradientUnits="userSpaceOnUse" x1="80" y1="30" x2="720" y2="350"><stop offset="0" stop-color="#fbe3a6"/><stop offset=".4" stop-color="#e0ad4f"/><stop offset=".7" stop-color="#b9822c"/><stop offset="1" stop-color="#ecc77a"/></linearGradient>
<linearGradient id="band" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9bd63"/><stop offset=".5" stop-color="#b37a26"/><stop offset="1" stop-color="#8f5e19"/></linearGradient>
<radialGradient id="ruby" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ff8a9a"/><stop offset=".45" stop-color="#b8173a"/><stop offset="1" stop-color="#5c0618"/></radialGradient>
<radialGradient id="pearl" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f3e2bd"/><stop offset="1" stop-color="#c9a15a"/></radialGradient></defs>'''

def jg(fill=MAROON, top=352, size=290):
    d, w = text_path(SERIF, 'JG', size, tracking=0.10)
    return f'<path d="{d}" fill="{fill}" transform="translate({400 - w / 2:.1f} {top})"/>'

# A · Your crown, made solid: the same three ball-tipped points and outward-curving side horns, filled in, on a jewelled band
A = '''<path d="M118 292C118 238 92 180 132 104L262 214L400 66L538 214L668 104C708 180 682 238 682 292Z" fill="url(#gold)"/>
<path d="M150 270C150 236 140 196 150 150L262 244L400 110L538 244L650 150C660 196 650 236 650 270Z" fill="#000" opacity=".10"/>
<path d="M132 104L262 214L400 66L538 214L668 104" fill="none" stroke="#fff3cf" stroke-width="3" opacity=".7" stroke-linejoin="round"/>
<circle cx="132" cy="88" r="20" fill="url(#pearl)"/><circle cx="668" cy="88" r="20" fill="url(#pearl)"/><circle cx="400" cy="46" r="24" fill="url(#pearl)"/>
<path d="M60 336C150 300 650 300 740 336C650 318 150 318 60 336Z" fill="url(#gold)"/>
<rect x="104" y="288" width="592" height="40" rx="10" fill="url(#band)"/><rect x="104" y="292" width="592" height="5" rx="2" fill="#fff3cf" opacity=".5"/>
<ellipse cx="400" cy="308" rx="22" ry="14" fill="url(#ruby)"/><ellipse cx="250" cy="308" rx="14" ry="10" fill="url(#ruby)"/><ellipse cx="550" cy="308" rx="14" ry="10" fill="url(#ruby)"/>
<circle cx="170" cy="308" r="6" fill="url(#pearl)"/><circle cx="630" cy="308" r="6" fill="url(#pearl)"/><circle cx="325" cy="308" r="5" fill="url(#pearl)"/><circle cx="475" cy="308" r="5" fill="url(#pearl)"/>
<ellipse cx="400" cy="190" rx="16" ry="20" fill="url(#ruby)"/><circle cx="262" cy="250" r="9" fill="url(#ruby)"/><circle cx="538" cy="250" r="9" fill="url(#ruby)"/>'''

# B · Royal crown: five points, each with a pearl, arches between them, rich jewelled band
pts = [(150, 120), (275, 80), (400, 50), (525, 80), (650, 120)]
outline = 'M120 292L' + 'L'.join(f'{x} {y}L{(x + nx) / 2:.0f} {max(y, ny) + 95:.0f}' for (x, y), (nx, ny) in zip(pts, pts[1:])) + f'L{pts[-1][0]} {pts[-1][1]}L680 292Z'
outline = outline.replace('M120 292L', f'M120 292L{pts[0][0]} {pts[0][1]}L', 1).replace(f'L{pts[0][0]} {pts[0][1]}L{pts[0][0]} {pts[0][1]}', f'L{pts[0][0]} {pts[0][1]}', 1)
B = f'''<path d="{outline}" fill="url(#gold)"/>
<path d="M150 270Q400 200 650 270" fill="none" stroke="#000" stroke-width="22" opacity=".08"/>
{''.join(f'<circle cx="{x}" cy="{y - 18}" r="{18 if x != 400 else 23}" fill="url(#pearl)"/>' for x, y in pts)}
{''.join(f'<path d="M{x} {y + 30}l11 18-11 18-11-18z" fill="url(#ruby)"/>' for x, y in pts)}
<rect x="100" y="288" width="600" height="44" rx="12" fill="url(#band)"/><rect x="100" y="292" width="600" height="5" rx="2" fill="#fff3cf" opacity=".5"/>
{''.join(f'<ellipse cx="{x}" cy="310" rx="{20 if x == 400 else 13}" ry="{13 if x == 400 else 9}" fill="url(#ruby)"/>' for x in (190, 295, 400, 505, 610))}
{''.join(f'<circle cx="{x}" cy="310" r="5" fill="url(#pearl)"/>' for x in (140, 242, 348, 452, 558, 660))}'''

# C · Crown emblem: a crown whose band carries "JG", the name sitting inside the crown itself
C_crown = '''<path d="M150 300C150 220 120 160 160 96L282 196L400 52L518 196L640 96C680 160 650 220 650 300Z" fill="url(#gold)"/>
<circle cx="160" cy="80" r="20" fill="url(#pearl)"/><circle cx="640" cy="80" r="20" fill="url(#pearl)"/><circle cx="400" cy="32" r="24" fill="url(#pearl)"/>
<ellipse cx="400" cy="180" rx="16" ry="20" fill="url(#ruby)"/><circle cx="282" cy="236" r="10" fill="url(#ruby)"/><circle cx="518" cy="236" r="10" fill="url(#ruby)"/>
<path d="M120 300H680V520C680 560 640 600 600 600H200C160 600 120 560 120 520Z" fill="url(#band)"/>
<path d="M136 316H664V514C664 548 632 584 598 584H202C168 584 136 548 136 514Z" fill="#5a1426"/>
<path d="M136 316H664" stroke="#fff3cf" stroke-width="3" opacity=".5"/>'''

def page(body, h=680):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 {h}" width="800" height="{h}">{DEFS}{body}</svg>'

opts = {
    'crown-option-a': page(A + jg()),
    'crown-option-b': page(B + jg()),
    'crown-option-c': page(C_crown + jg('url(#gold)', 352, 210).replace('translate(', 'translate(', 1), 640),
}
for k, v in opts.items():
    open(os.path.join(OUT, k + '.svg'), 'w').write(v)
print('wrote', list(opts))
