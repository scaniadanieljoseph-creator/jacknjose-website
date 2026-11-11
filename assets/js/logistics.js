/* Jack & Jose Logistics — parcel booking, loading/unloading, tracking + branch master portal */
'use strict';

const PARCEL_STATUSES = ['Booked', 'Picked Up', 'Loaded', 'In Transit', 'Unloaded', 'Out for Delivery', 'Delivered'];
const PARCEL_TYPES = [['Documents', 1], ['Box / carton', 1], ['Electronics', 1.25], ['Furniture', 1.4], ['Perishables', 1.5], ['Two-wheeler', 1]];
const PARCEL_SERVICES = [['Standard (3–5 days)', 1], ['Express (1–2 days)', 1.6], ['Same-day (within city)', 2.2]];
SEED.branches = () => [
  ['KOC', 'Kochi Hub (Head Office)', 'Kochi', 'Hub', 'Jose Antony'], ['TVM', 'Thiruvananthapuram Branch', 'Thiruvananthapuram', 'Branch', 'Anil Kumar'], ['CLT', 'Kozhikode Branch', 'Kozhikode', 'Branch', 'Shameer K'],
  ['TCR', 'Thrissur Branch', 'Thrissur', 'Branch', 'Divya Menon'], ['CBE', 'Coimbatore Branch', 'Coimbatore', 'Branch', 'Senthil R'], ['MAA', 'Chennai Hub', 'Chennai', 'Hub', 'Karthik S'],
  ['BLR', 'Bengaluru Hub', 'Bengaluru', 'Hub', 'Prakash Gowda'], ['HYD', 'Hyderabad Branch', 'Hyderabad', 'Branch', 'Srinivas Rao'], ['BOM', 'Mumbai Hub', 'Mumbai', 'Hub', 'Aditya Patil'], ['DEL', 'Delhi Hub', 'Delhi', 'Hub', 'Rohit Verma'],
  ['KTM', 'Kottayam Franchise', 'Kottayam', 'Franchise', 'Biju Mathew'],
].map(([code, name, city, type, manager], i) => ({ id: 'BR' + code, code, name, city, type, manager, phone: '+91 484 ' + String(2300000 + i * 4111).slice(0, 7), address: `${['MG Road', 'NH Bypass', 'Industrial Estate', 'Market Road'][i % 4]}, ${city}`, status: i === 10 ? 'Inactive' : 'Active', createdAt: new Date().toISOString() }));
SEED.parcels = () => {
  const br = SEED.branches(), r = rng(99), out = [];
  for (let i = 0; i < 14; i++) {
    const a = br[Math.floor(r() * 10)], b = br[Math.floor(r() * 10)]; if (a === b) continue;
    const st = Math.floor(r() * PARCEL_STATUSES.length), w = Math.round((0.5 + r() * 40) * 10) / 10, t0 = Date.now() - (i + 1) * 864e5 * .6;
    const q = parcelPrice({ from: a.city, to: b.city, weight: w, type: PARCEL_TYPES[i % 5][0], service: PARCEL_SERVICES[i % 2][0], pkgs: 1 + (i % 3), pickup: i % 2 === 0, loading: i % 3 === 0, unloading: i % 4 === 0, value: 0 });
    out.push({ id: 'JJL' + (400100200 + i * 7919), fromBranch: a.id, toCity: b.city, toBranch: b.id, sender: SAMPLE_NAMES[i % 14], senderPhone: '+91 94' + String(47000000 + i * 31337).slice(0, 8), receiver: SAMPLE_NAMES[(i + 7) % 14], receiverPhone: '+91 90' + String(61000000 + i * 27183).slice(0, 8),
      receiverAddress: `${b.city}`, type: PARCEL_TYPES[i % 5][0], service: PARCEL_SERVICES[i % 2][0], weight: w, pkgs: 1 + (i % 3), value: 0, addons: { pickup: i % 2 === 0, loading: i % 3 === 0, unloading: i % 4 === 0, insure: false }, total: q.total, status: PARCEL_STATUSES[st], vehicle: st >= 2 && st <= 4 ? 'VEH' + (501 + (i % 4)) : '',
      history: PARCEL_STATUSES.slice(0, st + 1).map((s, k) => ({ status: s, at: new Date(t0 + k * 5 * 3600e3).toISOString(), note: k === 2 ? `Loaded at ${a.name}` : k === 4 ? `Unloaded at ${b.name}` : '' })), createdAt: new Date(t0).toISOString(), sample: true });
  }
  return out;
};
function parcelPrice(o) {
  const km = roadKm(o.from, o.to), w = Math.max(0.5, o.weight || 0), T = (PARCEL_TYPES.find(t => t[0] === o.type) || PARCEL_TYPES[1])[1], S = (PARCEL_SERVICES.find(s => s[0] === o.service) || PARCEL_SERVICES[0])[1];
  const zone = km < 60 ? 'Within city' : km < 400 ? 'Within region' : km < 1200 ? 'Metro / rest of South' : 'National';
  const perKg = km < 60 ? 18 : km < 400 ? 28 : km < 1200 ? 42 : 58;
  const lines = [[`${zone} · ${w} kg × ${inr(perKg)}/kg`, Math.max(60, w * perKg)]];
  if (T !== 1) lines.push([`Special handling (${o.type})`, lines[0][1] * (T - 1)]);
  if (S !== 1) lines.push([`${o.service.split(' (')[0]} service`, lines[0][1] * (S - 1)]);
  if (o.pickup) lines.push(['Door pickup', 80]);
  if (o.loading) lines.push([`Loading assistance (${o.pkgs} pkg)`, 40 * o.pkgs + Math.max(0, w - 30) * 2]);
  if (o.unloading) lines.push([`Unloading assistance (${o.pkgs} pkg)`, 40 * o.pkgs + Math.max(0, w - 30) * 2]);
  if (o.insure && o.value) lines.push(['Insurance 1% of value', Math.max(25, o.value * .01)]);
  const sub = lines.reduce((s, l) => s + l[1], 0); lines.push(['GST 18%', sub * .18]);
  return { lines, total: Math.round(sub * 1.18), km, zone };
}
const branchName = id => Store.find('branches', id)?.name || '—';
function parcelTimeline(p) {
  const done = new Map(p.history.map(h => [h.status, h]));
  const cur = PARCEL_STATUSES.indexOf(p.status);
  if (p.status === 'Cancelled') return `<div class="notice">This parcel was cancelled.</div>`;
  return `<ol class="timeline">${PARCEL_STATUSES.map((s, i) => { const h = done.get(s); return `<li class="${i < cur ? 'done' : i === cur ? (s === 'Delivered' ? 'done' : 'now') : ''}"><b>${s}</b>${h ? `<div class="muted small">${fmtDateTime(h.at)}${h.note ? ' · ' + esc(h.note) : ''}</div>` : ''}</li>`; }).join('')}</ol>`;
}
function parcelCard(p) {
  return `<div class="ticket"><div class="ticket-head"><div><div class="small" style="opacity:.8">Jack & Jose Logistics · Airway bill</div><b class="mono" style="font-size:1.3rem">${esc(p.id)}</b></div><div>${statusChip(p.status)}</div></div>
    <div class="ticket-body"><div class="kv"><div><span>From</span><b>${esc(branchName(p.fromBranch))}</b></div><div><span>To</span><b>${esc(p.toCity)}</b></div><div><span>Service</span><b>${esc(p.service)}</b></div><div><span>Parcel</span><b>${esc(p.type)} · ${p.pkgs} pkg · ${p.weight} kg</b></div></div>
    <div class="kv"><div><span>Sender</span><b>${esc(p.sender)}</b><div class="muted small">${esc(p.senderPhone)}</div></div><div><span>Receiver</span><b>${esc(p.receiver)}</b><div class="muted small">${esc(p.receiverPhone)}</div></div><div><span>Amount</span><b>${inr(p.total)}</b></div></div></div>
    <div class="ticket-perf"></div><div class="ticket-body">${parcelTimeline(p)}${Notify.note(p.id)}</div></div>`;
}

