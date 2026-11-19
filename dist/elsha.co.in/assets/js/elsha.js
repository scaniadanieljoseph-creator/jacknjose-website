/* Elsha — Media (photography, videography, design) and EEE (Elsha Energy Efficiency) */
'use strict';

/* ---------- Media ---------- */
const MEDIA_SERVICES = [
  ['camera', 'Wedding photography', 'Candid and traditional coverage, engagement shoots and albums printed on archival paper.'],
  ['video', 'Wedding & event films', 'Cinematic highlight films, full-length edits and same-day teasers for reception screens.'],
  ['building', 'Corporate & industrial', 'Factory, office and leadership shoots, annual-report photography and brand films.'],
  ['box', 'Product & e-commerce', 'White-background catalogue shots, lifestyle setups and 360° spins for online stores.'],
  ['plane', 'Drone aerials', 'Licensed DGCA-registered drone pilots for property, construction progress and events.'],
  ['pen', 'Design studio', 'Logos, brand identities, brochures, social media creatives and packaging by our designers.'],
];
const PORTFOLIO = [
  ['Wedding', 'Backwater wedding, Kumarakom', 160], ['Corporate', 'Leadership portraits, Infopark', 210], ['Product', 'Spice range catalogue', 30], ['Drone', 'Resort aerials, Munnar', 140],
  ['Events', 'Product launch, Bengaluru', 260], ['Wedding', 'Church wedding, Fort Kochi', 190], ['Design', 'Brand identity, coir exporter', 120], ['Product', 'Handloom sarees lookbook', 340],
  ['Drone', 'Highway construction progress', 200], ['Events', 'College fest after-movie', 280], ['Corporate', 'Factory film, Coimbatore', 175], ['Design', 'Festival poster series', 15],
];
const MEDIA_PACKAGES = [
  ['Essential', 24999, ['1 photographer, 6 hours', '300+ edited photos', 'Online gallery', 'Delivery in 15 days'], false],
  ['Signature', 64999, ['2 photographers + 1 videographer', 'Full day coverage', '4-min cinematic highlight film', '40-page premium album', 'Drone shots'], true],
  ['Premium', 129999, ['Team of 5, two days', 'Pre-wedding shoot', 'Full film + highlight + teaser', 'Two albums', 'Same-day edit for reception'], false],
];
SEED.mediaBookings = () => [
  ['Wedding photography', 'Signature', 'Thrissur', 18, 'Anitha Varghese', 'Confirmed'], ['Corporate & industrial', '', 'Kochi', 6, 'Kaveri Electronics', 'New'], ['Product & e-commerce', '', 'Alappuzha', 3, 'Cochin Coir Works', 'Contacted'],
].map(([service, pkg, location, d, name, status], i) => ({ id: 'ELM' + (2101 + i), service, pkg, location, date: todayISO(d), name, phone: '+91 96' + String(55000000 + i * 99991).slice(0, 8), email: '', message: '', status, createdAt: new Date(Date.now() - i * 864e5).toISOString(), sample: true }));

