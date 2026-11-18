"""Hotel Jothi Grand: the existing crown-over-JG design with an elephant, in pink, blue and orange. Five samples.
Run: python3 jg_elephant.py <fonts dir with Cinzel-wght-600.ttf>  -> final/elephant-*.svg"""
import os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'final'); os.makedirs(OUT, exist_ok=True)
FONTS = sys.argv[1] if len(sys.argv) > 1 else '.'
SERIF = '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'; CINZEL = os.path.join(FONTS, 'Cinzel-wght-600.ttf')
PINK, PINK_L, BLUE, BLUE_D, ORANGE, ORANGE_L, CREAM = '#e4407f', '#f7a8c8', '#1d6fd6', '#0e3a78', '#f28a1e', '#ffc06b', '#fff7ec'

def text_path(font_file, text, size, tracking=0.0):
    f = TTFont(font_file); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm
    cap = getattr(f['OS/2'], 'sCapHeight', 0) or upm * 0.7; sc = size / cap; pen = SVGPathPen(gs); x = 0.0
    for ch in text:
        g = cmap[ord(ch)]; gs[g].draw(TransformPen(pen, (sc, 0, 0, -sc, x, size))); x += gs[g].width * sc + tracking * size
    return pen.getCommands(), x - tracking * size

def word(font, text, size, fill, cx, top, tracking=0.0):
    d, w = text_path(font, text, size, tracking)
    return f'<path d="{d}" fill="{fill}" transform="translate({cx - w / 2:.1f} {top})"/>'

DEFS = f'''<defs>
<linearGradient id="og" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{ORANGE_L}"/><stop offset=".55" stop-color="{ORANGE}"/><stop offset="1" stop-color="#d4610d"/></linearGradient>
<linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7fb0"/><stop offset="1" stop-color="{PINK}"/></linearGradient>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3d8ff0"/><stop offset="1" stop-color="{BLUE_D}"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe3a6"/><stop offset=".5" stop-color="#e0ad4f"/><stop offset="1" stop-color="#b9822c"/></linearGradient></defs>'''

def crown(fill='url(#og)', ball=PINK, middle=True):
    """The existing crown: three ball-tipped points and outward-curving side horns, on a base line. 800-wide box, base at y=330."""
    horn = 'M150 98C192 142 246 206 249 250C251 291 182 322 40 332C160 312 213 288 211 252C209 214 176 151 136 105Z'
    return f'''<g><path d="{horn}" fill="{fill}"/><path d="{horn}" transform="translate(800 0) scale(-1 1)" fill="{fill}"/>
      <path d="{'M229 238L330 292L400 84L470 292L571 238' if middle else 'M229 238L330 292L380 270M420 270L470 292L571 238'}" fill="none" stroke="{fill}" stroke-width="30" stroke-linejoin="miter" stroke-miterlimit="12" stroke-linecap="round"/>
      <ellipse cx="141" cy="80" rx="23" ry="17" fill="{ball}"/><ellipse cx="659" cy="80" rx="23" ry="17" fill="{ball}"/>{f'<ellipse cx="400" cy="38" rx="26" ry="20" fill="{ball}"/>' if middle else ''}
      <path d="M40 329L760 329L742 339L58 339Z" fill="{fill}"/></g>'''

def elephant_front(body='url(#bg)', ear='url(#pg)', orn='url(#og)', tusk=CREAM):
    """Front-facing temple elephant head in a 400 x 400 box: big ears, curled trunk, tusks and a forehead ornament (nettipattam)."""
    earL = 'M140 120C70 70 8 120 22 200C34 262 92 286 136 262C150 232 152 170 140 120Z'
    return f'''<g>
      <path d="{earL}" fill="{ear}"/><path d="{earL}" transform="translate(400 0) scale(-1 1)" fill="{ear}"/>
      <path d="M58 156C60 214 92 250 130 248" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="8" stroke-linecap="round"/>
      <path d="M342 156C340 214 308 250 270 248" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="8" stroke-linecap="round"/>
      <path d="M172 246C160 282 138 302 108 308C140 316 170 298 184 266Z" fill="{tusk}" stroke="#c9a46a" stroke-width="3"/><path d="M228 246C240 282 262 302 292 308C260 316 230 298 216 266Z" fill="{tusk}" stroke="#c9a46a" stroke-width="3"/>
      <path d="M200 70C262 70 292 112 288 162C285 205 262 234 244 254C232 266 226 274 224 262L176 262C174 274 168 266 156 254C138 234 115 205 112 162C108 112 138 70 200 70Z" fill="{body}"/>
      <path d="M174 252C177 300 181 330 189 352C197 374 222 384 240 373C255 364 256 343 244 337C233 332 224 343 231 352C223 355 214 348 212 333C208 310 219 288 226 252Z" fill="{body}"/>
      <path d="M186 292h28M188 312h24M192 330h18" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"/>
      <path d="M200 84L244 108L238 168L200 214L162 168L156 108Z" fill="{orn}"/><path d="M200 98L230 114L226 162L200 194L174 162L170 114Z" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3"/>
      {''.join(f'<circle cx="{x}" cy="{y}" r="6" fill="{PINK}"/>' for x, y in [(200, 124), (186, 146), (214, 146), (200, 168)])}
      <circle cx="200" cy="216" r="9" fill="{PINK}"/>
      <ellipse cx="160" cy="196" rx="9" ry="11" fill="#0b1630"/><ellipse cx="240" cy="196" rx="9" ry="11" fill="#0b1630"/><circle cx="163" cy="192" r="3" fill="#fff"/><circle cx="243" cy="192" r="3" fill="#fff"/>
      </g>'''

