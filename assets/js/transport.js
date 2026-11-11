/* Jack & Jose Transports — Air, Road and Sea freight (FTL / PTL) across India and worldwide */
'use strict';

const ROAD_VEHICLES = [['Tata Ace / mini truck', 0.75, 22], ['14 ft LCV', 4, 34], ['17 ft truck', 7, 42], ['19 ft truck', 9, 48], ['20 ft container', 7, 52], ['32 ft SXL container', 7, 68], ['32 ft MXL container', 15, 80], ['40 ft trailer', 25, 105]];
const SEA_CONTAINERS = [['20 ft dry container (TEU)', 1], ['40 ft dry container (FEU)', 1.7], ['40 ft high cube', 1.8], ['20 ft reefer', 1.9]];
const GOODS = ['General cargo', 'Machinery & parts', 'Electronics', 'Textiles & garments', 'FMCG / food (non-perishable)', 'Perishables (cold chain)', 'Pharma', 'Furniture', 'Chemicals (non-hazardous)', 'Household goods'];
const MODE_INFO = {
  road: { label: 'Road', icon: 'truck', loads: [['FTL', 'Full truck load (FTL)'], ['PTL', 'Part truck load (PTL)']] },
  air: { label: 'Air', icon: 'plane', loads: [['FTL', 'Full charter'], ['PTL', 'Part load (consolidated)']] },
  sea: { label: 'Sea', icon: 'ship', loads: [['FTL', 'Full container (FCL)'], ['PTL', 'Less than container (LCL)']] },
};
const SHIP_STAGES = (intl) => ['Booked', 'Pickup scheduled', 'Picked up', 'In transit', ...(intl ? ['Customs clearance'] : []), 'Arrived at destination', 'Delivered'];
SEED.shipments = () => [
  ['road', 'FTL', 'Kochi', 'Delhi', 9000, '19 ft truck', 3], ['air', 'PTL', 'Bengaluru', 'Dubai (UAE)', 340, '', 4], ['sea', 'FTL', 'Kochi', 'Rotterdam (Netherlands)', 18000, '40 ft dry container (FEU)', 3],
  ['road', 'PTL', 'Chennai', 'Coimbatore', 650, '', 6], ['air', 'PTL', 'Mumbai', 'Kolkata', 120, '', 1],
].map(([mode, load, from, to, weight, vehicle, stage], i) => { const q = freightQuote({ mode, load, from, to, weight, vehicle, L: 0, W: 0, H: 0, pkgs: 1, value: 0, insure: false });
  return { id: 'JJT' + (88010 + i * 7), mode, load, from, to, weight, vehicle, goods: GOODS[i], company: ['Malabar Spices Exports', 'Kaveri Electronics', 'Cochin Coir Works', 'Sri Textiles', 'Western Pharma'][i], contact: SAMPLE_NAMES[i], phone: '+91 99' + String(31000000 + i * 51234).slice(0, 8), pickupDate: todayISO(-i), total: q.total, intl: q.intl, stage, createdAt: new Date(Date.now() - i * 864e5).toISOString(), sample: true }; });

