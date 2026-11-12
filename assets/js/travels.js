/* Jack & Jose Travels — bus booking platform + travels master portal */
'use strict';

const BUS_TYPES = {
  'AC Sleeper (2+1)': { layout: 'sleeper', ac: true, sleeper: true, rate: 2.1 },
  'Non-AC Sleeper (2+1)': { layout: 'sleeper', ac: false, sleeper: true, rate: 1.5 },
  'Volvo Multi-Axle AC Semi-Sleeper (2+2)': { layout: 'seater', ac: true, sleeper: false, rate: 1.9 },
  'AC Seater (2+2)': { layout: 'seater', ac: true, sleeper: false, rate: 1.6 },
  'Non-AC Seater (2+2)': { layout: 'seater', ac: false, sleeper: false, rate: 1.1 },
};
const PARTNER_OPERATORS = ['Malabar Star Travels', 'Southern Comfort Lines', 'Deccan Express Coaches', 'Konkan Coastal Travels', 'Western Ghats Travels', 'Ganga Tours & Travels', 'Coromandel Roadlines', 'Sahyadri Sleeper Co.'];
const OWN_OPERATOR = 'Jack & Jose Travels';
const SAMPLE_NAMES = ['Anitha Varghese', 'Rahul Menon', 'Fathima Rasheed', 'Arjun Nair', 'Priya Sundaram', 'Joseph Mathew', 'Deepak Rao', 'Sneha Pillai', 'Mohammed Irfan', 'Kavya Reddy', 'Vivek Sharma', 'Neha Joshi', 'Thomas Kurian', 'Lakshmi Iyer'];

SEED.buses = () => [
  ['Kochi', 'Bengaluru', '20:30', 600, 'AC Sleeper (2+1)', 1349, 4.6], ['Kochi', 'Bengaluru', '22:15', 590, 'Volvo Multi-Axle AC Semi-Sleeper (2+2)', 1099, 4.4],
  ['Bengaluru', 'Kochi', '21:00', 610, 'AC Sleeper (2+1)', 1349, 4.5], ['Kochi', 'Chennai', '19:45', 690, 'AC Sleeper (2+1)', 1449, 4.3],
  ['Chennai', 'Kochi', '20:00', 690, 'AC Sleeper (2+1)', 1449, 4.4], ['Thiruvananthapuram', 'Bengaluru', '18:30', 750, 'AC Sleeper (2+1)', 1599, 4.5],
  ['Kozhikode', 'Bengaluru', '22:00', 480, 'Non-AC Sleeper (2+1)', 849, 4.1], ['Kochi', 'Coimbatore', '07:00', 270, 'AC Seater (2+2)', 449, 4.2],
  ['Kochi', 'Thiruvananthapuram', '06:15', 260, 'AC Seater (2+2)', 429, 4.3], ['Bengaluru', 'Hyderabad', '21:30', 600, 'Volvo Multi-Axle AC Semi-Sleeper (2+2)', 1199, 4.4],
  ['Chennai', 'Bengaluru', '23:00', 380, 'AC Sleeper (2+1)', 899, 4.2], ['Thrissur', 'Chennai', '20:45', 640, 'Non-AC Sleeper (2+1)', 999, 4.0],
].map(([from, to, dep, durationMin, type, fare, rating], i) => ({
  id: 'BUS' + String(101 + i), operator: OWN_OPERATOR, busNo: `KL-07-JJ-${String(4100 + i * 37)}`, type, from, to, dep, durationMin, fare, rating,
  amenities: BUS_TYPES[type].ac ? 'WiFi, Charging point, Water bottle, Blanket, Reading light' : 'Charging point, Water bottle', active: 'Active', createdAt: new Date().toISOString(),
}));
SEED.agents = () => [
  ['Sajan Thomas', 'Sajan Tours & Travels', 'Kochi', 8], ['Meera Krishnan', 'Meera Holidays', 'Thiruvananthapuram', 7], ['Abdul Kareem', 'Malabar Ticket Point', 'Kozhikode', 7.5],
  ['Ravi Kumar', 'Ravi Travel Desk', 'Bengaluru', 6], ['Suganya P', 'Chennai Bus Booking Centre', 'Chennai', 6.5],
].map(([name, agency, city, commission], i) => ({ id: 'AGT' + (201 + i), name, agency, city, phone: '+91 9' + String(840000000 + i * 1371137).slice(0, 9), email: agency.toLowerCase().replace(/[^a-z]/g, '').slice(0, 14) + '@example.com', commission, status: i === 4 ? 'Inactive' : 'Active', createdAt: new Date().toISOString() }));
SEED.busBookings = () => {
  const buses = SEED.buses(), r = rng(42), out = [];
  for (let i = 0; i < 16; i++) {
    const b = buses[Math.floor(r() * buses.length)], date = todayISO(Math.floor(r() * 9) - 2), n = 1 + Math.floor(r() * 3);
    const seats = Array.from({ length: n }, (_, k) => (BUS_TYPES[b.type].sleeper ? (r() < .5 ? 'L' : 'U') : '') + (1 + ((i * 3 + k * 5) % 18)));
    const name = SAMPLE_NAMES[i % SAMPLE_NAMES.length], agentId = r() < .45 ? 'AGT' + (201 + Math.floor(r() * 4)) : '';
    const sub = b.fare * n;
    out.push({ id: 'JJB' + (7301 + i * 13), busId: b.id, operator: b.operator, busNo: b.busNo, type: b.type, from: b.from, to: b.to, date, dep: b.dep, arr: addMins(b.dep, b.durationMin).t,
      seats, passengers: seats.map((s, k) => ({ seat: s, name: k ? `Co-passenger ${k}` : name, age: 22 + Math.floor(r() * 30), gender: r() < .5 ? 'Female' : 'Male' })),
      boarding: b.from + ' Central Bus Stand', dropping: b.to + ' Central Bus Stand', fare: b.fare, total: Math.round(sub * 1.05), phone: '+91 98' + String(10000000 + i * 734521).slice(0, 8), email: '',
      agentId, status: r() < .12 ? 'Cancelled' : 'Confirmed', createdAt: new Date(Date.now() - i * 3600e3 * 7).toISOString(), sample: true });
  }
  return out;
};