def elephant_side(body='url(#bg)', ear='url(#pg)', cloth='url(#og)', tusk=CREAM, flip=False):
    """Side view, trunk raised in greeting, with a decorated saddle cloth. 400 x 320 box, facing right (flip=True faces left)."""
    g = f'''<path d="M70 150C62 100 110 62 190 64C220 50 270 50 300 76C326 98 330 126 336 140C344 150 350 136 348 116C346 94 336 80 344 62C352 46 384 48 384 70C384 86 374 98 376 120C378 160 360 182 330 186L322 196C320 212 318 236 318 262L290 262L286 214C270 220 250 224 230 224L226 262L198 262L196 222C176 224 156 222 140 214L136 262L108 262L106 210C94 206 86 196 82 182C74 190 62 204 54 206C52 196 66 180 72 168Z" fill="{body}"/>
      <path d="M262 92C232 96 222 150 248 176C266 186 286 172 288 150C290 122 282 98 262 92Z" fill="{ear}"/>
      <path d="M118 96C150 74 210 72 238 86L232 176C200 190 152 190 120 176C108 150 106 116 118 96Z" fill="{cloth}"/>
      <path d="M124 170C156 182 200 182 230 170" fill="none" stroke="{PINK}" stroke-width="8"/>{''.join(f'<circle cx="{x}" cy="186" r="5" fill="{PINK}"/>' for x in (138, 160, 182, 204, 224))}
      <path d="M150 104h60M150 124h60M150 144h60" stroke="#fff" stroke-opacity=".55" stroke-width="3"/>
      <circle cx="306" cy="112" r="6" fill="#0b1630"/><path d="M310 168C324 176 342 178 356 172C344 186 324 188 306 180Z" fill="{tusk}" stroke="#c9a46a" stroke-width="2.5"/>
      <path d="M296 72L312 54L320 80Z" fill="{cloth}"/>'''
    return f'<g transform="translate(400 0) scale(-1 1)">{g}</g>' if flip else f'<g>{g}</g>'

def svg(w, h, body, bg=None, rx=0):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{DEFS}{f"<rect width=\"{w}\" height=\"{h}\" rx=\"{rx}\" fill=\"{bg}\"/>" if bg else ""}{body}</svg>'

name = lambda cx, top, col='#0e3a78', sub=PINK: word(CINZEL, 'JOTHI GRAND', 64, col, cx, top, .14) + word(CINZEL, 'HOTEL', 26, sub, cx, top + 86, .9)
JG = lambda fill, cx, top, size=230: word(SERIF, 'JG', size, fill, cx, top, .1)