function freightQuote(o) {
  const intl = !isIndia(o.from) || !isIndia(o.to);
  const km = o.mode === 'road' ? roadKm(o.from, o.to) : distanceKm(o.from, o.to);
  const vol = (o.L || 0) * (o.W || 0) * (o.H || 0) * (o.pkgs || 1); // cm³
  const lines = []; let base = 0, transit = '';
  if (o.mode === 'road') {
    if (o.load === 'FTL') { const v = ROAD_VEHICLES.find(x => x[0] === o.vehicle) || ROAD_VEHICLES[3]; base = Math.max(1500, km * v[2]); lines.push([`${v[0]} · ${km} km × ${inr(v[2])}/km`, base]); }
    else { const ch = Math.max(o.weight || 0, vol / 4500); const rate = 4 + km * 0.006; base = Math.max(500, ch * rate); lines.push([`${Math.round(ch)} kg chargeable × ${inr(rate)}/kg`, base]); }
    lines.push(['Fuel surcharge 12%', base * .12]); lines.push(['Loading & documentation', o.load === 'FTL' ? 1200 : 250]);
    const d = Math.max(1, Math.ceil(km / 420)); transit = `${d}–${d + 1} days`;
  } else if (o.mode === 'air') {
    if (o.load === 'FTL') { base = Math.max(450000, km * (intl ? 620 : 950)); lines.push([`Freighter charter · ${km} km`, base]); transit = intl ? '1–2 days' : 'Same / next day'; }
    else { const ch = Math.max(o.weight || 0, vol / 6000, 1); const rate = intl ? 90 + km * 0.025 : 38 + km * 0.02; base = Math.max(1200, ch * rate); lines.push([`${Math.round(ch)} kg chargeable × ${inr(rate)}/kg`, base]); lines.push(['Airport handling & screening', ch * 3 + 600]); transit = intl ? '3–6 days' : '1–2 days'; }
    lines.push(['Fuel & security surcharge 12%', base * .12]);
  } else {
    if (o.load === 'FTL') { const c = SEA_CONTAINERS.find(x => x[0] === o.vehicle) || SEA_CONTAINERS[0]; base = (18000 + km * 6.5) * c[1]; lines.push([`${c[0]} · ${km} nautical-route km`, base]); lines.push(['Terminal handling (both ends)', 8500 * c[1] * 2]); }
    else { const cbm = Math.max(1, vol / 1e6, (o.weight || 0) / 1000); const rate = 2500 + km * 0.9; base = cbm * rate; lines.push([`${cbm.toFixed(2)} CBM × ${inr(rate)}/CBM`, base]); lines.push(['CFS handling', cbm * 1200]); }
    if (intl) lines.push(['Customs documentation (shipping bill, BL)', 6500]);
    const d = Math.max(3, Math.ceil(km / 550) + 3); transit = `${d}–${d + 4} days`;
  }
  if (o.insure && o.value) lines.push(['Transit insurance 0.3% of goods value', o.value * .003]);
  const sub = lines.reduce((s, l) => s + l[1], 0);
  const gst = intl ? 0 : o.mode === 'road' ? .12 : .18;
  lines.push([intl ? 'GST (export / import freight, zero-rated)' : `GST ${gst * 100}%`, sub * gst]);
  return { lines, total: Math.round(sub * (1 + gst)), km, intl, transit };
}

