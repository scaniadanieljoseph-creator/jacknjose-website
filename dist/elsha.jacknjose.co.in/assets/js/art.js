/* Illustrations for every service (generated SVG scenes, lightly animated) and the animated page background.
   Replace any scene with a real photograph through SITE_CONFIG.photos in config.js. */
'use strict';

let _artId = 0;
const SKY = { day: ['#6ec1f5', '#d9f1ff'], dusk: ['#27357e', '#f6a65e'], night: ['#041530', '#12457c'], dawn: ['#3478c9', '#c4ecd6'], sea: ['#3f9fe3', '#cfeeff'], map: ['#041a33', '#06305f'] };
function svgScene(inner, sky, label) {
  const id = 'sky' + (++_artId);
  return `<svg class="scene" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="400" height="260" fill="url(#${id})"/>${inner}</svg>`;
}
const P = {
  sun: (x, y, r = 24, c = '#ffd76a') => `<circle cx="${x}" cy="${y}" r="${r * 2}" fill="${c}" opacity=".22"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`,
  moon: (x, y) => `<circle cx="${x}" cy="${y}" r="20" fill="#f4f1dc"/><circle cx="${x + 8}" cy="${y - 5}" r="17" fill="#0a2b57"/>`,
  stars: seed => { const r = rng(seed); return Array.from({ length: 26 }, (_, i) => `<circle class="${i % 3 ? '' : 'twinkle'}" cx="${(r() * 400).toFixed(0)}" cy="${(r() * 120).toFixed(0)}" r="${(0.6 + r() * 1.1).toFixed(1)}" fill="#ffffff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`).join(''); },
  cloud: (x, y, s = 1, op = 0.9, slow = false) => `<g class="${slow ? 'drift slow' : 'drift'}" opacity="${op}" fill="#ffffff"><ellipse cx="${x}" cy="${y}" rx="${30 * s}" ry="${11 * s}"/><ellipse cx="${x - 18 * s}" cy="${y + 4 * s}" rx="${20 * s}" ry="${8 * s}"/><ellipse cx="${x + 20 * s}" cy="${y + 5 * s}" rx="${22 * s}" ry="${8 * s}"/></g>`,
  hills: (y, color, seed, amp = 30) => { const r = rng(seed); let d = `M0 260 L0 ${y}`; for (let x = 0; x <= 400; x += 50) d += ` Q${x + 25} ${(y - amp * (0.3 + r())).toFixed(0)} ${x + 50} ${(y + (r() - .5) * 14).toFixed(0)}`; return `<path d="${d} L400 260Z" fill="${color}"/>`; },
  palm: (x, y, s = 1, c = '#14603a') => `<g><path d="M${x} ${y} q${7 * s} ${-32 * s} ${2 * s} ${-62 * s}" stroke="#5b4024" stroke-width="${4.5 * s}" fill="none" stroke-linecap="round"/>${[[-40, -2], [-30, -22], [-6, -30], [28, -22], [40, 0], [22, 12], [-24, 10]].map(([dx, dy]) => `<path d="M${x + 2 * s} ${y - 62 * s} q${dx * s * .5} ${(dy - 14) * s * .6} ${dx * s} ${dy * s}" stroke="${c}" stroke-width="${4 * s}" fill="none" stroke-linecap="round"/>`).join('')}</g>`,
  water: (y, c1 = '#1f6fb5', c2 = '#17508a') => `<rect x="0" y="${y}" width="400" height="${260 - y}" fill="${c1}"/><rect x="0" y="${y + 26}" width="400" height="${260 - y}" fill="${c2}" opacity=".6"/>${[0, 1, 2, 3, 4, 5].map(i => `<path class="wave" d="M${20 + i * 66} ${y + 12 + (i % 3) * 14} q10 -4 20 0 t20 0" stroke="#ffffff" stroke-opacity=".45" stroke-width="2" fill="none"/>`).join('')}`,
  road: (y, night = false) => `<rect x="0" y="${y}" width="400" height="${260 - y}" fill="${night ? '#1a2436' : '#3b4656'}"/><line class="dash" x1="-40" y1="${y + 30}" x2="440" y2="${y + 30}" stroke="#f4d35e" stroke-width="3" stroke-dasharray="26 22"/><rect x="0" y="${y}" width="400" height="3" fill="#ffffff" opacity=".25"/>`,
  wheel: (x, y, r = 9) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#10161f"/><circle cx="${x}" cy="${y}" r="${r * .45}" fill="#9aa7b8"/>`,
  bus: (x, y, s = 1, night = false) => `<g transform="translate(${x} ${y}) scale(${s})">${night ? '<polygon points="168,34 250,52 250,60 168,46" fill="#ffe9a3" opacity=".35"/>' : ''}
    <rect x="0" y="0" width="170" height="52" rx="10" fill="#0b57b7"/><rect x="0" y="34" width="170" height="10" fill="#1fbf7a"/><rect x="150" y="6" width="16" height="22" rx="3" fill="#bfe3ff"/>
    ${[0, 1, 2, 3, 4].map(i => `<rect x="${10 + i * 27}" y="6" width="22" height="11" rx="2" fill="${night ? '#ffe9a3' : '#cfe9ff'}"/><rect x="${10 + i * 27}" y="20" width="22" height="10" rx="2" fill="${night ? '#ffd76a' : '#b6dcfb'}" opacity="${night && i % 2 ? .45 : 1}"/>`).join('')}
    <text x="12" y="42.5" font-size="7" font-weight="700" fill="#06305f" font-family="Sora, sans-serif">JACK &amp; JOSE TRAVELS</text>${P.wheel(34, 54)}${P.wheel(130, 54)}</g>`,
  truck: (x, y, s = 1, box = '#11895a') => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="0" y="0" width="118" height="48" rx="3" fill="${box}"/>${[20, 40, 60, 80, 100].map(v => `<line x1="${v}" y1="2" x2="${v}" y2="46" stroke="#000000" stroke-opacity=".14" stroke-width="2"/>`).join('')}
    <text x="59" y="29" text-anchor="middle" font-size="13" font-weight="700" fill="#ffffff" font-family="Sora, sans-serif">J&amp;J</text>
    <path d="M122 12 h26 l16 18 v18 h-42z" fill="#0b57b7"/><path d="M128 17 h17 l10 12 h-27z" fill="#cfe9ff"/><rect x="-2" y="48" width="168" height="5" fill="#222b38"/>${P.wheel(22, 56)}${P.wheel(46, 56)}${P.wheel(142, 56)}</g>`,
  van: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 4 h70 l22 16 v24 h-92z" fill="#ffffff"/><rect x="0" y="30" width="92" height="6" fill="#1fbf7a"/><path d="M66 9 h6 l14 11 h-20z" fill="#bfe3ff"/><text x="8" y="24" font-size="9" font-weight="700" fill="#0b57b7" font-family="Sora, sans-serif">J&amp;J</text>${P.wheel(20, 46, 7)}${P.wheel(72, 46, 7)}</g>`,
  ship: (x, y, s = 1) => `<g class="bob" transform="translate(${x} ${y}) scale(${s})"><polygon points="0,40 250,40 230,72 18,72" fill="#0a2b57"/><rect x="0" y="40" width="250" height="6" fill="#c2363a"/>
    ${[0, 1, 2, 3, 4, 5].map(i => [0, 1, 2].slice(0, i === 0 || i === 5 ? 2 : 3).map(j => `<rect x="${22 + i * 28}" y="${26 - j * 14}" width="26" height="13" fill="${['#1fbf7a', '#0b57b7', '#f4a23a', '#c2363a', '#0b8f9c'][(i + j * 2) % 5]}" stroke="#000000" stroke-opacity=".2"/>`).join('')).join('')}
    <rect x="196" y="6" width="34" height="34" fill="#ffffff"/><rect x="200" y="10" width="26" height="6" fill="#06305f"/><rect x="208" y="-10" width="10" height="16" fill="#f4a23a"/></g>`,
  plane: (x, y, s = 1) => `<g class="bob" transform="translate(${x} ${y}) scale(${s})"><line x1="-170" y1="16" x2="0" y2="16" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity=".55"/>
    <path d="M0 8 q0 -8 14 -8 h110 q30 2 40 16 q-10 12 -40 12 h-110 q-14 0 -14 -8z" fill="#ffffff"/><polygon points="4,2 -14,-26 6,-26 30,2" fill="#0b57b7"/><polygon points="60,18 30,58 54,58 104,18" fill="#d5e2ee"/><polygon points="62,8 44,-18 60,-18 96,8" fill="#e6eef6"/>
    <rect x="12" y="19" width="140" height="3" fill="#1fbf7a"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${36 + i * 13}" y="8" width="7" height="6" rx="2" fill="#0b57b7"/>`).join('')}<path d="M146 6 q12 2 16 9 h-18z" fill="#0c1e33"/></g>`,
  tower: (x, y, w, h, c, lit = '#ffd76a', seed = 1) => { const r = rng(seed), cols = Math.floor((w - 8) / 12), rows = Math.floor((h - 10) / 14); let win = ''; for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) win += `<rect x="${x + 6 + i * 12}" y="${y + 8 + j * 14}" width="7" height="8" fill="${r() < .6 ? lit : '#0a2540'}" opacity=".9"/>`; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>${win}`; },
  houseboat: (x, y, s = 1) => `<g class="bob" transform="translate(${x} ${y}) scale(${s})"><path d="M0 20 q55 16 110 0 q-6 -4 -12 -4 h-86 q-6 0 -12 4z" fill="#4a2f17"/><path d="M14 16 q41 -34 82 0z" fill="#c9a66b"/><path d="M22 16 q33 -24 66 0z" fill="#8a6a3c"/>${[34, 50, 66].map(v => `<rect x="${v}" y="6" width="9" height="9" fill="#ffd76a"/>`).join('')}</g>`,
  boxes: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${[[0, 20, 30, 24], [32, 14, 26, 30], [8, 0, 26, 20]].map(([a, b, w, h]) => `<rect x="${a}" y="${b}" width="${w}" height="${h}" fill="#c98d4b" stroke="#8a5a26"/><line x1="${a + w / 2}" y1="${b}" x2="${a + w / 2}" y2="${b + h}" stroke="#f0d2a6" stroke-width="3"/>`).join('')}</g>`,
  camera: (x, y, s = 1, c = '#0c1e33') => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${c}" stroke-linecap="round"><line x1="30" y1="34" x2="6" y2="110" stroke-width="5"/><line x1="30" y1="34" x2="54" y2="110" stroke-width="5"/><line x1="30" y1="34" x2="30" y2="108" stroke-width="4"/>
    <rect x="2" y="0" width="56" height="36" rx="6" fill="${c}" stroke="none"/><rect x="16" y="-8" width="20" height="10" rx="2" fill="${c}" stroke="none"/><circle cx="62" cy="18" r="13" fill="${c}" stroke="none"/><circle cx="64" cy="18" r="7" fill="#7fb7f7" stroke="none"/></g>`,
  drone: (x, y, s = 1) => `<g class="bob" transform="translate(${x} ${y}) scale(${s})"><rect x="-12" y="-4" width="24" height="10" rx="4" fill="#0c1e33"/><line x1="-30" y1="-2" x2="30" y2="-2" stroke="#0c1e33" stroke-width="3"/><ellipse cx="-30" cy="-6" rx="14" ry="2.5" fill="#0c1e33" opacity=".6"/><ellipse cx="30" cy="-6" rx="14" ry="2.5" fill="#0c1e33" opacity=".6"/><circle cx="0" cy="8" r="3" fill="#c2363a"/></g>`,
  panels: (x, y, n = 4, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${Array.from({ length: n }, (_, i) => `<polygon points="${i * 30},16 ${i * 30 + 10},0 ${i * 30 + 36},0 ${i * 30 + 26},16" fill="#0b3f8f" stroke="#cfe9ff" stroke-width="1"/><line x1="${i * 30 + 5}" y1="8" x2="${i * 30 + 31}" y2="8" stroke="#cfe9ff" stroke-width=".8"/><line x1="${i * 30 + 18}" y1="16" x2="${i * 30 + 28}" y2="0" stroke="#cfe9ff" stroke-width=".8"/>`).join('')}</g>`,
  turbine: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><polygon points="-3,0 3,0 5,90 -5,90" fill="#eef4f9"/><g class="spin">${[0, 120, 240].map(a => `<path transform="rotate(${a})" d="M0 0 q6 -22 0 -48 q-6 26 0 48z" fill="#ffffff"/>`).join('')}</g><circle r="4" fill="#c9d6e2"/></g>`,
  pin: (x, y, c = '#5ce2a7') => `<circle class="pulse" cx="${x}" cy="${y}" r="10" fill="${c}" opacity=".3"/><circle cx="${x}" cy="${y}" r="4.5" fill="${c}"/>`,
};
const SCENES = {
  travels: () => svgScene(P.stars(11) + P.moon(322, 52) + P.hills(150, '#0b2f5e', 4, 34) + P.hills(176, '#082344', 9, 18) + P.palm(46, 196, .9, '#0b3a2a') + P.palm(360, 200, 1.05, '#0b3a2a') + P.palm(318, 198, .7, '#0b3a2a') + P.road(194, true) + P.bus(86, 148, 1.15, true), SKY.night, 'Jack & Jose sleeper bus on a night highway'),
  hotels: () => svgScene(P.sun(300, 150, 28, '#ffcf70') + P.cloud(90, 50, 1, .5, true) + P.hills(160, '#3a3f7a', 3, 26) + P.tower(40, 84, 96, 96, '#f4efe4', '#ffd76a', 5) + `<polygon points="34,84 88,58 142,84" fill="#b5533c"/><rect x="34" y="176" width="150" height="6" fill="#d9c7a0"/>` + P.water(180, '#2b5fa8', '#1b3f7d') + P.houseboat(220, 196, 1.1) + P.palm(176, 182, 1, '#124d33') + P.palm(20, 184, .8, '#124d33'), SKY.dusk, 'Backwater resort at dusk with a Kerala houseboat'),
  road: () => svgScene(P.sun(70, 56, 22) + P.cloud(210, 44, 1.2) + P.cloud(340, 78, .8, .8, true) + P.hills(150, '#6fc28a', 21, 30) + P.hills(172, '#3f9e6a', 8, 16) + P.road(192) + P.truck(120, 136, 1.2), SKY.day, 'Jack & Jose container truck on a highway'),
  air: () => svgScene(P.sun(330, 50, 20, '#fff2b8') + P.cloud(80, 190, 2.2, .95, true) + P.cloud(300, 214, 2.6, .95) + P.cloud(190, 236, 3, 1, true) + P.cloud(330, 110, 1, .6) + P.plane(150, 96, 1.15), SKY.sea, 'Cargo aircraft above the clouds'),
  sea: () => svgScene(P.sun(60, 50, 18, '#fff2b8') + P.cloud(250, 46, 1.1, .85, true) + `<g fill="none" stroke="#c2363a" stroke-width="5"><path d="M340 170 v-120 h-70"/><path d="M372 170 v-120"/><path d="M340 70 h32 M340 110 h32 M340 150 h32"/><line x1="284" y1="50" x2="284" y2="96" stroke="#0c1e33" stroke-width="2"/></g><rect x="274" y="96" width="20" height="12" fill="#f4a23a"/>` + P.water(168) + P.ship(30, 106, 1) + `<rect x="300" y="168" width="100" height="10" fill="#6d7b8c"/>`, SKY.sea, 'Container ship at port with a gantry crane'),
  logistics: () => svgScene(P.sun(336, 60, 20, '#ffe9a3') + P.cloud(110, 40, 1, .7, true) + `<rect x="24" y="78" width="220" height="118" fill="#e7eef5"/><polygon points="14,78 134,44 254,78" fill="#0b57b7"/><rect x="60" y="86" width="150" height="20" fill="#06305f"/><text x="135" y="100" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff" font-family="Sora, sans-serif">J&amp;J LOGISTICS</text>
    ${[44, 112, 180].map(v => `<rect x="${v}" y="118" width="52" height="78" fill="#9fb3c8"/>${[0, 1, 2, 3, 4].map(i => `<line x1="${v}" y1="${130 + i * 14}" x2="${v + 52}" y2="${130 + i * 14}" stroke="#6f8399" stroke-width="2"/>`).join('')}`).join('')}` + `<rect x="0" y="196" width="400" height="64" fill="#566375"/>` + P.boxes(250, 152, 1) + P.van(292, 150, 1.05), SKY.dawn, 'Jack & Jose parcel hub with a delivery van'),
  fleet: () => svgScene(Array.from({ length: 9 }, (_, i) => `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="260" stroke="#ffffff" stroke-opacity=".06"/><line x1="0" y1="${i * 34}" x2="400" y2="${i * 34}" stroke="#ffffff" stroke-opacity=".06"/>`).join('') +
    `<path class="dash" d="M40 210 Q120 120 200 150 T360 50" stroke="#5ce2a7" stroke-width="2.5" stroke-dasharray="8 8" fill="none"/><path class="dash" d="M60 60 Q160 40 220 110 T350 200" stroke="#7fb7f7" stroke-width="2.5" stroke-dasharray="8 8" fill="none"/>` + P.pin(40, 210) + P.pin(360, 50) + P.pin(60, 60, '#7fb7f7') + P.pin(350, 200, '#7fb7f7') + P.pin(200, 150, '#f0b350') + P.truck(150, 168, .5) + P.bus(206, 84, .42), SKY.map, 'Live fleet map with vehicles on their routes'),
  media: () => svgScene(P.sun(240, 150, 44, '#ffd08a') + P.cloud(110, 60, 1.2, .35, true) + P.hills(170, '#3b2f6b', 14, 40) + P.hills(196, '#211a45', 6, 22) + `<rect x="0" y="222" width="400" height="38" fill="#120f2b"/>` + P.camera(54, 118, 1.05, '#0b0a1c') + P.drone(318, 62, 1) +
    `<g fill="none" stroke="#ffffff" stroke-width="3" opacity=".85"><path d="M150 40 h-16 v16"/><path d="M370 40 h16 v16"/><path d="M150 206 h-16 v-16"/><path d="M370 206 h16 v-16"/></g><circle class="twinkle" cx="150" cy="24" r="5" fill="#ff5a5f"/><text x="160" y="28" font-size="11" font-weight="700" fill="#ffffff" font-family="JetBrains Mono, monospace">REC</text>`, SKY.dusk, 'Camera and drone filming at sunset'),
  eee: () => svgScene(P.sun(70, 58, 24) + Array.from({ length: 8 }, (_, i) => `<line x1="70" y1="58" x2="${70 + 62 * Math.cos(i * Math.PI / 4)}" y2="${58 + 62 * Math.sin(i * Math.PI / 4)}" stroke="#ffd76a" stroke-width="3" stroke-linecap="round" opacity=".5" class="twinkle"/>`).join('') + P.cloud(250, 46, 1, .85, true) + P.hills(170, '#7fd39a', 31, 26) + P.hills(192, '#3fa46b', 12, 14) +
    P.turbine(340, 96, 1) + P.turbine(296, 120, .7) + `<rect x="96" y="112" width="150" height="96" fill="#f4efe4"/><polygon points="86,112 256,112 236,92 106,92" fill="#8a97a8"/>` + P.panels(112, 94, 4, 1) + [0, 1, 2, 3].map(i => `<rect x="${110 + i * 34}" y="126" width="20" height="24" fill="#bfe3ff"/><rect x="${110 + i * 34}" y="164" width="20" height="24" fill="#bfe3ff"/>`).join('') + `<rect x="0" y="206" width="400" height="54" fill="#2f8f5b"/>`, SKY.day, 'Building with rooftop solar panels and wind turbines'),
};
SCENES.transports = SCENES.road; SCENES.jj = SCENES.road; SCENES['jack-jose'] = SCENES.road; SCENES.elsha = SCENES.media; SCENES.contact = SCENES.logistics;
['travels-admin', 'bus-results'].forEach(k => SCENES[k] = SCENES.travels); SCENES['hotel-results'] = SCENES.hotels;