function artSvg(cat, hue, seed) {
  const r = rng(seed), h2 = (hue + 50) % 360;
  let shapes = '';
  if (cat === 'Drone') shapes = `<polygon points="0,220 60,150 120,190 200,110 300,200 300,300 0,300" fill="hsl(${hue} 40% 22% / .8)"/><polygon points="0,260 90,200 170,240 300,180 300,300 0,300" fill="hsl(${hue} 45% 14% / .9)"/>`;
  else if (cat === 'Wedding') shapes = `<circle cx="130" cy="140" r="52" fill="none" stroke="hsl(45 90% 75% / .85)" stroke-width="9"/><circle cx="172" cy="150" r="52" fill="none" stroke="hsl(45 90% 85% / .7)" stroke-width="9"/>`;
  else if (cat === 'Product') shapes = `<rect x="95" y="90" width="110" height="140" rx="16" fill="hsl(${h2} 60% 80% / .85)"/><rect x="115" y="70" width="70" height="30" rx="6" fill="hsl(${h2} 50% 30% / .8)"/><ellipse cx="150" cy="245" rx="80" ry="10" fill="rgba(0,0,0,.25)"/>`;
  else if (cat === 'Design') shapes = Array.from({ length: 5 }, (_, i) => `<rect x="${30 + i * 50}" y="${60 + r() * 80}" width="40" height="${60 + r() * 100}" rx="20" fill="hsl(${(hue + i * 30) % 360} 70% ${55 + i * 5}% / .85)"/>`).join('');
  else if (cat === 'Events') shapes = Array.from({ length: 14 }, () => `<circle cx="${r() * 300}" cy="${r() * 200}" r="${4 + r() * 18}" fill="hsl(${(hue + r() * 120) % 360} 90% 70% / ${0.3 + r() * .5})"/>`).join('') + `<rect x="0" y="230" width="300" height="70" fill="rgba(0,0,0,.35)"/>`;
  else shapes = `<rect x="40" y="70" width="90" height="170" fill="hsl(${hue} 30% 85% / .7)"/><rect x="140" y="40" width="120" height="200" fill="hsl(${hue} 30% 92% / .55)"/>` + Array.from({ length: 12 }, (_, i) => `<rect x="${152 + (i % 3) * 36}" y="${56 + Math.floor(i / 3) * 44}" width="24" height="28" fill="hsl(${hue} 60% 40% / .5)"/>`).join('');
  return `<svg class="art" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="g${seed}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 60% 38%)"/><stop offset="1" stop-color="hsl(${h2} 65% 28%)"/></linearGradient></defs><rect width="300" height="300" fill="url(#g${seed})"/>${shapes}</svg>`;
}

