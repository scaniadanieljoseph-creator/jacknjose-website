/* Hostels & PG by Elsha.
   Public page #hostels: find a hostel and send an enquiry. Portal #hostel-crm: run one or more hostels end to end
   (rooms & beds, residents, rent, deposits, mess, gate register, complaints, notices, expenses, reports).
   Collections: hostels (public listing), hostelEnquiries (public can create), hs_* (private, Hostel manager role). */
'use strict';

ICONS.bed = '<path d="M3 18V7M3 14h18v4M21 18v-5a3 3 0 0 0-3-3h-8v4"/><circle cx="7" cy="11" r="2"/>';
SCENES.hostels = () => svgScene(P.sun(330, 54, 20, '#ffe39a') + P.cloud(90, 40, 1, .7, true) + P.hills(172, '#7fc69a', 5, 22) +
  `<rect x="70" y="70" width="230" height="134" rx="4" fill="#f4efe4"/><polygon points="58,72 185,30 312,72" fill="#0b57b7"/><rect x="150" y="80" width="70" height="16" rx="3" fill="#06305f"/><text x="185" y="92" text-anchor="middle" font-size="10" font-weight="700" fill="#ffffff" font-family="sans-serif">HOSTEL</text>` +
  [0, 1, 2].map(r => [0, 1, 2, 3, 4].map(c => `<rect x="${86 + c * 42}" y="${104 + r * 30}" width="26" height="18" rx="2" fill="${(r + c) % 3 ? '#bfe3ff' : '#ffd76a'}" class="${(r + c) % 4 ? '' : 'twinkle'}"/>`).join('')).join('') +
  `<rect x="170" y="172" width="30" height="32" fill="#7a4e2d"/><rect x="0" y="204" width="400" height="56" fill="#5cae73"/><rect x="150" y="204" width="70" height="56" fill="#d9c7a0"/>` + P.palm(36, 206, .9) + P.palm(352, 208, 1) +
  `<g class="bob"><circle cx="252" cy="196" r="5" fill="#0c1e33"/><rect x="247" y="201" width="10" height="16" rx="3" fill="#e2405f"/></g><g class="bob" style="animation-delay:-1s"><circle cx="272" cy="198" r="5" fill="#0c1e33"/><rect x="267" y="203" width="10" height="14" rx="3" fill="#2b6cd6"/></g>`, SKY.dawn, 'Elsha hostel building with students');
SCENES['hostel-crm'] = SCENES.hostels;

const HS_TYPES = ['Boys hostel', 'Girls hostel', 'Co-living', 'Working women hostel', 'Working men hostel', 'Student PG'];
const HS_AMEN = ['Wi-Fi', 'Food / mess', 'AC rooms', 'Attached bathroom', 'Hot water', 'Laundry', 'Housekeeping', 'Power backup', 'CCTV', 'Security 24×7', 'Parking', 'Study room', 'Gym', 'RO water', 'TV room', 'Lift', 'Fridge', 'Biometric entry'];
const HS_PAY = ['Cash', 'UPI', 'Bank transfer', 'Card', 'Cheque'];
const HS_STATUS = ['Reserved', 'Active', 'Notice', 'Vacated'];
const HS_LIVE = ['Reserved', 'Active', 'Notice'];   // holding a bed
const hsNow = () => new Date().toISOString();
const hsLocalNow = () => { const d = new Date(); return `${todayISO()}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };   // matches datetime-local inputs
const hsSum = (a, f) => a.reduce((s, x) => s + (+f(x) || 0), 0);
const hsMonth = (d = todayISO()) => d.slice(0, 7);
const hsDim = m => new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate();
const hsMonthName = m => new Date(m + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const hsAddDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const hsAddMonths = (m, n) => { const d = new Date(m + '-01T00:00:00'); d.setMonth(d.getMonth() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const hsPhone10 = p => String(p || '').replace(/\D/g, '').slice(-10);
const hsWa = (phone, text) => `https://wa.me/91${hsPhone10(phone)}?text=${encodeURIComponent(text)}`;

const HS = {
  H: () => Session.get('hsHostel'),
  hostel: () => Store.find('hostels', Session.get('hsHostel')) || {},
  list: k => Store.get('hs_' + k).filter(x => x.hostelId === Session.get('hsHostel')),
  find: (k, id) => Store.find('hs_' + k, id),
  add: (k, doc, prefix = 'HS') => Store.add('hs_' + k, { id: doc.id || genId(prefix, 7), hostelId: Session.get('hsHostel'), createdAt: hsNow(), by: Auth.user()?.name || '', ...doc }),
  upd: (k, id, patch) => Store.update('hs_' + k, id, patch),
  del: (k, id) => Store.remove('hs_' + k, id),
  put(k, id, doc) { this.find(k, id) ? this.upd(k, id, doc) : this.add(k, { id, ...doc }); },
  cfg() { return { dueDay: 5, messFee: 0, lateFee: 0, noticeDays: 30, gateTime: '22:00', ...(Store.get('hs_settings').find(s => s.id === 'CFG' + Session.get('hsHostel')) || {}) }; },
};
const hsCrud = (el, k, o) => renderCrud(el, { key: 'hs_' + k, rows: () => HS.list(k), defaults: { hostelId: HS.H(), by: Auth.user()?.name || '' }, ...o });

/* ---------- rooms, beds and occupancy ---------- */
const hsRooms = () => HS.list('rooms').sort((a, b) => (+a.floor - +b.floor) || String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));
const hsBedsOf = r => 'ABCDEFGHIJKL'.slice(0, Math.max(1, Math.min(12, +r.sharing || 1))).split('');
const hsRes = id => HS.find('residents', id);
const hsOccupant = (roomId, bed) => HS.list('residents').find(x => x.roomId === roomId && x.bed === bed && HS_LIVE.includes(x.status));
function hsBedState(r, bed) {
  const o = hsOccupant(r.id, bed); if (o) return o.status === 'Notice' ? 'notice' : o.status === 'Reserved' ? 'reserved' : 'occupied';
  return (r.blocked || []).includes(bed) ? 'blocked' : 'vacant';
}
const hsAllBeds = () => hsRooms().flatMap(r => hsBedsOf(r).map(b => ({ room: r, bed: b, state: hsBedState(r, b) })));
const hsBedLabel = res => { const r = HS.find('rooms', res?.roomId); return r ? `${r.number}-${res.bed}` : '—'; };
const hsRoomLabel = r => `Room ${r.number} · ${r.sharing}-sharing${r.ac === 'AC' ? ' · AC' : ''} · ${inr(r.rent)}/bed`;
/* keep the public listing up to date: free beds, lowest rent and room types */
function hsSync() {
  const h = HS.hostel(); if (!h.id) return;
  const beds = hsAllBeds(), rooms = hsRooms(), vacantBeds = beds.filter(b => b.state === 'vacant').length, rentFrom = rooms.length ? Math.min(...rooms.map(r => +r.rent || 0)) : 0;
  const sharing = [...new Set(rooms.map(r => +r.sharing))].sort((a, b) => a - b);
  if (h.vacantBeds !== vacantBeds || h.rentFrom !== rentFrom || JSON.stringify(h.sharing || []) !== JSON.stringify(sharing)) Store.update('hostels', h.id, { vacantBeds, rentFrom, sharing });
}

