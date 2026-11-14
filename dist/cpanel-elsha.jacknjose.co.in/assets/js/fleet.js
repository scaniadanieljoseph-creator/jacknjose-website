/* Jack & Jose Fleet — master portal for every vehicle: live positions, trips, maintenance, compliance */
'use strict';

const VEHICLE_TYPES = ['32 ft MXL container', '32 ft SXL container', '19 ft truck', '14 ft LCV', 'Tata Ace / mini truck', '40 ft trailer', 'AC sleeper bus', 'AC seater bus', 'Tempo Traveller (12 seat)', 'Sedan (staff car)'];
const VEHICLE_STATUS = ['Available', 'On Trip', 'Maintenance', 'Inactive'];
SEED.vehicles = () => [
  ['KL-07-CX-4521', '32 ft MXL container', 'Tata Signa 4825.TK', 15000, 'Manoj Kumar', 'On Trip', 'Kochi', 62, 182340, 40, 185000],
  ['KL-07-CY-1180', '19 ft truck', 'Ashok Leyland Boss 1415', 9000, 'Sudheer P', 'Available', 'Kochi', 81, 96410, 210, 100000],
  ['KL-07-DA-7744', '14 ft LCV', 'Eicher Pro 2049', 4000, 'Rajesh V', 'On Trip', 'Coimbatore', 44, 58220, 95, 60000],
  ['KL-07-DB-3302', 'Tata Ace / mini truck', 'Tata Ace Gold', 750, 'Anoop K', 'Available', 'Kochi', 15, 41230, 300, 45000],
  ['TN-37-BZ-6610', '32 ft SXL container', 'BharatBenz 2823C', 7000, 'Murugan S', 'Maintenance', 'Chennai', 30, 211870, 12, 210000],
  ['KA-01-AK-9087', '40 ft trailer', 'Tata Prima 5530.S', 25000, 'Basavaraj H', 'On Trip', 'Bengaluru', 70, 304550, 160, 310000],
  ['KL-07-JJ-4100', 'AC sleeper bus', 'Volvo 9600 Sleeper', 36, 'Shaji Thomas', 'On Trip', 'Kochi', 66, 402110, 120, 405000],
  ['KL-07-JJ-4137', 'AC sleeper bus', 'BharatBenz 1624 Sleeper', 36, 'Pradeep Nair', 'Available', 'Bengaluru', 88, 288700, -5, 290000],
  ['KL-07-JJ-4174', 'AC seater bus', 'Ashok Leyland Viking', 44, 'Vinod Raj', 'Available', 'Thiruvananthapuram', 72, 150980, 260, 155000],
  ['KL-07-JJ-4211', 'Tempo Traveller (12 seat)', 'Force Traveller 3350', 12, 'Jibin George', 'Available', 'Kochi', 55, 77400, 22, 80000],
  ['MH-04-KT-2290', '19 ft truck', 'Tata LPT 1412', 9000, 'Santosh Jadhav', 'On Trip', 'Mumbai', 51, 132600, 330, 135000],
  ['KL-07-DE-5521', 'Sedan (staff car)', 'Maruti Ciaz', 4, 'Office pool', 'Inactive', 'Kochi', 35, 66010, 400, 70000],
].map(([regNo, type, model, capacity, driver, status, location, fuel, odometer, insDays, nextServiceKm], i) => ({
  id: 'VEH' + (501 + i), regNo, type, model, capacity, status, location, fuel, odometer, insuranceExpiry: todayISO(insDays), fitnessExpiry: todayISO(insDays + 180), nextServiceKm, createdAt: new Date().toISOString() }));