ROUTE_TITLES.media = 'Elsha Media';
route('media', app => {
  const cats = ['All', ...new Set(PORTFOLIO.map(p => p[0]))];
  app.innerHTML = pageHero({ elsha: true, eyebrow: 'Elsha Media & Designers', title: 'Photography, films and design that people remember', lead: 'Weddings, brands, products and places, shot and edited by Elsha’s in-house photographers, cinematographers and designers.', extra: `<div class="hero-actions"><a class="btn btn-light" href="#media" data-scroll="book-shoot">Book a shoot</a><a class="btn btn-outline" style="color:#fff;border-color:rgba(255,255,255,.4)" href="#media" data-scroll="portfolio">See our work</a></div>` }) +
  `<section class="section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">What we do</div><h2 style="margin-top:6px">Media and design services</h2></div><p>One team from the first shot to the final print, so the photos, film and brand material all look like they belong together.</p></div>
    <div class="grid g3">${MEDIA_SERVICES.map(([i, t, d]) => `<div class="card stack"><div class="ico g">${icon(i)}</div><h3>${t}</h3><p class="muted">${d}</p></div>`).join('')}</div></div></section>
  <section class="section band" id="portfolio"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Portfolio</div><h2 style="margin-top:6px">Recent work</h2></div><div class="chips" id="pf-cats">${cats.map((c, i) => `<button class="chip ${i ? '' : 'on'}" data-cat="${c}">${c}</button>`).join('')}</div></div>
    <div class="gallery" id="gallery"></div><p class="muted small" style="margin-top:12px">Illustrations stand in for client images on this preview. Replace them with your own photographs before launch.</p></div></section>
  <section class="section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Wedding packages</div><h2 style="margin-top:6px">Pick a package, or ask for a custom quote</h2></div></div>
    <div class="grid g3">${MEDIA_PACKAGES.map(([n, p, items, feat]) => `<div class="card price-card ${feat ? 'featured' : ''}">${feat ? '<span class="chip green" style="justify-self:start">Most booked</span>' : ''}<h3>${n}</h3><div class="price">${inr(p)}</div><ul>${items.map(x => `<li>${x}</li>`).join('')}</ul><button class="btn ${feat ? 'btn-green' : 'btn-outline'}" data-pkg="${n}">Choose ${n}</button></div>`).join('')}</div></div></section>
  <section class="section-tight" id="book-shoot"><div class="wrap"><div class="card raised"><div class="split"><form id="mb" class="stack"><div><div class="eyebrow">Book a shoot</div><h2 style="margin-top:6px">Tell us about your event or project</h2></div><div class="form-grid">
    <label class="field"><span>Service</span><select class="input" id="mb-svc" name="service">${MEDIA_SERVICES.map(s => `<option>${s[1]}</option>`).join('')}</select></label>
    <label class="field"><span>Package</span><select class="input" id="mb-pkg" name="pkg"><option value="">Custom quote</option>${MEDIA_PACKAGES.map(p => `<option>${p[0]}</option>`).join('')}</select></label>
    <label class="field"><span>Date</span><input class="input" id="mb-date" type="date" name="date" min="${todayISO()}" value="${todayISO(30)}" required></label>
    <label class="field"><span>Location</span><input class="input" id="mb-loc" name="location" list="dl-india" required placeholder="City or venue"></label>
    <label class="field"><span>Your name / company</span><input class="input" id="mb-name" name="name" required></label><label class="field"><span>Mobile</span><input class="input" id="mb-ph" name="phone" required pattern="[0-9+ ]{10,15}"></label>
    <label class="field full"><span>Email</span><input class="input" id="mb-em" type="email" name="email"></label>
    <label class="field full"><span>Brief</span><textarea class="input" id="mb-msg" name="message" placeholder="Guest count, number of products, style references…"></textarea></label></div>
    <button class="btn btn-green btn-lg">Send booking request</button></form>
    <div class="stack" style="align-content:start"><div class="notice g"><b>What happens next</b><p style="margin-top:6px">Our producer calls you within one working day to confirm the date, crew and a final quote. A 25% advance blocks the date.</p></div>
      <div class="kv"><div><span>Turnaround</span><b>Photos in 15 days, films in 30</b></div><div><span>Travel</span><b>Across India; outstation travel billed at cost</b></div></div></div></div></div></div></section>`;
  const gal = cat => { $('#gallery').innerHTML = PORTFOLIO.map((p, i) => [p, i]).filter(([p]) => cat === 'All' || p[0] === cat).map(([p, i]) => `<button class="shot" data-shot="${i}">${artSvg(p[0], p[2], i + 1)}<span class="cap">${esc(p[1])}<small>${esc(p[0])}</small></span></button>`).join('');
    $$('[data-shot]').forEach(b => b.onclick = () => { const p = PORTFOLIO[+b.dataset.shot]; openModal(p[1], `<div class="shot" style="aspect-ratio:16/10;cursor:default">${artSvg(p[0], p[2], 100 + +b.dataset.shot)}</div><p class="muted">${esc(p[0])} · Elsha Media</p>`, { wide: true }); }); };
  gal('All');
  $$('[data-cat]').forEach(c => c.onclick = () => { $$('[data-cat]').forEach(x => x.classList.toggle('on', x === c)); gal(c.dataset.cat); });
  $$('[data-pkg]').forEach(b => b.onclick = () => { $('#mb-svc').value = 'Wedding photography'; $('#mb-pkg').value = b.dataset.pkg; $('#book-shoot').scrollIntoView({ behavior: 'smooth' }); });
  $('#mb').onsubmit = e => { e.preventDefault(); const f = e.target; const b = { id: genId('ELM', 5), service: f.service.value, pkg: f.pkg.value, date: f.date.value, location: f.location.value.trim(), name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), message: f.message.value.trim(), status: 'New', createdAt: new Date().toISOString() };
    Store.add('mediaBookings', b); if (Launch.request('media', b)) { f.reset(); f.date.value = todayISO(30); return; } Notify.event('media_request', b); f.reset(); f.date.value = todayISO(30); openModal('Request received', `<div class="ticket"><div class="ticket-head elsha"><div><div class="small" style="opacity:.8">Elsha Media</div><h3 style="color:#fff">${esc(b.service)}</h3></div><b class="mono">${b.id}</b></div><div class="ticket-body"><div class="kv"><div><span>Date</span><b>${fmtDate(b.date)}</b></div><div><span>Location</span><b>${esc(b.location)}</b></div><div><span>Package</span><b>${esc(b.pkg || 'Custom quote')}</b></div></div><p class="muted">Our producer will call ${esc(b.phone)} within one working day.</p></div></div>`); };
});