function addMins(hhmm, mins) { const [h, m] = hhmm.split(':').map(Number); const t = h * 60 + m + mins; return { t: `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`, days: Math.floor(t / 1440) }; }
const durTxt = m => `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
const sameCity = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

function busesForRoute(from, to) {
  const own = Store.get('buses').filter(b => b.active === 'Active' && sameCity(b.from, from) && sameCity(b.to, to)).map(b => ({ ...b, own: b.operator === OWN_OPERATOR }));
  const km = roadKm(from, to), r = rng(hashStr(from.toLowerCase() + '|' + to.toLowerCase()));
  const hours = [5, 6, 7, 9, 10, 13, 14, 16, 18, 19, 20, 20, 21, 21, 22, 22, 23];
  const types = Object.keys(BUS_TYPES), n = 4 + Math.floor(r() * 5), gen = [];
  for (let i = 0; i < n; i++) {
    const type = types[Math.floor(r() * types.length)], T = BUS_TYPES[type];
    const dep = `${pad(hours[Math.floor(r() * hours.length)])}:${pad([0, 15, 30, 45][Math.floor(r() * 4)])}`;
    gen.push({ id: `G${hashStr(from + to).toString(36).toUpperCase()}${i}`, operator: i === 0 && !own.length ? OWN_OPERATOR : PARTNER_OPERATORS[Math.floor(r() * PARTNER_OPERATORS.length)],
      busNo: `${['KL', 'TN', 'KA', 'MH', 'AP'][Math.floor(r() * 5)]}-${pad(1 + Math.floor(r() * 60))}-${String.fromCharCode(65 + Math.floor(r() * 26))}${String.fromCharCode(65 + Math.floor(r() * 26))}-${1000 + Math.floor(r() * 8999)}`,
      type, from, to, dep, durationMin: Math.round(km / (T.ac ? 52 : 46) * 60 + r() * 50), fare: Math.max(199, Math.round((km * T.rate * (0.85 + r() * 0.35) + 99) / 10) * 10 - 1),
      rating: Math.round((3.5 + r() * 1.3) * 10) / 10, amenities: T.ac ? 'Charging point, Water bottle, Blanket' : 'Charging point', active: 'Active' });
    gen[i].own = gen[i].operator === OWN_OPERATOR;
  }
  return [...own, ...gen];
}
function seatLayout(bus) {
  if (bus.layout?.decks?.length) return bus.layout.decks; // custom layout from the seat-layout editor
  const T = BUS_TYPES[bus.type] || BUS_TYPES['AC Seater (2+2)'];
  if (T.layout === 'sleeper') { const deck = p => Array.from({ length: 6 }, (_, r) => [p + (r * 3 + 1), null, p + (r * 3 + 2), p + (r * 3 + 3)]); return [{ name: 'Lower deck', rows: deck('L'), sleeper: true }, { name: 'Upper deck', rows: deck('U'), sleeper: true }]; }
  return [{ name: 'Seater', rows: Array.from({ length: 10 }, (_, r) => [String(r * 4 + 1), String(r * 4 + 2), null, String(r * 4 + 3), String(r * 4 + 4)]), sleeper: false }];
}
function bookedSeats(bus, date) {
  const r = rng(hashStr(bus.id + date)), map = {};
  seatLayout(bus).forEach(d => d.rows.flat().filter(Boolean).forEach(s => { if (r() < .36) map[s] = r() < .2 ? 'ladies' : 'booked'; }));
  Store.get('busBookings').filter(b => b.busId === bus.id && b.date === date && b.status === 'Confirmed').forEach(b => b.passengers.forEach(p => { map[p.seat] = p.gender === 'Female' ? 'ladies' : 'booked'; }));
  return map;
}
const totalSeats = bus => seatLayout(bus).reduce((n, d) => n + d.rows.flat().filter(Boolean).length, 0);

/* ---------- Search widget ---------- */
function busSearchForm(s = Session.get('busSearch') || {}) {
  return `<form class="search-row" id="bus-search" autocomplete="off">
    <label class="field"><span>From</span><input class="input" id="bs-from" name="from" list="dl-india" placeholder="Leaving from" value="${esc(s.from || SITE_CONFIG.city || 'Kochi')}" required></label>
    <button type="button" class="swap" id="bs-swap" aria-label="Swap cities" title="Swap">⇄</button>
    <label class="field"><span>To</span><input class="input" id="bs-to" name="to" list="dl-india" placeholder="Going to" value="${esc(s.to || 'Bengaluru')}" required></label>
    <label class="field"><span>Date of journey</span><input class="input" id="bs-date" type="date" name="date" min="${todayISO()}" value="${esc(s.date && s.date >= todayISO() ? s.date : todayISO(1))}" required></label>
    <button class="btn btn-green btn-lg">${icon('search')} Search buses</button></form>`;
}
function bindBusSearch(root) {
  const f = $('#bus-search', root); if (!f) return;
  $('#bs-swap', f).onclick = () => { const a = f.from.value; f.from.value = f.to.value; f.to.value = a; };
  f.onsubmit = e => {
    e.preventDefault();
    const from = cityKey(f.from.value) || f.from.value.trim(), to = cityKey(f.to.value) || f.to.value.trim();
    if (sameCity(from, to)) return toast('Choose two different cities', 'err');
    Session.set('busSearch', { from, to, date: f.date.value }); go('bus-results');
  };
}

/* ---------- Ticket ---------- */
function busTicketHtml(b) {
  const agent = b.agentId ? Store.find('agents', b.agentId) : null;
  return `<div class="ticket"><div class="ticket-head"><div><div class="small" style="opacity:.8">Jack & Jose Travels · e-Ticket</div><h3 style="color:#fff;margin-top:4px">${esc(b.from)} → ${esc(b.to)}</h3></div>
    <div style="text-align:right"><div class="small" style="opacity:.8">PNR</div><b class="mono" style="font-size:1.2rem">${esc(b.id)}</b></div></div>
    <div class="ticket-body"><div class="kv"><div><span>Journey date</span><b>${fmtDate(b.date)}</b></div><div><span>Departure</span><b>${esc(b.dep)}</b></div><div><span>Arrival</span><b>${esc(b.arr)}</b></div><div><span>Status</span><b>${statusChip(b.status)}</b></div></div>
    <div class="kv"><div><span>Operator</span><b>${esc(b.operator)}</b></div><div><span>Bus</span><b>${esc(b.type)}</b></div><div><span>Bus no.</span><b class="mono">${esc(b.busNo)}</b></div><div><span>Booked via</span><b>${agent ? esc(agent.agency) : 'Website'}</b></div>${Pay.kv(b.id)}</div>
    <div class="kv"><div><span>Boarding point</span><b>${esc(b.boarding)}</b></div><div><span>Dropping point</span><b>${esc(b.dropping)}</b></div></div></div>
    <div class="ticket-perf"></div>
    <div class="ticket-body"><div class="table-wrap"><table class="table"><thead><tr><th>Seat</th><th>Passenger</th><th>Age</th><th>Gender</th></tr></thead><tbody>
    ${b.passengers.map(p => `<tr><td class="mono">${esc(p.seat)}</td><td>${esc(p.name)}</td><td>${esc(p.age)}</td><td>${esc(p.gender)}</td></tr>`).join('')}</tbody></table></div>
    <div class="line-item total"><span>Total paid (incl. 5% GST)</span><span>${inr(b.total)}</span></div>${Notify.note(b.id)}${b.status === 'Requested' ? '<div class="notice">This is a booking request. Your seats are confirmed only when we reply with a confirmation.</div>' : ''}
    ${b.status === 'Cancelled' ? `<div class="notice">This booking is cancelled.${b.refund ? ` Refund of ${inr(b.refund)} goes back to the original payment method: 1–2 days for UPI and wallets, 5–7 working days for cards and net banking.` : ''}</div>` : ''}</div></div>`;
}
function showBusTicket(b, { allowCancel = false, after } = {}) {
  const canCancel = allowCancel && b.status === 'Confirmed' && b.date >= todayISO();
  openModal('Your bus ticket', busTicketHtml(b) + (canCancel ? `<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><span class="muted small">Cancel now and get ${inr(b.total * .75)} back (75% refund).</span><button class="btn btn-danger" id="tk-cancel">Cancel this booking</button></div>` : ''), {
    wide: true, onMount: m => { if (allowCancel) Reviews.attach(m, 'bus', b); const c = $('#tk-cancel', m); if (c) c.onclick = () => confirmBox(`Cancel PNR ${b.id}? Refund: ${inr(b.total * .75)}.`, () => { Store.update('busBookings', b.id, { status: 'Cancelled', refund: Math.round(b.total * .75) }); Pay.refundBooking(b.id, Math.round(b.total * .75), 'Bus ticket cancelled by customer'); Notify.event('bus_cancelled', Store.find('busBookings', b.id)); toast('Booking cancelled'); after && after(); }, 'Cancel booking'); },
  });
}

/* ---------- Pages ---------- */
ROUTE_TITLES.travels = 'Bus booking';
route('travels', app => {
  const popular = [['Kochi', 'Bengaluru'], ['Bengaluru', 'Kochi'], ['Thiruvananthapuram', 'Bengaluru'], ['Kochi', 'Chennai'], ['Kozhikode', 'Bengaluru'], ['Chennai', 'Bengaluru'], ['Bengaluru', 'Hyderabad'], ['Mumbai', 'Goa'], ['Delhi', 'Jaipur'], ['Pune', 'Mumbai']];
  app.innerHTML = pageHero({ eyebrow: 'Jack & Jose Travels', title: 'Book bus tickets to any city in India', lead: `${Object.keys(INDIA_CITIES).length} cities, our own sleeper fleet plus partner operators, live seat maps and instant e-tickets.` }) +
  `<section class="wrap overlap"><div class="search-box">${busSearchForm()}<div class="chips" style="margin-top:12px"><span class="muted small">Quick date:</span>
    <button class="chip" type="button" data-qd="0">Today</button><button class="chip" type="button" data-qd="1">Tomorrow</button><button class="chip" type="button" data-qd="2">Day after</button></div></div></section>
  <section class="section"><div class="wrap grid g2">
    <div class="card"><div class="eyebrow">Popular routes</div><h3 style="margin:6px 0 14px">Routes travellers book most</h3><div class="chips">${popular.map(([a, b]) => `<button class="chip blue" data-route="${esc(a)}|${esc(b)}">${esc(a)} → ${esc(b)}</button>`).join('')}</div></div>
    <div class="card"><div class="eyebrow">Manage booking</div><h3 style="margin:6px 0 14px">View or cancel a ticket</h3>
      <form id="pnr-form" style="display:flex;gap:10px;flex-wrap:wrap"><input class="input mono" id="pnr" name="pnr" placeholder="PNR, e.g. JJB7301" style="flex:1 1 180px" required><button class="btn btn-primary">Find ticket</button></form>
      <p class="muted small" style="margin-top:10px">Your PNR is on the e-ticket shown after booking.</p></div>
  </div></section>
  <section class="section band"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Why book with us</div><h2 style="margin-top:6px">Designed around the overnight journey</h2></div></div>
    <div class="grid g4">${[['shield', 'Verified operators', 'Every partner bus is checked for permits, insurance and driver records.'], ['clock', 'Live seat maps', 'See sleeper berths and seats exactly as laid out, with ladies-booked seats marked.'], ['pin', 'Pick-up near you', 'Choose from several boarding and dropping points in each city.'], ['users', 'Agent network', 'Book through an authorised Jack & Jose agent in your town.']]
      .map(([i, t, d]) => `<div class="stack"><div class="ico">${icon(i)}</div><h3>${t}</h3><p class="muted">${d}</p></div>`).join('')}</div></div></section>
  <section class="section-tight"><div class="wrap"><div class="notice" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center"><span><b>Operators & staff:</b> manage buses, agents and bookings in the Travels master portal.</span><a class="btn btn-primary btn-sm" href="#travels-admin">Open Travels portal</a></div></div></section>`;
  bindBusSearch(app);
  $$('[data-qd]', app).forEach(b => b.onclick = () => { $('#bs-date').value = todayISO(+b.dataset.qd); });
  $$('[data-route]', app).forEach(b => b.onclick = () => { const [from, to] = b.dataset.route.split('|'); Session.set('busSearch', { from, to, date: $('#bs-date').value }); go('bus-results'); });
  $('#pnr-form', app).onsubmit = async e => { e.preventDefault(); const id = e.target.pnr.value.trim().toUpperCase(); const b = await Store.lookup('busBookings', id); if (!b) return toast(`No booking found for PNR ${id}`, 'err'); showBusTicket(b, { allowCancel: true }); };
});