SEED.trips = () => {
  const plan = { VEH501: ['Kochi', 'Delhi', 'Spices & coir products, 14.2 T', 30], VEH503: ['Coimbatore', 'Hyderabad', 'Textile bales, 3.6 T', 9], VEH506: ['Bengaluru', 'Mumbai', 'Machinery, 22 T', 14], VEH507: ['Kochi', 'Bengaluru', 'Passengers · JJ sleeper service', 5], VEH511: ['Mumbai', 'Pune', 'FMCG cartons, 7.8 T', 1.5] };
  const out = Object.entries(plan).map(([vid, [from, to, cargo, hoursAgo]], i) => ({ id: 'TRP' + (9001 + i), vehicleId: vid, from, to, cargo, startedAt: new Date(Date.now() - hoursAgo * 3600e3).toISOString(), status: 'Ongoing', km: roadKm(from, to), createdAt: new Date().toISOString() }));
  out.push({ id: 'TRP8990', vehicleId: 'VEH502', from: 'Chennai', to: 'Kochi', cargo: 'Electronics, 6 T', startedAt: new Date(Date.now() - 50 * 3600e3).toISOString(), endedAt: new Date(Date.now() - 34 * 3600e3).toISOString(), status: 'Completed', km: roadKm('Chennai', 'Kochi'), createdAt: new Date().toISOString() });
  return out;
};
SEED.maintenance = () => [
  ['VEH505', -2, 'Clutch overhaul & brake liners', 38500, 'In progress'], ['VEH502', -18, 'Scheduled service (10,000 km)', 9200, 'Done'], ['VEH507', -25, 'Tyre replacement × 2', 42000, 'Done'], ['VEH510', -40, 'AC compressor repair', 14800, 'Done'],
].map(([vehicleId, d, work, cost, state], i) => ({ id: 'MNT' + (701 + i), vehicleId, date: todayISO(d), work, cost, state, createdAt: new Date().toISOString() }));