ROUTE_TITLES.transports = 'Transports';
route('transports', app => {
  const st = { mode: 'road', load: 'FTL' };
  app.innerHTML = pageHero({ eyebrow: 'Jack & Jose Transports', title: 'Freight by road, air and sea. Across India and to the world.', lead: 'Get an instant estimate for a full truck, a part load, an air consignment or a sea container, then book pickup in one step.' }) +
  `<section class="wrap overlap"><div class="search-box"><div class="tabs" id="modes">${Object.entries(MODE_INFO).map(([k, m]) => `<button class="tab ${k === 'road' ? 'on' : ''}" data-mode="${k}">${icon(m.icon).replace('<svg', '<svg style="width:18px;height:18px"')} ${m.label}</button>`).join('')}</div>
    <div class="split"><form id="fq" class="stack" autocomplete="off">
      <div class="chips" id="loads"></div>
      <div class="form-grid"><label class="field"><span>Origin</span><input class="input" id="fq-from" name="from" list="dl-world" value="${esc(SITE_CONFIG.city || 'Kochi')}" required></label><label class="field"><span>Destination</span><input class="input" id="fq-to" name="to" list="dl-world" value="Delhi" required></label>
        <label class="field" id="veh-wrap"><span id="veh-label">Vehicle</span><select class="input" id="fq-veh" name="vehicle"></select></label>
        <label class="field"><span>Gross weight (kg)</span><input class="input" id="fq-wt" name="weight" type="number" min="1" value="6500" required></label>
        <label class="field" data-dims><span>Packages</span><input class="input" id="fq-pk" name="pkgs" type="number" min="1" value="1"></label>
        <label class="field" data-dims><span>Size per package L × W × H (cm)</span><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px"><input class="input" id="fq-l" name="L" type="number" min="0" placeholder="L" aria-label="Length cm"><input class="input" id="fq-w" name="W" type="number" min="0" placeholder="W" aria-label="Width cm"><input class="input" id="fq-h" name="H" type="number" min="0" placeholder="H" aria-label="Height cm"></div></label>
        <label class="field"><span>Goods type</span><select class="input" id="fq-goods" name="goods">${GOODS.map(g => `<option>${g}</option>`).join('')}</select></label>
        <label class="field"><span>Goods value (₹)</span><input class="input" id="fq-val" name="value" type="number" min="0" value="500000"></label>
        <label class="field"><span>Pickup date</span><input class="input" id="fq-date" name="date" type="date" min="${todayISO()}" value="${todayISO(1)}"></label>
        <label class="check" style="align-self:end;padding-bottom:10px"><input type="checkbox" id="fq-ins" name="insure" checked> Add transit insurance</label></div>
      <p class="muted small" id="fq-note"></p></form>
      <aside class="card summary-box" style="background:var(--surface-2)" id="quote"></aside></div></div></section>
  <section class="section"><div class="wrap grid g3">
    ${[['truck', 'Road freight', 'FTL trucks from 0.75 T mini trucks to 25 T trailers, and PTL consolidation between major hubs. Every truck GPS-tracked through our fleet portal.'],
      ['plane', 'Air cargo', 'Consolidated and charter air freight through all major Indian airports and to the Gulf, Southeast Asia, Europe and the Americas.'],
      ['ship', 'Sea freight', 'FCL and LCL from Kochi (Vallarpadam), Chennai, Nhava Sheva and Mundra, with customs documentation handled end to end.']]
      .map(([i, t, d]) => `<div class="card stack pic-card">${pic({ truck: 'road', plane: 'air', ship: 'sea' }[i])}<div class="ico">${icon(i)}</div><h3>${t}</h3><p class="muted">${d}</p></div>`).join('')}</div></section>
  <section class="section-tight"><div class="wrap"><div class="card"><div class="eyebrow">Track a shipment</div><h3 style="margin:6px 0 14px">Where is my consignment?</h3>
    <form id="trk" style="display:flex;gap:10px;flex-wrap:wrap"><input class="input mono" id="trk-id" name="id" placeholder="Shipment ID, e.g. JJT88010" style="flex:1 1 220px" required><button class="btn btn-primary">Track</button></form><div id="trk-out" style="margin-top:16px"></div></div></div></section>`;
  const f = $('#fq', app);
  function setMode() {
    $('#loads').innerHTML = MODE_INFO[st.mode].loads.map(([k, l]) => `<button type="button" class="chip ${k === st.load ? 'on' : ''}" data-load="${k}">${l}</button>`).join('');
    $$('[data-load]').forEach(b => b.onclick = () => { st.load = b.dataset.load; setMode(); });
    const showVeh = st.load === 'FTL' && st.mode !== 'air';
    $('#veh-wrap').hidden = !showVeh;
    $('#veh-label').textContent = st.mode === 'sea' ? 'Container' : 'Vehicle';
    $('#fq-veh').innerHTML = (st.mode === 'sea' ? SEA_CONTAINERS.map(c => `<option>${c[0]}</option>`) : ROAD_VEHICLES.map(v => `<option value="${v[0]}">${v[0]} · up to ${v[1]} T</option>`)).join('');
    if (st.mode === 'road') $('#fq-veh').value = '19 ft truck';
    $$('[data-dims]').forEach(d => d.hidden = st.load === 'FTL');
    f.from.setAttribute('list', st.mode === 'road' ? 'dl-india' : 'dl-world'); f.to.setAttribute('list', st.mode === 'road' ? 'dl-india' : 'dl-world');
    $('#fq-note').textContent = { road: 'Road freight covers all Indian states. For Nepal, Bhutan and Bangladesh border deliveries, contact our team.', air: 'Volumetric weight for air = L × W × H (cm) ÷ 6000. You pay for the higher of actual and volumetric weight.', sea: 'Port-to-port pricing from the nearest seaport. Door delivery at destination available on request.' }[st.mode];
    quote();
  }
  const read = () => ({ mode: st.mode, load: st.load, from: cityKey(f.from.value) || f.from.value.trim(), to: cityKey(f.to.value) || f.to.value.trim(), vehicle: f.vehicle.value, weight: +f.weight.value, pkgs: +f.pkgs.value || 1, L: +f.L.value, W: +f.W.value, H: +f.H.value, value: +f.value.value, insure: f.insure.checked, goods: f.goods.value, date: f.date.value });
  function quote() {
    const o = read();
    if (!o.from || !o.to || sameCity(o.from, o.to)) { $('#quote').innerHTML = `<div class="empty-state">Enter two different places to see an estimate.</div>`; return; }
    if (st.mode === 'road' && (!isIndia(o.from) || !isIndia(o.to))) { $('#quote').innerHTML = `<div class="empty-state"><b>Road freight runs within India.</b><p style="margin-top:6px">Switch to Air or Sea for international destinations.</p></div>`; return; }
    if (st.mode === 'road' && st.load === 'FTL') { const v = ROAD_VEHICLES.find(x => x[0] === o.vehicle); if (v && o.weight > v[1] * 1000) { $('#quote').innerHTML = `<div class="empty-state"><b>${o.weight.toLocaleString('en-IN')} kg is over the ${v[0]} limit (${v[1] * 1000} kg).</b><p style="margin-top:6px">Pick a larger vehicle.</p></div>`; return; } }
    const q = freightQuote(o);
    $('#quote').innerHTML = `<div class="eyebrow">Instant estimate</div><h3 style="margin:6px 0 4px">${esc(o.from)} → ${esc(o.to)}</h3><div class="muted small">${MODE_INFO[st.mode].label} · ${MODE_INFO[st.mode].loads.find(l => l[0] === st.load)[1]} · ${q.km.toLocaleString('en-IN')} km · transit ${q.transit}</div>
      <div style="margin-top:12px">${q.lines.map(([l, v]) => `<div class="line-item"><span>${esc(l)}</span><span>${inr(v)}</span></div>`).join('')}<div class="line-item total"><span>Estimated total</span><span>${inr(q.total)}</span></div></div>
      <button class="btn btn-green btn-block" id="book-ship" style="margin-top:12px">Book this shipment</button><p class="muted small" style="margin-top:8px">Final price is confirmed after pickup weighment.</p>`;
    $('#book-ship').onclick = () => book(o, q);
  }
  function book(o, q) {
    openModal('Book shipment', `<div class="notice"><b>${esc(o.from)} → ${esc(o.to)}</b> · ${MODE_INFO[o.mode].label} · ${inr(q.total)}</div><form id="sb" class="form-grid">
      <label class="field"><span>Company</span><input class="input" id="sb-co" name="company" required></label><label class="field"><span>Contact person</span><input class="input" id="sb-name" name="name" required></label>
      <label class="field"><span>Mobile</span><input class="input" id="sb-ph" name="phone" required pattern="[0-9+ ]{10,15}"></label><label class="field"><span>Email</span><input class="input" id="sb-em" name="email" type="email"></label>
      <label class="field full"><span>Pickup address</span><textarea class="input" id="sb-addr" name="addr" required></textarea></label>
      <label class="field full"><span>GSTIN (optional)</span><input class="input mono" id="sb-gst" name="gstin" placeholder="32ABCDE1234F1Z5" maxlength="15"></label>
      <button class="btn btn-green btn-lg full">Confirm booking</button></form>`, { onMount: m => $('#sb', m).onsubmit = e => { e.preventDefault(); const t = e.target;
        const s = { id: genNum('JJT', 5), mode: o.mode, load: o.load, from: o.from, to: o.to, weight: o.weight, vehicle: o.load === 'FTL' ? o.vehicle : '', goods: o.goods, company: t.company.value.trim(), contact: t.name.value.trim(), phone: t.phone.value.trim(), email: t.email.value.trim(), address: t.addr.value.trim(), gstin: t.gstin.value.trim(), pickupDate: o.date, total: q.total, intl: q.intl, stage: 0, createdAt: new Date().toISOString() };
        Store.add('shipments', s); if (Launch.request('freight', s)) return; Notify.event('shipment_booked', s); closeModal(); toast('Shipment booked · ' + s.id); $('#trk-id').value = s.id; trackShow(s); $('#trk-out').scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
  }
  function trackShow(s) {
    const stages = SHIP_STAGES(s.intl);
    $('#trk-out').innerHTML = `<div class="grid g2"><div class="kv"><div><span>Shipment</span><b class="mono">${esc(s.id)}</b></div><div><span>Route</span><b>${esc(s.from)} → ${esc(s.to)}</b></div><div><span>Mode</span><b>${MODE_INFO[s.mode].label} · ${s.load === 'FTL' ? 'Full load' : 'Part load'}</b></div><div><span>Shipper</span><b>${esc(s.company)}</b></div><div><span>Pickup</span><b>${fmtDate(s.pickupDate)}</b></div><div><span>Freight</span><b>${inr(s.total)}</b></div></div>
      <ol class="timeline">${stages.map((x, i) => `<li class="${i < s.stage ? 'done' : i === s.stage ? 'now' : ''}"><b>${x}</b>${i === s.stage ? '<div class="muted small">Current status</div>' : ''}</li>`).join('')}</ol></div>`;
  }
  $$('[data-mode]').forEach(b => b.onclick = () => { st.mode = b.dataset.mode; $$('[data-mode]').forEach(x => x.classList.toggle('on', x === b));
    if (st.mode === 'road') { f.from.value = SITE_CONFIG.city || 'Kochi'; f.to.value = 'Delhi'; f.weight.value = 6500; } else if (st.mode === 'air') { st.load = 'PTL'; f.from.value = 'Bengaluru'; f.to.value = 'Dubai (UAE)'; f.weight.value = 250; } else { f.from.value = 'Kochi'; f.to.value = 'Rotterdam (Netherlands)'; f.weight.value = 15000; }
    setMode(); });
  f.addEventListener('input', quote); f.addEventListener('change', quote); f.onsubmit = e => e.preventDefault();
  $('#trk', app).onsubmit = e => { e.preventDefault(); const s = Store.find('shipments', e.target.id.value.trim().toUpperCase()); if (!s) { $('#trk-out').innerHTML = `<p class="muted">No shipment found with that ID. Check the ID on your booking confirmation.</p>`; return; } trackShow(s); };
  setMode();
});