/* ---------- EEE: Elsha Energy Efficiency ---------- */
const EEE_UPGRADES = [
  ['led', 'LED lighting retrofit', 0.08, 180, 'Replace tube lights and CFLs with LED panels and battens.'],
  ['bldc', 'BLDC ceiling fans', 0.07, 220, '28 W super-efficient fans in place of 75 W induction fans.'],
  ['ac', 'Inverter AC / VRF upgrade', 0.12, 900, '5-star inverter ACs or VRF systems with scheduling.'],
  ['hp', 'Heat-pump water heaters', 0.10, 600, 'Hot water for hostels at a third of the energy of geysers.'],
  ['swh', 'Solar water heaters', 0.06, 380, 'Rooftop solar thermal for kitchens and bathrooms.'],
  ['ctrl', 'Occupancy sensors & smart controls', 0.05, 140, 'Lights and ACs switch off in empty rooms and corridors.'],
  ['pv', 'Rooftop solar PV (on-grid)', 0.30, 2600, 'Net-metered solar plant sized to your roof and load.'],
  ['pf', 'Power-factor correction (APFC)', 0.03, 90, 'Cuts reactive-power penalties on HT/LT bills.'],
];
const EEE_PRODUCTS = [
  ['LED panel light 2×2 ft, 36 W', 1450, 'BEE 5-star equivalent', 'Saves ~40 W per fitting vs 4×18 W CFL'], ['BLDC ceiling fan 1200 mm, 28 W', 3290, 'BEE 5-star', 'Saves ~₹1,200/year per fan'],
  ['Heat-pump water heater 300 L', 168000, 'COP 4.2', 'Serves ~60 hostel residents'], ['Solar water heater 500 LPD (ETC)', 92000, 'MNRE listed', 'Replaces ~9 kWh/day of geyser use'],
  ['Inverter split AC 1.5 T', 46500, 'BEE 5-star (ISEER 5.2)', '30–40% less than fixed-speed AC'], ['Occupancy sensor (ceiling, PIR)', 1650, '—', 'Ideal for corridors, washrooms, classrooms'],
  ['Smart energy meter (3-phase, IoT)', 8900, 'Class 1.0', 'Live kWh dashboard per block'], ['Rooftop solar PV, per kWp', 52000, 'ALMM modules', '~4 units/day per kWp in Kerala'],
];
SEED.eeeEnquiries = () => [
  ['St. Mary’s Ladies Hostel', 'Hostel', 'Kottayam', 85000, 'Audit scheduled'], ['Kaveri Electronics Pvt Ltd', 'Company / office', 'Coimbatore', 420000, 'Proposal sent'],
].map(([org, type, city, bill, status], i) => ({ id: 'EEE' + (3101 + i), org, type, city, bill, contact: SAMPLE_NAMES[i + 2], phone: '+91 93' + String(88000000 + i * 12345).slice(0, 8), email: '', items: [], upgrades: ['led', 'bldc'], status, createdAt: new Date(Date.now() - i * 2 * 864e5).toISOString(), sample: true }));

