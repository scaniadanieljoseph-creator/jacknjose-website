/* Jack & Jose Hotels — hotel booking platform + hotels master portal */
'use strict';

const ROOM_TYPES = [
  { key: 'Standard', mult: 1, desc: 'Queen bed · 180 sq ft · City view' },
  { key: 'Deluxe', mult: 1.35, desc: 'King bed · 260 sq ft · Breakfast included' },
  { key: 'Suite', mult: 2.1, desc: 'Separate living room · 420 sq ft · Breakfast & airport pickup' },
];
const AMENITIES = ['Free WiFi', 'Breakfast', 'Pool', 'Parking', 'AC', 'Restaurant', 'Gym', 'Spa', 'Airport shuttle', 'Lake view', 'Beach access', 'Power backup'];
SEED.hotels = () => [
  ['Jack & Jose Residency', 'Kochi', 'MG Road', 4, 4200, 4.6, 'Free WiFi, Breakfast, Pool, Parking, AC, Restaurant, Gym', 48, 210],
  ['Marine Drive Bay Inn', 'Kochi', 'Marine Drive', 3, 2600, 4.2, 'Free WiFi, AC, Restaurant, Parking', 36, 195],
  ['Fort Heritage Bungalow', 'Kochi', 'Fort Kochi', 4, 5400, 4.7, 'Free WiFi, Breakfast, AC, Restaurant, Lake view', 14, 25],
  ['Kovalam Palm Retreat', 'Thiruvananthapuram', 'Kovalam', 4, 4800, 4.5, 'Free WiFi, Breakfast, Pool, Beach access, Spa, AC', 30, 165],
  ['Capital Business Hotel', 'Thiruvananthapuram', 'Thampanoor', 3, 2300, 4.0, 'Free WiFi, AC, Restaurant, Power backup', 40, 220],
  ['Backwater Crest Resort', 'Alappuzha', 'Punnamada', 5, 8900, 4.8, 'Free WiFi, Breakfast, Pool, Spa, Lake view, Restaurant, AC', 22, 175],
  ['Canal Side Homestay', 'Alappuzha', 'Finishing Point', 2, 1500, 4.4, 'Free WiFi, Breakfast, Lake view', 8, 140],
  ['Calicut Beach Suites', 'Kozhikode', 'Beach Road', 3, 2900, 4.3, 'Free WiFi, AC, Restaurant, Beach access, Parking', 28, 30],
  ['Garden City Grand', 'Bengaluru', 'Indiranagar', 4, 5600, 4.4, 'Free WiFi, Breakfast, Gym, AC, Restaurant, Parking', 80, 225],
  ['Tech Park Stay', 'Bengaluru', 'Whitefield', 3, 3200, 4.1, 'Free WiFi, AC, Gym, Power backup, Parking', 60, 205],
  ['Airport Transit Hotel', 'Bengaluru', 'Devanahalli', 3, 3600, 4.0, 'Free WiFi, AC, Airport shuttle, Restaurant', 50, 190],
  ['Marina Seaview Hotel', 'Chennai', 'Besant Nagar', 4, 4900, 4.4, 'Free WiFi, Breakfast, Pool, AC, Beach access', 54, 200],
  ['Central Station Lodge', 'Chennai', 'Egmore', 2, 1600, 3.8, 'Free WiFi, AC, Power backup', 42, 215],
  ['Candolim Sands Resort', 'Goa', 'Candolim', 4, 6200, 4.5, 'Free WiFi, Breakfast, Pool, Beach access, Restaurant, AC', 44, 15],
  ['Panjim Riverside Inn', 'Goa', 'Panaji', 3, 3100, 4.2, 'Free WiFi, AC, Restaurant, Parking', 26, 185],
  ['Harbour Line Hotel', 'Mumbai', 'Andheri East', 3, 4600, 4.1, 'Free WiFi, AC, Airport shuttle, Restaurant, Gym', 70, 230],
  ['Bandstand Boutique', 'Mumbai', 'Bandra West', 4, 7800, 4.6, 'Free WiFi, Breakfast, AC, Restaurant, Spa', 32, 200],
  ['Connaught Place Residency', 'Delhi', 'Connaught Place', 4, 6400, 4.4, 'Free WiFi, Breakfast, AC, Gym, Restaurant, Parking', 64, 215],
  ['Aerocity Transit Suites', 'Delhi', 'Aerocity', 4, 5900, 4.3, 'Free WiFi, Airport shuttle, AC, Gym, Restaurant', 90, 195],
  ['Hitech City Comforts', 'Hyderabad', 'Madhapur', 3, 3400, 4.2, 'Free WiFi, AC, Gym, Breakfast, Parking', 48, 210],
  ['Pink City Haveli', 'Jaipur', 'Old City', 4, 4400, 4.6, 'Free WiFi, Breakfast, Pool, Restaurant, AC', 24, 30],
  ['Chamundi View Hotel', 'Mysuru', 'Nazarbad', 3, 2700, 4.3, 'Free WiFi, Breakfast, AC, Parking', 30, 160],
  ['Coimbatore Business Inn', 'Coimbatore', 'Avinashi Road', 3, 2800, 4.1, 'Free WiFi, AC, Restaurant, Parking, Power backup', 44, 220],
  ['Temple Town Residency', 'Madurai', 'Near Meenakshi Temple', 3, 2400, 4.2, 'Free WiFi, AC, Breakfast, Restaurant', 36, 25],
].map(([name, city, area, stars, price, rating, amenities, rooms, hue], i) => ({ id: 'HTL' + (301 + i), name, city, area, stars, price, rating, reviews: 120 + ((i * 97) % 900), amenities, rooms, hue, active: 'Active', createdAt: new Date().toISOString() }));
SEED.hotelBookings = () => {
  const hotels = SEED.hotels(), r = rng(7), out = [];
  for (let i = 0; i < 12; i++) {
    const h = hotels[Math.floor(r() * hotels.length)], ci = todayISO(Math.floor(r() * 12) - 3), n = 1 + Math.floor(r() * 3), rt = ROOM_TYPES[Math.floor(r() * 3)], rooms = 1 + (r() < .25 ? 1 : 0);
    const co = (() => { const d = new Date(ci + 'T00:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })();
    const base = h.price * rt.mult * n * rooms;
    out.push({ id: genIdSeed('JJH', i), hotelId: h.id, hotelName: h.name, city: h.city, checkIn: ci, checkOut: co, nights: n, rooms, guests: rooms * 2, roomType: rt.key, base, tax: base * gstRate(h.price * rt.mult), total: Math.round(base * (1 + gstRate(h.price * rt.mult))),
      guest: SAMPLE_NAMES[(i + 5) % SAMPLE_NAMES.length], phone: '+91 97' + String(20000000 + i * 613427).slice(0, 8), email: '', status: ci < todayISO() ? (r() < .5 ? 'Checked-out' : 'Checked-in') : r() < .1 ? 'Cancelled' : 'Confirmed', createdAt: new Date(Date.now() - i * 3600e3 * 9).toISOString(), sample: true });
  }
  return out;
};
function genIdSeed(p, i) { return p + String(5100 + i * 29); }
const gstRate = perNight => perNight > 7500 ? 0.18 : 0.12;
const starStr = n => '★'.repeat(n) + '☆'.repeat(5 - n);
const overlap = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;
function roomsLeft(h, ci, co) {
  const occ = Math.floor(h.rooms * (0.35 + rng(hashStr(h.id + ci))() * 0.5));
  const booked = Store.get('hotelBookings').filter(b => b.hotelId === h.id && ['Confirmed', 'Checked-in'].includes(b.status) && overlap(b.checkIn, b.checkOut, ci, co)).reduce((s, b) => s + b.rooms, 0);
  return Math.max(0, h.rooms - occ - booked);
}
const hotelImg = h => `background:linear-gradient(135deg,hsl(${h.hue} 55% 32%),hsl(${(h.hue + 40) % 360} 60% 45%))`;

function hotelSearchForm(s = Session.get('hotelSearch') || {}) {
  const ci = s.checkIn && s.checkIn >= todayISO() ? s.checkIn : todayISO(1);
  return `<form class="search-row hotel" id="hotel-search" autocomplete="off">
    <label class="field"><span>City or destination</span><input class="input" id="hs-city" name="city" list="dl-india" value="${esc(s.city || 'Kochi')}" required></label>
    <label class="field"><span>Check-in</span><input class="input" id="hs-in" type="date" name="checkIn" min="${todayISO()}" value="${ci}" required></label>
    <label class="field"><span>Check-out</span><input class="input" id="hs-out" type="date" name="checkOut" min="${todayISO(1)}" value="${s.checkOut && s.checkOut > ci ? s.checkOut : todayISO(2)}" required></label>
    <label class="field"><span>Rooms</span><input class="input" id="hs-rooms" type="number" name="rooms" min="1" max="8" value="${s.rooms || 1}" required></label>
    <label class="field"><span>Guests</span><input class="input" id="hs-guests" type="number" name="guests" min="1" max="24" value="${s.guests || 2}" required></label>
    <button class="btn btn-green btn-lg">${icon('search')} Search</button></form>`;
}
function bindHotelSearch(root) {
  const f = $('#hotel-search', root); if (!f) return;
  f.checkIn.onchange = () => { if (f.checkOut.value <= f.checkIn.value) { const d = new Date(f.checkIn.value + 'T00:00:00'); d.setDate(d.getDate() + 1); f.checkOut.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; } f.checkOut.min = f.checkOut.value; };
  f.onsubmit = e => {
    e.preventDefault();
    if (f.checkOut.value <= f.checkIn.value) return toast('Check-out must be after check-in', 'err');
    if (+f.guests.value > +f.rooms.value * 3) return toast('Up to 3 guests per room. Add another room.', 'err');
    Session.set('hotelSearch', { city: cityKey(f.city.value) || f.city.value.trim(), checkIn: f.checkIn.value, checkOut: f.checkOut.value, rooms: +f.rooms.value, guests: +f.guests.value }); go('hotel-results');
  };
}
function hotelVoucherHtml(b) {
  return `<div class="ticket"><div class="ticket-head"><div><div class="small" style="opacity:.8">Jack & Jose Hotels · Booking voucher</div><h3 style="color:#fff;margin-top:4px">${esc(b.hotelName)}</h3><div class="small" style="opacity:.85">${esc(b.city)}</div></div>
    <div style="text-align:right"><div class="small" style="opacity:.8">Booking ID</div><b class="mono" style="font-size:1.2rem">${esc(b.id)}</b></div></div>
    <div class="ticket-body"><div class="kv"><div><span>Check-in</span><b>${fmtDate(b.checkIn)}</b><div class="muted small">from 12:00 PM</div></div><div><span>Check-out</span><b>${fmtDate(b.checkOut)}</b><div class="muted small">by 11:00 AM</div></div><div><span>Nights</span><b>${b.nights}</b></div><div><span>Status</span><b>${statusChip(b.status)}</b></div></div>
    <div class="kv"><div><span>Room</span><b>${esc(b.roomType)} × ${b.rooms}</b></div><div><span>Guests</span><b>${b.guests}</b></div><div><span>Guest name</span><b>${esc(b.guest)}</b></div><div><span>Phone</span><b>${esc(b.phone)}</b></div>${Pay.kv(b.id)}</div></div>
    <div class="ticket-perf"></div><div class="ticket-body"><div><div class="line-item"><span>Room charges</span><span>${inr(b.base)}</span></div><div class="line-item"><span>GST</span><span>${inr(b.tax)}</span></div><div class="line-item total"><span>Total</span><span>${inr(b.total)}</span></div></div>${Notify.note(b.id)}
    <p class="muted small">Carry a government photo ID at check-in. Free cancellation until 24 hours before check-in.</p></div></div>`;
}

ROUTE_TITLES.hotels = 'Hotel booking';
route('hotels', app => {
  const cities = [...new Set(Store.get('hotels').filter(h => h.active === 'Active').map(h => h.city))];
  app.innerHTML = pageHero({ eyebrow: 'Jack & Jose Hotels', title: 'Stays from backwater resorts to business hotels', lead: 'Compare verified hotels, check live room availability and get a booking voucher in seconds. Free cancellation up to 24 hours before check-in.' }) +
  `<section class="wrap overlap"><div class="search-box">${hotelSearchForm()}</div></section>
  <section class="section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Destinations</div><h2 style="margin-top:6px">Where our partner hotels are</h2></div></div>
    <div class="grid g4">${cities.map(c => { const hs = Store.get('hotels').filter(h => h.city === c && h.active === 'Active'); const min = Math.min(...hs.map(h => h.price)); return `<button class="card svc" data-city="${esc(c)}" style="text-align:left;cursor:pointer;padding:0;overflow:hidden"><div style="${hotelImg(hs[0])};height:90px;display:grid;place-items:center;color:#fff;font-family:var(--font-display);font-size:1.3rem;font-weight:700">${esc(c)}</div><div style="padding:14px 16px"><b>${hs.length} hotel${hs.length > 1 ? 's' : ''}</b><div class="muted small">from ${inr(min)} / night</div></div></button>`; }).join('')}</div></div></section>
  <section class="section-tight"><div class="wrap grid g2"><div class="card"><div class="eyebrow">Manage booking</div><h3 style="margin:6px 0 14px">Find your hotel booking</h3>
    <form id="hb-form" style="display:flex;gap:10px;flex-wrap:wrap"><input class="input mono" id="hbid" name="bid" placeholder="Booking ID, e.g. JJH5100" style="flex:1 1 180px" required><button class="btn btn-primary">Find booking</button></form></div>
    <div class="card" style="display:grid;gap:10px;align-content:center"><div class="eyebrow">Hotel partners</div><h3>List your property with Jack & Jose</h3><p class="muted">Hotel managers control rooms, rates and bookings in the Hotels master portal.</p><div><a class="btn btn-primary btn-sm" href="#hotels-admin">Open Hotels portal</a></div></div></div></section>`;
  bindHotelSearch(app);
  $$('[data-city]', app).forEach(b => b.onclick = () => { const f = $('#hotel-search'); f.city.value = b.dataset.city; f.requestSubmit(); });
  $('#hb-form', app).onsubmit = e => { e.preventDefault(); const id = e.target.bid.value.trim().toUpperCase(), b = Store.find('hotelBookings', id); if (!b) return toast(`No booking found for ${id}`, 'err');
    const can = b.status === 'Confirmed' && daysBetween(todayISO(), b.checkIn) >= 1;
    openModal('Hotel booking', hotelVoucherHtml(b) + (can ? `<div style="text-align:right"><button class="btn btn-danger" id="hb-cancel">Cancel booking (full refund)</button></div>` : ''), { wide: true, onMount: m => { const c = $('#hb-cancel', m); if (c) c.onclick = () => confirmBox(`Cancel booking ${b.id}? ${inr(b.total)} will be refunded.`, () => { Store.update('hotelBookings', b.id, { status: 'Cancelled' }); Pay.refundBooking(b.id, b.total, 'Hotel booking cancelled by guest'); Notify.event('hotel_cancelled', Store.find('hotelBookings', b.id)); toast('Hotel booking cancelled'); }, 'Cancel booking'); } }); };
});

ROUTE_TITLES['hotel-results'] = 'Hotels';
route('hotel-results', app => {
  const s = Session.get('hotelSearch'); if (!s) return go('hotels');
  const nights = daysBetween(s.checkIn, s.checkOut);
  const inCity = Store.get('hotels').filter(h => h.active === 'Active' && sameCity(h.city, s.city));
  const list0 = inCity.length ? inCity : Store.get('hotels').filter(h => h.active === 'Active');
  const maxP = Math.max(...list0.map(h => h.price));
  const st = { sort: 'pop', stars: new Set(), am: new Set(), max: maxP };
  app.innerHTML = `<div class="route-summary"><div class="wrap"><div class="cities">${esc(s.city)}</div><span class="chip" style="background:rgba(255,255,255,.12);color:#fff">${fmtDate(s.checkIn)} – ${fmtDate(s.checkOut)} · ${nights} night${nights > 1 ? 's' : ''}</span><span class="small" style="opacity:.85">${s.rooms} room${s.rooms > 1 ? 's' : ''}, ${s.guests} guest${s.guests > 1 ? 's' : ''}</span><span style="flex:1"></span><button class="btn btn-light btn-sm" id="modify">Modify search</button></div></div>
  <div class="wrap" id="modify-box" hidden style="padding-top:16px"><div class="search-box">${hotelSearchForm(s)}</div></div>
  ${inCity.length ? '' : `<div class="wrap" style="padding-top:16px"><div class="notice">We don't have partner hotels in ${esc(s.city)} yet. Showing all partner hotels instead.</div></div>`}
  <section class="section-tight"><div class="wrap results-layout"><aside class="filters card">
    <div><h4>Max price / night</h4><input type="range" id="pmax" min="1000" max="${maxP}" step="100" value="${maxP}" style="width:100%;accent-color:var(--green)"><div class="small"><b id="pmax-v">${inr(maxP)}</b></div></div>
    <div><h4>Star rating</h4><div class="stack">${[5, 4, 3, 2].map(n => `<label class="check"><input type="checkbox" data-star="${n}"> <span class="stars">${'★'.repeat(n)}</span></label>`).join('')}</div></div>
    <div><h4>Amenities</h4><div class="stack">${AMENITIES.slice(0, 9).map(a => `<label class="check"><input type="checkbox" data-am="${a}"> ${a}</label>`).join('')}</div></div></aside>
    <div style="min-width:0"><div class="sortbar"><b id="count"></b><span style="flex:1"></span><span class="muted small">Sort by</span>${[['pop', 'Popularity'], ['low', 'Price: low'], ['high', 'Price: high'], ['rating', 'Guest rating']].map(([k, l]) => `<button class="chip ${k === 'pop' ? 'on' : ''}" data-sort="${k}">${l}</button>`).join('')}</div><div class="stack" id="hotel-list"></div></div></div></section>`;
  bindHotelSearch(app);
  $('#modify').onclick = () => { $('#modify-box').hidden = !$('#modify-box').hidden; };
  function list() {
    let L = list0.filter(h => h.price <= st.max && (!st.stars.size || st.stars.has(h.stars)) && [...st.am].every(a => h.amenities.includes(a)));
    const by = { pop: (a, b) => b.reviews - a.reviews, low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price, rating: (a, b) => b.rating - a.rating }; L.sort(by[st.sort]);
    $('#count').textContent = `${L.length} propert${L.length === 1 ? 'y' : 'ies'}`;
    $('#hotel-list').innerHTML = L.map(h => { const left = roomsLeft(h, s.checkIn, s.checkOut), enough = left >= s.rooms;
      return `<article class="card hotel"><div class="hotel-img" style="${hotelImg(h)}"><span class="ini">${esc(h.name.split(' ').map(w => w[0]).slice(0, 2).join(''))}</span>${h.name.startsWith('Jack & Jose') ? '<span class="tag own-badge">Jack & Jose</span>' : ''}</div>
        <div class="hotel-body"><div><span class="stars small">${starStr(h.stars)}</span></div><h3>${esc(h.name)}</h3><div class="muted small">${icon('pin', '').replace('<svg', '<svg style="width:14px;height:14px;vertical-align:-2px"')} ${esc(h.area)}, ${esc(h.city)}</div>
        <div class="chips">${h.amenities.split(',').slice(0, 5).map(a => `<span class="chip">${esc(a.trim())}</span>`).join('')}</div>
        <div style="display:flex;gap:8px;align-items:center"><span class="rating">${h.rating.toFixed(1)}</span><span class="small muted">${h.rating >= 4.5 ? 'Excellent' : h.rating >= 4 ? 'Very good' : 'Good'} · ${h.reviews} reviews</span></div></div>
        <div class="hotel-side"><span class="small" style="color:${enough ? (left < 6 ? 'var(--danger)' : 'var(--green)') : 'var(--danger)'}">${enough ? (left < 6 ? `Only ${left} rooms left` : 'Rooms available') : 'Sold out for these dates'}</span>
        <b style="font-family:var(--font-display);font-size:1.4rem">${inr(h.price)}</b><span class="muted small">per room / night<br>+ ${gstRate(h.price) * 100}% GST</span>
        <button class="btn btn-green btn-sm" data-hotel="${h.id}" ${enough ? '' : 'disabled'}>Choose room</button></div></article>`; }).join('') || `<div class="card empty-state"><h3>No hotels match</h3><p>Raise the price limit or clear a filter.</p></div>`;
    $$('[data-hotel]').forEach(b => b.onclick = () => chooseRoom(Store.find('hotels', b.dataset.hotel)));
  }
  function chooseRoom(h) {
    let rt = ROOM_TYPES[0];
    const calc = () => { const per = h.price * rt.mult, base = per * nights * s.rooms, tax = base * gstRate(per); return { per, base, tax, total: Math.round(base + tax) }; };
    const summary = () => { const c = calc(); return `<div class="line-item"><span>${inr(c.per)} × ${nights} night${nights > 1 ? 's' : ''} × ${s.rooms} room${s.rooms > 1 ? 's' : ''}</span><span>${inr(c.base)}</span></div><div class="line-item"><span>GST ${gstRate(c.per) * 100}%</span><span>${inr(c.tax)}</span></div><div class="line-item total"><span>Total</span><span>${inr(c.total)}</span></div>`; };
    openModal(h.name, `<div class="muted">${esc(h.area)}, ${esc(h.city)} · ${fmtDate(s.checkIn)} – ${fmtDate(s.checkOut)}</div>
      <div class="stack" id="rooms">${ROOM_TYPES.map((r, i) => `<label class="room-opt ${i === 0 ? 'on' : ''}"><div><b>${r.key} room</b><div class="muted small">${r.desc}</div></div><div style="text-align:right"><b>${inr(h.price * r.mult)}</b><div class="muted small">/ night</div><input type="radio" name="rt" value="${i}" ${i === 0 ? 'checked' : ''} style="accent-color:var(--green)"></div></label>`).join('')}</div>
      <form id="guest" class="form-grid"><label class="field"><span>Lead guest name</span><input class="input" id="g-name" name="name" required></label><label class="field"><span>Mobile</span><input class="input" id="g-phone" name="phone" required pattern="[0-9+ ]{10,15}"></label><label class="field"><span>Email</span><input class="input" id="g-mail" name="email" type="email"></label>
        <label class="field full"><span>Special requests</span><input class="input" id="g-req" name="req" placeholder="Early check-in, extra bed…"></label>
        <div class="full card" style="background:var(--surface-2)" id="sum">${summary()}</div><button class="btn btn-green btn-lg full">Continue to payment</button></form>`, {
      wide: true, onMount: m => {
        $$('input[name=rt]', m).forEach(r => r.onchange = () => { rt = ROOM_TYPES[+r.value]; $$('.room-opt', m).forEach((o, i) => o.classList.toggle('on', i === +r.value)); $('#sum', m).innerHTML = summary(); });
        $('#guest', m).onsubmit = e => { e.preventDefault(); const f = e.target, c = calc();
          const b = { id: genId('JJH', 6), hotelId: h.id, hotelName: h.name, city: h.city, checkIn: s.checkIn, checkOut: s.checkOut, nights, rooms: s.rooms, guests: s.guests, roomType: rt.key, base: c.base, tax: c.tax, total: c.total, guest: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), request: f.req.value.trim(), status: 'Confirmed', createdAt: new Date().toISOString() };
          if (roomsLeft(h, s.checkIn, s.checkOut) < s.rooms) { closeModal(); toast('Those rooms just sold out. Choose another hotel.', 'err'); return list(); }
          Pay.checkout({ amount: b.total, description: `${h.name} · ${fmtDate(s.checkIn)} · ${nights} night(s) · ${rt.key} × ${s.rooms}`, bookingType: 'hotel', bookingId: b.id, customer: { name: b.guest, phone: b.phone, email: b.email },
            onSuccess: p => { b.paymentId = p.id; Store.add('hotelBookings', b); Notify.event('hotel_booked', b); toast('Paid & confirmed · ' + b.id); list(); openModal('Booking confirmed', hotelVoucherHtml(b), { wide: true }); } }); };
      },
    });
  }
  $('#pmax').oninput = e => { st.max = +e.target.value; $('#pmax-v').textContent = inr(st.max); list(); };
  $$('[data-star]').forEach(c => c.onchange = () => { c.checked ? st.stars.add(+c.dataset.star) : st.stars.delete(+c.dataset.star); list(); });
  $$('[data-am]').forEach(c => c.onchange = () => { c.checked ? st.am.add(c.dataset.am) : st.am.delete(c.dataset.am); list(); });
  $$('[data-sort]').forEach(c => c.onclick = () => { st.sort = c.dataset.sort; $$('[data-sort]').forEach(x => x.classList.toggle('on', x === c)); list(); });
  list();
});

ROUTE_TITLES['hotels-admin'] = 'Hotels portal';
route('hotels-admin', app => {
  const tabs = [['dash', 'Dashboard'], ['bookings', 'Bookings'], ['hotels', 'Hotels']];
  const active = Session.get('tab_#hotels-admin') || 'dash';
  app.innerHTML = adminShell({ title: 'Hotels master portal', sub: 'Partner properties, rates, room inventory and guest bookings.', tabs, active, base: 'hotels' });
  const body = $('#admin-body', app);
  const setStatus = (r, status, rr) => { Store.update('hotelBookings', r.id, { status }); if (status === 'Cancelled') Pay.refundBooking(r.id, r.total, 'Hotel booking cancelled by hotel'); const ev = { Cancelled: 'hotel_cancelled', 'Checked-in': 'hotel_checkin', 'Checked-out': 'hotel_checkout' }[status]; if (ev) Notify.event(ev, Store.find('hotelBookings', r.id)); toast(`${r.id} marked ${status}`); rr(); };
  const show = tab => {
    if (tab === 'dash') {
      const bk = Store.get('hotelBookings'), live = bk.filter(b => b.status !== 'Cancelled'), H = Store.get('hotels');
      const rev = live.reduce((s, b) => s + b.total, 0), nights = live.reduce((s, b) => s + b.nights * b.rooms, 0);
      const inHouse = bk.filter(b => b.status === 'Checked-in').length, arrivals = bk.filter(b => b.status === 'Confirmed' && b.checkIn === todayISO()).length;
      const byHotel = {}; live.forEach(b => { byHotel[b.hotelName] = (byHotel[b.hotelName] || 0) + b.total; });
      const byCity = {}; H.filter(h => h.active === 'Active').forEach(h => { byCity[h.city] = (byCity[h.city] || 0) + h.rooms; });
      body.innerHTML = `<div class="kpis">${kpi('Bookings', live.length, `${bk.length - live.length} cancelled`)}${kpi('Revenue', inr(rev), 'incl. GST')}${kpi('Room nights sold', nights)}${kpi('Guests in house', inHouse, `${arrivals} arriving today`)}${kpi('Active hotels', H.filter(h => h.active === 'Active').length, `${H.reduce((s, h) => s + (+h.rooms || 0), 0)} rooms listed`)}</div>
        <div class="grid g2" style="margin-top:18px"><div class="card"><h3 style="margin-bottom:14px">Top hotels by revenue</h3>${bars(Object.entries(byHotel).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => [k, v, inr(v)]))}</div>
        <div class="card"><h3 style="margin-bottom:14px">Room inventory by city</h3>${bars(Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 8))}</div></div>`;
    }
    if (tab === 'bookings') renderCrud(body, { key: 'hotelBookings', single: 'Booking', plural: 'Bookings', noAdd: true, noEdit: true, label: r => r.id,
      columns: [{ label: 'Booking', render: r => `<span class="mono">${esc(r.id)}</span>` }, { label: 'Hotel', render: r => `${esc(r.hotelName)}<div class="muted small">${esc(r.city)}</div>` }, { label: 'Stay', render: r => `${fmtDate(r.checkIn)}<div class="muted small">${r.nights} night(s) · ${esc(r.roomType)} × ${r.rooms}</div>` }, { label: 'Guest', render: r => `${esc(r.guest)}<div class="muted small">${esc(r.phone)}</div>` }, { label: 'Amount', render: r => inr(r.total) }, { label: 'Status', render: r => statusChip(r.status) }],
      actions: [{ id: 'v', label: 'Voucher', run: r => openModal('Booking voucher', hotelVoucherHtml(r), { wide: true }) }, { id: 'in', label: 'Check in', show: r => r.status === 'Confirmed', run: (r, rr) => setStatus(r, 'Checked-in', rr) }, { id: 'out', label: 'Check out', show: r => r.status === 'Checked-in', run: (r, rr) => setStatus(r, 'Checked-out', rr) }, { id: 'c', label: 'Cancel', show: r => r.status === 'Confirmed', run: (r, rr) => confirmBox(`Cancel booking ${r.id} for ${r.guest}?`, () => setStatus(r, 'Cancelled', rr), 'Cancel booking') }] });
    if (tab === 'hotels') renderCrud(body, { key: 'hotels', single: 'Hotel', plural: 'Hotels', idPrefix: 'HTL', label: r => r.name, defaults: { reviews: 0, hue: 200 },
      fields: [{ name: 'name', label: 'Hotel name', required: true }, { name: 'city', label: 'City', list: 'dl-india', required: true }, { name: 'area', label: 'Area / locality', required: true }, { name: 'stars', label: 'Star category', type: 'select', options: [[5, '5 star'], [4, '4 star'], [3, '3 star'], [2, '2 star'], [1, '1 star']] },
        { name: 'price', label: 'Base rate / night (₹)', type: 'number', min: 300, required: true, default: 2500 }, { name: 'rooms', label: 'Rooms', type: 'number', min: 1, required: true, default: 20 }, { name: 'rating', label: 'Guest rating', type: 'number', min: 1, max: 5, step: '0.1', default: 4.2 }, { name: 'active', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
        { name: 'amenities', label: 'Amenities (comma separated)', full: true, default: 'Free WiFi, AC, Parking', placeholder: AMENITIES.join(', ') }],
      validate: d => { d.stars = +d.stars; return null; },
      columns: [{ label: 'Hotel', render: r => `<b>${esc(r.name)}</b><div class="muted small">${esc(r.id)} · <span class="stars">${'★'.repeat(+r.stars)}</span></div>` }, { label: 'Location', render: r => `${esc(r.area)}<div class="muted small">${esc(r.city)}</div>` }, { label: 'Rate', render: r => inr(r.price) }, { label: 'Rooms', field: 'rooms' }, { label: 'Rating', render: r => `<span class="rating">${(+r.rating).toFixed(1)}</span>` }, { label: 'Status', render: r => statusChip(r.active) }],
      actions: [{ id: 'tg', label: 'Toggle', run: (r, rr) => { Store.update('hotels', r.id, { active: r.active === 'Active' ? 'Inactive' : 'Active' }); toast(`${r.name} is now ${r.active === 'Active' ? 'hidden from' : 'listed on'} the site`); rr(); } }] });
  };
  bindTabs(app, show); show(active);
});
