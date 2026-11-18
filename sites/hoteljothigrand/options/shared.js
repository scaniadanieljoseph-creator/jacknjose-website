'use strict';
/* Shared content and booking logic for the Hotel Jothi Grand design options. Each design only changes the look. */
const JG = (() => {
  const HOTEL = {
    name: 'Hotel Jothi Grand',
    mobiles: ['+91 73040 43384', '+91 73050 43384'], landlines: ['0422 2331848', '0422 2441848'],
    whatsapp: '917305043384', email: 'hoteljothigrand666@gmail.com',
    address: '19, Sankra Nagar, Near KCT Tech Park, Thudiyalur Road, Saravanampatti, Coimbatore - 641035',
    mapQuery: 'Hotel Jothi Grand, Sankra Nagar, Thudiyalur Road, Saravanampatti, Coimbatore 641035',
    gstin: '33AFNPJ5789B1ZA', checkIn: '12:00 noon', checkOut: '11:00 AM', barHours: [17, 23.5], roofHours: [16, 23],
    bookUrl: '../book.php',
  };
  HOTEL.mapLink = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(HOTEL.mapQuery);
  const ROOMS = [
    { key: 'Deluxe Room', tag: 'Deluxe', text: 'A calm, well-lit room with a plush double bed and everything for a restful night.', feat: ['King or twin beds', 'Air-conditioned', 'Smart TV & free Wi-Fi', 'Dental kit & bath amenities'], max: 3, pos: '30% 60%' },
    { key: 'Premium Room', tag: 'Premium', text: 'More space, richer finishes and a seating corner. Ideal for longer stays and business trips.', feat: ['King bed & seating area', 'Work desk & fast Wi-Fi', 'Tea & coffee, mini fridge', 'Bathrobe & slippers'], max: 3, pos: '70% 50%' },
    { key: 'Grand Suite', tag: 'Suite', text: 'Our finest: a separate living room, a large bath and extra touches for special occasions.', feat: ['Separate living room', 'Rain shower', 'Welcome refreshments', 'Priority rooftop & bar tables'], max: 4, pos: '50% 40%' },
  ];
  const XP = [
    { key: 'restaurant', name: 'The Restaurant', short: 'Restaurant', pic: 'restaurant', text: 'Breakfast, lunch and dinner in our air-conditioned dining hall, with a buffet spread and dishes cooked to order.', pick: 'Table at the restaurant' },
    { key: 'bar', name: 'Freeze Bar', short: 'Freeze Bar', art: 'bar', text: 'An air-conditioned bar with fine spirits, signature cocktails and chef’s bar bites, from 5 pm.', pick: 'Table at the bar', hours: 'barHours' },
    { key: 'roof', name: 'The Rooftop', short: 'Rooftop', art: 'roof', text: 'Open sky, city lights and fast Wi-Fi in every corner. Sunset evenings, dinners and small celebrations.', pick: 'Rooftop event or table', hours: 'roofHours' },
  ];
  const AMEN = [['wifi', 'Free Wi-Fi'], ['glass', 'Freeze Bar'], ['sun', 'Rooftop lounge'], ['car', 'Secure parking'], ['tooth', 'Dental kit'], ['bell', '24-hour desk'], ['plate', 'Room service'], ['shirt', 'Laundry'], ['snow', 'Air-conditioning'], ['tv', 'Smart TV'], ['cup', 'Tea & coffee'], ['shield', 'CCTV & key-cards']];
  const PIC = { exterior: [864, 1040, 'Hotel Jothi Grand building'], room: [1600, 980, 'A room at Hotel Jothi Grand'], reception: [1152, 770, 'Reception and front desk'], restaurant: [1080, 770, 'The air-conditioned restaurant'], lounge: [1200, 1390, 'Lounge seating outside the rooms'] };
  const IMG = '../img/';
  const pic = (n, sizes = '100vw', eager = false, style = '') => { const [w, h, alt] = PIC[n], big = Math.min(1600, w); return `<picture><source type="image/webp" srcset="${IMG}${n}-800.webp 800w, ${IMG}${n}-1600.webp ${big}w" sizes="${sizes}"><img src="${IMG}${n}-800.jpg" srcset="${IMG}${n}-800.jpg 800w, ${IMG}${n}-1600.jpg ${big}w" sizes="${sizes}" width="${w}" height="${h}" alt="${alt}" ${style ? `style="${style}"` : ''} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`; };
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0'), iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  const nice = s => new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const tel = n => n.replace(/[^\d+]/g, '').replace(/^0/, '+91');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ICON = {
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/><path d="M2 9a15 15 0 0 1 20 0"/>', glass: '<path d="M7 3h10l-5 8z"/><path d="M12 11v8M8 21h8"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    car: '<path d="M5 16l1.5-5A2 2 0 0 1 8.4 9.5h7.2a2 2 0 0 1 1.9 1.5L19 16"/><rect x="3" y="15" width="18" height="4" rx="1.5"/><circle cx="7" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>', tooth: '<path d="M7 3c-2.5 0-4 2-3.6 4.7.4 2.3 1.6 3.3 2 6 .4 2.8.8 7.3 2.4 7.3s1.6-4 2.6-6.5c.4-1 .8-1.5 1.6-1.5s1.2.5 1.6 1.5c1 2.5 1 6.5 2.6 6.5s2-4.5 2.4-7.3c.4-2.7 1.6-3.7 2-6C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z"/>',
    bell: '<path d="M4 18h16M6 18a6 6 0 0 1 12 0M12 9V7M10 7h4"/><path d="M3 21h18"/>', plate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3.5"/><path d="M2 4v6M4 4v6M3 10v10M21 4c-1.5 1-2 3-2 6h2v10"/>', shirt: '<path d="M8 3l-5 3 2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z"/>',
    snow: '<path d="M12 2v20M4 6l16 12M20 6L4 18M9 3l3 3 3-3M9 21l3-3 3 3"/>', tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>', cup: '<path d="M4 8h13v5a6 6 0 0 1-12 0z"/><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17M8 2v3M12 2v3"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>', phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', pin: '<path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', chat: '<path d="M4 5h16v11H9l-5 4z"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', check: '<path d="M5 12l5 5 9-10"/>',
  };
  const ic = (n, sw = 1.6) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] || ''}</svg>`;
  /* drawn scenes for the bar and rooftop until real photos arrive; colours follow the design */
  const ART = {
    bar: (c = {}) => { const a = c.accent || '#e43d82', bg1 = c.bg1 || '#1b2a66', bg2 = c.bg2 || '#2a1747'; return `<svg viewBox="0 0 500 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Freeze Bar"><defs><linearGradient id="bw${a.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs><rect width="500" height="400" fill="url(#bw${a.slice(1)})"/>
      ${[60, 130, 200].map((y, r) => `<rect x="40" y="${y + 38}" width="420" height="4" fill="${a}" fill-opacity=".6"/>` + Array.from({ length: 9 }, (_, i) => { const x = 58 + i * 46, h = 30 + ((i * 7 + r * 5) % 4) * 6, col = ['#3c8f6a', '#c23a6e', '#e8a64a', '#3d6fd6', '#e8dcc0'][(i + r) % 5]; return `<rect x="${x}" y="${y + 38 - h}" width="16" height="${h}" rx="3" fill="${col}"/><rect x="${x + 5}" y="${y + 30 - h}" width="6" height="9" fill="${col}"/>`; }).join('')).join('')}
      <rect x="0" y="290" width="500" height="110" fill="${bg2}"/><rect x="0" y="282" width="500" height="10" rx="4" fill="${a}" fill-opacity=".8"/>
      <g transform="translate(150 196)"><path d="M0 0h70l-35 48z" fill="none" stroke="#fff" stroke-width="3"/><path d="M8 8h54l-27 36z" fill="${a}"/><path d="M35 48v34M18 86h34" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="58" cy="2" r="7" fill="#9be08f"/></g>
      <g transform="translate(300 214)"><rect x="0" y="0" width="48" height="66" rx="6" fill="none" stroke="#fff" stroke-width="3"/><rect x="4" y="24" width="40" height="38" rx="3" fill="#5b8dff"/><rect x="9" y="28" width="16" height="12" rx="3" fill="#fff" fill-opacity=".8"/></g></svg>`; },
    roof: (c = {}) => { const a = c.accent || '#e43d82'; return `<svg viewBox="0 0 500 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Rooftop at dusk"><defs><linearGradient id="rs${a.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.sky1 || '#2a55c4'}"/><stop offset=".55" stop-color="${c.sky2 || '#b44c9a'}"/><stop offset="1" stop-color="${c.sky3 || '#ff9fbf'}"/></linearGradient></defs>
      <rect width="500" height="400" fill="url(#rs${a.slice(1)})"/><circle cx="380" cy="215" r="34" fill="#fff" fill-opacity=".85"/>
      ${Array.from({ length: 22 }, (_, i) => `<circle cx="${(i * 97) % 500}" cy="${(i * 53) % 150 + 10}" r="${i % 3 ? 1.2 : 1.8}" fill="#fff"/>`).join('')}
      <path d="M0 250h40v-40h30v-25h28v65h20v-90h34v90h22v-55h30v55h18v-70h36v70h24v-40h26v40h30v-60h30v60h22v-30h40v30h70v150H0z" fill="${c.city || '#1b2a66'}"/>
      ${Array.from({ length: 40 }, (_, i) => `<rect x="${(i * 37) % 480 + 8}" y="${200 + (i * 29) % 50}" width="4" height="5" fill="#ffe7b0" fill-opacity=".85"/>`).join('')}
      <rect x="0" y="300" width="500" height="100" fill="${c.floor || '#22205a'}"/><rect x="0" y="296" width="500" height="5" fill="${a}"/>
      <path d="M10 262 Q90 280 170 262 T330 262 T490 262" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/>${[50, 130, 210, 290, 370, 450].map(x => `<circle cx="${x}" cy="270" r="4" fill="#fff3b0"/>`).join('')}
      <g transform="translate(400 70)" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M-26 0a37 37 0 0 1 52 0"/><path d="M-16 12a22 22 0 0 1 32 0"/><circle cx="0" cy="26" r="3" fill="#fff"/></g></svg>`; },
  };
  const openNow = ([a, b]) => { const n = new Date(), h = n.getHours() + n.getMinutes() / 60; return h >= a && h < b; };
  const hr = x => { const h = Math.floor(x), m = Math.round((x - h) * 60), d = new Date(); d.setHours(h, m); return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: m ? '2-digit' : undefined }); };
  const status = k => openNow(HOTEL[k]) ? 'Open now · till ' + hr(HOTEL[k][1]) : 'Opens at ' + hr(HOTEL[k][0]);
  const xpMedia = (x, artColours, sizes = '50vw') => x.pic ? pic(x.pic, sizes) : ART[x.art](artColours);

  /* fill any element with a data-jg attribute */
  function fill() {
    const wa = `https://wa.me/${HOTEL.whatsapp}?text=` + encodeURIComponent(`Hello ${HOTEL.name}, I would like to know about room availability.`);
    const map = {
      phone: `<a href="tel:${tel(HOTEL.mobiles[0])}">${esc(HOTEL.mobiles[0])}</a>`, email: `<a href="mailto:${HOTEL.email}">${esc(HOTEL.email)}</a>`,
      address: `<a href="${esc(HOTEL.mapLink)}" target="_blank" rel="noopener">${esc(HOTEL.address)}</a>`, gst: 'GSTIN ' + HOTEL.gstin, year: String(new Date().getFullYear()),
      phones: [...HOTEL.mobiles, ...HOTEL.landlines].map(n => `<a href="tel:${tel(n)}">${esc(n)}</a>`).join(' · '), times: `Check-in ${HOTEL.checkIn} · Check-out ${HOTEL.checkOut}`,
    };
    $$('[data-jg]').forEach(el => { if (map[el.dataset.jg] != null) el.innerHTML = map[el.dataset.jg]; });
    $$('[data-pic]').forEach(el => { el.innerHTML = pic(el.dataset.pic, el.dataset.sizes || '100vw', el.hasAttribute('data-eager'), el.dataset.style || ''); });
    $$('[data-wa]').forEach(a => { a.href = wa; a.target = '_blank'; a.rel = 'noopener'; });
    $$('[data-tel]').forEach(a => { a.href = 'tel:' + tel(HOTEL.mobiles[0]); });
    $$('[data-map]').forEach(a => { a.href = HOTEL.mapLink; a.target = '_blank'; a.rel = 'noopener'; });
    $$('[data-status]').forEach(el => { el.textContent = status(el.dataset.status); });
    $$('[data-mapframe]').forEach(el => { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { el.innerHTML = `<iframe title="Map to Hotel Jothi Grand" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${encodeURIComponent(HOTEL.mapQuery)}&z=15&output=embed" style="border:0;width:100%;height:100%;display:block"></iframe>`; io.disconnect(); } }, { rootMargin: '300px' }); io.observe(el); });
  }

  /* booking form: <form data-book> with fields ci, co, room, rooms, guests, name, phone, email, req, website (hidden) */
  function booking(f, opts = {}) {
    const today = iso(new Date());
    f.room.innerHTML = ROOMS.map(r => `<option>${esc(r.key)}</option>`).join('') + XP.map(x => `<option>${esc(x.pick)}</option>`).join('');
    f.ci.min = today; f.ci.value = today; f.co.min = addDays(today, 1); f.co.value = addDays(today, 1);
    const isRoom = () => ROOMS.some(r => r.key === f.room.value);
    const guests = () => { const per = (ROOMS.find(r => r.key === f.room.value) || { max: 6 }).max, max = per * (+f.rooms.value || 1), cur = +f.guests.value || 2; f.guests.innerHTML = Array.from({ length: max }, (_, i) => `<option value="${i + 1}" ${i + 1 === Math.min(cur, max) ? 'selected' : ''}>${i + 1} guest${i ? 's' : ''}</option>`).join(''); };
    const sum = () => { if (f.co.value <= f.ci.value) f.co.value = addDays(f.ci.value, 1); f.co.min = addDays(f.ci.value, 1); const n = Math.round((new Date(f.co.value) - new Date(f.ci.value)) / 864e5);
      f.co.closest('label').style.opacity = isRoom() ? 1 : .45; f.rooms.disabled = !isRoom();
      const s = $('[data-sum]', f); if (s) s.innerHTML = isRoom() ? `<b>${esc(f.room.value)}</b> · ${nice(f.ci.value)} → ${nice(f.co.value)} · ${n} night${n > 1 ? 's' : ''} · ${f.guests.value} guest${f.guests.value > 1 ? 's' : ''}` : `<b>${esc(f.room.value)}</b> · ${nice(f.ci.value)} · ${f.guests.value} guest${f.guests.value > 1 ? 's' : ''}`; };
    f.room.addEventListener('change', guests); f.rooms.addEventListener('change', guests); f.addEventListener('input', sum); f.addEventListener('change', sum); guests(); f.guests.value = '2'; sum();
    const pick = v => { f.room.value = v; guests(); sum(); };
    $$('[data-pick]').forEach(a => a.addEventListener('click', () => { pick(a.dataset.pick); setTimeout(() => f.name.focus({ preventScroll: true }), 800); }));
    const msg = (t, ok) => { let m = $('[data-msg]', f); if (!m) return alert(t); m.className = 'jg-msg ' + (ok ? 'ok' : 'err'); m.innerHTML = t; };
    f.addEventListener('submit', async e => {
      e.preventDefault();
      if (f.name.value.trim().length < 2) { f.name.focus(); return msg('Please enter your name.'); }
      if (f.phone.value.replace(/\D/g, '').length < 10) { f.phone.focus(); return msg('Please enter a 10-digit mobile number.'); }
      if (f.email.value && !f.email.checkValidity()) { f.email.focus(); return msg('Please check your email address.'); }
      const btn = $('button[type=submit], button:not([type])', f), label = btn.innerHTML; btn.disabled = true; btn.innerHTML = 'Sending…';
      const data = { name: f.name.value, phone: f.phone.value, email: f.email.value, room: f.room.value, ci: f.ci.value, co: isRoom() ? f.co.value : '', rooms: f.rooms.value, guests: f.guests.value, req: f.req.value, website: f.website ? f.website.value : '' };
      const lines = [`Booking enquiry · ${HOTEL.name}`, `Name: ${data.name}`, `Mobile: ${data.phone}`, `For: ${data.room}`, `Dates: ${data.ci}${data.co ? ' to ' + data.co : ''}`, `Guests: ${data.guests}`, data.req && `Requests: ${data.req}`].filter(Boolean).join('\n');
      const waLink = `https://wa.me/${HOTEL.whatsapp}?text=${encodeURIComponent(lines)}`;
      try {
        const r = await fetch(HOTEL.bookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw new Error(j.error || 'Could not send');
        msg(`<b>Thank you, ${esc(data.name.trim())}!</b> Your request <b>${esc(j.ref)}</b> has reached our reservations team. We will call you shortly to confirm.${j.emailed ? ' A copy is on its way to your email.' : ''}`, true);
        f.name.value = f.phone.value = f.email.value = f.req.value = '';
        opts.onSent && opts.onSent(j);
      } catch (err) {
        msg(`${esc(err.message && err.message !== 'Failed to fetch' ? err.message : 'We could not send your request just now.')} <a href="${waLink}" target="_blank" rel="noopener">Send it on WhatsApp instead</a> or call <a href="tel:${tel(HOTEL.mobiles[0])}">${esc(HOTEL.mobiles[0])}</a>.`);
      } finally { btn.disabled = false; btn.innerHTML = label; }
    });
    return { pick };
  }

  /* reveal on scroll, header state, simple slideshow */
  function motion() {
    const io = 'IntersectionObserver' in window && !reduce ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 }) : null;
    $$('.rv').forEach((el, i) => { if (io) { el.style.transitionDelay = `${(i % 3) * 90}ms`; io.observe(el); } else el.classList.add('in'); });
    const nav = $('[data-nav]'); if (nav) { const s = () => nav.classList.toggle('scrolled', scrollY > 40); addEventListener('scroll', s, { passive: true }); s(); }
    const menu = $('[data-menu]'), links = $('[data-links]'); if (menu && links) { menu.onclick = () => { const o = links.classList.toggle('open'); menu.setAttribute('aria-expanded', o); }; $$('a', links).forEach(a => a.addEventListener('click', () => links.classList.remove('open'))); }
    $$('[data-slides]').forEach(box => { const sl = $$('.slide', box); if (sl.length < 2 || reduce) return; let at = 0; setInterval(() => { sl[at].classList.remove('on'); at = (at + 1) % sl.length; sl[at].classList.add('on'); }, +box.dataset.slides || 5500); });
  }

  const BOOK_FORM = (cls = '') => `
    <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
    <label class="${cls} half">Check-in<input type="date" name="ci" required></label>
    <label class="${cls} half">Check-out<input type="date" name="co"></label>
    <label class="${cls} half">Booking for<select name="room"></select></label>
    <label class="${cls} half">Rooms &amp; guests<span class="pair"><select name="rooms" aria-label="Rooms"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select><select name="guests" aria-label="Guests"></select></span></label>
    <label class="${cls} full">Your name<input name="name" required autocomplete="name"></label>
    <label class="${cls} half">Mobile number<input name="phone" required inputmode="tel" autocomplete="tel" placeholder="+91"></label>
    <label class="${cls} half">Email (optional)<input name="email" type="email" autocomplete="email"></label>
    <label class="${cls} full">Special requests<input name="req" placeholder="Early check-in, extra bed, rooftop dinner…"></label>
    <div class="jg-sum full" data-sum></div>
    <button class="full" type="submit">Request booking</button>
    <div class="jg-msg full" data-msg role="status" aria-live="polite"></div>`;

  document.head.insertAdjacentHTML('beforeend', '<style>picture{display:block;width:100%;height:100%}</style>');
  return { HOTEL, ROOMS, XP, AMEN, PIC, pic, ic, esc, ART, status, xpMedia, fill, booking, motion, BOOK_FORM, $, $$, reduce };
})();