ROUTE_TITLES.logistics = 'Parcel booking';
route('logistics', app => {
  const brs = Store.get('branches').filter(b => b.status === 'Active');
  app.innerHTML = pageHero({ eyebrow: 'Jack & Jose Logistics', title: 'Send a parcel from any of our branches', lead: `${brs.length} active branches and hubs. Door pickup, loading and unloading help, and live tracking from booking to delivery.` }) +
  `<section class="wrap overlap"><div class="search-box"><div class="split"><form id="pb" class="stack" autocomplete="off">
    <h3>Parcel details</h3><div class="form-grid">
      <label class="field"><span>Booking branch</span><select class="input" id="pb-from" name="from">${brs.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Destination city</span><input class="input" id="pb-to" name="to" list="dl-india" value="Bengaluru" required></label>
      <label class="field"><span>Parcel type</span><select class="input" id="pb-type" name="type">${PARCEL_TYPES.map(t => `<option>${t[0]}</option>`).join('')}</select></label>
      <label class="field"><span>Service</span><select class="input" id="pb-svc" name="service">${PARCEL_SERVICES.map(t => `<option>${t[0]}</option>`).join('')}</select></label>
      <label class="field"><span>Total weight (kg)</span><input class="input" id="pb-wt" name="weight" type="number" min="0.1" step="0.1" value="5" required></label>
      <label class="field"><span>No. of packages</span><input class="input" id="pb-pk" name="pkgs" type="number" min="1" value="1" required></label>
      <label class="field"><span>Declared value (₹)</span><input class="input" id="pb-val" name="value" type="number" min="0" value="2000"></label></div>
    <div class="chips"><label class="check chip"><input type="checkbox" id="pb-pick" name="pickup"> Door pickup</label><label class="check chip"><input type="checkbox" id="pb-load" name="loading"> Loading help</label><label class="check chip"><input type="checkbox" id="pb-unload" name="unloading"> Unloading help</label><label class="check chip"><input type="checkbox" id="pb-ins" name="insure"> Insure parcel</label></div>
    <h3 style="margin-top:6px">Sender & receiver</h3><div class="form-grid">
      <label class="field"><span>Sender name</span><input class="input" id="pb-sn" name="sender" required></label><label class="field"><span>Sender mobile</span><input class="input" id="pb-sp" name="senderPhone" required pattern="[0-9+ ]{10,15}"></label>
      <label class="field full"><span>Sender email (optional, for receipt)</span><input class="input" id="pb-se" name="senderEmail" type="email"></label>
      <label class="field"><span>Receiver name</span><input class="input" id="pb-rn" name="receiver" required></label><label class="field"><span>Receiver mobile</span><input class="input" id="pb-rp" name="receiverPhone" required pattern="[0-9+ ]{10,15}"></label>
      <label class="field full"><span>Delivery address</span><textarea class="input" id="pb-ra" name="receiverAddress" required placeholder="House / building, street, area, PIN code"></textarea></label></div>
    <button class="btn btn-green btn-lg">Book parcel</button></form>
    <aside class="card summary-box" style="background:var(--surface-2)" id="pq"></aside></div></div></section>
  <section class="section"><div class="wrap grid g2"><div class="card"><div class="eyebrow">Track parcel</div><h3 style="margin:6px 0 14px">Enter your airway bill number</h3>
    <form id="pt" style="display:flex;gap:10px;flex-wrap:wrap"><input class="input mono" id="pt-id" name="id" placeholder="e.g. JJL400100200" style="flex:1 1 200px" required><button class="btn btn-primary">Track</button></form><div id="pt-out" style="margin-top:16px"></div></div>
    <div class="card"><div class="eyebrow">Our branches</div><h3 style="margin:6px 0 14px">Drop off at a branch near you</h3><div class="stack">${brs.map(b => `<div style="display:flex;justify-content:space-between;gap:10px;border-bottom:1px dashed var(--line);padding-bottom:8px"><div><b>${esc(b.name)}</b><div class="muted small">${esc(b.address)}</div></div><span class="chip ${b.type === 'Hub' ? 'blue' : ''}">${esc(b.type)}</span></div>`).join('')}</div></div></div></section>
  <section class="section-tight"><div class="wrap"><div class="notice" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center"><span><b>Branch staff:</b> load, unload and update parcels, and manage branches in the Logistics master portal.</span><a class="btn btn-primary btn-sm" href="#logistics-admin">Open Logistics portal</a></div></div></section>`;
  const f = $('#pb', app);
  const read = () => ({ fromBranch: f.from.value, from: Store.find('branches', f.from.value)?.city, to: cityKey(f.to.value) || f.to.value.trim(), type: f.type.value, service: f.service.value, weight: +f.weight.value, pkgs: +f.pkgs.value || 1, value: +f.value.value, pickup: f.pickup.checked, loading: f.loading.checked, unloading: f.unloading.checked, insure: f.insure.checked });
  const quote = () => { const o = read(); if (!o.to) return; if (o.service.startsWith('Same-day') && roadKm(o.from, o.to) > 60) { $('#pq').innerHTML = `<div class="empty-state"><b>Same-day service works within the same city.</b><p style="margin-top:6px">Choose Standard or Express for ${esc(o.to)}.</p></div>`; return null; }
    const q = parcelPrice(o); $('#pq').innerHTML = `<div class="eyebrow">Price</div><h3 style="margin:6px 0 4px">${esc(o.from)} → ${esc(o.to)}</h3><div class="muted small">${q.km} km by road</div><div style="margin-top:12px">${q.lines.map(([l, v]) => `<div class="line-item"><span>${esc(l)}</span><span>${inr(v)}</span></div>`).join('')}<div class="line-item total"><span>Total</span><span>${inr(q.total)}</span></div></div>`; return q; };
  f.addEventListener('input', quote); f.addEventListener('change', quote); quote();
  f.onsubmit = e => { e.preventDefault(); const o = read(), q = quote(); if (!q) return toast('Choose a service that matches the destination', 'err');
    const toBranch = Store.get('branches').find(b => sameCity(b.city, o.to) && b.status === 'Active');
    const p = { id: genNum('JJL', 9), fromBranch: o.fromBranch, toCity: o.to, toBranch: toBranch?.id || '', sender: f.sender.value.trim(), senderPhone: f.senderPhone.value.trim(), senderEmail: f.senderEmail.value.trim(), receiver: f.receiver.value.trim(), receiverPhone: f.receiverPhone.value.trim(), receiverAddress: f.receiverAddress.value.trim(),
      type: o.type, service: o.service, weight: o.weight, pkgs: o.pkgs, value: o.value, addons: { pickup: o.pickup, loading: o.loading, unloading: o.unloading, insure: o.insure }, total: q.total, status: 'Booked', vehicle: '', history: [{ status: 'Booked', at: new Date().toISOString(), note: `At ${branchName(o.fromBranch)}` }], createdAt: new Date().toISOString() };
    Store.add('parcels', p); Notify.event('parcel_booked', p); toast('Parcel booked · AWB ' + p.id); openModal('Parcel booked', parcelCard(p), { wide: true }); f.reset(); quote(); };
  $('#pt', app).onsubmit = e => { e.preventDefault(); const p = Store.find('parcels', e.target.id.value.trim().toUpperCase()); $('#pt-out').innerHTML = p ? `<div class="stack"><div><b class="mono">${esc(p.id)}</b> · ${esc(branchName(p.fromBranch))} → ${esc(p.toCity)}</div>${parcelTimeline(p)}</div>` : '<p class="muted">No parcel found with that number. Check the airway bill on your receipt.</p>'; };
});

