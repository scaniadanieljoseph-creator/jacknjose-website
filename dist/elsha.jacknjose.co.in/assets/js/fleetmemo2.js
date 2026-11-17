/* Memo flow: open a memo with the vehicle, starting km, route, places, vehicle kind and crew (this creates the first trip);
   add the next trip at the far end with that place's km; close the memo back home with the closing km, diesel and AdBlue.
   Loaded after fleetmemo.js; replaces the trip forms in fleetpay.js. */
'use strict';

const FL_KIND_LABEL = [['Bus', 'Bus'], ['Cargo van', 'Van'], ['Truck', 'Truck'], ['Car', 'Car']];
const flCrewOpts = (keep = []) => { const S = FL.list('staff').filter(x => x.status === 'Active' || keep.includes(x.id)), by = roles => S.filter(x => roles.includes(x.role) || keep.includes(x.id)).map(x => [x.id, x.name]); return { drv: by(['Driver']), cln: by(['Cleaner', 'Conductor']) }; };
/* km of each trip from the readings: the next trip's starting km (or the closing km) less this trip's starting km */
function flLegKms(sid) {
  const s = FL.find('sheets', sid); if (!s) return; const L = flLegs(sid);
  L.forEach((l, i) => { const st = +l.startKm || (i === 0 ? +s.startKm : 0), next = i < L.length - 1 ? +L[i + 1].startKm : +s.endKm; if (st && next > st && +l.km !== next - st) FL.upd('duties', l.id, { km: next - st }); });
}
/* Checks a trip's crew and works out wages and bata from the rate card (same rules as before). Returns an error message or null. */
function flPrepLeg(s, d, leg) {
  const v = FL.veh(s.vehicleId), crew = [d.driverId, d.driver2Id, d.cleanerId].filter(Boolean), all = FL.list('duties');
  if (!v) return 'Choose the vehicle'; if (!d.driverId) return 'Choose driver 1 (add drivers under Staff first)';
  if (!d.from || !d.to) return 'Enter the From place and To place'; if (flSame(d.from, d.to)) return 'From place and To place must be different';
  if (new Set(crew).size !== crew.length) return 'The same person is chosen twice in this crew';
  if (s.status !== 'Closed') { const b = crew.find(id => all.some(x => x.sheetId !== s.id && x.status === 'Assigned' && flCrewIds(x).includes(id) && FL.find('sheets', x.sheetId)?.status === 'Open')); if (b) return `${FL.name(b)} is already on another open memo (${all.find(x => x.sheetId !== s.id && x.status === 'Assigned' && flCrewIds(x).includes(b)).sheetId})`;
    const exp = [d.driverId, d.driver2Id].filter(Boolean).map(id => FL.find('staff', id)).find(x => x?.licenceExpiry && x.licenceExpiry < d.date); if (exp) return `${exp.name}’s driving licence expired on ${fmtDate(exp.licenceExpiry)}. Renew it before assigning duty.`; }
  const drv = FL.find('staff', d.driverId), cl = d.cleanerId ? FL.find('staff', d.cleanerId) : null; d.kind = d.kind || flKindOf(v.type); d.from = cityKey(d.from) || d.from.trim(); d.to = cityKey(d.to) || d.to.trim();
  const r = flRate(d.kind, d.from, d.to), wasAuto = leg && +leg.wage === flAutoWage(flRate(leg.kind, leg.from, leg.to), !leg.driver2Id, FL.find('staff', leg.driverId)); // an untouched automatic wage follows a change of crew
  if (!+d.wage || (wasAuto && +d.wage === +leg.wage)) d.wage = flAutoWage(r, !d.driver2Id, drv); if (!+d.batta) d.batta = r?.driverBatta || 0; d.soloExtra = 0;
  d.cleanerWage = cl ? (+d.cleanerWage || r?.cleanerWage || +cl.dailyWage || 0) : 0; d.cleanerBatta = cl ? (+d.cleanerBatta || r?.cleanerBatta || 0) : 0; d.conductorId = '';
  ['wage', 'batta', 'cleanerWage', 'cleanerBatta', 'startKm'].forEach(k => { if (d[k] !== undefined) d[k] = +d[k] || 0; });
  return null;
}
const flCrewFields = (o, opt) => `<label class="field"><span>Driver name 1</span><select class="input" name="driverId" required><option value="">Choose</option>${opt.drv.map(([id, n]) => `<option value="${id}" ${id === o.driverId ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
  <label class="field"><span>Driver name 2</span><select class="input" name="driver2Id"><option value="">None (single driver)</option>${opt.drv.map(([id, n]) => `<option value="${id}" ${id === o.driver2Id ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
  <label class="field"><span>Conductor / cleaner</span><select class="input" name="cleanerId"><option value="">None</option>${opt.cln.map(([id, n]) => `<option value="${id}" ${id === o.cleanerId ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
const flKindField = k => `<label class="field"><span>Kind of vehicle</span><select class="input" name="kind">${FL_KIND_LABEL.map(([v, l]) => `<option value="${v}" ${v === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
const flMoreFields = o => `<details class="full fm-more"><summary>More details (optional): timing, route no., load, wages, notes</summary><div class="form-grid" style="margin-top:10px">
  <label class="field"><span>Departure time</span><input class="input" type="time" name="depTime" value="${esc(o.depTime || '')}"></label><label class="field"><span>Arrival time</span><input class="input" type="time" name="arrTime" value="${esc(o.arrTime || '')}"></label>
  <label class="field"><span>Route no. (Rno)</span><input class="input" name="rno" value="${esc(o.rno || '')}" placeholder="e.g. 2307A"></label><label class="field"><span>Seats / luggage</span><select class="input" name="load">${['', ...FL_LOADS].map(x => `<option ${x === (o.load || '') ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
  <label class="field"><span>Driver wage, each (₹, 0 = automatic)</span><input class="input" type="number" min="0" name="wage" value="${+o.wage || 0}"></label><label class="field"><span>Driver bata, each (₹, 0 = rate card)</span><input class="input" type="number" min="0" name="batta" value="${+o.batta || 0}"></label>
  <label class="field"><span>Cleaner wage (₹, 0 = rate card)</span><input class="input" type="number" min="0" name="cleanerWage" value="${+o.cleanerWage || 0}"></label><label class="field"><span>Cleaner bata (₹, 0 = rate card)</span><input class="input" type="number" min="0" name="cleanerBatta" value="${+o.cleanerBatta || 0}"></label>
  <label class="field full"><span>Notes</span><input class="input" name="notes" value="${esc(o.notes || '')}"></label></div></details>`;
const flReadLeg = f => { const o = {}; ['date', 'startKm', 'route', 'from', 'to', 'kind', 'driverId', 'driver2Id', 'cleanerId', 'depTime', 'arrTime', 'rno', 'load', 'wage', 'batta', 'cleanerWage', 'cleanerBatta', 'notes'].forEach(k => { if (f[k]) o[k] = String(f[k].value).trim(); }); return o; };

/* ---------- New memo: vehicle, starting km, route, places, kind and crew → memo with its first trip ---------- */
function flOpenSheet(day, after) {
  const open = FL.list('sheets').filter(s => s.status === 'Open'), V = Store.get('vehicles').filter(v => v.status !== 'Inactive'), opt = flCrewOpts();
  openModal('New memo', `<form id="nm" class="form-grid">
    <label class="field"><span>1. Vehicle number</span><select class="input" name="veh" required><option value="">Choose the vehicle</option>${V.map(v => { const o = open.find(s => s.vehicleId === v.id); return `<option value="${v.id}" ${o ? 'disabled' : ''}>${esc(v.regNo)}${o ? ` · ${o.id} is still open` : v.status === 'Maintenance' ? ' · in maintenance' : ''}</option>`; }).join('')}</select></label>
    <label class="field"><span>Date</span><input class="input" type="date" name="date" value="${day}" required></label>
    <label class="field"><span>2. Starting km</span><input class="input" type="number" name="startKm" min="0" required placeholder="Closing km of the previous trip"><small class="muted" id="nm-km"></small></label>
    <label class="field"><span>3. Route</span><input class="input" name="route" placeholder="e.g. Via Avinashi, Salem, Villupuram"></label>
    <label class="field"><span>4. From place</span><input class="input" name="from" list="dl-india" required value="${esc(SITE_CONFIG.city || '')}"></label><label class="field"><span>To place</span><input class="input" name="to" list="dl-india" required></label>
    ${flKindField('Bus')}${flCrewFields({}, opt)}
    <p class="muted small full">This creates the memo and its first trip. When the vehicle reaches the other end, use <b>“+ Next trip”</b> for the return trip. When it is back, use <b>“Close memo”</b> to enter the closing km, diesel and AdBlue.</p>
    <div class="full" style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary">Create memo</button></div></form>`, { wide: true, onMount: m => {
      const f = $('#nm', m), fill = () => { const v = FL.veh(f.veh.value); if (!v) return; f.startKm.value = +v.odometer || ''; $('#nm-km', m).textContent = v.odometer ? `Last closing km of ${v.regNo}: ${(+v.odometer).toLocaleString('en-IN')}` : ''; f.kind.value = flKindOf(v.type); };
      f.veh.onchange = fill;
      f.onsubmit = e => { e.preventDefault(); const v = FL.veh(f.veh.value); if (!v) return toast('Choose the vehicle', 'err');
        if (FL.list('sheets').some(s => s.vehicleId === v.id && s.status === 'Open')) return toast(`${v.regNo} already has an open memo. Close it first.`, 'err');
        const d = flReadLeg(f), startKm = +d.startKm || 0; if (!startKm) return toast('Enter the starting km', 'err');
        if (+v.odometer && startKm < +v.odometer && !confirm(`Starting km ${startKm.toLocaleString('en-IN')} is less than the last closing km ${(+v.odometer).toLocaleString('en-IN')}. Use it anyway?`)) return;
        const no = flNextNo(), id = flNoId(no), draft = { id, vehicleId: v.id, status: 'Open' }, err = flPrepLeg(draft, d, null); if (err) return toast(err, 'err');
        FL.add('sheets', { id, no, vehicleId: v.id, date: d.date, startKm, endKm: 0, sheet: null, status: 'Open', payMode: 'sheet' });
        FL.add('duties', { ...d, startKm, sheetId: id, vehicleId: v.id, status: 'Assigned' }, 'FD');
        if (d.date <= todayISO() && v.status === 'Available') Store.update('vehicles', v.id, { status: 'On Trip', location: d.from });
        closeModal(); toast(`Memo ${id} created · ${v.regNo} · ${d.from} → ${d.to}`); after && after(); }; } });
}

/* ---------- Next trip (or change a trip) ---------- */
function flLegForm(s, leg, after) {
  const v = FL.veh(s.vehicleId), L = flLegs(s.id), prev = leg ? null : L[L.length - 1], o = leg ? { ...leg, cleanerId: flCleaner(leg) } : { date: todayISO() < s.date ? s.date : todayISO(), from: prev?.to || '', to: prev?.from || '', route: prev?.route || '', kind: prev?.kind || flKindOf(v?.type), driverId: prev?.driverId || '', driver2Id: prev?.driver2Id || '', cleanerId: prev ? flCleaner(prev) : '', load: prev?.load || '' };
  const opt = flCrewOpts(leg ? flCrewIds(leg) : []), first = leg && L[0]?.id === leg.id, minKm = leg ? 0 : +(prev?.startKm || s.startKm) || 0;
  openModal(`${leg ? 'Change trip' : `Next trip (trip ${L.length + 1})`} · ${s.id} · ${v?.regNo || ''}`, `<form id="crud-form" class="form-grid">
    ${!leg && prev ? `<div class="notice full">${esc(v?.regNo || '')} reached <b>${esc(prev.to)}</b>. Enter the km reading at ${esc(prev.to)} and the crew for the trip back.</div>` : ''}
    <label class="field"><span>Starting km${o.from ? ' at ' + esc(o.from) : ''}</span><input class="input" type="number" name="startKm" min="0" ${first ? 'readonly' : 'required'} value="${leg ? (+leg.startKm || (first ? +s.startKm : '')) || '' : ''}" placeholder="${minKm ? 'More than ' + minKm.toLocaleString('en-IN') : ''}">${first ? '<small class="muted">The memo’s starting km. Change it in the memo.</small>' : ''}</label>
    <label class="field"><span>Date</span><input class="input" type="date" name="date" value="${esc(o.date || '')}" required></label>
    <label class="field"><span>Route</span><input class="input" name="route" value="${esc(o.route || '')}" placeholder="e.g. Via Villupuram, Salem"></label>${flKindField(o.kind)}
    <label class="field"><span>From place</span><input class="input" name="from" list="dl-india" required value="${esc(o.from || '')}"></label><label class="field"><span>To place</span><input class="input" name="to" list="dl-india" required value="${esc(o.to || '')}"></label>
    ${flCrewFields(o, opt)}${flMoreFields(o)}
    <div class="full" style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary">${leg ? 'Save trip' : 'Add trip'}</button></div></form>`, { wide: true, onMount: m => $('#crud-form', m).onsubmit = e => { e.preventDefault(); const f = e.target, d = flReadLeg(f);
      if (first) delete d.startKm; else { const km = +d.startKm || 0; if (!km) return toast('Enter the starting km', 'err');
        const i = leg ? L.findIndex(x => x.id === leg.id) : L.length, before = i > 0 ? +(L[i - 1].startKm || (i - 1 === 0 ? s.startKm : 0)) : +s.startKm, after2 = leg && i < L.length - 1 ? +L[i + 1].startKm : +s.endKm;
        if (before && km <= before) return toast(`Starting km must be more than ${before.toLocaleString('en-IN')} (the previous trip’s starting km)`, 'err'); if (after2 && km >= after2) return toast(`Starting km must be less than ${after2.toLocaleString('en-IN')}`, 'err'); }
      const err = flPrepLeg(s, d, leg); if (err) return toast(err, 'err');
      if (leg) FL.upd('duties', leg.id, d); else FL.add('duties', { ...d, sheetId: s.id, vehicleId: s.vehicleId, status: s.status === 'Closed' ? 'Completed' : 'Assigned' }, 'FD');
      flLegKms(s.id); if (!leg && v) Store.update('vehicles', v.id, { location: d.from });
      closeModal(); toast(leg ? 'Trip saved' : `Trip ${L.length + 1} added: ${d.from} → ${d.to}`); after && after(); } });
}

/* ---------- Close memo: closing km, diesel and AdBlue; completes the trips ---------- */
function flCloseMemo(s, after) {
  const v = FL.veh(s.vehicleId), L = flLegs(s.id), last = L[L.length - 1]; if (!last) return toast('Add a trip to this memo first', 'err');
  const lastKm = +(last.startKm || s.startKm) || 0, rate = (FL.list('sheets').flatMap(x => x.fuel || []).filter(x => x.type === 'Diesel' && +x.rate).pop() || {}).rate || '';
  openModal(`Close memo ${s.id} · ${v?.regNo || ''}`, `<form id="cm" class="form-grid"><div class="notice full">${esc(flChain(L))} · ${L.length} trip${L.length === 1 ? '' : 's'} · started at ${(+s.startKm).toLocaleString('en-IN')} km</div>
    <label class="field"><span>Closing km${last.to ? ' at ' + esc(last.to) : ''}</span><input class="input" type="number" name="endKm" min="${lastKm + 1}" required placeholder="More than ${lastKm.toLocaleString('en-IN')}"></label><label class="field"><span>Date</span><input class="input" type="date" name="date" value="${todayISO()}" required></label>
    <label class="field"><span>Diesel filled (litres)</span><input class="input" type="number" name="dl" min="0" step="0.01"></label><label class="field"><span>Diesel rate (₹ per litre)</span><input class="input" type="number" name="dr" min="0" step="0.01" value="${rate}"></label>
    <label class="field"><span>Diesel amount (₹)</span><input class="input" type="number" name="da" min="0" step="0.01"></label><label class="field"><span>Bunk</span><input class="input" name="bunk" placeholder="Fuel station name"></label>
    <label class="field"><span>AdBlue filled (litres)</span><input class="input" type="number" name="al" min="0" step="0.01"></label><label class="field"><span>AdBlue amount (₹)</span><input class="input" type="number" name="aa" min="0" step="0.01"></label>
    <label class="field"><span>Diesel paid by</span><select class="input" name="pay"><option value="C">Bunk credit / office</option><option value="D">Driver cash</option></select></label><div></div>
    <div class="card full" style="background:var(--surface-2)" id="cm-sum"></div>
    <div class="full" style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-green" name="go" value="close">Close memo</button><button class="btn btn-primary" name="go" value="exp">Close and enter expenses</button></div></form>`, { wide: true, onMount: m => {
      const f = $('#cm', m), n = k => +f[k].value || 0;
      const sum = () => { const km = n('endKm') > +s.startKm ? n('endKm') - +s.startKm : 0; $('#cm-sum', m).innerHTML = `<div class="line-item"><span>Total km</span><b>${km.toLocaleString('en-IN')}</b></div><div class="line-item"><span>Mileage</span><b>${km && n('dl') ? (km / n('dl')).toFixed(2) + ' km/L' : '—'}</b></div><div class="line-item total"><span>Fuel amount</span><span>${inr(n('da') + n('aa'))}</span></div>`; };
      f.addEventListener('input', e => { if (['dl', 'dr'].includes(e.target.name) && n('dl') && n('dr')) f.da.value = Math.round(n('dl') * n('dr') * 100) / 100; if (e.target.name === 'da' && n('dl') && n('da')) f.dr.value = Math.round(n('da') / n('dl') * 100) / 100; sum(); }); sum();
      f.onsubmit = e => { e.preventDefault(); const end = n('endKm'); if (end <= lastKm) return toast(`Closing km must be more than ${lastKm.toLocaleString('en-IN')}`, 'err');
        const M = flMemo(s), fuel = [...M.fuel]; if (n('dl') || n('da')) fuel.push({ date: f.date.value, type: 'Diesel', bunk: f.bunk.value.trim(), ltrs: n('dl'), rate: n('dr'), amount: n('da'), pay: f.pay.value }); if (n('al') || n('aa')) fuel.push({ date: f.date.value, type: 'AdBlue', bunk: f.bunk.value.trim(), ltrs: n('al'), rate: n('al') && n('aa') ? Math.round(n('aa') / n('al') * 100) / 100 : 0, amount: n('aa'), pay: f.pay.value });
        FL.upd('sheets', s.id, { v: 2, sheet: { v: 2 }, adv: M.adv, billed: M.billed, unbilled: M.unbilled, door: M.door, crew: M.crew, payMode: M.payMode, drvCollected: M.drvCollected, otherInc: M.otherInc, target: M.target, checks: M.checks, fuel, endKm: end, status: 'Closed', closedAt: new Date().toISOString(), closedBy: Auth.user()?.name || '' });
        flLegKms(s.id); const fresh = FL.find('sheets', s.id); flFinishTrip(fresh, end);
        closeModal(); toast(`${s.id} closed · ${(end - +s.startKm).toLocaleString('en-IN')} km${n('dl') ? ' · ' + ((end - +s.startKm) / n('dl')).toFixed(2) + ' km/L' : ''}`); after && after(); if (e.submitter?.value === 'exp') flTripSheet(FL.find('sheets', s.id), after); }; } });
}
