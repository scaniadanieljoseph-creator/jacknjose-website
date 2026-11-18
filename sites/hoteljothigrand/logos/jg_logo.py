"""Hotel Jothi Grand logo: the crown-over-JG mark redrawn as clean vectors, in colour, with lettering converted to outlines.
Run: python3 jg_logo.py <fonts dir with Cinzel-wght-600.ttf>   (writes SVG files into ./final)"""
import os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'final'); os.makedirs(OUT, exist_ok=True)
FONTS = sys.argv[1] if len(sys.argv) > 1 else '.'
SERIF = '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'   # Times-style letters, like the original JG
CINZEL = os.path.join(FONTS, 'Cinzel-wght-600.ttf')                       # classic capitals for the name

def text_path(font_file, text, size, tracking=0.0, kern=None):
    """Outline of `text` at cap-height `size` units: returns (svg path d, width, height). Baseline at y = height."""
    f = TTFont(font_file); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm
    cap = getattr(f['OS/2'], 'sCapHeight', 0) or upm * 0.7; sc = size / cap
    pen = SVGPathPen(gs); x = 0.0; kern = kern or {}
    for i, ch in enumerate(text):
        g = cmap[ord(ch)]
        tp = TransformPen(pen, (sc, 0, 0, -sc, x, size)); gs[g].draw(tp)
        x += gs[g].width * sc + tracking * size + kern.get(i, 0) * size
    return pen.getCommands(), x - tracking * size, size

def bbox(font_file, text):
    f = TTFont(font_file); gs = f.getGlyphSet(); cmap = f.getBestCmap(); b = BoundsPen(gs); gs[cmap[ord(text)]].draw(b); return b.bounds

GOLD = '<linearGradient id="gold" gradientUnits="userSpaceOnUse" x1="40" y1="20" x2="760" y2="340"><stop offset="0" stop-color="#f7dc98"/><stop offset=".45" stop-color="#d9a648"/><stop offset=".75" stop-color="#b8822e"/><stop offset="1" stop-color="#e9c578"/></linearGradient>'

def crown(fill):
    """Crown on an 800-wide box: three ball-tipped points, curved side horns and a tapered base line at y = 330."""
    horn = 'M150 98C192 142 246 206 249 250C251 291 182 322 40 332C160 312 213 288 211 252C209 214 176 151 136 105Z'
    return f'''<g fill="{fill}">
      <path d="{horn}"/><path d="{horn}" transform="translate(800 0) scale(-1 1)"/>
      <path d="M229 238L330 292L400 84L470 292L571 238" fill="none" stroke="{fill}" stroke-width="30" stroke-linejoin="miter" stroke-miterlimit="12" stroke-linecap="round"/>
      <ellipse cx="141" cy="80" rx="23" ry="17"/><ellipse cx="659" cy="80" rx="23" ry="17"/><ellipse cx="400" cy="38" rx="26" ry="20"/>
      <path d="M40 329L760 329L742 339L58 339Z"/></g>'''

def letters(fill):
    """J and G under the crown, J's top bar resting on the base line."""
    d, w, h = text_path(SERIF, 'JG', 300, tracking=0.10)
    x0 = 400 - w / 2
    return f'<path d="{d}" fill="{fill}" transform="translate({x0:.1f} 348)"/>'

def mark(crown_fill, letter_fill):
    return crown(crown_fill) + letters(letter_fill)

def name_block(text, size, fill, tracking, cx, y):
    d, w, h = text_path(CINZEL, text, size, tracking=tracking)
    return f'<path d="{d}" fill="{fill}" transform="translate({cx - w / 2:.1f} {y - h:.1f})"/>', w

def svg(w, h, body, bg=None):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><defs>{GOLD}</defs>{f"<rect width=\"{w}\" height=\"{h}\" fill=\"{bg}\"/>" if bg else ""}{body}</svg>'

