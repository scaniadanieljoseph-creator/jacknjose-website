// Logo concepts for Hotel Jothi Grand. Writes one SVG per concept and a presentation sheet:
//   node make.js   (needs Playwright for the PNG previews)
const fs = require('fs'), path = require('path');
const OUT = __dirname;
const FONTS = `<style>@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&amp;family=Manrope:wght@600;800&amp;family=Cinzel:wght@600;700&amp;display=swap');</style>`;
const svg = (vb, body, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${FONTS}${bg ? `<rect width="100%" height="100%" fill="${bg}"/>` : ''}${body}</svg>`;

/* 1 · Grand Arch: a JG monogram under a gold arch, like the hotel's entrance; five stars on top */
const archMark = (gold = '#e2b45f', ink = '#e2b45f') => `
  <defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d58f"/><stop offset=".5" stop-color="${gold}"/><stop offset="1" stop-color="#b9832f"/></linearGradient></defs>
  <path d="M110 268V160a90 90 0 0 1 180 0v108" fill="none" stroke="url(#g1)" stroke-width="7"/>
  <path d="M126 268V162a74 74 0 0 1 148 0v106" fill="none" stroke="url(#g1)" stroke-width="1.6" opacity=".8"/>
  <path d="M96 268h208" stroke="url(#g1)" stroke-width="4"/>
  ${[-2, -1, 0, 1, 2].map(i => `<path transform="translate(${200 + i * 20} ${56 - (2 - Math.abs(i)) * 5}) scale(.42)" d="M0-12l3.5 7.6 8.2.9-6.1 5.6 1.7 8.1L0 6.1-7.3 10.2l1.7-8.1-6.1-5.6 8.2-.9z" fill="url(#g1)"/>`).join('')}
  <text x="200" y="232" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-weight="700" font-size="112" fill="url(#g1)" letter-spacing="-6">JG</text>`;
const logo1 = (bg = '#0d1424', text = '#f6efe2') => svg('0 0 400 400', `${archMark()}
  <text x="200" y="314" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="600" font-size="13" letter-spacing="9" fill="#e2b45f">HOTEL</text>
  <text x="200" y="352" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-weight="700" font-size="40" letter-spacing="3" fill="${text}">JOTHI GRAND</text>`, bg);

/* 2 · Jothi Flame: an oil-lamp flame (jothi = light) whose inner curve forms a J */
const flameMark = () => `
  <defs><linearGradient id="f2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".55" stop-color="#f39a2b"/><stop offset="1" stop-color="#d4561b"/></linearGradient>
  <linearGradient id="b2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b9832f"/><stop offset=".5" stop-color="#f1cc7a"/><stop offset="1" stop-color="#b9832f"/></linearGradient></defs>
  <path d="M200 40c34 44 58 78 58 116 0 34-26 58-58 58s-58-24-58-58c0-26 14-46 30-64-2 22 6 36 18 42-6-34 2-64 10-94z" fill="url(#f2)"/>
  <path d="M214 104v62c0 16-10 24-22 24-9 0-16-5-19-12" fill="none" stroke="#fff6dc" stroke-width="9" stroke-linecap="round"/>
  <path d="M118 222h164c-8 30-40 50-82 50s-74-20-82-50z" fill="url(#b2)"/><path d="M168 272h64l-8 14h-48z" fill="#b9832f"/>`;
const logo2 = (bg = '#3b1733', text = '#fdf3e1') => svg('0 0 400 400', `${flameMark()}
  <text x="200" y="332" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-weight="700" font-size="34" letter-spacing="3" fill="${text}">JOTHI GRAND</text>
  <text x="200" y="364" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="600" font-size="13" letter-spacing="10" fill="#f1b35a">HOTEL</text>`, bg);

/* 3 · The Facade: the hotel's own building in a tile: plum front, orange frame, blue glass strip, balconies */
const facadeMark = () => `
  <rect x="0" y="0" width="120" height="150" rx="22" fill="#4a2240"/>
  <path d="M30 26h60l6 8v108H24V34z" fill="#5c2b4f" stroke="#f08a2b" stroke-width="4" stroke-linejoin="round"/>
  <rect x="53" y="34" width="14" height="108" rx="2" fill="#2aa7e6"/><rect x="53" y="34" width="14" height="108" rx="2" fill="url(#gl3)"/>
  ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="30" y="${44 + i * 15}" width="17" height="6" rx="1.5" fill="#f3d9b8" opacity=".9"/><rect x="73" y="${44 + i * 15}" width="17" height="6" rx="1.5" fill="#f3d9b8" opacity=".9"/>`).join('')}
  <rect x="18" y="128" width="84" height="8" rx="2" fill="#f08a2b"/>
  <defs><linearGradient id="gl3" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;
const logo3 = (bg = '#fbf6ee', text = '#3b1733') => svg('0 0 520 240', `<g transform="translate(40 45)">${facadeMark()}</g>
  <text x="190" y="104" font-family="Manrope, sans-serif" font-weight="600" font-size="15" letter-spacing="8" fill="#f08a2b">HOTEL</text>
  <text x="188" y="148" font-family="Manrope, sans-serif" font-weight="800" font-size="44" letter-spacing="1" fill="${text}">JOTHI</text>
  <text x="188" y="190" font-family="Manrope, sans-serif" font-weight="800" font-size="44" letter-spacing="1" fill="${text}">GRAND</text>
  <rect x="190" y="204" width="56" height="5" rx="2" fill="#2aa7e6"/><rect x="250" y="204" width="18" height="5" rx="2" fill="#f08a2b"/>`, bg);

/* 4 · Royal Crest: a crown of three flames over a classic serif wordmark, maroon and gold */
const crownMark = (c = '#c8933a') => `
  <defs><linearGradient id="c4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d38e"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
  ${[[-46, .78], [0, 1], [46, .78]].map(([dx, s]) => `<path transform="translate(${200 + dx} 118) scale(${s})" d="M0-62c16 20 26 36 26 52 0 15-12 26-26 26s-26-11-26-26c0-12 6-21 13-29-1 10 3 16 8 19-3-15 1-29 5-42z" fill="url(#c4)"/>`).join('')}
  <path d="M138 142h124l-8 22H146z" fill="url(#c4)"/><circle cx="200" cy="153" r="4.5" fill="#7a1f2b"/><circle cx="170" cy="153" r="3" fill="#7a1f2b"/><circle cx="230" cy="153" r="3" fill="#7a1f2b"/>`;
const logo4 = (bg = '#f7f0e3', text = '#6d1a28') => svg('0 0 400 400', `${crownMark()}
  <text x="200" y="232" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-weight="600" font-size="58" fill="${text}">Jothi Grand</text>
  <path d="M110 254h70M220 254h70" stroke="#c8933a" stroke-width="1.5"/><path d="M200 248l6 6-6 6-6-6z" fill="#c8933a"/>
  <text x="200" y="288" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-weight="600" font-size="15" letter-spacing="8" fill="#c8933a">HOTEL</text>
  <text x="200" y="318" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="600" font-size="10.5" letter-spacing="3" fill="${text}" opacity=".75">ROOMS · RESTAURANT · FREEZE BAR</text>`, bg);

const icons = {
  1: svg('0 0 400 400', `<rect width="400" height="400" rx="88" fill="#0d1424"/><g transform="translate(0 30)">${archMark()}</g>`),
  2: svg('0 0 400 400', `<rect width="400" height="400" rx="88" fill="#3b1733"/><g transform="translate(0 40)">${flameMark()}</g>`),
  3: svg('0 0 400 400', `<rect width="400" height="400" rx="88" fill="#fbf6ee"/><g transform="translate(110 65) scale(1.5)">${facadeMark()}</g>`),
  4: svg('0 0 400 400', `<rect width="400" height="400" rx="88" fill="#6d1a28"/><g transform="translate(0 70)">${crownMark('#e2b45f')}</g>`),
};
const L = [
  [1, 'Grand Arch', 'A JG monogram under a gold arch with five stars. Matches the website’s midnight-and-gold look; feels premium and classic.', logo1(), logo1('#ffffff', '#0d1424')],
  [2, 'Jothi Flame', '“Jothi” means light. A temple-lamp flame whose inner curve forms a J. Warm, Indian, easy to recognise even small.', logo2(), logo2('#ffffff', '#3b1733')],
  [3, 'The Facade', 'The hotel’s own building as a symbol: plum front, orange frame and the blue glass strip. Modern and instantly linked to the property.', logo3(), logo3('#0d1424', '#fbf6ee')],
  [4, 'Royal Crest', 'A crown of three flames over an italic serif name, in maroon and gold. Elegant and traditional; suits signage, menus and bills.', logo4(), logo4('#6d1a28', '#f7f0e3')],
];
L.forEach(([n, name, , main, alt]) => { const slug = name.toLowerCase().replace(/[^a-z]+/g, '-'); fs.writeFileSync(path.join(OUT, `${n}-${slug}.svg`), main); fs.writeFileSync(path.join(OUT, `${n}-${slug}-alt.svg`), alt); fs.writeFileSync(path.join(OUT, `${n}-${slug}-icon.svg`), icons[n]); });

const uri = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
const sheet = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Manrope:wght@500;700&display=swap">
<style>body{margin:0;background:#ece6dc;font-family:Manrope,sans-serif;color:#1f1a14;padding:36px}h1{font-family:'Cormorant Garamond',serif;font-size:40px;margin:0 0 6px}p.sub{margin:0 0 26px;color:#6b6152}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}.card{background:#fff;border-radius:20px;padding:20px;box-shadow:0 6px 24px rgba(0,0,0,.08);display:grid;gap:14px}
.row{display:grid;grid-template-columns:1.25fr 1fr 110px;gap:12px;align-items:center}.row img{width:100%;border-radius:14px;display:block;box-shadow:0 2px 10px rgba(0,0,0,.08)}.row img.ic{width:110px;border-radius:24px}
h2{margin:0;font-size:20px}h2 b{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#1f1a14;color:#fff;font-size:15px;margin-right:8px}.card p{margin:0;color:#5a5044;font-size:14px;line-height:1.5}</style></head>
<body><h1>Hotel Jothi Grand · logo concepts</h1><p class="sub">Each concept: main version, alternate colours, and the app / social-media icon.</p><div class="grid">
${L.map(([n, name, desc, main, alt]) => `<div class="card"><h2><b>${n}</b>${name}</h2><div class="row"><img src="${uri(main)}"><img src="${uri(alt)}"><img class="ic" src="${uri(icons[n])}"></div><p>${desc}</p></div>`).join('')}
</div></body></html>`;
fs.writeFileSync(path.join(OUT, 'sheet.html'), sheet);
console.log('wrote', fs.readdirSync(OUT).filter(f => f.endsWith('.svg')).length, 'svgs + sheet.html');