ROUTE_TITLES['bus-results'] = 'Bus results';
route('bus-results', app => {
  const s = Session.get('busSearch'); if (!s) return go('travels');
  const state = { sort: 'dep', f: new Set(), slot: new Set(), open: null, sel: [] };
  const all = busesForRoute(s.from, s.to);
  const km = roadKm(s.from, s.to);
  app.innerHTML = `<div class="route-summary"><div class="wrap">
      <div class="cities">${esc(s.from)} <span class="route-line" style="width:40px;background-image:linear-gradient(90deg,#9ff0c8 50%,transparent 50%)"></span> ${esc(s.to)}</div>
      <span class="chip" style="background:rgba(255,255,255,.12);color:#fff">${fmtDate(s.date)}</span><span class="small" style="opacity:.8">≈ ${km} km by road</span>
      <span style="flex:1"></span><button class="btn btn-outline btn-sm" id="prev-d" ${s.date <= todayISO() ? 'disabled' : ''}>‹ Prev day</button><button class="btn btn-outline btn-sm" id="next-d">Next day ›</button><button class="btn btn-light btn-sm" id="modify">Modify search</button></div></div>
    <div class="wrap" id="modify-box" hidden style="padding-top:16px"><div class="search-box">${busSearchForm(s)}</div></div>
    <section class="section-tight"><div class="wrap results-layout">
      <aside class="filters card"><div><h4>Bus type</h4><div class="stack">${['AC', 'Non-AC', 'Sleeper', 'Seater', 'Jack & Jose buses'].map(t => `<label class="check"><input type="checkbox" data-f="${t}"> ${t}</label>`).join('')}</div></div>
        <div><h4>Departure time</h4><div class="stack">${[['m', 'Before 6 AM'], ['d', '6 AM – 12 PM'], ['a', '12 PM – 6 PM'], ['n', 'After 6 PM']].map(([k, l]) => `<label class="check"><input type="checkbox" data-slot="${k}"> ${l}</label>`).join('')}</div></div>
        <button class="btn btn-outline btn-sm" id="clear-f">Clear filters</button></aside>
      <div style="min-width:0"><div class="sortbar"><b id="count"></b><span style="flex:1"></span><span class="muted small">Sort by</span>${[['dep', 'Departure'], ['dur', 'Duration'], ['price', 'Price'], ['rating', 'Rating']].map(([k, l]) => `<button class="chip ${k === 'dep' ? 'on' : ''}" data-sort="${k}">${l}</button>`).join('')}</div>
      <div class="stack" id="bus-list"></div></div></div></section>`;
  bindBusSearch(app);
  const shift = d => { const nd = new Date(s.date + 'T00:00:00'); nd.setDate(nd.getDate() + d); Session.set('busSearch', { ...s, date: `${nd.getFullYear()}-${pad(nd.getMonth() + 1)}-${pad(nd.getDate())}` }); render(); };
  $('#prev-d').onclick = () => shift(-1); $('#next-d').onclick = () => shift(1);
  $('#modify').onclick = () => { $('#modify-box').hidden = !$('#modify-box').hidden; };
  const slotOf = dep => { const h = +dep.slice(0, 2); return h < 6 ? 'm' : h < 12 ? 'd' : h < 18 ? 'a' : 'n'; };
  function list() {
    let L = all.filter(b => { const T = BUS_TYPES[b.type];
      if (state.f.has('AC') && !state.f.has('Non-AC') && !T.ac) return false; if (state.f.has('Non-AC') && !state.f.has('AC') && T.ac) return false;
      if (state.f.has('Sleeper') && !state.f.has('Seater') && !T.sleeper) return false; if (state.f.has('Seater') && !state.f.has('Sleeper') && T.sleeper) return false;
      if (state.f.has('Jack & Jose buses') && !b.own) return false; if (state.slot.size && !state.slot.has(slotOf(b.dep))) return false; return true; });
    const by = { dep: (a, b) => a.dep.localeCompare(b.dep), dur: (a, b) => a.durationMin - b.durationMin, price: (a, b) => a.fare - b.fare, rating: (a, b) => b.rating - a.rating };
    L.sort(by[state.sort]);
    $('#count').textContent = `${L.length} bus${L.length === 1 ? '' : 'es'} found`;
    $('#bus-list').innerHTML = L.map(b => { const arr = addMins(b.dep, b.durationMin), booked = bookedSeats(b, s.date), left = totalSeats(b) - Object.keys(booked).length;
      return `<article class="card bus" data-bus="${esc(b.id)}"><div class="bus-main">
        <div style="min-width:0"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h3>${esc(b.operator)}</h3>${b.own ? '<span class="own-badge">Jack & Jose</span>' : ''}</div><div class="muted small" style="margin-top:4px">${esc(b.type)}</div></div>
        <div class="bus-times"><div><b>${b.dep}</b><div class="muted small">${esc(s.from)}</div></div><div style="flex:1;text-align:center" class="muted small"><div class="route-line" style="margin:6px 0"></div>${durTxt(b.durationMin)}</div><div style="text-align:right"><b>${arr.t}</b>${arr.days ? `<sup class="small" style="color:var(--warn)"> +${arr.days}</sup>` : ''}<div class="muted small">${esc(s.to)}</div></div></div>
        <div class="bus-price"><div>${ratingBadge('bus', b.id, b.rating, b.operator)}</div><div><span class="muted small">Starts from</span><br><b>${inr(minFare(b))}</b></div><div class="small" style="color:${left < 8 ? 'var(--danger)' : 'var(--muted)'}">${left} seats left</div></div></div>
        <div class="bus-foot">${b.amenities.split(',').slice(0, 4).map(a => `<span class="chip">${esc(a.trim())}</span>`).join('')}${Media.of('bus', b.id, 'photo').length ? `<button class="chip blue" data-busphotos="${esc(b.id)}">Photos (${Media.of('bus', b.id, 'photo').length})</button>` : ''}<span style="flex:1"></span><button class="btn btn-green btn-sm" data-view="${esc(b.id)}">${state.open === b.id ? 'Hide seats' : 'View seats'}</button></div>
        ${state.open === b.id ? seatPanel(b, booked) : ''}</article>`; }).join('') || `<div class="card empty-state"><h3>No buses match these filters</h3><p style="margin-top:6px">Clear a filter or try the next day.</p></div>`;
    bindPanel();
  }
  function seatPanel(b, booked) {
    const T = BUS_TYPES[b.type] || {}, stops = busStops(b, s.from, s.to);
    const decks = seatLayout(b).map(d => `<div class="deck"><div class="deck-title"><span>${d.name}</span>${d.name !== 'Upper deck' ? '<span>Driver ⊙</span>' : ''}</div>
      <div class="seat-grid" style="grid-template-columns:${d.rows[0].map(c => c === null ? '18px' : '34px').join(' ')}">${d.rows.flat().map(c => c === null ? '<span class="seat-gap"></span>' : c === '' ? '<span></span>' :
      `<button type="button" class="seat ${seatKindClass(d, c)} ${booked[c] === 'ladies' ? 'booked ladies' : booked[c] ? 'booked' : ''} ${state.sel.includes(c) ? 'sel' : ''}" data-seat="${c}" ${booked[c] ? 'disabled' : ''} title="${seatKindClass(d, c) ? 'Sleeper berth' : 'Seat'} ${c} · ${inr(seatPrice(b, c))}" aria-label="${seatKindClass(d, c) ? 'Berth' : 'Seat'} ${c}${booked[c] ? ' booked' : ''}">${c}</button>`).join('')}</div></div>`).join('');
    const sub = fareTotal(b, state.sel), mixed = hasBothKinds(b) && b.layout?.seatPct;
    return `<div class="seat-panel"><div><div class="decks">${decks}</div><div class="legend"><span><i></i>Available</span><span><i class="b"></i>Booked</span><span><i class="l"></i>Booked by ladies</span><span><i class="s"></i>Your selection</span></div></div>
      <div class="stack" style="align-content:start"><label class="field"><span>Boarding point</span><select class="input" id="bp">${stops.boarding.map(x => `<option>${x.t} · ${esc(x.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Dropping point</span><select class="input" id="dp">${stops.dropping.map(x => `<option>${x.t} · ${esc(x.name)}</option>`).join('')}</select></label>
      <div class="card" style="background:var(--surface-2)"><div class="line-item"><span>Seats</span><b class="mono">${state.sel.join(', ') || '—'}</b></div><div class="line-item"><span>Fare (${mixed ? state.sel.map(x => `${x} ${inr(seatPrice(b, x))}`).join(' + ') || '0 seats' : `${state.sel.length} × ${inr(b.fare)}`})</span><span>${inr(sub)}</span></div><div class="line-item"><span>GST 5%</span><span>${inr(sub * .05)}</span></div><div class="line-item total"><span>Total</span><span>${inr(sub * 1.05)}</span></div></div>
      <button class="btn btn-primary btn-block" id="proceed" ${state.sel.length ? '' : 'disabled'}>${state.sel.length ? 'Proceed to book' : 'Select up to 6 seats'}</button>
      <p class="muted small">${mixed ? `Sleeper berth ${inr(b.fare)} · Seat ${inr(minFare(b))}. ` : ''}${T.sleeper || mixed ? 'Berths are 6 ft long. ' : ''}Cancellation up to the day of travel: 75% refund.</p></div></div>`;
  }
  function bindPanel() {
    $$('[data-view]').forEach(btn => btn.onclick = () => { state.open = state.open === btn.dataset.view ? null : btn.dataset.view; state.sel = []; list(); if (state.open) $(`[data-bus="${state.open}"]`).scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    $$('[data-seat]').forEach(btn => btn.onclick = () => { const c = btn.dataset.seat; if (state.sel.includes(c)) state.sel = state.sel.filter(x => x !== c); else if (state.sel.length >= 6) return toast('You can book up to 6 seats at a time', 'err'); else state.sel.push(c); const bp = $('#bp')?.selectedIndex, dp = $('#dp')?.selectedIndex; list(); if ($('#bp')) { $('#bp').selectedIndex = bp; $('#dp').selectedIndex = dp; } });
    const p = $('#proceed'); if (p) p.onclick = () => checkout(all.find(b => b.id === state.open), $('#bp').value, $('#dp').value);
  }
  function checkout(b, boarding, dropping) {
    const agents = Store.get('agents').filter(a => a.status === 'Active'), sub = fareTotal(b, state.sel);
    openModal('Passenger details', `<form id="pax" class="stack">
      <div class="notice"><b>${esc(b.operator)}</b> · ${esc(s.from)} → ${esc(s.to)} · ${fmtDate(s.date)} · ${b.dep}</div>
      ${state.sel.map((seat, i) => `<div class="card"><div class="eyebrow" style="margin-bottom:10px">Seat <span class="mono">${esc(seat)}</span></div><div class="form-grid">
        <label class="field"><span>Full name</span><input class="input" id="pn-${i}" name="n${i}" required placeholder="As on ID proof"></label>
        <label class="field"><span>Age</span><input class="input" id="pa-${i}" name="a${i}" type="number" min="1" max="110" required></label>
        <label class="field"><span>Gender</span><select class="input" id="pg-${i}" name="g${i}"><option>Female</option><option>Male</option><option>Other</option></select></label></div></div>`).join('')}
      <div class="form-grid"><label class="field"><span>Mobile number</span><input class="input" id="pmob" name="phone" required pattern="[0-9+ ]{10,15}" placeholder="+91 98xxxxxxxx"></label>
        <label class="field"><span>Email (for e-ticket)</span><input class="input" id="pmail" name="email" type="email" placeholder="you@example.com"></label>
        <label class="field"><span>Booking through</span><select class="input" id="pagent" name="agent"><option value="">Website (direct)</option>${agents.map(a => `<option value="${a.id}">${esc(a.agency)} · ${esc(a.city)}</option>`).join('')}</select></label>
        </div>
      <div class="line-item total"><span>Amount payable</span><span>${inr(sub * 1.05)}</span></div>
      <button class="btn btn-green btn-lg">${Launch.payLabel()}</button><p class="muted small">${Launch.payNote() || 'Pay by UPI, card, net banking or wallet on the next step. Seats are confirmed once payment succeeds.'}</p></form>`, {
      wide: true, onMount: m => $('#pax', m).onsubmit = e => {
        e.preventDefault(); const f = e.target;
        const bk = { id: genId('JJB', 6), busId: b.id, operator: b.operator, busNo: b.busNo, type: b.type, from: s.from, to: s.to, date: s.date, dep: b.dep, arr: addMins(b.dep, b.durationMin).t,
          seats: [...state.sel], passengers: state.sel.map((seat, i) => ({ seat, name: f['n' + i].value.trim(), age: +f['a' + i].value, gender: f['g' + i].value })),
          boarding: boarding.split(' · ')[1], dropping: dropping.split(' · ')[1], fare: b.fare, total: Math.round(sub * 1.05), phone: f.phone.value.trim(), email: f.email.value.trim(), agentId: f.agent.value, status: 'Confirmed', createdAt: new Date().toISOString() };
        const taken = bookedSeats(b, s.date); if (bk.seats.some(x => taken[x])) { closeModal(); toast('Some of these seats were just booked by someone else. Pick again.', 'err'); state.sel = []; return list(); }
        Pay.checkout({ amount: bk.total, description: `Bus ${s.from} → ${s.to} · ${fmtDate(s.date)} · ${bk.seats.length} seat(s)`, bookingType: 'bus', bookingId: bk.id, customer: { name: bk.passengers[0].name, phone: bk.phone, email: bk.email },
          onSuccess: p => { if (p.requested) bk.status = 'Requested'; else { bk.paymentId = p.id; bk.payment = PAY_METHODS[p.method]?.label; } Store.add('busBookings', bk); state.sel = []; state.open = null; list(); if (Launch.request('bus', bk)) return; Notify.event('bus_booked', bk); toast('Paid & confirmed · PNR ' + bk.id); showBusTicket(bk); } });
      },
    });
  }
  $$('[data-f]').forEach(c => c.onchange = () => { c.checked ? state.f.add(c.dataset.f) : state.f.delete(c.dataset.f); list(); });
  $$('[data-slot]').forEach(c => c.onchange = () => { c.checked ? state.slot.add(c.dataset.slot) : state.slot.delete(c.dataset.slot); list(); });
  $$('[data-sort]').forEach(c => c.onclick = () => { state.sort = c.dataset.sort; $$('[data-sort]').forEach(x => x.classList.toggle('on', x === c)); list(); });
  $('#clear-f').onclick = () => { state.f.clear(); state.slot.clear(); $$('.filters input').forEach(i => i.checked = false); list(); };
  list();
});

/* ---------- Travels master portal ---------- */
ROUTE_TITLES['travels-admin'] = 'Travels portal';
route('travels-admin', app => {
  const tabs = [['dash', 'Dashboard'], ['bookings', 'Bookings'], ['buses', 'Buses & vehicles'], ['reviews', 'Ratings & reviews'], ['agents', 'Agents']];
  const active = Session.get('tab_#travels-admin') || 'dash';
  app.innerHTML = adminShell({ title: 'Travels master portal', sub: 'Buses, routes, agents and every seat sold.', tabs, active, base: 'travels' });
  const body = $('#admin-body', app);
  const agentName = id => { const a = Store.find('agents', id); return a ? a.agency : 'Website'; };
  const show = tab => {
    if (tab === 'dash') {
      const bk = Store.get('busBookings'), conf = bk.filter(b => b.status === 'Confirmed');
      const rev = conf.reduce((s, b) => s + b.total, 0), seats = conf.reduce((s, b) => s + b.seats.length, 0);
      const byRoute = {}; conf.forEach(b => { const k = `${b.from} → ${b.to}`; byRoute[k] = (byRoute[k] || 0) + b.total; });
      const byCh = {}; conf.forEach(b => { const k = agentName(b.agentId); byCh[k] = (byCh[k] || 0) + 1; });
      body.innerHTML = `<div class="kpis">${kpi('Confirmed bookings', conf.length, `${bk.length - conf.length} cancelled`)}${kpi('Revenue', inr(rev), 'confirmed tickets, incl. GST')}${kpi('Seats sold', seats)}${kpi('Active buses', Store.get('buses').filter(b => b.active === 'Active').length, `${Store.get('agents').filter(a => a.status === 'Active').length} active agents`)}</div>
        <div class="grid g2" style="margin-top:18px"><div class="card"><h3 style="margin-bottom:14px">Revenue by route</h3>${bars(Object.entries(byRoute).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => [k, v, inr(v)]))}</div>
        <div class="card"><h3 style="margin-bottom:14px">Bookings by channel</h3>${bars(Object.entries(byCh).sort((a, b) => b[1] - a[1]))}</div></div>
        <div class="card" style="margin-top:18px"><h3 style="margin-bottom:12px">Latest bookings</h3><div class="table-wrap"><table class="table"><thead><tr><th>PNR</th><th>Journey</th><th>Date</th><th>Seats</th><th>Amount</th><th>Status</th></tr></thead><tbody>
        ${bk.slice(0, 6).map(b => `<tr><td class="mono">${esc(b.id)}</td><td>${esc(b.from)} → ${esc(b.to)}</td><td>${fmtDate(b.date)}</td><td class="mono">${esc(b.seats.join(', '))}</td><td>${inr(b.total)}</td><td>${statusChip(b.status)}</td></tr>`).join('')}</tbody></table></div></div>`;
    }
    if (tab === 'bookings') renderCrud(body, { key: 'busBookings', single: 'Booking', plural: 'Bookings', noAdd: true, noEdit: true, label: r => r.id,
      columns: [{ label: 'PNR', render: r => `<span class="mono">${esc(r.id)}</span>` }, { label: 'Journey', render: r => `${esc(r.from)} → ${esc(r.to)}<div class="muted small">${esc(r.operator)}</div>` }, { label: 'Date', render: r => `${fmtDate(r.date)}<div class="muted small">${esc(r.dep)}</div>` },
        { label: 'Seats', render: r => `<span class="mono">${esc(r.seats.join(', '))}</span>` }, { label: 'Lead passenger', render: r => `${esc(r.passengers[0]?.name)}<div class="muted small">${esc(r.phone)}</div>` }, { label: 'Channel', render: r => esc(agentName(r.agentId)) }, { label: 'Amount', render: r => inr(r.total) }, { label: 'Status', render: r => statusChip(r.status) }],
      actions: [{ id: 'view', label: 'Ticket', run: r => showBusTicket(r) }, { id: 'confirm', label: 'Confirm', show: r => r.status === 'Requested', run: (r, rr) => { const clash = Store.get('busBookings').filter(o => o.id !== r.id && o.busId === r.busId && o.date === r.date && o.status === 'Confirmed').flatMap(o => o.seats).filter(x => r.seats.includes(x)); if (clash.length) return toast(`Seat ${clash.join(', ')} is already confirmed for another passenger`, 'err'); Store.update('busBookings', r.id, { status: 'Confirmed' }); Notify.event('bus_booked', Store.find('busBookings', r.id)); toast(`PNR ${r.id} confirmed`); rr(); } }, { id: 'decline', label: 'Decline', show: r => r.status === 'Requested', run: (r, rr) => confirmBox(`Decline booking request ${r.id}?`, () => { Store.update('busBookings', r.id, { status: 'Cancelled', refund: 0 }); toast('Request declined'); rr(); }, 'Decline request') }, { id: 'cancel', label: 'Cancel', show: r => r.status === 'Confirmed', run: (r, rr) => confirmBox(`Cancel PNR ${r.id}? The passenger gets a 75% refund (${inr(r.total * .75)}).`, () => { Store.update('busBookings', r.id, { status: 'Cancelled', refund: Math.round(r.total * .75) }); Pay.refundBooking(r.id, Math.round(r.total * .75), 'Bus ticket cancelled by operator'); Notify.event('bus_cancelled', Store.find('busBookings', r.id)); toast('Booking cancelled'); rr(); }, 'Cancel booking') }] });
    if (tab === 'reviews') reviewsAdmin(body, 'bus');
    if (tab === 'buses') renderCrud(body, { actions: BUS_TOOLS, key: 'buses', single: 'Bus', plural: 'Buses', idPrefix: 'BUS', label: r => r.busNo,
      fields: [{ name: 'operator', label: 'Operator', default: OWN_OPERATOR, required: true }, { name: 'busNo', label: 'Registration no.', required: true, placeholder: 'KL-07-JJ-4100' }, { name: 'type', label: 'Bus type', type: 'select', options: Object.keys(BUS_TYPES) },
        { name: 'from', label: 'From city', list: 'dl-india', required: true }, { name: 'to', label: 'To city', list: 'dl-india', required: true }, { name: 'dep', label: 'Departure time', type: 'time', default: '21:00', required: true },
        { name: 'durationMin', label: 'Journey time (minutes)', type: 'number', min: 30, default: 480, required: true }, { name: 'fare', label: 'Fare per seat (₹)', type: 'number', min: 50, default: 999, required: true },
        { name: 'rating', label: 'Rating', type: 'number', min: 1, max: 5, step: '0.1', default: 4.5 }, { name: 'active', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }, { name: 'amenities', label: 'Amenities (comma separated)', full: true, default: 'WiFi, Charging point, Water bottle, Blanket' }],
      validate: d => sameCity(d.from, d.to) ? 'From and To cities must be different' : null,
      columns: [{ label: 'Photo', render: r => Media.cover('bus', r.id) ? `<img class="thumb" src="${Media.cover('bus', r.id)}" alt="">` : '<span class="muted small">None</span>' }, { label: 'Bus', render: r => `<b class="mono">${esc(r.busNo)}</b><div class="muted small">${esc(r.operator)}</div>` }, { label: 'Type', field: 'type' }, { label: 'Route', render: r => `${esc(r.from)} → ${esc(r.to)}` }, { label: 'Departs', render: r => `${esc(r.dep)}<div class="muted small">${durTxt(+r.durationMin)}</div>` }, { label: 'Fare', render: r => inr(r.fare) }, { label: 'Status', render: r => statusChip(r.active) }] });
    if (tab === 'agents') { const bk = Store.get('busBookings').filter(b => b.status === 'Confirmed');
      renderCrud(body, { key: 'agents', single: 'Agent', plural: 'Agents', idPrefix: 'AGT', label: r => r.agency,
        fields: [{ name: 'name', label: 'Agent name', required: true }, { name: 'agency', label: 'Agency name', required: true }, { name: 'city', label: 'City', list: 'dl-india', required: true }, { name: 'phone', label: 'Phone', required: true }, { name: 'email', label: 'Email', type: 'email' }, { name: 'commission', label: 'Commission %', type: 'number', min: 0, max: 30, step: '0.5', default: 7 }, { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }],
        columns: [{ label: 'Agency', render: r => `<b>${esc(r.agency)}</b><div class="muted small">${esc(r.name)} · ${esc(r.id)}</div>` }, { label: 'City', field: 'city' }, { label: 'Contact', render: r => `${esc(r.phone)}<div class="muted small">${esc(r.email)}</div>` }, { label: 'Commission', render: r => r.commission + '%' },
          { label: 'Bookings', render: r => bk.filter(b => b.agentId === r.id).length }, { label: 'Earned', render: r => inr(bk.filter(b => b.agentId === r.id).reduce((s, b) => s + b.total, 0) * r.commission / 100) }, { label: 'Status', render: r => statusChip(r.status) }] }); }
  };
  bindTabs(app, show); show(active);
});