ROUTE_TITLES.eee = 'Elsha Energy Efficiency';
route('eee', app => {
  const cart = new Map();
  app.innerHTML = pageHero({ elsha: true, eyebrow: 'EEE · Elsha Energy Efficiency', title: 'Lower power bills for hostels, campuses and companies', lead: 'We audit how your building uses electricity, recommend the upgrades that pay back fastest, and supply and install the efficient appliances.', extra: `<div class="hero-actions"><a class="btn btn-light" href="#eee" data-scroll="eee-calc">Estimate your savings</a><a class="btn btn-outline" style="color:#fff;border-color:rgba(255,255,255,.4)" href="#eee" data-scroll="eee-consult">Book a free consultation</a></div>` }) +
  `<section class="section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Who we work with</div><h2 style="margin-top:6px">Built for buildings that run all day</h2></div></div>
    <div class="grid g4">${[['building', 'Hostels & PGs', 'Water heating, fans and lights run around the clock. Heat pumps and BLDC fans usually pay back within two years.'], ['users', 'Companies & offices', 'HVAC scheduling, LED retrofits and solar PV cut daytime peak demand and HT bills.'], ['shield', 'Hospitals', 'Reliable hot water and 24×7 HVAC with power-factor correction and monitoring.'], ['grid', 'Schools & colleges', 'Occupancy controls and rooftop solar for classrooms, labs and hostels.']]
      .map(([i, t, d]) => `<div class="card stack"><div class="ico g">${icon(i)}</div><h3>${t}</h3><p class="muted">${d}</p></div>`).join('')}</div></div></section>
  <section class="section band"><div class="wrap"><div class="section-head"><div><div class="eyebrow">How an engagement runs</div><h2 style="margin-top:6px">From audit to monitored savings</h2></div></div>
    <ol class="grid g4" style="list-style:none;padding:0;margin:0">${[['Walk-through audit', 'Our engineer logs connected load, operating hours and 12 months of bills.'], ['Savings report', 'Each upgrade is priced with its expected kWh saving and payback period.'], ['Supply & install', 'We supply BEE-rated and MNRE-listed equipment and install it with minimal disruption.'], ['Measure & verify', 'Smart meters track savings against the baseline for the first 12 months.']]
      .map(([t, d], i) => `<li class="stack"><span class="mono" style="color:var(--green);font-weight:700">Step ${i + 1}</span><h3>${t}</h3><p class="muted">${d}</p></li>`).join('')}</ol></div></section>
  <section class="section" id="eee-calc"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Savings calculator</div><h2 style="margin-top:6px">What could you save?</h2></div><p>A first estimate from typical results. The site audit gives the real number.</p></div>
    <div class="split"><form class="card stack" id="calc"><div class="form-grid">
      <label class="field"><span>Facility type</span><select class="input" id="c-type" name="type"><option value="1.1">Hostel / PG</option><option value="1">Company / office</option><option value="0.95">School / college</option><option value="1.15">Hospital</option></select></label>
      <label class="field"><span>Average monthly bill (₹)</span><input class="input" id="c-bill" type="number" name="bill" min="1000" step="500" value="85000"></label>
      <label class="field"><span>Tariff (₹ per kWh)</span><input class="input" id="c-tariff" type="number" name="tariff" min="3" max="15" step="0.1" value="8"></label></div>
      <div class="stack">${EEE_UPGRADES.map(([k, l, s, , d], i) => `<label class="check" style="align-items:flex-start"><input type="checkbox" name="u" value="${k}" ${i < 3 ? 'checked' : ''} style="margin-top:3px"><span><b>${l}</b> <span class="chip green">~${Math.round(s * 100)}%</span><br><span class="muted small">${d}</span></span></label>`).join('')}</div></form>
      <aside class="card summary-box" id="calc-out" style="background:var(--surface-2)"></aside></div></div></section>
  <section class="section band"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Efficient appliances</div><h2 style="margin-top:6px">Products we supply and install</h2></div><p>Add items to your quote request. Prices are indicative and include installation.</p></div>
    <div class="grid g4">${EEE_PRODUCTS.map(([n, p, rating, note], i) => `<div class="card stack" style="align-content:start">${productArt(i)}<span class="chip green" style="justify-self:start">${esc(rating)}</span><h3 style="font-size:1rem">${esc(n)}</h3><p class="muted small">${esc(note)}</p><b style="font-family:var(--font-display);font-size:1.25rem">${inr(p)}</b>
      <div style="display:flex;gap:8px;align-items:center"><input class="input" type="number" min="1" value="1" id="qty-${i}" aria-label="Quantity" style="width:80px"><button class="btn btn-outline btn-sm" data-add="${i}">Add to quote</button></div></div>`).join('')}</div></div></section>
  <section class="section-tight" id="eee-consult"><div class="wrap"><div class="card raised"><div class="split"><form id="eq" class="stack"><div><div class="eyebrow">Free consultation</div><h2 style="margin-top:6px">Book an energy audit</h2></div><div class="form-grid">
    <label class="field"><span>Organisation</span><input class="input" id="eq-org" name="org" required></label><label class="field"><span>Type</span><select class="input" id="eq-type" name="type"><option>Hostel</option><option>Company / office</option><option>School / college</option><option>Hospital</option><option>Other</option></select></label>
    <label class="field"><span>City</span><input class="input" id="eq-city" name="city" list="dl-india" required></label><label class="field"><span>Monthly power bill (₹)</span><input class="input" id="eq-bill" name="bill" type="number" min="0"></label>
    <label class="field"><span>Contact person</span><input class="input" id="eq-name" name="contact" required></label><label class="field"><span>Mobile</span><input class="input" id="eq-ph" name="phone" required pattern="[0-9+ ]{10,15}"></label>
    <label class="field full"><span>Email</span><input class="input" id="eq-em" name="email" type="email"></label></div>
    <button class="btn btn-green btn-lg">Request consultation</button></form>
    <div class="stack" style="align-content:start"><h3>Your quote list</h3><div id="cart"></div></div></div></div></div></section>`;
  const calc = () => { const f = $('#calc'), bill = +f.bill.value || 0, tariff = +f.tariff.value || 8, factor = +f.type.value, picked = $$('input[name=u]:checked', f).map(c => EEE_UPGRADES.find(u => u[0] === c.value));
    const save = Math.min(.65, 1 - picked.reduce((p, u) => p * (1 - u[2] * factor), 1)), kwh = bill / tariff, sKwh = kwh * save, sRs = bill * save;
    const capex = picked.reduce((s, u) => s + u[3] * kwh / 100, 0), payback = sRs ? capex / sRs : 0;
    $('#calc-out').innerHTML = `<div class="eyebrow">Estimated savings</div><div style="font-family:var(--font-display);font-size:2.4rem;font-weight:700;color:var(--green)" class="num">${inr(sRs)}<span style="font-size:1rem;color:var(--muted)"> / month</span></div>
      <div class="line-item"><span>Reduction in bill</span><b>${Math.round(save * 100)}%</b></div><div class="line-item"><span>Energy saved</span><span>${Math.round(sKwh).toLocaleString('en-IN')} kWh / month</span></div><div class="line-item"><span>Yearly saving</span><span>${inr(sRs * 12)}</span></div>
      <div class="line-item"><span>Indicative investment</span><span>${inr(capex)}</span></div><div class="line-item total"><span>Simple payback</span><span>${payback ? (payback < 12 ? Math.max(1, Math.round(payback)) + ' months' : (payback / 12).toFixed(1) + ' years') : '—'}</span></div>
      <div class="notice g" style="margin-top:12px">Avoids about <b>${(sKwh * 12 * 0.71 / 1000).toFixed(1)} tonnes of CO₂</b> a year (CEA grid factor 0.71 kg/kWh).</div>`; };
  $('#calc').addEventListener('input', calc); $('#calc').addEventListener('change', calc); $('#calc').onsubmit = e => e.preventDefault(); calc();
  const drawCart = () => { const items = [...cart.entries()]; $('#cart').innerHTML = items.length ? `${items.map(([i, q]) => `<div class="line-item"><span>${q} × ${esc(EEE_PRODUCTS[i][0])}</span><span>${inr(EEE_PRODUCTS[i][1] * q)} <button class="btn btn-danger-ghost btn-sm" data-rm="${i}" aria-label="Remove">×</button></span></div>`).join('')}<div class="line-item total"><span>Indicative total</span><span>${inr(items.reduce((s, [i, q]) => s + EEE_PRODUCTS[i][1] * q, 0))}</span></div>` : '<p class="muted">No products added yet. Use “Add to quote” on any product above, or just request the audit.</p>';
    $$('[data-rm]').forEach(b => b.onclick = () => { cart.delete(+b.dataset.rm); drawCart(); }); };
  $$('[data-add]').forEach(b => b.onclick = () => { const i = +b.dataset.add, q = Math.max(1, +$('#qty-' + i).value || 1); cart.set(i, (cart.get(i) || 0) + q); drawCart(); toast(`Added ${q} × ${EEE_PRODUCTS[i][0]}`); });
  drawCart();
  $('#eq').onsubmit = e => { e.preventDefault(); const f = e.target; const q = { id: genId('EEE', 5), org: f.org.value.trim(), type: f.type.value, city: f.city.value.trim(), bill: +f.bill.value || 0, contact: f.contact.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), items: [...cart.entries()].map(([i, n]) => ({ name: EEE_PRODUCTS[i][0], qty: n, price: EEE_PRODUCTS[i][1] })), upgrades: $$('input[name=u]:checked').map(c => c.value), status: 'New', createdAt: new Date().toISOString() };
    Store.add('eeeEnquiries', q); if (Launch.request('eee', q)) { f.reset(); cart.clear(); drawCart(); return; } Notify.event('eee_request', q); f.reset(); cart.clear(); drawCart(); openModal('Consultation requested', `<div class="notice g"><b>Reference ${q.id}</b><p style="margin-top:6px">An Elsha energy engineer will call ${esc(q.contact)} on ${esc(q.phone)} within two working days to schedule the site audit.</p></div>`); };
});