/* A picture slot: the owner's photo from config.js if set, otherwise the illustration. */
function pic(slot, cls = '') {
  const photo = SITE_CONFIG.photos?.[slot];
  const inner = photo ? `<img src="${esc(photo)}" alt="${esc(slot)}" loading="lazy">` : (SCENES[slot] || SCENES.road)();
  return `<div class="pic ${cls}">${inner}</div>`;
}
/* Hotel pictures vary by location type so listings don't all look alike. */
function hotelPic(h) {
  const seed = hashStr(h.id || h.name), am = String(h.amenities || '');
  if (/Beach/i.test(am)) return svgScene(P.sun(310, 56, 20, '#fff2b8') + P.cloud(120, 44, 1.1, .85, true) + P.water(120, '#2aa3d8', '#1c7fb8') + `<path d="M0 260 L0 186 Q160 150 400 196 L400 260Z" fill="#f1dcae"/><rect x="34" y="124" width="124" height="52" fill="#fff7ea"/><polygon points="26,124 96,96 166,124" fill="#b5533c"/>${[0, 1, 2, 3].map(i => `<rect x="${44 + i * 28}" y="136" width="16" height="22" fill="#7fc4e8"/>`).join('')}` + P.palm(200, 196, 1.1) + P.palm(250, 204, .8) + `<path d="M300 214 l22 -26 l22 26z" fill="#c2363a"/><line x1="322" y1="188" x2="322" y2="228" stroke="#5b4024" stroke-width="3"/>`, SKY.sea, `${h.name}: beach resort`);
  if (/Lake/i.test(am)) return svgScene(P.sun(300, 146, 26, '#ffcf70') + P.hills(158, `hsl(${h.hue} 30% 34%)`, seed % 40, 26) + P.tower(36, 96, 110, 86, '#f4efe4', '#ffd76a', seed) + `<polygon points="28,96 91,66 154,96" fill="#8a4b34"/>` + P.water(180, '#2b5fa8', '#1b3f7d') + P.houseboat(210, 198, 1.1) + P.palm(170, 184, 1, '#124d33'), SKY.dusk, `${h.name}: backwater resort`);
  const night = seed % 2 === 0, r = rng(seed), main = `hsl(${h.hue} 35% ${night ? 30 : 86}%)`;
  let sky = ''; for (let x = -10; x < 400; x += 44) { const hh = 50 + r() * 70; sky += P.tower(x, 200 - hh, 38, hh, night ? '#0a2748' : '#9fb9d4', night ? '#ffd76a' : '#e9f4ff', seed + x); }
  return svgScene((night ? P.stars(seed) + P.moon(330, 46) : P.sun(330, 50, 18) + P.cloud(90, 40, 1, .85, true)) + sky + P.tower(140, 50, 120, 150, main, night ? '#ffd76a' : '#5aa2f5', seed + 7) + `<rect x="170" y="36" width="60" height="14" fill="#0b57b7"/><text x="200" y="47" text-anchor="middle" font-size="9" font-weight="700" fill="#ffffff" font-family="Sora, sans-serif">HOTEL</text><rect x="186" y="172" width="28" height="28" fill="#0c1e33"/><rect x="0" y="200" width="400" height="60" fill="${night ? '#101b2c' : '#57667a'}"/>` + (/Airport/i.test(am) ? P.plane(40, 40, .45) : '') + P.palm(120, 204, .6, '#14603a') + P.palm(282, 204, .6, '#14603a'), night ? SKY.night : SKY.day, `${h.name}: city hotel`);
}
/* Small product drawings for the EEE catalogue (same order as EEE_PRODUCTS). */
function productArt(i) {
  const g = [
    `<rect x="26" y="34" width="68" height="52" rx="4" fill="#ffffff" stroke="#9fb3c8" stroke-width="3"/><rect x="34" y="42" width="52" height="36" fill="#fff6c9"/><path d="M60 14v12M30 22l8 8M90 22l-8 8" stroke="#f4a23a" stroke-width="4" stroke-linecap="round"/>`,
    `<g class="spin slowspin" style="transform-origin:60px 56px">${[0, 120, 240].map(a => `<path transform="rotate(${a} 60 56)" d="M60 56 q18 -10 44 -4 q-4 12 -44 4z" fill="#0b57b7"/>`).join('')}</g><circle cx="60" cy="56" r="9" fill="#06305f"/><rect x="57" y="12" width="6" height="36" fill="#9fb3c8"/>`,
    `<rect x="40" y="18" width="40" height="80" rx="16" fill="#e7eef5" stroke="#9fb3c8" stroke-width="3"/><rect x="48" y="50" width="24" height="10" rx="3" fill="#11895a"/><path d="M84 40 h14 v30 h-14" fill="none" stroke="#c2363a" stroke-width="4"/><circle cx="60" cy="34" r="5" fill="#f4a23a"/>`,
    `<polygon points="20,92 44,44 100,44 76,92" fill="#0b3f8f" stroke="#cfe9ff" stroke-width="2"/>${[0, 1, 2, 3].map(k => `<line x1="${30 + k * 14}" y1="92" x2="${54 + k * 14}" y2="44" stroke="#cfe9ff" stroke-width="1.5"/>`).join('')}<rect x="40" y="24" width="64" height="18" rx="9" fill="#e7eef5" stroke="#9fb3c8" stroke-width="3"/>`,
    `<rect x="14" y="34" width="92" height="38" rx="8" fill="#ffffff" stroke="#9fb3c8" stroke-width="3"/><rect x="24" y="58" width="72" height="6" rx="3" fill="#cfe1f0"/><circle cx="92" cy="46" r="3" fill="#1fbf7a"/><path class="wave" d="M34 82 q6 8 0 16 M60 82 q6 8 0 16 M86 82 q6 8 0 16" stroke="#5aa2f5" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    `<circle cx="60" cy="52" r="26" fill="#ffffff" stroke="#9fb3c8" stroke-width="3"/><circle cx="60" cy="52" r="10" fill="#0b57b7"/><path class="twinkle" d="M24 92 q36 -22 72 0 M36 102 q24 -14 48 0" stroke="#1fbf7a" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    `<rect x="30" y="16" width="60" height="88" rx="8" fill="#ffffff" stroke="#9fb3c8" stroke-width="3"/><rect x="38" y="26" width="44" height="22" fill="#0c1e33"/><text x="60" y="42" text-anchor="middle" font-size="12" fill="#5ce2a7" font-family="JetBrains Mono, monospace">kWh</text><path d="M44 78 l10 -14 l8 8 l14 -18" stroke="#11895a" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    `<circle cx="92" cy="26" r="12" fill="#ffd76a"/><polygon points="14,96 34,50 96,50 76,96" fill="#0b3f8f" stroke="#cfe9ff" stroke-width="2"/>${[0, 1, 2].map(k => `<line x1="${30 + k * 16}" y1="96" x2="${50 + k * 16}" y2="50" stroke="#cfe9ff" stroke-width="1.5"/>`).join('')}<line x1="24" y1="73" x2="86" y2="73" stroke="#cfe9ff" stroke-width="1.5"/>`,
  ][i] || '';
  return `<svg class="prod-art" viewBox="0 0 120 120" role="img" aria-label="Product illustration"><circle cx="60" cy="60" r="56" fill="var(--green-soft)"/>${g}</svg>`;
}

/* ---------- Animated page background: slow blue/green aurora that drifts and follows scroll ---------- */
function startBackground() {
  if (document.getElementById('bg-canvas')) return;
  const c = document.createElement('canvas'); c.id = 'bg-canvas'; c.setAttribute('aria-hidden', 'true'); document.body.prepend(c);
  const ctx = c.getContext('2d'); if (!ctx) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const blobs = [[11, 87, 183], [31, 191, 122], [11, 143, 156], [43, 134, 240], [17, 137, 90], [90, 162, 245]].map((rgb, i) => ({ rgb, ax: 0.18 + (i % 3) * 0.12, ay: 0.14 + (i % 2) * 0.16, sx: 0.00011 + i * 0.000023, sy: 0.00009 + i * 0.000031, ph: i * 1.7, r: 0.34 + (i % 3) * 0.1 }));
  let w = 0, h = 0, last = 0, mx = 0.5, my = 0.5;
  const size = () => { w = c.width = Math.max(160, Math.round(innerWidth / 5)); h = c.height = Math.max(120, Math.round(innerHeight / 5)); };
  size(); addEventListener('resize', size);
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; }, { passive: true });
  const dark = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
  function frame(t) {
    if (!reduce) requestAnimationFrame(frame);
    if (document.hidden || t - last < 40) return; last = t;
    const a = dark() ? 0.2 : 0.15, sc = (scrollY || 0) * 0.0006;
    ctx.clearRect(0, 0, w, h);
    blobs.forEach((b, i) => {
      const x = (0.5 + Math.sin(t * b.sx + b.ph) * b.ax + (mx - .5) * 0.06 * (i % 2 ? 1 : -1)) * w;
      const y = (0.5 + Math.cos(t * b.sy + b.ph * 1.3) * b.ay - sc * (i % 2 ? 1 : .5) + (my - .5) * 0.05) * h;
      const rad = b.r * Math.max(w, h), g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(${b.rgb},${a})`); g.addColorStop(1, `rgba(${b.rgb},0)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    });
  }
  requestAnimationFrame(frame);
}