/* ---------- money: invoices, payments, deposits ---------- */
const hsInvPaid = inv => hsSum(HS.list('payments').filter(p => p.invoiceId === inv.id), p => p.amount);
const hsInvBal = inv => Math.max(0, Math.round(inv.total - hsInvPaid(inv)));
function hsInvState(inv) { const b = hsInvBal(inv); if (b <= 0) return 'Paid'; if (inv.dueDate < todayISO()) return 'Overdue'; return b < inv.total ? 'Part paid' : 'Due'; }
const hsInvChip = s => `<span class="chip ${{ Paid: 'green', Overdue: 'danger', 'Part paid': 'warn', Due: 'blue' }[s] || ''}">${s}</span>`;
const hsOpenInv = resId => HS.list('invoices').filter(i => i.residentId === resId && hsInvBal(i) > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
const hsDue = resId => hsSum(hsOpenInv(resId), hsInvBal);
const hsDeposit = resId => { const P = HS.list('payments').filter(p => p.residentId === resId); return hsSum(P.filter(p => p.kind === 'Deposit'), p => p.amount) - hsSum(P.filter(p => p.kind === 'Refund'), p => p.amount) - hsSum(P.filter(p => p.kind === 'Fee' && p.method === 'From deposit'), p => p.amount); };
const hsTotal = lines => Math.round(hsSum(lines, l => l.amount));
function hsInvoiceFor(res, month, lines) {   // add lines to the month's invoice, creating it if needed
  let inv = HS.list('invoices').find(i => i.residentId === res.id && i.month === month);
  if (inv) { const all = [...inv.lines, ...lines]; HS.upd('invoices', inv.id, { lines: all, total: hsTotal(all) }); return HS.find('invoices', inv.id); }
  const cfg = HS.cfg(), due = `${month}-${pad(Math.min(28, Math.max(1, +cfg.dueDay || 5)))}`;
  return HS.add('invoices', { residentId: res.id, name: res.name, roomId: res.roomId, bed: res.bed, month, lines, total: hsTotal(lines), dueDate: due < (res.joinDate || '') ? res.joinDate : due }, 'HI');
}
/* rent (and mess) for one resident for one month, counted by the days they stay that month */
function hsMonthLines(res, month) {
  const dim = hsDim(month), ms = month + '-01', me = `${month}-${pad(dim)}`, from = res.joinDate > ms ? res.joinDate : ms, endBy = res.vacateOn || res.vacateDate || '';
  const to = endBy && endBy < me ? endBy : me; if (from > to || (res.joinDate || '') > me) return [];
  const days = daysBetween(from, to) + 1, part = days < dim, cfg = HS.cfg(), lines = [{ type: 'Rent', desc: `Rent · ${hsMonthName(month)}${part ? ` (${days} of ${dim} days)` : ''}`, amount: Math.round((+res.rent || 0) * days / dim) }];
  if (res.mess && +cfg.messFee > 0) lines.push({ type: 'Mess', desc: `Mess · ${hsMonthName(month)}${part ? ` (${days} days)` : ''}`, amount: Math.round(+cfg.messFee * days / dim) });
  return lines.filter(l => l.amount > 0);
}
function hsBillMonth(month) {
  let n = 0;
  HS.list('residents').filter(r => ['Active', 'Notice'].includes(r.status)).forEach(r => { if (HS.list('invoices').some(i => i.residentId === r.id && i.month === month && i.lines.some(l => l.type === 'Rent'))) return; const lines = hsMonthLines(r, month); if (lines.length) { hsInvoiceFor(r, month, lines); n++; } });
  return n;
}
/* take a payment and settle the oldest dues first; returns the payment records */
function hsCollect(res, amount, method, date, ref, note) {
  let left = Math.round(+amount); const out = [];
  for (const inv of hsOpenInv(res.id)) { if (left <= 0) break; const take = Math.min(left, hsInvBal(inv)); out.push(HS.add('payments', { residentId: res.id, name: res.name, invoiceId: inv.id, kind: 'Fee', amount: take, method, date, ref, note, month: inv.month }, 'HP')); left -= take; }
  if (left > 0) out.push(HS.add('payments', { residentId: res.id, name: res.name, invoiceId: '', kind: 'Advance', amount: left, method, date, ref, note: note || 'Advance for next month' }, 'HP'));
  return out;
}
function hsReceipt(pays) {
  if (!pays.length) return; const res = hsRes(pays[0].residentId) || {}, h = HS.hostel(), no = pays[0].id;
  openModal('Receipt · ' + no, `${printBar('receipt')}<div class="print-sheet"><section class="copy"><header><div class="ph-brand"><b>${esc(h.name)}</b><span>${esc([h.area, h.city].filter(Boolean).join(', '))}</span><span>${esc(h.phone || SITE_CONFIG.phone)}</span></div><div class="ph-kind"><b>RECEIPT</b><span>${esc(no)} · ${fmtDate(pays[0].date)}</span></div></header>
    <div class="ph-grid"><div><span>Received from</span><b>${esc(res.name || pays[0].name)}</b>${esc(res.phone || '')}</div><div><span>Room / bed</span><b>${esc(hsBedLabel(res))}</b>${esc(res.org || '')}</div></div>
    <table class="ph-table"><tr><th>For</th><th>Paid by</th><th>Reference</th><th>Amount</th></tr>${pays.map(p => { const inv = HS.find('invoices', p.invoiceId); return `<tr><td>${esc(p.kind === 'Fee' ? (inv ? 'Fees · ' + hsMonthName(inv.month) : 'Fees') : p.kind === 'Deposit' ? 'Security deposit' : p.kind === 'Refund' ? 'Deposit refund (paid to resident)' : 'Advance')}</td><td>${esc(p.method)}</td><td>${esc(p.ref || '')}</td><td>${inr(p.amount)}</td></tr>`; }).join('')}<tr><th colspan="3">Total</th><th>${inr(hsSum(pays, p => p.amount))}</th></tr></table>
    <p class="small">Balance due after this payment: <b>${inr(hsDue(res.id))}</b> · Deposit held: <b>${inr(hsDeposit(res.id))}</b></p><div class="ph-sign"><div><span>Resident</span><i></i></div><div><span>For ${esc(h.name)}</span><i></i></div></div></section></div>`, { wide: true });
}
function hsCollectModal(res, after) {
  const open = hsOpenInv(res.id), due = hsSum(open, hsInvBal);
  openModal(`Collect · ${res.name}`, `<div class="stack"><div class="kpis">${kpi('Due now', inr(due))}${kpi('Deposit held', inr(hsDeposit(res.id)))}</div>
    ${open.map(i => `<div class="line-item"><span>${esc(hsMonthName(i.month))} · due ${fmtDate(i.dueDate)}</span><span>${inr(hsInvBal(i))}</span></div>`).join('') || '<p class="muted">No dues. Money received now is kept as advance for next month.</p>'}
    <form class="form-grid" id="hs-pay"><label class="field"><span>Amount (₹)</span><input class="input" type="number" name="amount" min="1" value="${due || ''}" required></label><label class="field"><span>Paid by</span><select class="input" name="method">${[...HS_PAY, ...(hsDeposit(res.id) > 0 ? ['From deposit'] : [])].map(m => `<option>${m}</option>`).join('')}</select></label>
      <label class="field"><span>Date</span><input class="input" type="date" name="date" value="${todayISO()}" required></label><label class="field"><span>UPI / cheque ref (optional)</span><input class="input" name="ref"></label>
      <div class="full" style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary">Save &amp; print receipt</button></div></form></div>`, {
    onMount: m => $('#hs-pay', m).onsubmit = e => { e.preventDefault(); const f = e.target, amt = +f.amount.value;
      if (f.method.value === 'From deposit' && amt > hsDeposit(res.id)) return toast('That is more than the deposit held', 'err');
      if (f.method.value === 'From deposit' && amt > due) return toast('Use the deposit only for dues', 'err');
      const pays = hsCollect(res, amt, f.method.value, f.date.value, f.ref.value.trim(), ''); closeModal(); toast(`${inr(amt)} received from ${res.name}`); after && after(); hsReceipt(pays); } });
}
const hsRemind = (res, amount) => hsWa(res.phone, `Dear ${res.name}, your ${HS.hostel().name || 'hostel'} fees of ${inr(amount)} are due (room ${hsBedLabel(res)}). Please pay by UPI or at the office. Thank you.`);

/* =============================== PUBLIC PAGE =============================== */
ROUTE_TITLES.hostels = 'Hostels & PG';
route('hostels', app => {
  const all = Store.get('hostels').filter(h => h.status === 'Active'), cities = [...new Set(all.map(h => h.city).filter(Boolean))].sort();
  const q = Session.get('hsFind') || { city: '', type: '', max: '', vacant: false };
  app.innerHTML = pageHero({ elsha: true, eyebrow: 'Elsha · Hostels & PG', title: 'Find a hostel that feels like home', lead: 'Clean rooms, good food, Wi-Fi and a safe, well-run building for students and working professionals. Send an enquiry and the hostel calls you back.' }) +
    `<section class="wrap overlap"><div class="search-box"><form class="form-grid" id="hs-q" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));align-items:end">
      <label class="field"><span>City</span><select class="input" name="city"><option value="">Any city</option>${cities.map(c => `<option ${c === q.city ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <label class="field"><span>Hostel for</span><select class="input" name="type"><option value="">Anyone</option>${HS_TYPES.map(t => `<option ${t === q.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="field"><span>Rent up to (₹ / month)</span><input class="input" type="number" name="max" min="0" step="500" value="${esc(q.max)}" placeholder="Any"></label>
      <label class="check"><input type="checkbox" name="vacant" ${q.vacant ? 'checked' : ''}> Beds free now</label></form></div></section>
    <section class="section"><div class="wrap"><div id="hs-list" class="grid g3"></div></div></section>
    <section class="section band"><div class="wrap"><div class="venture el" style="min-height:0;flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px"><div style="display:grid;gap:8px;max-width:60ch"><h2>Run a hostel or PG?</h2><p>Manage rooms and beds, admissions, monthly rent, deposits, mess, the gate register and complaints in one place, on your phone or computer. Your hostel is listed here for students and professionals to find.</p></div><a class="btn btn-light btn-lg" href="#contact">Talk to us</a></div></div></section>`;
  const draw = () => {
    const list = all.filter(h => (!q.city || h.city === q.city) && (!q.type || h.type === q.type) && (!q.max || (+h.rentFrom || 0) <= +q.max) && (!q.vacant || +h.vacantBeds > 0));
    $('#hs-list', app).innerHTML = list.map(h => `<article class="card svc el" style="gap:10px">${pic('hostels')}<div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><h3>${esc(h.name)}</h3>${+h.vacantBeds > 0 ? `<span class="chip green">${h.vacantBeds} bed${h.vacantBeds > 1 ? 's' : ''} free</span>` : '<span class="chip">Full now</span>'}</div>
      <p class="muted small">${esc(h.type || '')} · ${esc([h.area, h.city].filter(Boolean).join(', '))}</p>${h.rentFrom ? `<p><b>${inr(h.rentFrom)}</b> <span class="muted small">/ month onwards${(h.sharing || []).length ? ` · ${h.sharing.map(n => n === 1 ? 'single' : n + '-sharing').join(', ')}` : ''}</span></p>` : ''}
      <div class="chips">${(h.amenities || []).slice(0, 6).map(a => `<span class="chip">${esc(a)}</span>`).join('')}</div>${h.about ? `<p class="small">${esc(h.about)}</p>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:auto"><button class="btn btn-green" data-enq="${esc(h.id)}">Enquire / book a visit</button>${h.mapLink ? `<a class="btn btn-outline" href="${esc(h.mapLink)}" target="_blank" rel="noopener">Map</a>` : ''}</div></article>`).join('')
      || `<div class="card empty-state" style="grid-column:1/-1"><h3>${all.length ? 'No hostel matches these choices' : 'Hostels are being added'}</h3><p class="muted" style="margin-top:6px">${all.length ? 'Try another city or a higher rent.' : 'Send us a message and we will help you find a bed.'}</p><p style="margin-top:12px"><a class="btn btn-green" href="#contact">Contact us</a></p></div>`;
    $$('[data-enq]', app).forEach(b => b.onclick = () => hsEnquiry(Store.find('hostels', b.dataset.enq)));
  };
  $('#hs-q', app).oninput = e => { const f = e.currentTarget; Object.assign(q, { city: f.city.value, type: f.type.value, max: f.max.value, vacant: f.vacant.checked }); Session.set('hsFind', q); draw(); };
  draw();
});
function hsEnquiry(h) {
  openModal(`Enquire · ${h.name}`, `<form class="form-grid" id="hs-enq"><label class="field"><span>Your name</span><input class="input" name="name" required></label><label class="field"><span>Mobile</span><input class="input" name="phone" required pattern="[0-9+ ]{10,15}"></label>
    <label class="field"><span>I am a</span><select class="input" name="kind"><option>Student</option><option>Working professional</option><option>Parent / guardian</option></select></label><label class="field"><span>Gender</span><select class="input" name="gender"><option>Female</option><option>Male</option><option>Other</option></select></label>
    <label class="field"><span>Move in around</span><input class="input" type="date" name="moveIn" value="${todayISO(7)}" min="${todayISO()}"></label><label class="field"><span>Room preference</span><select class="input" name="sharing"><option value="">Any</option>${(h.sharing || [1, 2, 3]).map(n => `<option value="${n}">${n === 1 ? 'Single room' : n + '-sharing'}</option>`).join('')}</select></label>
    <label class="field full"><span>Message (optional)</span><textarea class="input" name="msg" placeholder="College / company, food preference, questions…"></textarea></label>
    <p class="small muted full">We share your details only with ${esc(h.name)} so they can call you back.</p><div class="full" style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-green">Send enquiry</button></div></form>`, {
    onMount: m => $('#hs-enq', m).onsubmit = e => { e.preventDefault(); const f = e.target, d = { id: genId('HQ', 7), hostelId: h.id, hostelName: h.name, name: f.name.value.trim(), phone: f.phone.value.trim(), kind: f.kind.value, gender: f.gender.value, moveIn: f.moveIn.value, sharing: f.sharing.value, msg: f.msg.value.trim(), status: 'New', createdAt: hsNow() };
      Store.add('hostelEnquiries', d); closeModal();
      openModal('Enquiry sent', `<div class="stack"><p>Thank you, ${esc(d.name)}. <b>${esc(h.name)}</b> will call you on ${esc(d.phone)} soon.</p><p class="muted small">Reference ${esc(d.id)}</p><a class="btn btn-green" target="_blank" rel="noopener" href="${hsWa(h.whatsapp || h.phone || SITE_CONFIG.whatsapp, `Hello ${h.name}, I am ${d.name} (${d.kind}). I am looking for a ${d.sharing ? d.sharing + '-sharing ' : ''}bed from ${fmtDate(d.moveIn)}. Ref ${d.id}.`)}">Also message on WhatsApp</a></div>`); } });
}

/* =============================== PORTAL =============================== */
ROUTE_TITLES['hostel-crm'] = 'Hostel management';
const HS_TABS = [['dash', 'Dashboard'], ['beds', 'Rooms & beds'], ['res', 'Residents'], ['fees', 'Rent & fees'], ['mess', 'Mess'], ['gate', 'Gate register'], ['cmp', 'Complaints'], ['notice', 'Notices'], ['exp', 'Expenses'], ['rep', 'Reports'], ['enq', 'Enquiries'], ['set', 'Hostel & settings']];
route('hostel-crm', app => {
  const hostels = Store.get('hostels');
  let active = Session.get('tab_#hostel-crm') || 'dash'; if (!HS_TABS.some(t => t[0] === active)) active = 'dash';
  app.innerHTML = adminShell({ title: 'Hostel management', sub: 'Rooms and beds, residents, rent and deposits, mess, gate register, complaints and accounts for your hostels.', tabs: hostels.length ? HS_TABS : [], active, base: 'hostels', green: true });
  const outer = $('#admin-body', app);
  if (typeof Remote !== 'undefined' && Remote.on && (Remote.apiVersion || 1) < 8) { outer.innerHTML = `<div class="card stack"><h3>One update needed on your server</h3><p>Hostel management stores new kinds of records, so the database program needs its latest version (8).</p><ol style="padding-left:20px;display:grid;gap:6px"><li>In cPanel → File Manager, open the <b>api.jacknjose.co.in</b> folder.</li><li>Click <b>Upload</b>, tick <b>Overwrite existing files</b>, and choose the new <b>index.php</b>.</li><li>Reload this page.</li></ol></div>`; return; }
  if (!hostels.length) { outer.innerHTML = `<div class="card stack" style="max-width:720px"><h3>Add your first hostel</h3><p class="muted">You can add more hostels later and switch between them at the top.</p><div id="hs-first"></div></div>`; hsPropertyForm($('#hs-first', outer), null, () => render()); return; }
  if (!hostels.some(h => h.id === HS.H())) Session.set('hsHostel', hostels[0].id);
  outer.innerHTML = `<div class="crm-bar"><label class="field" style="flex:1 1 260px;max-width:420px"><span>Hostel</span><select class="input" id="hs-pick" ${hostels.length < 2 ? 'disabled' : ''}>${hostels.map(h => `<option value="${h.id}" ${h.id === HS.H() ? 'selected' : ''}>${esc(h.name)} · ${esc(h.city || '')}</option>`).join('')}</select></label><span class="muted small" id="hs-sum"></span></div><div id="hs-body"></div>`;
  const body = $('#hs-body', outer);
  const show = tab => { hsSync(); $('#hs-sum', outer).textContent = (() => { const B = hsAllBeds(); return B.length ? `${B.filter(x => ['occupied', 'notice'].includes(x.state)).length} of ${B.length} beds occupied` : ''; })();
    ({ dash: hsDash, beds: hsBeds, res: hsResidents, fees: hsFees, mess: hsMess, gate: hsGate, cmp: hsComplaints, notice: hsNotices, exp: hsExpenses, rep: hsReports, enq: hsEnquiries, set: hsSettings })[tab](body, () => show(tab)); };
  $('#hs-pick', outer).onchange = e => { Session.set('hsHostel', e.target.value); show($('.admin-tabs button.on', app)?.dataset.tab || active); };
  bindTabs(app, show); show(active);
});
function hsSubnav(body, key, views, draw) {
  let cur = Session.get('hsSub_' + key); if (!views.some(v => v[0] === cur)) cur = views[0][0];
  body.innerHTML = `<div class="chips" style="margin-bottom:14px">${views.map(([id, l]) => `<button class="chip ${id === cur ? 'on' : ''}" data-sub="${id}">${l}</button>`).join('')}</div><div id="hs-sub"></div>`;
  $$('[data-sub]', body).forEach(b => b.onclick = () => { Session.set('hsSub_' + key, b.dataset.sub); hsSubnav(body, key, views, draw); });
  draw(cur, $('#hs-sub', body));
}

/* ---------- Dashboard ---------- */
function hsDash(body, again) {
  const B = hsAllBeds(), occ = B.filter(b => ['occupied', 'notice'].includes(b.state)).length, R = HS.list('residents'), live = R.filter(r => ['Active', 'Notice'].includes(r.status)), m = hsMonth();
  const inv = HS.list('invoices'), pay = HS.list('payments').filter(p => p.kind === 'Fee' || p.kind === 'Advance'), billed = hsSum(inv.filter(i => i.month === m), i => i.total), got = hsSum(pay.filter(p => (p.date || '').startsWith(m)), p => p.amount);
  const dues = live.map(r => ({ r, due: hsDue(r.id), late: hsOpenInv(r.id).some(i => i.dueDate < todayISO()) })).filter(x => x.due > 0).sort((a, b) => b.due - a.due);
  const out = HS.list('outings').filter(o => !o.backAt), vis = HS.list('visitors').filter(v => !v.outAt), cmp = HS.list('complaints').filter(c => c.status !== 'Resolved'), notice = R.filter(r => r.status === 'Notice').sort((a, b) => (a.vacateOn || '').localeCompare(b.vacateOn || ''));
  const months = [5, 4, 3, 2, 1, 0].map(n => hsAddMonths(m, -n)), enq = Store.get('hostelEnquiries').filter(e => e.hostelId === HS.H() && e.status === 'New');
  body.innerHTML = `<div class="kpis">${kpi('Occupancy', B.length ? Math.round(occ / B.length * 100) + '%' : '—', `${occ} of ${B.length} beds`)}${kpi('Beds free', B.filter(b => b.state === 'vacant').length, `${B.filter(b => b.state === 'reserved').length} reserved`)}${kpi('Residents', live.length, `${notice.length} on notice`)}${kpi(`Collected · ${hsMonthName(m).split(' ')[0]}`, inr(got), `billed ${inr(billed)}`)}${kpi('Dues outstanding', inr(hsSum(dues, d => d.due)), `${dues.filter(d => d.late).length} overdue`, dues.some(d => d.late))}${kpi('Deposits held', inr(hsSum(R, r => hsDeposit(r.id))))}${kpi('Out of hostel now', out.length, out.filter(o => o.expectedBack && o.expectedBack < hsLocalNow()).length ? 'some are late' : '')}${kpi('Open complaints', cmp.length, `${vis.length} visitor(s) inside`)}</div>
    ${!B.length ? `<div class="card" style="margin-top:18px"><b>Start here:</b> add your rooms in <b>Rooms &amp; beds</b>, then admit residents.</div>` : ''}
    <div class="grid g2" style="margin-top:18px"><div class="card"><h3 style="margin-bottom:12px">Collections · last 6 months</h3>${bars(months.map(x => [hsMonthName(x).slice(0, 3), hsSum(pay.filter(p => (p.date || '').startsWith(x)), p => p.amount), inr(hsSum(pay.filter(p => (p.date || '').startsWith(x)), p => p.amount))]))}</div>
      <div class="card"><h3 style="margin-bottom:10px">Dues to follow up</h3>${dues.slice(0, 8).map(d => `<div class="line-item"><span><b>${esc(d.r.name)}</b> · ${esc(hsBedLabel(d.r))} ${d.late ? '<span class="chip danger">overdue</span>' : ''}</span><span>${inr(d.due)} <a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="${hsRemind(d.r, d.due)}">WhatsApp</a></span></div>`).join('') || '<p class="muted">Everyone has paid. 🎉</p>'}</div></div>
    <div class="grid g3" style="margin-top:18px"><div class="card"><h3 style="margin-bottom:10px">Leaving soon</h3>${notice.map(r => `<div class="line-item"><span>${esc(r.name)} · ${esc(hsBedLabel(r))}</span><span>${fmtDate(r.vacateOn)}</span></div>`).join('') || '<p class="muted">No one is on notice.</p>'}</div>
      <div class="card"><h3 style="margin-bottom:10px">Out right now</h3>${out.map(o => `<div class="line-item"><span>${esc(hsRes(o.residentId)?.name || o.name)} · ${esc(o.type)}</span><span class="small ${o.expectedBack && o.expectedBack < hsLocalNow() ? 'danger-text' : 'muted'}">back ${o.expectedBack ? fmtDateTime(o.expectedBack) : '—'}</span></div>`).join('') || '<p class="muted">Everyone is in.</p>'}</div>
      <div class="card"><h3 style="margin-bottom:10px">New enquiries</h3>${enq.slice(0, 6).map(e => `<div class="line-item"><span>${esc(e.name)} · ${esc(e.kind)}</span><a class="btn btn-sm btn-ghost" href="tel:${esc(e.phone)}">Call</a></div>`).join('') || '<p class="muted">No new enquiries.</p>'}</div></div>`;
  void again;
}

/* ---------- Rooms & beds ---------- */
function hsBeds(body, again) {
  hsSubnav(body, 'beds', [['board', 'Bed board'], ['rooms', 'Rooms']], (view, el) => {
    if (view === 'board') {
      const rooms = hsRooms(), floors = [...new Set(rooms.map(r => +r.floor))].sort((a, b) => a - b), B = hsAllBeds(), cnt = s => B.filter(b => b.state === s).length, only = Session.get('hsVacOnly');
      el.innerHTML = rooms.length ? `<div class="hs-legend">${[['vacant', 'Free'], ['occupied', 'Occupied'], ['notice', 'On notice'], ['reserved', 'Reserved'], ['blocked', 'Blocked']].map(([k, l]) => `<span><i class="hs-dot hs-${k}"></i>${l} <b>${cnt(k)}</b></span>`).join('')}<label class="check" style="margin-left:auto"><input type="checkbox" id="hs-vo" ${only ? 'checked' : ''}> Rooms with free beds only</label></div>
        ${floors.map(f => `<h3 class="hs-floor">${f === 0 ? 'Ground floor' : `Floor ${f}`}</h3><div class="hs-rooms">${rooms.filter(r => +r.floor === f && (!only || hsBedsOf(r).some(b => hsBedState(r, b) === 'vacant'))).map(r => `<div class="hs-room"><div class="hs-room-h"><b>${esc(r.number)}</b><span class="muted small">${r.sharing}-sharing${r.ac === 'AC' ? ' · AC' : ''}${r.bath === 'Attached' ? ' · attached bath' : ''}</span><span class="small">${inr(r.rent)}</span></div>
          <div class="hs-bedrow">${hsBedsOf(r).map(b => { const st = hsBedState(r, b), o = hsOccupant(r.id, b); return `<button class="hs-bed hs-${st}" data-bed="${esc(r.id)}|${b}" title="${esc(o ? o.name : st)}"><b>${b}</b><span>${esc(o ? o.name.split(' ')[0] : st === 'blocked' ? 'Blocked' : 'Free')}</span></button>`; }).join('')}</div></div>`).join('')}</div>`).join('')}
        <p class="muted small" style="margin-top:12px">Tap a free bed to admit someone, an occupied bed to see the resident.</p>` : `<div class="card empty-state"><h3>No rooms yet</h3><p class="muted" style="margin-top:6px">Open <b>Rooms</b> above and use “Add a whole floor” to create rooms and beds in one go.</p></div>`;
      const vo = $('#hs-vo', el); if (vo) vo.onchange = () => { Session.set('hsVacOnly', vo.checked); again(); };
      $$('[data-bed]', el).forEach(b => b.onclick = () => { const [rid, bed] = b.dataset.bed.split('|'), r = HS.find('rooms', rid), o = hsOccupant(rid, bed);
        if (o) return hsProfile(o, again);
        if ((r.blocked || []).includes(bed)) return confirmBox(`Bed ${r.number}-${bed} is blocked. Make it free again?`, () => { HS.upd('rooms', rid, { blocked: (r.blocked || []).filter(x => x !== bed) }); hsSync(); again(); }, 'Unblock bed');
        openModal(`Bed ${r.number}-${bed}`, `<div class="stack"><p>${esc(hsRoomLabel(r))}</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary" id="b-adm">Admit a resident here</button><button class="btn btn-outline" id="b-blk">Block bed (repairs)</button></div></div>`, { onMount: m => {
          $('#b-adm', m).onclick = () => { closeModal(); hsAdmission(null, again, { roomId: rid, bed }); };
          $('#b-blk', m).onclick = () => { HS.upd('rooms', rid, { blocked: [...(r.blocked || []), bed] }); closeModal(); hsSync(); toast('Bed blocked'); again(); }; } }); });
      return;
    }
    hsCrud(el, 'rooms', { single: 'Room', plural: 'Rooms', idPrefix: 'HR', label: r => r.number, onChange: hsSync,
      toolbar: '<button class="btn btn-outline" id="hs-floor">+ Add a whole floor</button>',
      fields: [{ name: 'number', label: 'Room number', required: true }, { name: 'floor', label: 'Floor (0 = ground)', type: 'number', min: 0, default: 1 }, { name: 'sharing', label: 'Beds in the room', type: 'number', min: 1, max: 12, default: 2 }, { name: 'ac', label: 'AC', type: 'select', options: ['Non-AC', 'AC'] }, { name: 'bath', label: 'Bathroom', type: 'select', options: ['Attached', 'Common'] }, { name: 'rent', label: 'Rent per bed per month (₹)', type: 'number', min: 0, required: true }, { name: 'deposit', label: 'Deposit per bed (₹)', type: 'number', min: 0, default: 0 }, { name: 'notes', label: 'Notes', full: true }],
      validate: (d, row) => { if (HS.list('rooms').some(r => String(r.number).toLowerCase() === d.number.toLowerCase() && r.id !== row?.id)) return `Room ${d.number} already exists`; if (row && hsBedsOf(row).slice(+d.sharing).some(b => hsOccupant(row.id, b))) return 'Move the residents out of the beds you are removing first'; return null; },
      beforeDelete: r => hsBedsOf(r).some(b => hsOccupant(r.id, b)) ? 'Someone stays in this room. Move or vacate them first.' : null,
      columns: [{ label: 'Room', render: r => `<b>${esc(r.number)}</b><div class="muted small">Floor ${r.floor}</div>` }, { label: 'Type', render: r => `${r.sharing}-sharing · ${esc(r.ac)} · ${esc(r.bath)} bath` }, { label: 'Rent / bed', render: r => inr(r.rent) + `<div class="muted small">deposit ${inr(r.deposit)}</div>` }, { label: 'Beds', render: r => { const s = hsBedsOf(r).map(b => hsBedState(r, b)); return `${s.filter(x => x === 'vacant').length} free of ${s.length}`; } }] });
    $('#hs-floor', el).onclick = () => openModal('Add a whole floor', `<form class="form-grid" id="hs-fl">${formHtml([{ name: 'floor', label: 'Floor (0 = ground)', type: 'number', min: 0, default: 1 }, { name: 'from', label: 'First room number', type: 'number', min: 1, default: 101 }, { name: 'to', label: 'Last room number', type: 'number', min: 1, default: 110 }, { name: 'sharing', label: 'Beds per room', type: 'number', min: 1, max: 12, default: 3 }, { name: 'ac', label: 'AC', type: 'select', options: ['Non-AC', 'AC'] }, { name: 'bath', label: 'Bathroom', type: 'select', options: ['Attached', 'Common'] }, { name: 'rent', label: 'Rent per bed (₹)', type: 'number', min: 0, default: 6000 }, { name: 'deposit', label: 'Deposit per bed (₹)', type: 'number', min: 0, default: 6000 }], {})}<div class="full" style="display:flex;justify-content:flex-end;gap:10px"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary">Create rooms</button></div></form>`, {
      onMount: m => $('#hs-fl', m).onsubmit = e => { e.preventDefault(); const f = e.target, a = +f.from.value, z = +f.to.value; if (z < a || z - a > 80) return toast('Choose up to 80 rooms', 'err'); let n = 0;
        for (let k = a; k <= z; k++) { if (HS.list('rooms').some(r => String(r.number) === String(k))) continue; HS.add('rooms', { number: String(k), floor: +f.floor.value, sharing: +f.sharing.value, ac: f.ac.value, bath: f.bath.value, rent: +f.rent.value, deposit: +f.deposit.value, notes: '' }, 'HR'); n++; }
        closeModal(); hsSync(); toast(`${n} rooms added with ${n * +f.sharing.value} beds`); again(); } });
  });
}

/* ---------- Residents ---------- */
const HS_RES_FIELDS = () => [
  { name: 'name', label: 'Full name', required: true }, { name: 'phone', label: 'Mobile', required: true, pattern: '[0-9+ ]{10,15}' }, { name: 'email', label: 'Email', type: 'email' }, { name: 'gender', label: 'Gender', type: 'select', options: ['Female', 'Male', 'Other'] },
  { name: 'dob', label: 'Date of birth', type: 'date' }, { name: 'kind', label: 'Resident type', type: 'select', options: ['Student', 'Working professional', 'Other'] }, { name: 'org', label: 'College / company', placeholder: 'PSG College of Technology' }, { name: 'course', label: 'Course & year / designation' },
  { name: 'guardian', label: 'Parent / guardian name', required: true }, { name: 'guardianPhone', label: 'Parent / guardian mobile', required: true }, { name: 'relation', label: 'Relation', type: 'select', options: ['Father', 'Mother', 'Guardian', 'Spouse', 'Sibling', 'Other'] }, { name: 'emergency', label: 'Emergency contact (if different)' },
  { name: 'idType', label: 'ID proof', type: 'select', options: ['Aadhaar', 'College ID', 'Company ID', 'Passport', 'Driving licence', 'Voter ID', 'PAN'] }, { name: 'idNumber', label: 'ID number' }, { name: 'blood', label: 'Blood group', type: 'select', options: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] }, { name: 'food', label: 'Food', type: 'select', options: ['Veg', 'Non-veg', 'Egg'] },
  { name: 'address', label: 'Home address', full: true }, { name: 'medical', label: 'Medical conditions / allergies (optional)', full: true }, { name: 'notes', label: 'Notes', full: true }];
async function hsPhotoFrom(file) {   // small square photo kept with the resident record
  const img = await createImageBitmap(file), s = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = 240;
  c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 240, 240); return c.toDataURL('image/jpeg', .72);
}
const hsAvatar = r => r?.photo ? `<img class="hs-av" src="${esc(r.photo)}" alt="">` : `<span class="hs-av none">${esc((r?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join(''))}</span>`;
function hsAdmission(row, again, pre = {}) {
  const fields = HS_RES_FIELDS(), free = hsAllBeds().filter(b => b.state === 'vacant' || (row && b.room.id === row.roomId && b.bed === row.bed));
  const v = row || { kind: 'Student', relation: 'Father', idType: 'Aadhaar', food: 'Veg', ...pre }, bedVal = row ? `${row.roomId}|${row.bed}` : pre.roomId ? `${pre.roomId}|${pre.bed}` : '';
  let photo = row?.photo || '';
  openModal(row ? `Edit · ${row.name}` : 'New admission', `<form class="form-grid" id="hs-adm">
    <div class="full hs-photo-row"><span id="hs-ph">${hsAvatar({ name: v.name || '?', photo })}</span><label class="btn btn-outline btn-sm">📷 Photo<input type="file" accept="image/*" capture="user" id="hs-phf" hidden></label><span class="muted small">Optional. Taken on a phone, or choose a picture.</span></div>
    ${formHtml(fields.slice(0, 12), v)}
    ${row ? '' : `<h4 class="full" style="margin-top:6px">Room, rent and deposit</h4><label class="field"><span>Bed</span><select class="input" name="bedSel" required><option value="">Choose a free bed</option>${free.map(b => `<option value="${esc(b.room.id)}|${b.bed}" ${`${b.room.id}|${b.bed}` === bedVal ? 'selected' : ''}>${esc(b.room.number)}-${b.bed} · ${b.room.sharing}-sharing${b.room.ac === 'AC' ? ' AC' : ''} · ${inr(b.room.rent)}</option>`).join('')}</select></label>
      <label class="field"><span>Joining date</span><input class="input" type="date" name="joinDate" value="${todayISO()}" required></label><label class="field"><span>Monthly rent (₹)</span><input class="input" type="number" name="rent" min="0" required></label><label class="field"><span>Security deposit (₹)</span><input class="input" type="number" name="deposit" min="0"></label>
      <label class="field"><span>Deposit received now (₹)</span><input class="input" type="number" name="depPaid" min="0"></label><label class="field"><span>Deposit paid by</span><select class="input" name="depMethod">${HS_PAY.map(m => `<option>${m}</option>`).join('')}</select></label>
      <label class="check"><input type="checkbox" name="mess" checked> Takes food from the mess</label><label class="check"><input type="checkbox" name="billNow" checked> Bill this month's rent now (for the days left)</label>`}
    ${row ? `<label class="field"><span>Monthly rent (₹)</span><input class="input" type="number" name="rent" min="0" value="${esc(row.rent)}"></label><label class="check"><input type="checkbox" name="mess" ${row.mess ? 'checked' : ''}> Takes food from the mess</label>` : ''}
    ${formHtml(fields.slice(12), v)}
    <label class="check full"><input type="checkbox" name="agree" ${row ? 'checked' : ''} required> The resident has read and accepted the hostel rules${HS.hostel().rules ? '' : ' (add your rules under Hostel & settings)'}</label>
    <div class="full" style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary">${row ? 'Save changes' : 'Admit resident'}</button></div></form>`, { wide: true, onMount: m => {
    const f = $('#hs-adm', m), setRent = () => { const [rid] = (f.bedSel?.value || '').split('|'), r = HS.find('rooms', rid); if (r && f.rent) { f.rent.value = r.rent; f.deposit.value = r.deposit; f.depPaid.value = r.deposit; } };
    if (f.bedSel) { f.bedSel.onchange = setRent; setRent(); }
    $('#hs-phf', m).onchange = async e => { const file = e.target.files[0]; if (!file) return; try { photo = await hsPhotoFrom(file); $('#hs-ph', m).innerHTML = hsAvatar({ photo }); } catch (x) { toast('That photo could not be read', 'err'); } };
    f.onsubmit = e => { e.preventDefault(); const d = readForm(f, fields); d.photo = photo; d.mess = f.mess.checked; d.rent = +f.rent.value;
      if (hsPhone10(d.phone).length < 10 || hsPhone10(d.guardianPhone).length < 10) return toast('Check the mobile numbers (10 digits)', 'err');
      if (row) { HS.upd('residents', row.id, d); closeModal(); toast('Resident updated'); again(); return; }
      const [roomId, bed] = f.bedSel.value.split('|'); if (!roomId) return toast('Choose a bed', 'err'); if (hsOccupant(roomId, bed)) return toast('That bed was just taken. Choose another.', 'err');
      const join = f.joinDate.value, res = HS.add('residents', { ...d, roomId, bed, joinDate: join, deposit: +f.deposit.value || 0, status: join > todayISO() ? 'Reserved' : 'Active', moves: [{ date: join, roomId, bed }] }, 'HRS');
      const dep = +f.depPaid.value || 0, pays = dep > 0 ? [HS.add('payments', { residentId: res.id, name: res.name, kind: 'Deposit', amount: dep, method: f.depMethod.value, date: todayISO(), ref: '', note: 'Security deposit' }, 'HP')] : [];
      if (f.billNow.checked && res.status === 'Active') { const L = hsMonthLines(res, hsMonth(join)); if (L.length) hsInvoiceFor(res, hsMonth(join), L); }
      if (pre.enquiryId) Store.update('hostelEnquiries', pre.enquiryId, { status: 'Joined', residentId: res.id });
      closeModal(); hsSync(); toast(`${res.name} admitted to ${hsBedLabel(res)}`); again(); if (pays.length) hsReceipt(pays); };
  } });
}
function hsProfile(r, again) {
  const inv = HS.list('invoices').filter(i => i.residentId === r.id).sort((a, b) => b.month.localeCompare(a.month)), pays = HS.list('payments').filter(p => p.residentId === r.id).sort((a, b) => (b.date || '').localeCompare(a.date || '')), due = hsDue(r.id), dep = hsDeposit(r.id), live = HS_LIVE.includes(r.status);
  openModal(r.name, `<div class="stack"><div class="hs-prof">${hsAvatar(r)}<div><b style="font-size:1.1rem">${esc(r.name)}</b> ${statusChip(r.status === 'Notice' ? 'Notice period' : r.status)}<div class="muted small">${esc(r.kind || '')} · ${esc(r.org || '')} ${esc(r.course || '')}</div><div class="small">Bed <b>${esc(hsBedLabel(r))}</b> · joined ${fmtDate(r.joinDate)}${r.status === 'Notice' ? ` · leaving ${fmtDate(r.vacateOn)}` : ''}${r.vacateDate ? ` · left ${fmtDate(r.vacateDate)}` : ''}</div></div></div>
    <div class="kpis">${kpi('Rent', inr(r.rent))}${kpi('Due now', inr(due), '', due > 0)}${kpi('Deposit held', inr(dep))}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${live ? `<button class="btn btn-primary btn-sm" data-a="pay">Collect money</button>` : ''}<button class="btn btn-outline btn-sm" data-a="edit">Edit details</button>${live ? `<button class="btn btn-outline btn-sm" data-a="move">Change bed</button>` : ''}${r.status === 'Active' ? `<button class="btn btn-outline btn-sm" data-a="notice">Give notice</button>` : ''}${r.status === 'Reserved' ? `<button class="btn btn-outline btn-sm" data-a="checkin">Mark arrived</button>` : ''}${live ? `<button class="btn btn-danger-ghost btn-sm" data-a="vacate">Vacate &amp; settle</button>` : ''}<button class="btn btn-ghost btn-sm" data-a="card">ID card</button><a class="btn btn-ghost btn-sm" href="tel:${esc(r.phone)}">Call</a>${due > 0 ? `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${hsRemind(r, due)}">WhatsApp reminder</a>` : ''}</div>
    <div class="ph-grid"><div><span>Mobile</span><b>${esc(r.phone)}</b>${esc(r.email || '')}</div><div><span>Parent / guardian</span><b>${esc(r.guardian || '')} (${esc(r.relation || '')})</b>${esc(r.guardianPhone || '')}</div><div><span>ID</span><b>${esc(r.idType || '')} ${esc(r.idNumber || '')}</b>Blood ${esc(r.blood || '—')} · ${esc(r.food || '')}${r.mess ? ' · mess' : ''}</div><div><span>Address</span>${esc(r.address || '—')}</div></div>
    <h4>Bills</h4><div class="table-wrap"><table class="table"><thead><tr><th>Month</th><th>Total</th><th>Balance</th><th>Status</th></tr></thead><tbody>${inv.map(i => `<tr><td>${esc(hsMonthName(i.month))}<div class="muted small">${i.lines.map(l => esc(l.type)).join(', ')}</div></td><td>${inr(i.total)}</td><td>${inr(hsInvBal(i))}</td><td>${hsInvChip(hsInvState(i))}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No bills yet.</td></tr>'}</tbody></table></div>
    <h4>Payments</h4><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>For</th><th>Amount</th><th></th></tr></thead><tbody>${pays.map(p => `<tr><td>${fmtDate(p.date)}</td><td>${esc(p.kind === 'Fee' ? 'Fees' : p.kind)} · ${esc(p.method)}</td><td>${p.kind === 'Refund' ? '−' : ''}${inr(p.amount)}</td><td><button class="btn btn-sm btn-ghost" data-rc="${esc(p.id)}">Receipt</button></td></tr>`).join('') || '<tr><td colspan="4" class="empty">No payments yet.</td></tr>'}</tbody></table></div></div>`, { wide: true, onMount: m => {
    $$('[data-rc]', m).forEach(b => b.onclick = () => hsReceipt([HS.find('payments', b.dataset.rc)]));
    $$('[data-a]', m).forEach(b => b.onclick = () => { const a = b.dataset.a, next = () => { again(); };
      if (a === 'pay') hsCollectModal(r, next);
      if (a === 'edit') hsAdmission(r, next);
      if (a === 'card') hsIdCard(r);
      if (a === 'checkin') { HS.upd('residents', r.id, { status: 'Active', joinDate: todayISO() }); const L = hsMonthLines({ ...r, joinDate: todayISO() }, hsMonth()); if (L.length) hsInvoiceFor(r, hsMonth(), L); closeModal(); toast(`${r.name} has moved in`); hsSync(); next(); }
      if (a === 'notice') openModal(`Notice · ${r.name}`, `<form class="form-grid" id="hs-nt"><label class="field"><span>Notice given on</span><input class="input" type="date" name="on" value="${todayISO()}"></label><label class="field"><span>Last day in the hostel</span><input class="input" type="date" name="last" value="${todayISO(+HS.cfg().noticeDays || 30)}" required></label><label class="field full"><span>Reason (optional)</span><input class="input" name="why" placeholder="Course over, job change…"></label><div class="full" style="display:flex;justify-content:flex-end;gap:10px"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary">Save notice</button></div></form>`, { onMount: mm => $('#hs-nt', mm).onsubmit = e => { e.preventDefault(); const f = e.target; HS.upd('residents', r.id, { status: 'Notice', noticeOn: f.on.value, vacateOn: f.last.value, leaveReason: f.why.value.trim() }); closeModal(); toast(`Notice recorded · leaving ${fmtDate(f.last.value)}`); next(); } });
      if (a === 'move') { const free = hsAllBeds().filter(x => x.state === 'vacant'); openModal(`Change bed · ${r.name}`, `<form class="form-grid" id="hs-mv"><label class="field full"><span>Move to</span><select class="input" name="to" required>${free.map(x => `<option value="${esc(x.room.id)}|${x.bed}">${esc(x.room.number)}-${x.bed} · ${x.room.sharing}-sharing${x.room.ac === 'AC' ? ' AC' : ''} · ${inr(x.room.rent)}</option>`).join('')}</select></label><label class="check full"><input type="checkbox" name="rent" checked> Use the new room's rent from next bill</label><div class="full" style="display:flex;justify-content:flex-end;gap:10px"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" ${free.length ? '' : 'disabled'}>Move</button></div></form>`, { onMount: mm => $('#hs-mv', mm).onsubmit = e => { e.preventDefault(); const [roomId, bed] = e.target.to.value.split('|'), nr = HS.find('rooms', roomId); HS.upd('residents', r.id, { roomId, bed, ...(e.target.rent.checked ? { rent: nr.rent } : {}), moves: [...(r.moves || []), { date: todayISO(), roomId, bed }] }); closeModal(); hsSync(); toast(`Moved to ${nr.number}-${bed}`); next(); } }); }
      if (a === 'vacate') hsVacate(r, next);
    });
  } });
}
function hsVacate(r, after) {
  const due = hsDue(r.id), dep = hsDeposit(r.id);
  openModal(`Vacate & settle · ${r.name}`, `<form class="form-grid" id="hs-vac"><div class="full kpis">${kpi('Dues', inr(due))}${kpi('Deposit held', inr(dep))}</div>
    <label class="field"><span>Leaving on</span><input class="input" type="date" name="date" value="${r.vacateOn && r.vacateOn <= todayISO(7) ? r.vacateOn : todayISO()}" required></label><label class="field"><span>Deductions (damage, cleaning, keys) ₹</span><input class="input" type="number" name="ded" min="0" value="0"></label>
    <label class="field full"><span>Reason for deductions</span><input class="input" name="why"></label><label class="check full"><input type="checkbox" name="final" checked> Bill rent for the days stayed this month if not billed yet</label>
    <label class="field"><span>Refund paid by</span><select class="input" name="method">${HS_PAY.map(m => `<option>${m}</option>`).join('')}</select></label><div class="full card" id="hs-vsum" style="padding:12px"></div>
    <div class="full" style="display:flex;justify-content:flex-end;gap:10px"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-danger">Vacate &amp; settle</button></div></form>`, { onMount: m => {
    const f = $('#hs-vac', m), calc = () => { const extra = f.final.checked && !HS.list('invoices').some(i => i.residentId === r.id && i.month === hsMonth(f.date.value)) ? hsSum(hsMonthLines({ ...r, vacateOn: f.date.value }, hsMonth(f.date.value)), l => l.amount) : 0, owe = due + extra + (+f.ded.value || 0), net = dep - owe; return { extra, owe, net }; };
    const draw = () => { const c = calc(); $('#hs-vsum', m).innerHTML = `<div class="line-item"><span>Dues${c.extra ? ` + this month's rent ${inr(c.extra)}` : ''} + deductions</span><b>${inr(c.owe)}</b></div><div class="line-item"><span>Deposit held</span><b>${inr(dep)}</b></div><div class="line-item"><span><b>${c.net >= 0 ? 'Refund to the resident' : 'Resident still has to pay'}</b></span><b style="font-size:1.2rem">${inr(Math.abs(c.net))}</b></div>`; };
    f.addEventListener('input', draw); draw();
    f.onsubmit = e => { e.preventDefault(); const c = calc(), d = f.date.value, pays = [];
      if (c.extra) hsInvoiceFor(r, hsMonth(d), hsMonthLines({ ...r, vacateOn: d }, hsMonth(d)));
      if (+f.ded.value > 0) hsInvoiceFor(r, hsMonth(d), [{ type: 'Deduction', desc: 'Deductions at check-out' + (f.why.value.trim() ? ' · ' + f.why.value.trim() : ''), amount: +f.ded.value }]);
      const use = Math.min(hsDeposit(r.id), hsDue(r.id)); if (use > 0) pays.push(...hsCollect(r, use, 'From deposit', d, '', 'Adjusted from deposit at check-out'));
      const refund = hsDeposit(r.id); if (refund > 0) pays.push(HS.add('payments', { residentId: r.id, name: r.name, kind: 'Refund', amount: refund, method: f.method.value, date: d, ref: '', note: 'Deposit refund' }, 'HP'));
      HS.upd('residents', r.id, { status: 'Vacated', vacateDate: d, vacatedBy: Auth.user()?.name || '' }); closeModal(); hsSync();
      toast(hsDue(r.id) > 0 ? `${r.name} has left · ${inr(hsDue(r.id))} still to collect` : `${r.name} has left · settled`); after && after(); if (pays.length) hsReceipt(pays); } } });
}
function hsIdCard(r) {
  const h = HS.hostel();
  openModal('ID card · ' + r.name, `${printBar('ID card')}<div class="print-sheet"><section class="copy hs-idcard"><div class="hs-idc"><div class="hs-idc-h"><b>${esc(h.name)}</b><span>${esc(h.type || 'Hostel')} · ${esc(h.city || '')}</span></div><div class="hs-idc-b">${hsAvatar(r)}<div><b>${esc(r.name)}</b><span>Room / bed ${esc(hsBedLabel(r))}</span><span>${esc(r.org || '')}</span><span>Blood group ${esc(r.blood || '—')}</span><span>Emergency ${esc(r.guardianPhone || '')}</span><span class="mono">${esc(r.id)}</span></div></div><div class="hs-idc-f">Valid while resident · If found, call ${esc(h.phone || SITE_CONFIG.phone)}</div></div></section></div>`);
}
function hsResidents(body, again) {
  const filt = Session.get('hsResF') || 'Live', groups = { Live: r => ['Active', 'Notice'].includes(r.status), Reserved: r => r.status === 'Reserved', Notice: r => r.status === 'Notice', Vacated: r => r.status === 'Vacated', All: () => true };
  const R = HS.list('residents');
  body.innerHTML = `<div class="crud-bar"><div class="chips">${Object.keys(groups).map(k => `<button class="chip ${k === filt ? 'on' : ''}" data-f="${k}">${k === 'Live' ? 'Staying now' : k} · ${R.filter(groups[k]).length}</button>`).join('')}</div><span class="spacer"></span><input class="input" type="search" id="hs-rq" placeholder="Search name, phone, room…" style="max-width:260px"><button class="btn btn-primary" id="hs-new">+ New admission</button></div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Resident</th><th>Bed</th><th>College / company</th><th>Joined</th><th>Rent</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>${R.filter(groups[filt]).sort((a, b) => a.name.localeCompare(b.name)).map(r => { const due = hsDue(r.id);
      return `<tr data-text="${esc([r.name, r.phone, hsBedLabel(r), r.org].join(' ').toLowerCase())}"><td><div class="hs-who">${hsAvatar(r)}<div><b>${esc(r.name)}</b><div class="muted small">${esc(r.phone)}</div></div></div></td><td>${esc(hsBedLabel(r))}</td><td class="small">${esc(r.org || '')}<div class="muted">${esc(r.course || '')}</div></td><td>${fmtDate(r.joinDate)}</td><td>${inr(r.rent)}</td><td>${due > 0 ? `<b class="danger-text">${inr(due)}</b>` : '—'}</td><td>${statusChip(r.status === 'Notice' ? 'Notice period' : r.status)}</td><td class="row-actions"><button class="btn btn-sm btn-ghost" data-open="${esc(r.id)}">Open</button>${due > 0 && r.status !== 'Vacated' ? `<button class="btn btn-sm btn-ghost" data-pay="${esc(r.id)}">Collect</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">No residents here.</td></tr>'}</tbody></table></div>`;
  $$('[data-f]', body).forEach(b => b.onclick = () => { Session.set('hsResF', b.dataset.f); again(); });
  $('#hs-new', body).onclick = () => hsAdmission(null, again);
  $('#hs-rq', body).oninput = e => { const q = e.target.value.toLowerCase(); $$('tbody tr[data-text]', body).forEach(tr => tr.hidden = !tr.dataset.text.includes(q)); };
  $$('[data-open]', body).forEach(b => b.onclick = () => hsProfile(hsRes(b.dataset.open), again));
  $$('[data-pay]', body).forEach(b => b.onclick = () => hsCollectModal(hsRes(b.dataset.pay), again));
}