const tripProgress = t => { const hrs = t.km / 45; return Math.min(.97, Math.max(.02, (Date.now() - new Date(t.startedAt)) / 3600e3 / hrs)); };
function vehicleAlerts() {
  const out = [];
  Store.get('vehicles').filter(v => v.status !== 'Inactive').forEach(v => {
    const ins = daysBetween(todayISO(), v.insuranceExpiry);
    if (ins < 0) out.push(['crit', `${v.regNo}: insurance expired on ${fmtDate(v.insuranceExpiry)}`]);
    else if (ins <= 30) out.push(['', `${v.regNo}: insurance expires in ${ins} day${ins === 1 ? '' : 's'}`]);
    if (+v.fuel < 20) out.push(['crit', `${v.regNo}: fuel at ${v.fuel}%`]);
    const left = v.nextServiceKm - v.odometer;
    if (left <= 0) out.push(['crit', `${v.regNo}: service overdue by ${Math.abs(left).toLocaleString('en-IN')} km`]);
    else if (left <= 3000) out.push(['', `${v.regNo}: service due in ${left.toLocaleString('en-IN')} km`]);
  });
  return out;
}
function fleetMap() {
  const W = 420, H = 470, P = ([lat, lon]) => [((lon - 67.5) / 30) * W, H - ((lat - 6) / 31) * H];
  const V = Store.get('vehicles'), T = Store.get('trips').filter(t => t.status === 'Ongoing');
  const cityDots = Object.entries(INDIA_CITIES).map(([n, c]) => { const [x, y] = P(c); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="rgba(255,255,255,.35)"><title>${n}</title></circle>`; }).join('');
  const labels = ['Delhi', 'Mumbai', 'Kolkata', 'Chennai', 'Bengaluru', 'Kochi', 'Hyderabad', 'Ahmedabad', 'Guwahati'].map(n => { const [x, y] = P(INDIA_CITIES[n]); return `<text x="${(x + 6).toFixed(1)}" y="${(y + 4).toFixed(1)}" fill="rgba(255,255,255,.6)" font-size="11" font-family="Plus Jakarta Sans, sans-serif">${n}</text>`; }).join('');
  const routes = T.map(t => { const a = P(ALL_PLACES[cityKey(t.from)] || INDIA_CITIES.Kochi), b = P(ALL_PLACES[cityKey(t.to)] || INDIA_CITIES.Kochi); return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="rgba(159,240,200,.5)" stroke-dasharray="4 5" stroke-width="1.5"/>`; }).join('');
  const marks = V.filter(v => v.status !== 'Inactive').map(v => {
    const t = T.find(x => x.vehicleId === v.id); let pos;
    if (t) { const a = ALL_PLACES[cityKey(t.from)] || INDIA_CITIES.Kochi, b = ALL_PLACES[cityKey(t.to)] || INDIA_CITIES.Kochi, p = tripProgress(t); pos = P([a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p]); }
    else { const c = INDIA_CITIES[cityKey(v.location)] || INDIA_CITIES.Kochi; const j = (hashStr(v.id) % 14) - 7; pos = P(c); pos = [pos[0] + j, pos[1] + ((hashStr(v.regNo) % 14) - 7)]; }
    const col = t ? '#5ce2a7' : v.status === 'Maintenance' ? '#f0b350' : '#7fb7f7';
    return `<g data-veh="${v.id}" style="cursor:pointer"><circle cx="${pos[0].toFixed(1)}" cy="${pos[1].toFixed(1)}" r="${t ? 9 : 6}" fill="${col}" opacity=".25"/><circle cx="${pos[0].toFixed(1)}" cy="${pos[1].toFixed(1)}" r="4.5" fill="${col}" stroke="#06305f" stroke-width="1.5"/><title>${v.regNo} · ${v.status}${t ? ` · ${t.from} → ${t.to} (${Math.round(tripProgress(t) * 100)}%)` : ' · ' + v.location}</title></g>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Live fleet positions across India"><rect width="${W}" height="${H}" fill="#06305f"/>${cityDots}${labels}${routes}${marks}</svg>
    <div class="legend" style="position:absolute;left:12px;bottom:10px;color:#cfe3f7"><span><i style="background:#5ce2a7;border-color:#5ce2a7;border-radius:50%"></i>On trip</span><span><i style="background:#7fb7f7;border-color:#7fb7f7;border-radius:50%"></i>Available</span><span><i style="background:#f0b350;border-color:#f0b350;border-radius:50%"></i>Maintenance</span></div>`;
}

ROUTE_TITLES.fleet = 'Fleet portal';
route('fleet', app => {
  const tabs = [['dash', 'Live overview'], ['vehicles', 'Vehicles'], ['trips', 'Trips'], ['maint', 'Maintenance'], ['duty', 'Duty list'], ['fstaff', 'Staff'], ['rates', 'Daily wages'], ['pay', 'Payroll']];
  const active = Session.get('tab_#fleet') || 'dash';
  app.innerHTML = adminShell({ title: 'Fleet management portal', sub: 'Every truck, bus and car in one place: where it is, who drives it and what it needs next.', tabs, active, base: 'transports' });
  const body = $('#admin-body', app);
  const vName = id => Store.find('vehicles', id)?.regNo || id;
  const show = tab => {
    if (fleetTimer) { clearInterval(fleetTimer); fleetTimer = null; }
    const V = Store.get('vehicles');
    if (tab === 'dash') {
      const cnt = s => V.filter(v => v.status === s).length, alerts = vehicleAlerts(), T = Store.get('trips').filter(t => t.status === 'Ongoing');
      body.innerHTML = `<div class="kpis">${kpi('Total vehicles', V.length)}${kpi('On trip', cnt('On Trip'), `${Math.round(cnt('On Trip') / Math.max(1, V.length - cnt('Inactive')) * 100)}% utilisation`)}${kpi('Available', cnt('Available'))}${kpi('In maintenance', cnt('Maintenance'))}${kpi('Alerts', alerts.length, 'insurance, fuel, service', alerts.some(a => a[0] === 'crit'))}</div>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));margin-top:18px"><div class="map-box" id="fmap">${fleetMap()}</div>
        <div class="stack" style="align-content:start"><div class="card"><h3 style="margin-bottom:12px">Trips in progress</h3><div class="stack" id="trip-prog"></div></div>
        <div class="card"><h3 style="margin-bottom:12px">Compliance & service alerts</h3><div class="stack">${alerts.map(([c, m]) => `<div class="alert-item ${c}">${c ? '●' : '○'} ${esc(m)}</div>`).join('') || '<p class="muted">All vehicles are compliant.</p>'}</div></div></div></div>`;
      const prog = () => { $('#trip-prog').innerHTML = T.map(t => { const p = tripProgress(t); return `<div><div style="display:flex;justify-content:space-between;gap:8px" class="small"><b class="mono">${esc(vName(t.vehicleId))}</b><span class="muted">${esc(t.from)} → ${esc(t.to)}</span></div><div class="bar-row" style="grid-template-columns:1fr 46px"><div class="track"><div class="fill" style="width:${p * 100}%"></div></div><b class="num small" style="text-align:right">${Math.round(p * 100)}%</b></div><div class="muted small">${esc(t.cargo)} · ${Math.round(t.km * (1 - p))} km to go</div></div>`; }).join('') || '<p class="muted">No vehicles on trip.</p>'; };
      prog();
      const bindMap = () => $$('[data-veh]', body).forEach(g => g.onclick = () => vehicleCard(Store.find('vehicles', g.dataset.veh)));
      bindMap();
      fleetTimer = setInterval(() => { if (!$('#fmap')) return; $('#fmap').innerHTML = fleetMap(); bindMap(); prog(); }, 5000);
    }
    if (tab === 'vehicles') renderCrud(body, { key: 'vehicles', single: 'Vehicle', plural: 'Vehicles', idPrefix: 'VEH', label: r => r.regNo,
      fields: [{ name: 'regNo', label: 'Registration no.', required: true, placeholder: 'KL-07-AB-1234' }, { name: 'type', label: 'Vehicle type', type: 'select', options: VEHICLE_TYPES }, { name: 'model', label: 'Make & model', required: true }, { name: 'capacity', label: 'Capacity (kg or seats)', type: 'number', min: 1, required: true },
        { name: 'status', label: 'Status', type: 'select', options: VEHICLE_STATUS }, { name: 'location', label: 'Current / base city', list: 'dl-india', required: true },
        { name: 'fuel', label: 'Fuel level %', type: 'number', min: 0, max: 100, default: 80 }, { name: 'odometer', label: 'Odometer (km)', type: 'number', min: 0, default: 0 }, { name: 'nextServiceKm', label: 'Next service at (km)', type: 'number', min: 0, default: 10000 },
        { name: 'insuranceExpiry', label: 'Insurance valid till', type: 'date', required: true, default: todayISO(365) }, { name: 'fitnessExpiry', label: 'Fitness / permit valid till', type: 'date', default: todayISO(365) }],
      validate: (d, row) => { d.regNo = d.regNo.toUpperCase(); return Store.get('vehicles').some(v => v.regNo === d.regNo && v.id !== row?.id) ? `${d.regNo} is already registered` : null; },
      columns: [{ label: 'Vehicle', render: r => `<b class="mono">${esc(r.regNo)}</b><div class="muted small">${esc(r.type)} · ${esc(r.model)}</div>` }, { label: 'On duty today', render: r => esc(flCrew(r.id)) || '<span class="muted">No duty</span>' }, { label: 'Location', field: 'location' },
        { label: 'Fuel', render: r => `<span class="fuel"><i class="${r.fuel < 20 ? 'low' : ''}" style="width:${r.fuel}%"></i></span>${r.fuel}%` }, { label: 'Odometer', render: r => `${(+r.odometer).toLocaleString('en-IN')} km` }, { label: 'Insurance', render: r => { const d = daysBetween(todayISO(), r.insuranceExpiry); return `${fmtDate(r.insuranceExpiry)}${d < 0 ? ' <span class="chip danger">Expired</span>' : d <= 30 ? ' <span class="chip warn">' + d + 'd</span>' : ''}`; } }, { label: 'Status', render: r => statusChip(r.status) }],
      actions: [{ id: 'card', label: 'View', run: r => vehicleCard(r) }] });
    if (tab === 'trips') {
      const T = Store.get('trips');
      renderCrud(body, { key: 'trips', single: 'Trip', plural: 'Trips', noEdit: true, label: r => r.id, toolbar: '',
        fields: () => [{ name: 'vehicleId', label: 'Vehicle', type: 'select', options: Store.get('vehicles').filter(v => v.status === 'Available').map(v => [v.id, `${v.regNo} · ${v.type} · ${v.location}`]) }, { name: 'from', label: 'From', list: 'dl-india', required: true }, { name: 'to', label: 'To', list: 'dl-india', required: true }, { name: 'cargo', label: 'Cargo / purpose', full: true, required: true, placeholder: 'e.g. FMCG cartons, 7 T' }],
        validate: d => { if (!d.vehicleId) return 'No vehicle is available. Free up a vehicle first.'; if (sameCity(d.from, d.to)) return 'From and To must be different'; d.from = cityKey(d.from) || d.from; d.to = cityKey(d.to) || d.to; d.km = roadKm(d.from, d.to); d.status = 'Ongoing'; d.startedAt = new Date().toISOString(); Store.update('vehicles', d.vehicleId, { status: 'On Trip', location: d.from }); return null; },
        idPrefix: 'TRP',
        columns: [{ label: 'Trip', render: r => `<span class="mono">${esc(r.id)}</span>` }, { label: 'Vehicle', render: r => `<span class="mono">${esc(vName(r.vehicleId))}</span>` }, { label: 'Route', render: r => `${esc(r.from)} → ${esc(r.to)}<div class="muted small">${(+r.km).toLocaleString('en-IN')} km</div>` }, { label: 'Cargo', field: 'cargo' }, { label: 'Started', render: r => fmtDateTime(r.startedAt) }, { label: 'Progress', render: r => r.status === 'Ongoing' ? Math.round(tripProgress(r) * 100) + '%' : '100%' }, { label: 'Status', render: r => statusChip(r.status) }],
        actions: [{ id: 'done', label: 'Complete', show: r => r.status === 'Ongoing', run: (r, rr) => { Store.update('trips', r.id, { status: 'Completed', endedAt: new Date().toISOString() }); Store.update('vehicles', r.vehicleId, v => ({ status: 'Available', location: r.to, odometer: (+v.odometer) + (+r.km), fuel: Math.max(5, v.fuel - Math.round(r.km / 25)) })); toast(`Trip ${r.id} completed. Vehicle is at ${r.to}.`); rr(); } }] });
      const btn = $('[data-crud-add]', body); if (btn) btn.textContent = '+ Assign trip';
    }
    if (tab === 'duty') flDuty(body, () => show('duty'));
    if (tab === 'fstaff') flStaff(body);
    if (tab === 'rates') flRates(body);
    if (tab === 'pay') flPayroll(body, () => show('pay'));
    if (tab === 'maint') renderCrud(body, { key: 'maintenance', single: 'Service record', plural: 'Service records', idPrefix: 'MNT', label: r => r.work,
      fields: () => [{ name: 'vehicleId', label: 'Vehicle', type: 'select', options: Store.get('vehicles').map(v => [v.id, `${v.regNo} · ${v.type}`]) }, { name: 'date', label: 'Date', type: 'date', default: todayISO(), required: true }, { name: 'work', label: 'Work done', required: true, full: true }, { name: 'cost', label: 'Cost (₹)', type: 'number', min: 0, required: true }, { name: 'state', label: 'State', type: 'select', options: ['In progress', 'Done'] }],
      validate: d => { Store.update('vehicles', d.vehicleId, v => d.state === 'In progress' ? { status: 'Maintenance' } : (v.status === 'Maintenance' ? { status: 'Available', nextServiceKm: (+v.odometer) + 10000 } : {})); return null; },
      columns: [{ label: 'Date', render: r => fmtDate(r.date) }, { label: 'Vehicle', render: r => `<span class="mono">${esc(vName(r.vehicleId))}</span>` }, { label: 'Work', field: 'work' }, { label: 'Cost', render: r => inr(r.cost) }, { label: 'State', render: r => `<span class="chip ${r.state === 'Done' ? 'green' : 'warn'}">${esc(r.state)}</span>` }],
      actions: [{ id: 'fin', label: 'Mark done', show: r => r.state === 'In progress', run: (r, rr) => { Store.update('maintenance', r.id, { state: 'Done' }); Store.update('vehicles', r.vehicleId, v => ({ status: 'Available', nextServiceKm: (+v.odometer) + 10000 })); toast('Vehicle back in service'); rr(); } }] });
  };
  function vehicleCard(v) {
    const trips = Store.get('trips').filter(t => t.vehicleId === v.id), m = Store.get('maintenance').filter(x => x.vehicleId === v.id);
    openModal(v.regNo, `<div class="kv"><div><span>Type</span><b>${esc(v.type)}</b></div><div><span>Model</span><b>${esc(v.model)}</b></div><div><span>Capacity</span><b>${(+v.capacity).toLocaleString('en-IN')} ${/bus|Traveller|Sedan/.test(v.type) ? 'seats' : 'kg'}</b></div><div><span>Status</span><b>${statusChip(v.status)}</b></div>
      <div><span>Crew today</span><b>${esc(flCrew(v.id) || 'No duty assigned')}</b></div><div><span>Location</span><b>${esc(v.location)}</b></div><div><span>Fuel</span><b>${v.fuel}%</b></div><div><span>Odometer</span><b>${(+v.odometer).toLocaleString('en-IN')} km</b></div>
      <div><span>Insurance till</span><b>${fmtDate(v.insuranceExpiry)}</b></div><div><span>Fitness till</span><b>${fmtDate(v.fitnessExpiry)}</b></div><div><span>Next service</span><b>${(+v.nextServiceKm).toLocaleString('en-IN')} km</b></div></div>
      <div><h4 style="margin-bottom:8px">Trips</h4>${trips.map(t => `<div class="line-item"><span>${esc(t.from)} → ${esc(t.to)} · ${esc(t.cargo)}</span>${statusChip(t.status)}</div>`).join('') || '<p class="muted small">No trips recorded.</p>'}</div>
      <div><h4 style="margin-bottom:8px">Service history</h4>${m.map(x => `<div class="line-item"><span>${fmtDate(x.date)} · ${esc(x.work)}</span><span>${inr(x.cost)}</span></div>`).join('') || '<p class="muted small">No service records.</p>'}</div>`, { wide: true });
  }
  bindTabs(app, show); show(active);
});