ROUTE_TITLES['logistics-admin'] = 'Logistics portal';
route('logistics-admin', app => {
  const tabs = [['dash', 'Dashboard'], ['parcels', 'Parcels'], ['loading', 'Loading & unloading'], ['branches', 'Branches']];
  const active = Session.get('tab_#logistics-admin') || 'dash';
  app.innerHTML = adminShell({ title: 'Logistics master portal', sub: 'Parcel operations, vehicle loading sheets and the branch network.', tabs, active, base: 'logistics' });
  const body = $('#admin-body', app);
  const moveTo = (p, status, extra = {}) => { const note = extra.note || ''; Store.update('parcels', p.id, x => ({ status, ...extra, history: [...x.history, { status, at: new Date().toISOString(), note }] })); Notify.event('parcel_update', Store.find('parcels', p.id)); };
  const show = tab => {
    const P = Store.get('parcels');
    if (tab === 'dash') {
      const byStatus = PARCEL_STATUSES.map(s => [s, P.filter(p => p.status === s).length]);
      const byBranch = {}; P.forEach(p => { const n = branchName(p.fromBranch); byBranch[n] = (byBranch[n] || 0) + 1; });
      const rev = P.filter(p => p.status !== 'Cancelled').reduce((s, p) => s + p.total, 0);
      body.innerHTML = `<div class="kpis">${kpi('Parcels', P.length, `${P.filter(p => p.createdAt.slice(0, 10) === todayISO()).length} booked today`)}${kpi('In network', P.filter(p => !['Delivered', 'Cancelled'].includes(p.status)).length, 'not yet delivered')}${kpi('Delivered', P.filter(p => p.status === 'Delivered').length)}${kpi('Revenue', inr(rev))}${kpi('Active branches', Store.get('branches').filter(b => b.status === 'Active').length, `${Store.get('branches').length} total`)}</div>
      <div class="grid g2" style="margin-top:18px"><div class="card"><h3 style="margin-bottom:14px">Parcels by status</h3>${bars(byStatus)}</div><div class="card"><h3 style="margin-bottom:14px">Bookings by origin branch</h3>${bars(Object.entries(byBranch).sort((a, b) => b[1] - a[1]).slice(0, 8))}</div></div>`;
    }
    if (tab === 'parcels') renderCrud(body, { key: 'parcels', single: 'Parcel', plural: 'Parcels', noAdd: true, noEdit: true, label: r => r.id,
      columns: [{ label: 'AWB', render: r => `<span class="mono">${esc(r.id)}</span><div class="muted small">${fmtDateTime(r.createdAt)}</div>` }, { label: 'Route', render: r => `${esc(branchName(r.fromBranch))}<div class="muted small">→ ${esc(r.toCity)}</div>` }, { label: 'Parcel', render: r => `${esc(r.type)}<div class="muted small">${r.pkgs} pkg · ${r.weight} kg</div>` },
        { label: 'Receiver', render: r => `${esc(r.receiver)}<div class="muted small">${esc(r.receiverPhone)}</div>` }, { label: 'Add-ons', render: r => [r.addons?.pickup && 'Pickup', r.addons?.loading && 'Load', r.addons?.unloading && 'Unload'].filter(Boolean).map(a => `<span class="chip">${a}</span>`).join(' ') || '—' }, { label: 'Amount', render: r => inr(r.total) }, { label: 'Status', render: r => statusChip(r.status) }],
      actions: [{ id: 'view', label: 'Details', run: r => openModal('Parcel ' + r.id, parcelCard(r), { wide: true }) }, { id: 'next', label: 'Next step', show: r => !['Delivered', 'Cancelled'].includes(r.status), run: (r, rr) => { const n = PARCEL_STATUSES[PARCEL_STATUSES.indexOf(r.status) + 1]; moveTo(r, n); toast(`${r.id} → ${n}`); rr(); } },
        { id: 'cx', label: 'Cancel', show: r => r.status === 'Booked', run: (r, rr) => confirmBox(`Cancel parcel ${r.id}?`, () => { moveTo(r, 'Cancelled'); toast('Parcel cancelled'); rr(); }, 'Cancel parcel') }] });
    if (tab === 'loading') {
      const V = Store.get('vehicles').filter(v => v.status !== 'Inactive');
      const toLoad = P.filter(p => ['Booked', 'Picked Up'].includes(p.status)), toUnload = P.filter(p => ['Loaded', 'In Transit'].includes(p.status));
      const sheet = (list, kind) => `<div class="table-wrap"><table class="table"><thead><tr><th><input type="checkbox" data-all="${kind}" aria-label="Select all"></th><th>AWB</th><th>Route</th><th>Parcel</th><th>Vehicle</th><th>Status</th></tr></thead><tbody>
        ${list.map(p => `<tr><td><input type="checkbox" data-pick="${kind}" value="${p.id}" aria-label="Select ${p.id}"></td><td class="mono">${esc(p.id)}</td><td>${esc(branchName(p.fromBranch))} → ${esc(p.toCity)}</td><td>${p.pkgs} pkg · ${p.weight} kg</td><td class="mono">${esc(Store.find('vehicles', p.vehicle)?.regNo || '—')}</td><td>${statusChip(p.status)}</td></tr>`).join('') || `<tr><td colspan="6" class="empty">Nothing waiting here.</td></tr>`}</tbody></table></div>`;
      body.innerHTML = `<div class="grid" style="gap:22px"><div class="card stack"><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:end;justify-content:space-between"><div><h3>Loading sheet</h3><p class="muted small">Parcels booked or picked up, waiting to be loaded onto a vehicle.</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><select class="input" id="load-veh" style="width:auto">${V.map(v => `<option value="${v.id}">${esc(v.regNo)} · ${esc(v.type)}</option>`).join('')}</select><button class="btn btn-primary" id="do-load">Load selected</button></div></div>${sheet(toLoad, 'L')}</div>
        <div class="card stack"><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:end;justify-content:space-between"><div><h3>Unloading sheet</h3><p class="muted small">Parcels on vehicles. Mark as dispatched or unload at the destination branch.</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-outline" id="do-transit">Mark in transit</button><button class="btn btn-green" id="do-unload">Unload selected</button></div></div>${sheet(toUnload, 'U')}</div></div>`;
      $$('[data-all]', body).forEach(a => a.onchange = () => $$(`[data-pick="${a.dataset.all}"]`, body).forEach(c => c.checked = a.checked));
      const picked = k => $$(`[data-pick="${k}"]:checked`, body).map(c => Store.find('parcels', c.value));
      $('#do-load', body).onclick = () => { const L = picked('L'), v = Store.find('vehicles', $('#load-veh').value); if (!L.length) return toast('Select at least one parcel', 'err'); L.forEach(p => moveTo(p, 'Loaded', { vehicle: v.id, note: `Loaded on ${v.regNo} at ${branchName(p.fromBranch)}` })); toast(`${L.length} parcel(s) loaded on ${v.regNo}`); show('loading'); };
      $('#do-transit', body).onclick = () => { const L = picked('U').filter(p => p.status === 'Loaded'); if (!L.length) return toast('Select loaded parcels to dispatch', 'err'); L.forEach(p => moveTo(p, 'In Transit', { note: 'Vehicle departed' })); toast(`${L.length} parcel(s) dispatched`); show('loading'); };
      $('#do-unload', body).onclick = () => { const L = picked('U'); if (!L.length) return toast('Select at least one parcel', 'err'); L.forEach(p => moveTo(p, 'Unloaded', { note: `Unloaded at ${p.toBranch ? branchName(p.toBranch) : p.toCity + ' delivery centre'}` })); toast(`${L.length} parcel(s) unloaded`); show('loading'); };
    }
    if (tab === 'branches') renderCrud(body, { key: 'branches', single: 'Branch', plural: 'Branches', label: r => r.name, newId: d => 'BR' + d.code.toUpperCase() + (Store.find('branches', 'BR' + d.code.toUpperCase()) ? genId('', 2) : ''),
      fields: [{ name: 'code', label: 'Branch code', required: true, placeholder: 'e.g. KOC' }, { name: 'name', label: 'Branch name', required: true }, { name: 'city', label: 'City', list: 'dl-india', required: true }, { name: 'type', label: 'Type', type: 'select', options: ['Hub', 'Branch', 'Franchise'] },
        { name: 'manager', label: 'Branch manager', required: true }, { name: 'phone', label: 'Phone', required: true }, { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }, { name: 'address', label: 'Address', full: true, required: true }],
      validate: (d, row) => { d.code = d.code.toUpperCase(); return Store.get('branches').some(b => b.code === d.code && b.id !== row?.id) ? `Branch code ${d.code} is already in use` : null; },
      columns: [{ label: 'Code', render: r => `<b class="mono">${esc(r.code)}</b>` }, { label: 'Branch', render: r => `${esc(r.name)}<div class="muted small">${esc(r.address)}</div>` }, { label: 'City', field: 'city' }, { label: 'Type', render: r => `<span class="chip ${r.type === 'Hub' ? 'blue' : ''}">${esc(r.type)}</span>` }, { label: 'Manager', render: r => `${esc(r.manager)}<div class="muted small">${esc(r.phone)}</div>` },
        { label: 'Parcels', render: r => P.filter(p => p.fromBranch === r.id).length }, { label: 'Status', render: r => statusChip(r.status) }] });
  };
  bindTabs(app, show); show(active);
});