samples = {
    # 1 · Crown on the elephant: the elephant wears the existing crown, JG below
    'elephant-1-crowned-elephant': svg(800, 1060, f'<g transform="translate(250 30) scale(.375)">{crown()}</g><g transform="translate(200 150)">{elephant_front()}</g>{JG("url(#bg)", 400, 560)}{name(400, 870)}', CREAM),
    # 2 · Royal pair: two elephants raising their trunks towards the crown, JG under the crown
    'elephant-2-royal-pair': svg(1200, 760, f'<g transform="translate(400 18) scale(.5)">{crown("url(#og)", PINK)}</g><g transform="translate(36 200) scale(.8)">{elephant_side(flip=False)}</g><g transform="translate(844 200) scale(.8)">{elephant_side(flip=True)}</g>{JG("url(#pg)", 600, 210, 220)}{name(600, 560)}', CREAM),
    # 3 · Round seal: blue disc, crown and elephant inside, the name around the ring
    'elephant-3-seal': svg(900, 900, f'''<circle cx="450" cy="450" r="430" fill="url(#bg)"/><circle cx="450" cy="450" r="392" fill="none" stroke="{ORANGE}" stroke-width="10"/><circle cx="450" cy="450" r="300" fill="{CREAM}"/>
      <circle cx="450" cy="450" r="300" fill="none" stroke="{PINK}" stroke-width="12"/>
      <path id="ringT" d="M450 450m-344 0a344 344 0 1 1 688 0" fill="none"/><path id="ringB" d="M450 450m-344 0a344 344 0 1 0 688 0" fill="none"/>
      <text font-family="Cinzel, Georgia, serif" font-weight="700" font-size="54" letter-spacing="14" fill="{CREAM}" text-anchor="middle"><textPath href="#ringT" startOffset="50%">JOTHI GRAND</textPath></text>
      <text font-family="Cinzel, Georgia, serif" font-weight="700" font-size="34" letter-spacing="16" fill="{ORANGE_L}" text-anchor="middle" dy="30"><textPath href="#ringB" startOffset="50%">HOTEL · COIMBATORE</textPath></text>
      <g transform="translate(330 160) scale(.3)">{crown()}</g><g transform="translate(285 255) scale(.82)">{elephant_front()}</g><text x="450" y="660" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="0">.</text>{JG("url(#pg)", 450, 600, 110)}'''),
    # 4 · Horizontal: crown + JG with a small elephant, name at the right (letterhead, website)
    'elephant-4-horizontal': (lambda mk, w1, w2: svg(int(520 + max(w1, w2) + 60), 440, f'<g transform="translate(30 20) scale(.55)">{mk}</g><path d="M490 70V370" stroke="{ORANGE}" stroke-width="4"/>'
        f'{word(CINZEL, "HOTEL", 34, PINK, 520 + w1 / 2, 110, .85)}{word(CINZEL, "JOTHI GRAND", 92, BLUE_D, 520 + w2 / 2, 168, .1)}<path d="M524 298H{520 + w2:.0f}" stroke="url(#og)" stroke-width="6"/>'
        f'{word(CINZEL, "ROOMS · RESTAURANT · FREEZE BAR", 24, PINK, 520 + w2 / 2, 322, .25)}', CREAM))(
        crown("url(#og)", PINK, middle=False) + f'<g transform="translate(250 30) scale(.75)">{elephant_front()}</g>' + JG("url(#bg)", 400, 380, 270),
        text_path(CINZEL, "HOTEL", 34, .85)[1], text_path(CINZEL, "JOTHI GRAND", 92, .1)[1]),
    # 5 · Existing design, re-coloured: the same crown and JG, the crown's middle point replaced by an elephant raising its trunk
    'elephant-5-classic-recoloured': svg(800, 940, f'<g>{crown("url(#og)", PINK, middle=False)}</g><g transform="translate(250 30) scale(.75)">{elephant_front("url(#bg)", "url(#pg)", "url(#og)")}</g>{JG("url(#bg)", 400, 380, 270)}{name(400, 740)}', '#ffffff'),
}
# website assets: mark and horizontal logo for the blue header / footer, and the square app icon
site_mark = crown("url(#og)", PINK, middle=False) + f'<g transform="translate(250 30) scale(.75)">{elephant_front()}</g>' + JG('#ffffff', 400, 380, 270)
w1, w2 = text_path(CINZEL, "HOTEL", 34, .85)[1], text_path(CINZEL, "JOTHI GRAND", 92, .1)[1]
site = {
    'site-mark': svg(800, 680, site_mark),
    'site-horizontal': svg(int(520 + max(w1, w2) + 30), 440, f'<g transform="translate(30 20) scale(.55)">{site_mark}</g><path d="M490 80V360" stroke="{ORANGE}" stroke-width="4"/>{word(CINZEL, "HOTEL", 34, "#ff8fbd", 520 + w1 / 2, 130, .85)}{word(CINZEL, "JOTHI GRAND", 92, "#ffffff", 520 + w2 / 2, 190, .1)}<path d="M524 320H{520 + w2:.0f}" stroke="url(#og)" stroke-width="6"/>'),
    'site-icon': svg(1024, 1024, f'<rect width="1024" height="1024" rx="220" fill="url(#bg)"/><g transform="translate(152 150) scale(.9)">{site_mark}</g>'),
}
for k, v in site.items():
    open(os.path.join(OUT, k + '.svg'), 'w').write(v)
for k, v in samples.items():
    open(os.path.join(OUT, k + '.svg'), 'w').write(v)
print('wrote', list(samples))