MAROON, IVORY, MIDNIGHT = '#6b1a2e', '#fbf5ea', '#0d1424'
variants = {
    # mark only (crown + JG), 800 x 680
    'jg-mark-colour': svg(800, 680, mark('url(#gold)', MAROON)),
    'jg-mark-on-dark': svg(800, 680, mark('url(#gold)', IVORY), MIDNIGHT),
    'jg-mark-black': svg(800, 680, mark('#111111', '#111111')),
}
# stacked logo: mark, then the name and HOTEL
for key, (crf, lf, nf, sub, bg) in {'colour': ('url(#gold)', MAROON, MAROON, '#b8822e', None), 'on-dark': ('url(#gold)', IVORY, IVORY, '#e2b45f', MIDNIGHT), 'black': ('#111111', '#111111', '#111111', '#111111', None)}.items():
    n1, w1 = name_block('JOTHI GRAND', 74, nf, 0.16, 500, 860)
    n2, w2 = name_block('HOTEL', 30, sub, 0.9, 500, 930)
    lines = f'<path d="M{500 - w1 / 2:.0f} 900H{500 - w2 / 2 - 34:.0f}M{500 + w2 / 2 + 22:.0f} 900H{500 + w1 / 2:.0f}" stroke="{sub}" stroke-width="2.5"/>'
    variants[f'jothi-grand-logo-stacked-{key}'] = svg(1000, 990, f'<g transform="translate(100 40)">{mark(crf, lf)}</g>{n1}{lines}{n2}', bg)
# horizontal logo: mark at left, name at right (for letterheads, bills and the website header)
for key, (crf, lf, nf, sub, bg) in {'colour': ('url(#gold)', MAROON, MAROON, '#b8822e', None), 'on-dark': ('url(#gold)', IVORY, IVORY, '#e2b45f', MIDNIGHT), 'black': ('#111111', '#111111', '#111111', '#111111', None)}.items():
    d1, w1, _ = text_path(CINZEL, 'HOTEL', 34, tracking=0.85); d2, w2, _ = text_path(CINZEL, 'JOTHI GRAND', 96, tracking=0.12)
    W = 40 + 300 + 50 + max(w1, w2) + 40
    body = f'<g transform="translate(40 25) scale(.375)">{mark(crf, lf)}</g><path d="M372 52V246" stroke="{sub}" stroke-width="2.5"/>' \
           f'<path d="{d1}" fill="{sub}" transform="translate(400 70)"/><path d="{d2}" fill="{nf}" transform="translate(396 132)"/>' \
           ''
    variants[f'jothi-grand-logo-horizontal-{key}'] = svg(int(W), 290, body, bg)
# transparent versions for dark backgrounds (website header and footer)
variants['jg-mark-light'] = svg(800, 680, mark('url(#gold)', IVORY))
d1, w1, _ = text_path(CINZEL, 'HOTEL', 34, tracking=0.85); d2, w2, _ = text_path(CINZEL, 'JOTHI GRAND', 96, tracking=0.12)
variants['jothi-grand-logo-horizontal-light'] = svg(int(40 + 300 + 50 + max(w1, w2) + 40), 290, f'<g transform="translate(40 25) scale(.375)">{mark("url(#gold)", IVORY)}</g><path d="M372 52V246" stroke="#e2b45f" stroke-width="2.5"/><path d="{d1}" fill="#e2b45f" transform="translate(400 70)"/><path d="{d2}" fill="{IVORY}" transform="translate(396 132)"/>')
# square icon for WhatsApp, Google and social media
variants['jg-icon'] = svg(1024, 1024, f'<rect width="1024" height="1024" rx="220" fill="{MIDNIGHT}"/><g transform="translate(152 176) scale(.9)">{mark("url(#gold)", IVORY)}</g>')

for name, s in variants.items():
    open(os.path.join(OUT, name + '.svg'), 'w').write(s)
print('wrote', len(variants), 'svgs to', OUT)
