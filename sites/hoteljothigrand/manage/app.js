'use strict';
/* Hotel Jothi Grand management: front office CRM, rooms, guests, staff, attendance, payroll and accounts.
   Every change is saved straight to the hotel database through api.php. */

/* ---------------- helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0'), iso = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const nightsBetween = (a, b) => Math.max(1, Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5));
const fmtD = s => s ? new Date(s.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const monthName = m => new Date(m + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const daysIn = m => new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate();
const num = v => Math.round((+v || 0) * 100) / 100;
const inr = v => '₹' + (Math.round(+v || 0)).toLocaleString('en-IN');
const sum = (a, f) => a.reduce((t, x) => t + (+f(x) || 0), 0);
const telLink = p => 'tel:' + String(p || '').replace(/[^\d+]/g, '');
const waLink = p => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 10) d = '91' + d; return 'https://wa.me/' + d; };
const toast = (m, bad) => { const t = $('#toast'); t.textContent = m; t.className = 'toast show' + (bad ? ' err' : ''); clearTimeout(toast.t); toast.t = setTimeout(() => t.className = 'toast', 3200); };
const ICON = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', inbox: '<path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
  bed: '<path d="M3 18V7M3 14h18v4M21 18v-6a3 3 0 0 0-3-3h-8v5"/><circle cx="7" cy="11" r="2"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  id: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17a3.5 3.5 0 0 1 7 0M15 10h3M15 14h3"/>', check: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 13l3 3 5-6M8 2v4M16 2v4"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>', chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
};
const ic = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] || ''}</svg>`;
const chip = (t, c = '') => `<span class="chip ${c}">${esc(t)}</span>`;
const STATUS_C = { Confirmed: 'c-blue', 'Checked-in': 'c-pink', 'Checked-out': 'c-green', Cancelled: 'c-red', 'No-show': 'c-amber', New: 'c-pink', Contacted: 'c-blue', Converted: 'c-green', Closed: '', Active: 'c-green', Inactive: '', Paid: 'c-green', Pending: 'c-amber', Available: 'c-green', Occupied: 'c-pink', Cleaning: 'c-amber', Maintenance: '', Reserved: 'c-blue' };
const st = s => chip(s, STATUS_C[s] || '');

/* ---------------- data ---------------- */
let TOKEN = '', ME = null, DB = {}, ROLES = {};
try { TOKEN = localStorage.getItem('jg_tok') || ''; } catch (e) {}
async function call(action, body = {}) {
  let r;
  try { r = await fetch('api.php', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth': TOKEN }, body: JSON.stringify({ action, ...body }) }); }
  catch (e) { throw new Error('No connection to the server. Check your internet and try again.'); }
  const j = await r.json().catch(() => ({ ok: false, error: 'The server sent an unexpected reply.' }));
  if (r.status === 401 && !['login', 'setup'].includes(action)) { signOut(true); throw new Error(j.error || 'Please sign in again.'); }
  if (!j.ok) throw new Error(j.error || 'Something went wrong.');
  return j;
}
const L = c => DB[c] || [];
const find = (c, id) => L(c).find(x => x.id === id);
function upsert(c, d) { DB[c] = DB[c] || []; const i = DB[c].findIndex(x => x.id === d.id); if (i >= 0) DB[c][i] = d; else DB[c].push(d); return d; }
async function save(c, doc) { const j = await call('save', { collection: c, doc }); return upsert(c, j.doc); }
async function saveMany(c, docs) { const j = await call('saveMany', { collection: c, docs }); j.docs.forEach(d => upsert(c, d)); }
async function remove(c, id) { await call('delete', { collection: c, id }); DB[c] = L(c).filter(x => x.id !== id); }
const PERMS = { frontdesk: { rooms: 'rw', bookings: 'rw', guests: 'rw', enquiries: 'rw', attendance: 'rw', staff: 'r', settings: 'r', income: 'rw' }, accounts: { rooms: 'r', bookings: 'r', guests: 'r', enquiries: 'r', staff: 'rw', attendance: 'rw', payroll: 'rw', expenses: 'rw', income: 'rw', settings: 'r' } };
const isMgr = () => ['admin', 'manager'].includes(ME?.role);
const can = (c, m = 'r') => isMgr() || (PERMS[ME?.role]?.[c] || '').includes(m);

const DEFAULT_SETTINGS = { id: 'hotel', name: 'Hotel Jothi Grand', gstin: '33AFNPJ5789B1ZA', address: '19, Sankra Nagar, Near KCT Tech Park, Thudiyalur Road, Saravanampatti, Coimbatore - 641035', phone: '+91 73040 43384', email: 'hoteljothigrand666@gmail.com',
  gstRate: 5, roomTypes: [{ name: 'Deluxe Room', rate: 2500, max: 3 }, { name: 'Premium Room', rate: 3200, max: 3 }, { name: 'Grand Suite', rate: 4500, max: 4 }],
  depts: ['Front office', 'Housekeeping', 'Kitchen', 'Restaurant', 'Bar', 'Maintenance', 'Security', 'Accounts', 'Management'],
  expenseCats: ['Salary', 'Electricity', 'Water', 'Food & provisions', 'Bar stock', 'Laundry', 'Repairs & maintenance', 'Housekeeping supplies', 'Rent', 'Taxes', 'Marketing', 'Other'],
  pfOn: false, pfRate: 12, esiOn: false, esiRate: 0.75, otRate: 1, payUnmarked: false };
const S = () => ({ ...DEFAULT_SETTINGS, ...(find('settings', 'hotel') || {}) });
const staffName = id => find('staff', id)?.name || id;
const roomNo = id => find('rooms', id)?.number || '';

/* booking money */
function bill(b) {
  const n = nightsBetween(b.ci, b.co), room = n * num(b.rate), gst = num(room * num(b.gstRate ?? S().gstRate) / 100), extras = sum(b.charges || [], c => c.amount), total = num(room + gst + extras), paid = sum(b.payments || [], p => p.amount);
  return { n, room, gst, extras, total, paid, bal: num(total - paid) };
}

/* ---------------- modal and forms ---------------- */
function modal(title, html, onMount) { $('#modal-title').textContent = title; $('#modal-body').innerHTML = html; $('#modal').classList.add('open'); onMount && onMount($('#modal-body')); const f = $('#modal-body input:not([type=hidden]), #modal-body select'); f && f.focus(); }
function closeModal() { $('#modal').classList.remove('open'); $('#modal-body').innerHTML = ''; }
$('#modal-x').onclick = closeModal; $('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
/* fields: {name, label, type, options, required, full, min, step, placeholder} */
function fieldsHTML(fields, v = {}) {
  return fields.map(f => {
    const val = v[f.name] ?? f.value ?? '', req = f.required ? 'required' : '', cls = `f ${f.full ? 'full' : ''}`;
    if (f.type === 'select') return `<label class="${cls}">${esc(f.label)}<select class="in" name="${f.name}" ${req}>${f.blank ? `<option value="">${esc(f.blank)}</option>` : ''}${f.options.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}" ${String(ov) === String(val) ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select></label>`;
    if (f.type === 'textarea') return `<label class="${cls}">${esc(f.label)}<textarea class="in" name="${f.name}" rows="3" ${req}>${esc(val)}</textarea></label>`;
    if (f.type === 'check') return `<label class="${cls}" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="${f.name}" ${val ? 'checked' : ''}> ${esc(f.label)}</label>`;
    return `<label class="${cls}">${esc(f.label)}<input class="in" name="${f.name}" type="${f.type || 'text'}" value="${esc(val)}" ${req} ${f.min != null ? `min="${f.min}"` : ''} ${f.step ? `step="${f.step}"` : ''} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''}></label>`;
  }).join('');
}
function readForm(form, fields) { const o = {}; fields.forEach(f => { const el = form.elements[f.name]; if (!el) return; o[f.name] = f.type === 'check' ? el.checked : f.type === 'number' ? num(el.value) : el.value.trim(); }); return o; }
function formModal(title, fields, values, onSave, extra = '') {
  modal(title, `<form class="form" novalidate>${fieldsHTML(fields, values)}${extra}<div class="acts"><button type="button" class="btn btn-g" data-cancel>Cancel</button><button class="btn btn-p">Save</button></div></form>`, m => {
    const form = $('form', m); $('[data-cancel]', m).onclick = closeModal;
    form.onsubmit = async e => { e.preventDefault(); const bad = fields.find(f => f.required && !String(form.elements[f.name].value).trim()); if (bad) { form.elements[bad.name].focus(); return toast(`Please fill in: ${bad.label}`, 1); }
      const btn = $('button.btn-p', form); btn.disabled = true; try { await onSave(readForm(form, fields), form); closeModal(); render(); } catch (err) { toast(err.message, 1); } finally { btn.disabled = false; } };
  });
}
async function act(fn, ok) { try { await fn(); ok && toast(ok); render(); } catch (e) { toast(e.message, 1); } }
function printDoc(title, body) {
  const w = open('', '_blank'); if (!w) return toast('Allow pop-ups to print', 1);
  const s = S(); w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font:14px/1.5 Arial,sans-serif;color:#111;margin:28px}h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #ccc;padding:7px 9px;text-align:left}th{background:#f3f3f7}.r{text-align:right}.head{display:flex;gap:16px;align-items:center;border-bottom:2px solid #0a1234;padding-bottom:12px;margin-bottom:14px}.head img{width:70px}.muted{color:#555;font-size:12px}.tot td{font-weight:bold}@media print{button{display:none}}</style></head><body>
    <div class="head"><img src="../img/logo-gold-360.png" alt=""><div><h1>${esc(s.name)}</h1><div class="muted">${esc(s.address)}<br>Phone ${esc(s.phone)} · ${esc(s.email)} · GSTIN ${esc(s.gstin)}</div></div></div>${body}<p style="margin-top:30px"><button onclick="print()">Print</button></p></body></html>`);
  w.document.close(); setTimeout(() => w.print(), 400);
}

/* ---------------- sign in ---------------- */
function signOut(expired) { if (TOKEN && !expired) call('logout').catch(() => {}); TOKEN = ''; ME = null; DB = {}; try { localStorage.removeItem('jg_tok'); } catch (e) {} loginView(expired ? 'Your session ended. Please sign in again.' : ''); }
async function loginView(msg = '') {
  let needsSetup = false; try { needsSetup = (await call('status')).needsSetup; } catch (e) { msg = e.message; }
  $('#app').innerHTML = `<div class="login"><form novalidate><img src="../img/logo-gold-light-360.png" alt="Hotel Jothi Grand"><h1>JOTHI GRAND</h1><p>${needsSetup ? 'First time here: create the owner login.' : 'Staff sign in'}</p>
    ${needsSetup ? '<label>Your name<input name="name" autocomplete="name" required></label>' : ''}<label>Username<input name="username" autocomplete="username" autocapitalize="none" required></label>
    <label>Password<input name="password" type="password" autocomplete="${needsSetup ? 'new-password' : 'current-password'}" required></label>${needsSetup ? '<label>Repeat password<input name="password2" type="password" autocomplete="new-password" required></label>' : ''}
    <div class="err" id="err">${esc(msg)}</div><button class="btn btn-p">${needsSetup ? 'Create owner login' : 'Sign in'}</button><p class="small"><a href="../" style="color:#b9c3e6">← Back to the website</a></p></form></div>`;
  const f = $('.login form'); f.username.focus();
  f.onsubmit = async e => { e.preventDefault(); const err = $('#err'), b = $('button', f); err.textContent = '';
    if (needsSetup && f.password.value !== f.password2.value) return err.textContent = 'The two passwords do not match.';
    b.disabled = true;
    try { const j = await call(needsSetup ? 'setup' : 'login', { name: f.name?.value || '', username: f.username.value, password: f.password.value }); TOKEN = j.token; try { localStorage.setItem('jg_tok', TOKEN); } catch (e2) {} await boot(); }
    catch (x) { err.textContent = x.message; } finally { b.disabled = false; } };
}
async function boot() {
  if (!TOKEN) return loginView();
  try { const j = await call('load'); ME = j.user; DB = j.data; ROLES = j.roles; } catch (e) { if (TOKEN) return loginView(e.message); return; }
  if (isMgr() && !find('settings', 'hotel')) { try { await save('settings', { ...DEFAULT_SETTINGS }); } catch (e) {} }
  render();
}

/* ---------------- layout and routing ---------------- */
const PAGES = [
  ['dashboard', 'Dashboard', 'home', () => true], ['bookings', 'Bookings', 'cal', () => can('bookings')], ['enquiries', 'Website enquiries', 'inbox', () => can('enquiries')],
  ['rooms', 'Rooms', 'bed', () => can('rooms')], ['guests', 'Guests', 'users', () => can('guests')], ['staff', 'Staff', 'id', () => can('staff')],
  ['attendance', 'Attendance', 'check', () => can('attendance')], ['payroll', 'Payroll', 'cash', () => can('payroll')], ['accounts', 'Accounts', 'chart', () => can('expenses')], ['settings', 'Settings', 'cog', () => true]];
const route = () => { const r = (location.hash.slice(2) || 'dashboard').split('/')[0]; const p = PAGES.find(x => x[0] === r && x[3]()); return p ? r : 'dashboard'; };
addEventListener('hashchange', () => ME && render());
function render() {
  if (!ME) return;
  const r = route(), page = PAGES.find(p => p[0] === r), newEnq = L('enquiries').filter(e => e.status === 'New').length;
  if (!$('.shell')) $('#app').innerHTML = `<div class="shell"><aside class="side" id="side"><div class="brand"><img src="../img/logo-gold-light-360.png" alt=""><div><b>JOTHI GRAND</b><small>Management</small></div></div><nav id="nav"></nav>
    <div class="me"><b>${esc(ME.name)}</b><span class="muted" style="color:#9aa4c8">${esc(ROLES[ME.role] || ME.role)}</span><br><button class="btn btn-s btn-ghost-w" id="out">Sign out</button></div></aside>
    <div class="main"><div class="top"><div style="display:flex;gap:10px;align-items:center"><button class="icon-btn menu-btn" id="menu" aria-label="Menu">☰</button><h1 id="title"></h1></div><div class="acts" id="top-acts"></div></div><div class="page" id="page"></div></div></div>`;
  $('#nav').innerHTML = PAGES.filter(p => p[3]()).map(([k, l, i]) => `<a href="#/${k}" class="${k === r ? 'on' : ''}">${ic(i)}${l}${k === 'enquiries' && newEnq ? `<span class="cnt">${newEnq}</span>` : ''}</a>`).join('');
  $('#out').onclick = () => signOut(); $('#menu').onclick = () => $('#side').classList.toggle('open'); $$('#nav a').forEach(a => a.onclick = () => $('#side').classList.remove('open'));
  $('#title').textContent = page[1]; $('#top-acts').innerHTML = ''; const el = $('#page');
  ({ dashboard, bookings, enquiries, rooms, guests, staff, attendance, payroll, accounts, settings })[r](el, $('#top-acts'));
}
const topBtn = (acts, label, fn, cls = 'btn-p') => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.onclick = fn; acts.append(b); };
const kpi = (label, value, sub = '') => `<div class="kpi"><small>${esc(label)}</small><b>${value}</b>${sub ? `<i>${sub}</i>` : ''}</div>`;
let STATE = {};

/* ---------------- dashboard ---------------- */
function dashboard(el, acts) {
  const t = iso(), m = t.slice(0, 7), B = L('bookings'), R = L('rooms');
  if (can('bookings', 'w')) topBtn(acts, '+ New booking', () => bookingForm());
  const inHouse = B.filter(b => b.status === 'Checked-in'), arrivals = B.filter(b => b.status === 'Confirmed' && b.ci === t), departures = inHouse.filter(b => b.co <= t);
  const occ = R.length ? Math.round(R.filter(r => r.status === 'Occupied').length / R.length * 100) : 0;
  const present = L('attendance').filter(a => a.date === t && ['P', 'H'].includes(a.status)).length, activeStaff = L('staff').filter(s => s.status !== 'Inactive').length;
  const inc = sum(L('income').filter(i => (i.date || '').startsWith(m)), i => i.amount), exp = sum(L('expenses').filter(x => (x.date || '').startsWith(m)), x => x.amount);
  const newEnq = L('enquiries').filter(e => e.status === 'New');
  const row = b => `<div class="list-row"><div><b>${esc(b.guest)}</b> <span class="muted small">${esc(b.id)}</span><div class="small muted">${esc(b.roomType || '')}${b.room ? ' · Room ' + esc(roomNo(b.room)) : ''} · ${fmtD(b.ci)} → ${fmtD(b.co)}</div></div><a class="btn btn-s btn-g" href="#/bookings">Open</a></div>`;
  el.innerHTML = `<div class="grid g4" style="margin-bottom:16px">${kpi('In-house guests', inHouse.length, `${occ}% rooms occupied`)}${kpi('Arrivals today', arrivals.length, `${departures.length} departures due`)}${can('income') ? kpi('Income this month', inr(inc), `Expenses ${inr(exp)}`) : kpi('Rooms', R.length, `${R.filter(r => r.status === 'Available').length} available`)}${kpi('Staff present today', `${present}/${activeStaff}`, `<a href="#/attendance">Mark attendance</a>`)}</div>
    <div class="grid g3">
      <div class="card"><h3>Arrivals today</h3>${arrivals.map(row).join('') || '<p class="muted">No arrivals expected today.</p>'}</div>
      <div class="card"><h3>Departures due</h3>${departures.map(row).join('') || '<p class="muted">No departures due.</p>'}</div>
      <div class="card"><h3>New website enquiries</h3>${newEnq.slice(0, 6).map(e => `<div class="list-row"><div><b>${esc(e.name)}</b><div class="small muted">${esc(e.room || '')} · ${fmtD(e.ci)}</div></div><a class="btn btn-s btn-p" href="#/enquiries">View</a></div>`).join('') || '<p class="muted">No new enquiries.</p>'}</div>
    </div>
    <div class="card" style="margin-top:16px"><h3>Rooms right now</h3><div class="legend"><span class="Available">Available</span><span class="Occupied">Occupied</span><span class="Reserved">Reserved</span><span class="Cleaning">Cleaning</span><span class="Maintenance">Maintenance</span></div><div class="rooms">${roomTiles()}</div></div>`;
  bindRoomTiles(el);
}

/* ---------------- rooms ---------------- */
function roomTiles() {
  const B = L('bookings');
  return L('rooms').sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true })).map(r => { const g = B.find(b => b.room === r.id && b.status === 'Checked-in');
    return `<button class="room st-${esc(r.status || 'Available')}" data-room="${esc(r.id)}"><div><b>${esc(r.number)}</b><small>${esc(r.type)}</small></div><span class="g">${g ? esc(g.guest) + ' · till ' + fmtD(g.co) : esc(r.status || 'Available')}</span></button>`; }).join('') || '<p class="muted">No rooms yet. Add them on the Rooms page.</p>';
}
function bindRoomTiles(el) {
  $$('[data-room]', el).forEach(b => b.onclick = () => { const r = find('rooms', b.dataset.room); if (!can('rooms', 'w')) return;
    modal(`Room ${r.number}`, `<p class="muted">${esc(r.type)} · Floor ${esc(r.floor || '—')} · ${inr(r.rate)} a night</p><div class="tabs" style="margin-top:12px">${['Available', 'Reserved', 'Cleaning', 'Maintenance', 'Occupied'].map(s => `<button data-s="${s}" class="${r.status === s ? 'on' : ''}">${s}</button>`).join('')}</div>`,
      m => $$('[data-s]', m).forEach(x => x.onclick = () => act(async () => { await save('rooms', { ...r, status: x.dataset.s }); closeModal(); }, `Room ${r.number}: ${x.dataset.s}`))); });
}
function rooms(el, acts) {
  const types = S().roomTypes.map(t => t.name);
  const F = [{ name: 'number', label: 'Room number', required: true }, { name: 'type', label: 'Room type', type: 'select', options: types }, { name: 'floor', label: 'Floor' }, { name: 'rate', label: 'Rate a night (₹)', type: 'number', min: 0 }, { name: 'status', label: 'Status', type: 'select', options: ['Available', 'Reserved', 'Cleaning', 'Maintenance', 'Occupied'] }, { name: 'notes', label: 'Notes', full: true }];
  const edit = r => formModal(r ? `Room ${r.number}` : 'Add room', F, r || { status: 'Available', type: types[0], rate: S().roomTypes[0]?.rate }, async v => { if (L('rooms').some(x => x.number === v.number && x.id !== r?.id)) throw new Error('That room number already exists.'); await save('rooms', { ...(r || {}), ...v }); toast('Room saved'); });
  if (can('rooms', 'w')) { topBtn(acts, '+ Add room', () => edit()); if (isMgr()) topBtn(acts, 'Add many rooms', () => formModal('Add a series of rooms', [{ name: 'from', label: 'First room number', type: 'number', required: true }, { name: 'to', label: 'Last room number', type: 'number', required: true }, { name: 'type', label: 'Room type', type: 'select', options: types }, { name: 'floor', label: 'Floor' }],
    { type: types[0] }, async v => { if (v.to < v.from || v.to - v.from > 60) throw new Error('Choose up to 60 rooms.'); const rate = S().roomTypes.find(t => t.name === v.type)?.rate || 0; let n = 0; for (let k = v.from; k <= v.to; k++) { if (L('rooms').some(x => String(x.number) === String(k))) continue; await save('rooms', { number: String(k), type: v.type, floor: v.floor, rate, status: 'Available' }); n++; } toast(`${n} rooms added`); }), 'btn-g'); }
  el.innerHTML = `<div class="legend"><span class="Available">Available</span><span class="Occupied">Occupied</span><span class="Reserved">Reserved</span><span class="Cleaning">Cleaning</span><span class="Maintenance">Maintenance</span></div><div class="rooms" style="margin-bottom:20px">${roomTiles()}</div>
    <div class="table-wrap"><table><thead><tr><th>Room</th><th>Type</th><th>Floor</th><th class="r">Rate</th><th>Status</th><th></th></tr></thead><tbody>${L('rooms').sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true })).map(r => `<tr><td><b>${esc(r.number)}</b></td><td>${esc(r.type)}</td><td>${esc(r.floor || '')}</td><td class="r">${inr(r.rate)}</td><td>${st(r.status || 'Available')}</td><td><div class="row-acts">${can('rooms', 'w') ? `<button class="btn btn-s btn-g" data-e="${esc(r.id)}">Edit</button>` : ''}${isMgr() ? `<button class="btn btn-s btn-del" data-d="${esc(r.id)}">Delete</button>` : ''}</div></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No rooms yet.</td></tr>'}</tbody></table></div>`;
  bindRoomTiles(el); $$('[data-e]', el).forEach(b => b.onclick = () => edit(find('rooms', b.dataset.e)));
  $$('[data-d]', el).forEach(b => b.onclick = () => confirm('Delete this room?') && act(() => remove('rooms', b.dataset.d), 'Room deleted'));
}

/* ---------------- bookings ---------------- */
async function upsertGuest(v) {
  const phone = (v.phone || '').replace(/\D/g, '').slice(-10); if (!phone) return '';
  const g = L('guests').find(x => (x.phone || '').replace(/\D/g, '').slice(-10) === phone);
  if (g) { if ((v.email && !g.email) || (v.idProof && !g.idProof)) await save('guests', { ...g, email: g.email || v.email, idProof: g.idProof || v.idProof }); return g.id; }
  if (!can('guests', 'w')) return '';
  return (await save('guests', { name: v.guest, phone: v.phone, email: v.email, idProof: v.idProof, address: v.address, city: '', notes: '' })).id;
}
function bookingForm(b, pre = {}) {
  const s = S(), types = s.roomTypes.map(t => t.name), v = b || { ci: iso(), co: addDays(iso(), 1), adults: 2, kids: 0, source: 'Walk-in', status: 'Confirmed', roomType: types[0], rate: s.roomTypes[0]?.rate, payMode: 'Cash', advance: 0, ...pre };
  const roomOpts = [['', 'Assign later'], ...L('rooms').filter(r => r.id === v.room || ['Available', 'Reserved', 'Cleaning'].includes(r.status)).map(r => [r.id, `${r.number} · ${r.type} · ${r.status}`])];
  const F = [{ name: 'guest', label: 'Guest name', required: true }, { name: 'phone', label: 'Mobile', required: true }, { name: 'email', label: 'Email' }, { name: 'idProof', label: 'ID proof (Aadhaar / DL / passport no.)' },
    { name: 'ci', label: 'Check-in', type: 'date', required: true }, { name: 'co', label: 'Check-out', type: 'date', required: true }, { name: 'roomType', label: 'Room type', type: 'select', options: types }, { name: 'room', label: 'Room', type: 'select', options: roomOpts },
    { name: 'adults', label: 'Adults', type: 'number', min: 1 }, { name: 'kids', label: 'Children', type: 'number', min: 0 }, { name: 'rate', label: 'Rate a night (₹, before GST)', type: 'number', min: 0, required: true }, { name: 'source', label: 'Booked through', type: 'select', options: ['Walk-in', 'Phone', 'Website', 'WhatsApp', 'Corporate', 'Travel agent', 'OTA (Booking.com, MakeMyTrip…)'] },
    ...(b ? [] : [{ name: 'advance', label: 'Advance received (₹)', type: 'number', min: 0 }, { name: 'payMode', label: 'Advance paid by', type: 'select', options: ['Cash', 'UPI', 'Card', 'Bank transfer'] }]),
    { name: 'address', label: 'Address', full: true }, { name: 'notes', label: 'Notes / requests', type: 'textarea', full: true }];
  formModal(b ? `Booking ${b.id}` : 'New booking', F, v, async x => {
    if (x.co <= x.ci) throw new Error('Check-out must be after check-in.');
    if (x.room) { const clash = L('bookings').find(o => o.id !== b?.id && o.room === x.room && ['Confirmed', 'Checked-in'].includes(o.status) && o.ci < x.co && x.ci < o.co); if (clash) throw new Error(`Room ${roomNo(x.room)} is already booked by ${clash.guest} (${fmtD(clash.ci)} → ${fmtD(clash.co)}).`); }
    const guestId = await upsertGuest(x), adv = x.advance; delete x.advance;
    const doc = { ...(b || { status: 'Confirmed', charges: [], payments: [], gstRate: s.gstRate }), ...x, guestId };
    if (!b && adv > 0) doc.payments = [{ date: iso(), amount: adv, mode: x.payMode, note: 'Advance' }];
    const saved = await save('bookings', doc);
    if (!b && adv > 0) await save('income', { date: iso(), category: 'Room', amount: adv, mode: x.payMode, ref: saved.id, note: `Advance · ${saved.guest}` });
    if (x.room && saved.status === 'Confirmed') { const r = find('rooms', x.room); if (r && r.status === 'Available' && x.ci === iso()) await save('rooms', { ...r, status: 'Reserved' }); }
    if (pre.enquiryId) { const e = find('enquiries', pre.enquiryId); if (e) await save('enquiries', { ...e, status: 'Converted', bookingId: saved.id }); }
    toast(`Booking ${saved.id} saved`);
  });
  const m = $('#modal-body form'); if (m) { m.roomType.onchange = () => { const t = s.roomTypes.find(t => t.name === m.roomType.value); if (t) m.rate.value = t.rate; }; }
}
function payModal(b, title = 'Record payment', fixed) {
  const bl = bill(b);
  formModal(`${title} · ${b.id}`, [{ name: 'amount', label: 'Amount (₹)', type: 'number', min: 0, required: true }, { name: 'mode', label: 'Paid by', type: 'select', options: ['Cash', 'UPI', 'Card', 'Bank transfer'] }, { name: 'note', label: 'Note', full: true }],
    { amount: fixed ?? Math.max(0, bl.bal), mode: 'Cash' }, async v => { if (v.amount <= 0) throw new Error('Enter an amount.'); await save('bookings', { ...b, payments: [...(b.payments || []), { date: iso(), amount: v.amount, mode: v.mode, note: v.note }] }); await save('income', { date: iso(), category: 'Room', amount: v.amount, mode: v.mode, ref: b.id, note: `${v.note || 'Payment'} · ${b.guest}` }); toast('Payment recorded'); });
}
function invoice(b) {
  const x = bill(b), s = S(), half = num(x.gst / 2), rate = num(b.gstRate ?? s.gstRate);
  printDoc(`Invoice ${b.id}`, `<h2 style="margin:0 0 6px">Tax invoice</h2><table><tr><td><b>Invoice no.</b> INV-${esc(b.id)}<br><b>Date</b> ${fmtD(b.checkedOutAt || iso())}</td><td><b>Guest</b> ${esc(b.guest)}<br>${esc(b.phone)}${b.email ? '<br>' + esc(b.email) : ''}${b.address ? '<br>' + esc(b.address) : ''}</td><td><b>Room</b> ${esc(roomNo(b.room) || '—')} · ${esc(b.roomType)}<br><b>Stay</b> ${fmtD(b.ci)} → ${fmtD(b.co)} (${x.n} night${x.n > 1 ? 's' : ''})<br><b>Guests</b> ${b.adults || 1} adult${b.kids ? `, ${b.kids} child` : ''}</td></tr></table>
    <table><thead><tr><th>Description</th><th class="r">Amount</th></tr></thead><tbody><tr><td>Room charges · ${x.n} × ${inr(b.rate)} (SAC 996311)</td><td class="r">${inr(x.room)}</td></tr><tr><td>CGST ${rate / 2}%</td><td class="r">${inr(half)}</td></tr><tr><td>SGST ${rate / 2}%</td><td class="r">${inr(x.gst - half)}</td></tr>
    ${(b.charges || []).map(c => `<tr><td>${esc(c.desc)} <span class="muted">(${fmtD(c.date)}, tax inclusive)</span></td><td class="r">${inr(c.amount)}</td></tr>`).join('')}
    <tr class="tot"><td>Total</td><td class="r">${inr(x.total)}</td></tr>${(b.payments || []).map(p => `<tr><td>Paid ${fmtD(p.date)} · ${esc(p.mode)}${p.note ? ' · ' + esc(p.note) : ''}</td><td class="r">− ${inr(p.amount)}</td></tr>`).join('')}<tr class="tot"><td>Balance due</td><td class="r">${inr(x.bal)}</td></tr></tbody></table>
    <p class="muted" style="margin-top:18px">Thank you for staying with us. This is a computer-generated invoice.</p>`);
}
function bookings(el, acts) {
  if (can('bookings', 'w')) topBtn(acts, '+ New booking', () => bookingForm());
  const tab = STATE.bkTab || 'Upcoming', q = (STATE.bkQ || '').toLowerCase(), B = L('bookings');
  const groups = { Upcoming: b => b.status === 'Confirmed', 'In-house': b => b.status === 'Checked-in', 'Checked-out': b => b.status === 'Checked-out', Cancelled: b => ['Cancelled', 'No-show'].includes(b.status), All: () => true };
  const rows = B.filter(groups[tab]).filter(b => !q || [b.id, b.guest, b.phone, roomNo(b.room)].join(' ').toLowerCase().includes(q)).sort((a, b) => tab === 'Checked-out' || tab === 'All' ? b.ci.localeCompare(a.ci) : a.ci.localeCompare(b.ci));
  const w = can('bookings', 'w');
  el.innerHTML = `<div class="tabs">${Object.keys(groups).map(k => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${k}<span>${B.filter(groups[k]).length}</span></button>`).join('')}</div>
    <div class="bar"><input class="in grow" id="q" placeholder="Search name, mobile, booking no. or room" value="${esc(STATE.bkQ || '')}" style="max-width:420px"></div>
    <div class="table-wrap"><table><thead><tr><th>Booking</th><th>Guest</th><th>Room</th><th>Stay</th><th class="r">Total</th><th class="r">Balance</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(b => { const x = bill(b);
      return `<tr><td><b>${esc(b.id)}</b><div class="small muted">${esc(b.source || '')}</div></td><td><b>${esc(b.guest)}</b><div class="small"><a href="${telLink(b.phone)}">${esc(b.phone)}</a></div></td><td>${esc(roomNo(b.room) || '—')}<div class="small muted">${esc(b.roomType || '')}</div></td><td class="nowrap">${fmtD(b.ci)} → ${fmtD(b.co)}<div class="small muted">${x.n} night${x.n > 1 ? 's' : ''}</div></td><td class="r">${inr(x.total)}</td><td class="r">${x.bal > 0 ? `<b style="color:var(--red)">${inr(x.bal)}</b>` : inr(0)}</td><td>${st(b.status)}</td>
      <td><div class="row-acts">${w && b.status === 'Confirmed' ? `<button class="btn btn-s btn-ok" data-in="${esc(b.id)}">Check in</button>` : ''}${w && b.status === 'Checked-in' ? `<button class="btn btn-s btn-g" data-chg="${esc(b.id)}">+ Charge</button><button class="btn btn-s btn-ok" data-out="${esc(b.id)}">Check out</button>` : ''}${w && x.bal > 0 && b.status !== 'Cancelled' ? `<button class="btn btn-s btn-g" data-pay="${esc(b.id)}">Payment</button>` : ''}<button class="btn btn-s btn-g" data-inv="${esc(b.id)}">Invoice</button>${w && ['Confirmed', 'Checked-in'].includes(b.status) ? `<button class="btn btn-s btn-g" data-ed="${esc(b.id)}">Edit</button>` : ''}${w && b.status === 'Confirmed' ? `<button class="btn btn-s btn-del" data-cx="${esc(b.id)}">Cancel</button>` : ''}</div></td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">No bookings here.</td></tr>'}</tbody></table></div>`;
  $$('[data-tab]', el).forEach(b => b.onclick = () => { STATE.bkTab = b.dataset.tab; render(); });
  $('#q', el).oninput = e => { STATE.bkQ = e.target.value; clearTimeout(STATE.qt); STATE.qt = setTimeout(() => { render(); const i = $('#q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
  const B_ = id => find('bookings', id);
  $$('[data-ed]', el).forEach(b => b.onclick = () => bookingForm(B_(b.dataset.ed)));
  $$('[data-inv]', el).forEach(b => b.onclick = () => invoice(B_(b.dataset.inv)));
  $$('[data-pay]', el).forEach(b => b.onclick = () => payModal(B_(b.dataset.pay)));
  $$('[data-cx]', el).forEach(b => b.onclick = () => { const k = B_(b.dataset.cx); if (confirm(`Cancel booking ${k.id} for ${k.guest}?`)) act(async () => { await save('bookings', { ...k, status: 'Cancelled' }); const r = find('rooms', k.room); if (r && r.status === 'Reserved') await save('rooms', { ...r, status: 'Available' }); }, 'Booking cancelled'); });
  $$('[data-chg]', el).forEach(b => b.onclick = () => { const k = B_(b.dataset.chg); formModal(`Add charge · ${k.guest}`, [{ name: 'desc', label: 'What for', type: 'select', options: ['Restaurant', 'Freeze Bar', 'Room service', 'Laundry', 'Extra bed', 'Rooftop', 'Cab', 'Other'] }, { name: 'amount', label: 'Amount (₹, tax inclusive)', type: 'number', min: 0, required: true }, { name: 'note', label: 'Details', full: true }], {},
    async v => { await save('bookings', { ...k, charges: [...(k.charges || []), { date: iso(), desc: v.desc + (v.note ? ' · ' + v.note : ''), amount: v.amount }] }); toast('Charge added to the bill'); }); });
  $$('[data-in]', el).forEach(b => b.onclick = () => { const k = B_(b.dataset.in), free = L('rooms').filter(r => r.id === k.room || ['Available', 'Reserved'].includes(r.status));
    formModal(`Check in · ${k.guest}`, [{ name: 'room', label: 'Room', type: 'select', required: true, blank: 'Choose a room', options: free.map(r => [r.id, `${r.number} · ${r.type} · ${r.status}`]) }, { name: 'idProof', label: 'ID proof number', required: true }, { name: 'adults', label: 'Adults', type: 'number', min: 1 }],
      { room: k.room, idProof: k.idProof, adults: k.adults }, async v => { const clash = L('bookings').find(o => o.id !== k.id && o.room === v.room && o.status === 'Checked-in'); if (clash) throw new Error(`Room ${roomNo(v.room)} is occupied by ${clash.guest}.`);
        await save('bookings', { ...k, ...v, status: 'Checked-in', checkedInAt: new Date().toISOString() }); const r = find('rooms', v.room); if (r) await save('rooms', { ...r, status: 'Occupied' }); if (k.room && k.room !== v.room) { const o = find('rooms', k.room); if (o && o.status === 'Reserved') await save('rooms', { ...o, status: 'Available' }); } toast(`${k.guest} checked in to room ${roomNo(v.room)}`); }); });
  $$('[data-out]', el).forEach(b => b.onclick = () => { const k = B_(b.dataset.out), outDay = k.co > iso() && iso() > k.ci ? iso() : k.co, x = bill(k);
    modal(`Check out · ${k.guest}`, `<p>Room ${esc(roomNo(k.room))} · ${fmtD(k.ci)} → ${fmtD(k.co)}</p><div class="card" style="margin:12px 0"><div class="list-row"><span>Room ${x.n} night(s) as booked</span><b>${inr(x.room)}</b></div><div class="list-row"><span>GST</span><b>${inr(x.gst)}</b></div><div class="list-row"><span>Extra charges</span><b>${inr(x.extras)}</b></div><div class="list-row"><span>Paid</span><b>${inr(x.paid)}</b></div><div class="list-row"><span><b>Balance to collect</b></span><b style="font-size:1.2rem">${inr(x.bal)}</b></div><p class="small muted">The bill is recalculated if you change the check-out date below.</p></div>
      <form class="form" id="co-f"><label class="f">Check-out date<input class="in" type="date" name="co" value="${esc(outDay)}"></label><label class="f">Balance paid by<select class="in" name="mode"><option>Cash</option><option>UPI</option><option>Card</option><option>Bank transfer</option></select></label><div class="acts"><button type="button" class="btn btn-g" data-cancel>Cancel</button><button class="btn btn-p">Settle &amp; check out</button></div></form>`,
      m => { $('[data-cancel]', m).onclick = closeModal; $('#co-f', m).onsubmit = e => { e.preventDefault(); const f = e.target; act(async () => {
        const upd = { ...k, co: f.co.value > k.ci ? f.co.value : k.co }, bl = bill(upd);
        if (bl.bal > 0) { upd.payments = [...(upd.payments || []), { date: iso(), amount: bl.bal, mode: f.mode.value, note: 'Settlement at check-out' }]; await save('income', { date: iso(), category: 'Room', amount: bl.bal, mode: f.mode.value, ref: k.id, note: `Check-out · ${k.guest}` }); }
        const done = await save('bookings', { ...upd, status: 'Checked-out', checkedOutAt: new Date().toISOString() }); const r = find('rooms', k.room); if (r) await save('rooms', { ...r, status: 'Cleaning' }); closeModal(); invoice(done); }, `${k.guest} checked out · room set to cleaning`); }; }); });
}

/* ---------------- website enquiries ---------------- */
function enquiries(el) {
  const tab = STATE.enqTab || 'New', E = L('enquiries').sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))), w = can('enquiries', 'w');
  const rows = tab === 'All' ? E : E.filter(e => (e.status || 'New') === tab);
  el.innerHTML = `<p class="muted" style="margin:0 0 14px">Booking requests sent from the hotel website arrive here automatically (and by email).</p><div class="tabs">${['New', 'Contacted', 'Converted', 'Closed', 'All'].map(k => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${k}<span>${k === 'All' ? E.length : E.filter(e => (e.status || 'New') === k).length}</span></button>`).join('')}</div>
    <div class="table-wrap"><table><thead><tr><th>Received</th><th>Guest</th><th>Request</th><th>Dates</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(e => `<tr><td class="nowrap">${esc((e.createdAt || '').slice(0, 16))}<div class="small muted">${esc(e.id)}</div></td><td><b>${esc(e.name)}</b><div class="small"><a href="${telLink(e.phone)}">${esc(e.phone)}</a>${e.email ? ' · ' + esc(e.email) : ''}</div></td><td>${esc(e.room)} · ${esc(e.guests || '')} guest(s)${e.req ? `<div class="small muted">${esc(e.req)}</div>` : ''}</td><td class="nowrap">${fmtD(e.ci)}${e.co ? ' → ' + fmtD(e.co) : ''}</td><td>${st(e.status || 'New')}${e.bookingId ? `<div class="small muted">${esc(e.bookingId)}</div>` : ''}</td>
      <td><div class="row-acts"><a class="btn btn-s btn-g" href="${telLink(e.phone)}">Call</a><a class="btn btn-s btn-g" href="${waLink(e.phone)}" target="_blank" rel="noopener">WhatsApp</a>${w && (e.status || 'New') === 'New' ? `<button class="btn btn-s btn-g" data-st="${esc(e.id)}|Contacted">Contacted</button>` : ''}${w && can('bookings', 'w') && !['Converted', 'Closed'].includes(e.status) ? `<button class="btn btn-s btn-p" data-conv="${esc(e.id)}">Make booking</button><button class="btn btn-s btn-del" data-st="${esc(e.id)}|Closed">Close</button>` : ''}</div></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Nothing here.</td></tr>'}</tbody></table></div>`;
  $$('[data-tab]', el).forEach(b => b.onclick = () => { STATE.enqTab = b.dataset.tab; render(); });
  $$('[data-st]', el).forEach(b => b.onclick = () => { const [id, s] = b.dataset.st.split('|'); act(() => save('enquiries', { ...find('enquiries', id), status: s }), `Marked ${s.toLowerCase()}`); });
  $$('[data-conv]', el).forEach(b => b.onclick = () => { const e = find('enquiries', b.dataset.conv), t = S().roomTypes.find(t => t.name === e.room);
    bookingForm(null, { guest: e.name, phone: e.phone, email: e.email, ci: e.ci >= iso() ? e.ci : iso(), co: e.co && e.co > e.ci ? e.co : addDays(e.ci >= iso() ? e.ci : iso(), 1), roomType: t ? t.name : S().roomTypes[0]?.name, rate: t ? t.rate : S().roomTypes[0]?.rate, adults: +e.guests || 2, source: 'Website', notes: e.req, enquiryId: e.id }); });
}

/* ---------------- guests ---------------- */
function guests(el, acts) {
  const F = [{ name: 'name', label: 'Name', required: true }, { name: 'phone', label: 'Mobile', required: true }, { name: 'email', label: 'Email' }, { name: 'city', label: 'City' }, { name: 'idProof', label: 'ID proof number' }, { name: 'dob', label: 'Birthday', type: 'date' }, { name: 'company', label: 'Company' }, { name: 'vip', label: 'VIP / regular guest', type: 'check' }, { name: 'address', label: 'Address', full: true }, { name: 'notes', label: 'Preferences & notes', type: 'textarea', full: true }];
  const edit = g => formModal(g ? g.name : 'Add guest', F, g || {}, async v => { await save('guests', { ...(g || {}), ...v }); toast('Guest saved'); });
  if (can('guests', 'w')) topBtn(acts, '+ Add guest', () => edit());
  const q = (STATE.gQ || '').toLowerCase(), B = L('bookings');
  const stats = g => { const mine = B.filter(b => b.guestId === g.id || (b.phone && g.phone && b.phone.replace(/\D/g, '').slice(-10) === g.phone.replace(/\D/g, '').slice(-10))); return { stays: mine.filter(b => b.status === 'Checked-out').length, spent: sum(mine, b => sum(b.payments || [], p => p.amount)), last: mine.map(b => b.ci).sort().pop() }; };
  const rows = L('guests').filter(g => !q || [g.name, g.phone, g.email, g.city, g.company].join(' ').toLowerCase().includes(q)).map(g => ({ g, s: stats(g) })).sort((a, b) => String(b.s.last || '').localeCompare(String(a.s.last || '')));
  el.innerHTML = `<div class="bar"><input class="in" id="q" placeholder="Search guests" value="${esc(STATE.gQ || '')}" style="max-width:420px"></div><div class="table-wrap"><table><thead><tr><th>Guest</th><th>Contact</th><th class="r">Stays</th><th class="r">Total paid</th><th>Last visit</th><th></th></tr></thead><tbody>${rows.map(({ g, s }) => `<tr><td><b>${esc(g.name)}</b> ${g.vip ? chip('VIP', 'c-violet') : ''}<div class="small muted">${esc([g.company, g.city].filter(Boolean).join(' · '))}</div></td><td><a href="${telLink(g.phone)}">${esc(g.phone)}</a><div class="small muted">${esc(g.email || '')}</div></td><td class="r">${s.stays}</td><td class="r">${inr(s.spent)}</td><td>${fmtD(s.last)}</td><td><div class="row-acts"><a class="btn btn-s btn-g" href="${waLink(g.phone)}" target="_blank" rel="noopener">WhatsApp</a>${can('bookings', 'w') ? `<button class="btn btn-s btn-g" data-bk="${esc(g.id)}">Book</button>` : ''}${can('guests', 'w') ? `<button class="btn btn-s btn-g" data-e="${esc(g.id)}">Edit</button>` : ''}${isMgr() ? `<button class="btn btn-s btn-del" data-d="${esc(g.id)}">Delete</button>` : ''}</div></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No guests yet. Guests are added automatically when you make a booking.</td></tr>'}</tbody></table></div>`;
  $('#q', el).oninput = e => { STATE.gQ = e.target.value; clearTimeout(STATE.qt); STATE.qt = setTimeout(() => { render(); const i = $('#q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
  $$('[data-e]', el).forEach(b => b.onclick = () => edit(find('guests', b.dataset.e)));
  $$('[data-bk]', el).forEach(b => b.onclick = () => { const g = find('guests', b.dataset.bk); bookingForm(null, { guest: g.name, phone: g.phone, email: g.email, idProof: g.idProof, address: g.address }); });
  $$('[data-d]', el).forEach(b => b.onclick = () => confirm('Delete this guest?') && act(() => remove('guests', b.dataset.d), 'Guest deleted'));
}

/* ---------------- staff ---------------- */
function staff(el, acts) {
  const s = S(), full = can('staff', 'w');
  const F = [{ name: 'name', label: 'Full name', required: true }, { name: 'role', label: 'Designation', required: true, placeholder: 'Receptionist, Chef, Room attendant…' }, { name: 'dept', label: 'Department', type: 'select', options: s.depts }, { name: 'phone', label: 'Mobile', required: true },
    { name: 'salary', label: 'Monthly salary (₹)', type: 'number', min: 0, required: true }, { name: 'joinDate', label: 'Joined on', type: 'date' }, { name: 'shift', label: 'Usual shift', type: 'select', options: ['Morning 6–2', 'General 9–6', 'Evening 2–10', 'Night 10–6', 'Rotating'] }, { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
    { name: 'bank', label: 'Bank account / UPI for salary' }, { name: 'idProof', label: 'Aadhaar / ID number' }, { name: 'pf', label: 'PF applicable', type: 'check' }, { name: 'esi', label: 'ESI applicable', type: 'check' }, { name: 'emergency', label: 'Emergency contact' }, { name: 'dob', label: 'Date of birth', type: 'date' }, { name: 'address', label: 'Address', full: true }];
  const edit = x => formModal(x ? x.name : 'Add staff member', F, x || { status: 'Active', joinDate: iso(), dept: s.depts[0] }, async v => { const d = await save('staff', { ...(x || {}), ...v }); toast(`${d.name} saved as ${d.id}`); });
  if (full) topBtn(acts, '+ Add staff', () => edit());
  const tab = STATE.stTab || 'Active', ST = L('staff').filter(x => tab === 'All' || (x.status || 'Active') === tab).sort((a, b) => a.id.localeCompare(b.id)), mon = iso().slice(0, 7), A = L('attendance').filter(a => a.date.startsWith(mon));
  el.innerHTML = `<div class="tabs">${['Active', 'Inactive', 'All'].map(k => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${k}</button>`).join('')}</div>${full ? `<div class="grid g4" style="margin-bottom:16px">${kpi('Active staff', L('staff').filter(x => x.status !== 'Inactive').length)}${kpi('Monthly salary bill', inr(sum(L('staff').filter(x => x.status !== 'Inactive'), x => x.salary)))}${kpi('Departments', new Set(L('staff').map(x => x.dept)).size)}${kpi('Present today', L('attendance').filter(a => a.date === iso() && ['P', 'H'].includes(a.status)).length)}</div>` : ''}
    <div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Department</th><th>Mobile</th>${full ? '<th class="r">Salary</th><th>Joined</th>' : ''}<th>This month</th><th>Status</th><th></th></tr></thead><tbody>${ST.map(x => { const m = A.filter(a => a.staffId === x.id), c = k => m.filter(a => a.status === k).length;
      return `<tr><td>${esc(x.id)}</td><td><b>${esc(x.name)}</b><div class="small muted">${esc(x.role)}</div></td><td>${esc(x.dept)}</td><td><a href="${telLink(x.phone)}">${esc(x.phone)}</a></td>${full ? `<td class="r">${inr(x.salary)}</td><td>${fmtD(x.joinDate)}</td>` : ''}<td class="small">${c('P')} P · ${c('H')} H · ${c('A')} A · ${c('L')} L</td><td>${st(x.status || 'Active')}</td><td><div class="row-acts">${full ? `<button class="btn btn-s btn-g" data-e="${esc(x.id)}">Edit</button>` : ''}${isMgr() ? `<button class="btn btn-s btn-del" data-d="${esc(x.id)}">Delete</button>` : ''}</div></td></tr>`; }).join('') || `<tr><td colspan="9" class="empty">No staff here yet.</td></tr>`}</tbody></table></div>`;
  $$('[data-tab]', el).forEach(b => b.onclick = () => { STATE.stTab = b.dataset.tab; render(); });
  $$('[data-e]', el).forEach(b => b.onclick = () => edit(find('staff', b.dataset.e)));
  $$('[data-d]', el).forEach(b => b.onclick = () => confirm('Delete this staff member? (Use Inactive to keep their history.)') && act(() => remove('staff', b.dataset.d), 'Deleted'));
}

/* ---------------- attendance ---------------- */
const ATT = { P: 'Present', A: 'Absent', H: 'Half day', L: 'Paid leave', WO: 'Week off' };
function attendance(el, acts) {
  const view = STATE.attView || 'day';
  el.innerHTML = `<div class="tabs"><button data-v="day" class="${view === 'day' ? 'on' : ''}">Daily register</button><button data-v="month" class="${view === 'month' ? 'on' : ''}">Monthly sheet</button></div><div id="av"></div>`;
  $$('[data-v]', el).forEach(b => b.onclick = () => { STATE.attView = b.dataset.v; render(); });
  (view === 'day' ? attDay : attMonth)($('#av', el), acts);
}
function attDay(el, acts) {
  const day = STATE.attDay || iso(), ST = L('staff').filter(s => s.status !== 'Inactive').sort((a, b) => a.id.localeCompare(b.id)), w = can('attendance', 'w');
  const cur = Object.fromEntries(ST.map(s => [s.id, { ...(find('attendance', `${day}_${s.id}`) || { id: `${day}_${s.id}`, date: day, staffId: s.id, status: '', in: '', out: '', ot: 0 }) }]));
  el.innerHTML = `<div class="bar"><label class="f">Date<input class="in" type="date" id="d" value="${day}" max="${iso()}"></label>${w ? '<button class="btn btn-g" id="all-p">Mark everyone present</button><button class="btn btn-p" id="sv">Save attendance</button>' : ''}<span class="muted small grow" style="text-align:right">P present · A absent · H half day · L paid leave · WO week off</span></div>
    <div class="table-wrap"><table><thead><tr><th>Staff</th><th>Attendance</th><th>In</th><th>Out</th><th>OT hrs</th></tr></thead><tbody>${ST.map(s => { const a = cur[s.id];
      return `<tr data-s="${esc(s.id)}"><td><b>${esc(s.name)}</b><div class="small muted">${esc(s.role)} · ${esc(s.shift || '')}</div></td><td><div class="att">${Object.keys(ATT).map(k => `<button type="button" class="${k} ${a.status === k ? 'on' : ''}" data-k="${k}" title="${ATT[k]}" ${w ? '' : 'disabled'}>${k}</button>`).join('')}</div></td><td><input class="in att-in" type="time" data-f="in" value="${esc(a.in || '')}" ${w ? '' : 'disabled'}></td><td><input class="in att-in" type="time" data-f="out" value="${esc(a.out || '')}" ${w ? '' : 'disabled'}></td><td><input class="in att-in" type="number" min="0" step="0.5" data-f="ot" value="${esc(a.ot || '')}" ${w ? '' : 'disabled'} style="width:70px"></td></tr>`; }).join('') || '<tr><td colspan="5" class="empty">Add staff first.</td></tr>'}</tbody></table></div>`;
  $('#d', el).onchange = e => { STATE.attDay = e.target.value || iso(); render(); };
  $$('tr[data-s]', el).forEach(tr => { const a = cur[tr.dataset.s];
    $$('[data-k]', tr).forEach(b => b.onclick = () => { a.status = a.status === b.dataset.k ? '' : b.dataset.k; $$('[data-k]', tr).forEach(x => x.classList.toggle('on', x.dataset.k === a.status)); if (a.status === 'P' && !a.in) { const t = new Date(); a.in = `${pad(t.getHours())}:${pad(t.getMinutes())}`; if (day === iso()) $('[data-f=in]', tr).value = a.in; else a.in = ''; } });
    $$('[data-f]', tr).forEach(i => i.oninput = () => { a[i.dataset.f] = i.dataset.f === 'ot' ? num(i.value) : i.value; }); });
  if (!w) return;
  $('#all-p', el).onclick = () => ST.forEach(s => { if (!cur[s.id].status) { cur[s.id].status = 'P'; $$(`tr[data-s="${s.id}"] [data-k]`, el).forEach(x => x.classList.toggle('on', x.dataset.k === 'P')); } });
  $('#sv', el).onclick = () => { const docs = Object.values(cur).filter(a => a.status || find('attendance', a.id)); if (!docs.length) return toast('Mark at least one person', 1); act(() => saveMany('attendance', docs), `Attendance saved for ${fmtD(day)}`); };
}
function attMonth(el, acts) {
  const mon = STATE.attMon || iso().slice(0, 7), D = daysIn(mon), ST = L('staff').filter(s => s.status !== 'Inactive').sort((a, b) => a.id.localeCompare(b.id)), A = L('attendance').filter(a => a.date.startsWith(mon));
  const get = (sid, d) => A.find(a => a.staffId === sid && a.date === `${mon}-${pad(d)}`)?.status || '';
  const html = `<table class="mgrid"><thead><tr><th>Staff</th>${Array.from({ length: D }, (_, i) => `<th>${i + 1}</th>`).join('')}<th>P</th><th>H</th><th>A</th><th>L</th><th>WO</th><th>OT</th></tr></thead><tbody>${ST.map(s => { const m = A.filter(a => a.staffId === s.id), c = k => m.filter(a => a.status === k).length;
    return `<tr><td><b>${esc(s.name)}</b></td>${Array.from({ length: D }, (_, i) => { const k = get(s.id, i + 1); return `<td class="code-${k}">${k || '·'}</td>`; }).join('')}<td><b>${c('P')}</b></td><td>${c('H')}</td><td>${c('A')}</td><td>${c('L')}</td><td>${c('WO')}</td><td>${sum(m, a => a.ot)}</td></tr>`; }).join('') || `<tr><td colspan="${D + 7}" class="empty">Add staff first.</td></tr>`}</tbody></table>`;
  el.innerHTML = `<div class="bar"><label class="f">Month<input class="in" type="month" id="m" value="${mon}"></label><button class="btn btn-g" id="pr">Print sheet</button></div><div class="table-wrap">${html}</div>`;
  $('#m', el).onchange = e => { STATE.attMon = e.target.value || iso().slice(0, 7); render(); };
  $('#pr', el).onclick = () => printDoc(`Attendance ${monthName(mon)}`, `<h2>Attendance register · ${monthName(mon)}</h2><div style="font-size:11px">${html}</div>`);
}

/* ---------------- payroll ---------------- */
function calcPay(s, mon, old = {}) {
  const set = S(), D = daysIn(mon), A = L('attendance').filter(a => a.staffId === s.id && a.date.startsWith(mon)), c = k => A.filter(a => a.status === k).length;
  const marked = A.filter(a => a.status).length, unmarked = Math.max(0, D - marked);
  let paidDays = c('P') + c('WO') + c('L') + c('H') * .5 + (set.payUnmarked ? unmarked : 0);
  if (s.joinDate && s.joinDate.slice(0, 7) === mon && set.payUnmarked) paidDays -= Math.max(0, +s.joinDate.slice(8, 10) - 1);
  paidDays = Math.max(0, Math.min(D, paidDays));
  const perDay = num(s.salary) / D, gross = Math.round(perDay * paidDays), otHours = sum(A, a => a.ot), otPay = Math.round(perDay / 8 * otHours * num(set.otRate || 1));
  const pf = s.pf && set.pfOn ? Math.round(Math.min(gross, 15000) * num(set.pfRate) / 100) : 0, esi = s.esi && set.esiOn && num(s.salary) <= 21000 ? Math.ceil((gross + otPay) * num(set.esiRate) / 100) : 0;
  const bonus = num(old.bonus), advance = num(old.advance), other = num(old.other);
  return { id: `${mon}_${s.id}`, month: mon, staffId: s.id, name: s.name, role: s.role, salary: num(s.salary), days: D, paidDays, counts: { P: c('P'), H: c('H'), A: c('A'), L: c('L'), WO: c('WO'), unmarked }, gross, otHours, otPay, bonus, advance, pf, esi, other, net: gross + otPay + bonus - advance - pf - esi - other, status: old.status || 'Pending', paidOn: old.paidOn || '', payMode: old.payMode || '' };
}
function payslip(p) {
  printDoc(`Payslip ${p.name} ${p.month}`, `<h2 style="margin:0">Payslip · ${monthName(p.month)}</h2><table><tr><td><b>Employee</b> ${esc(p.name)} (${esc(p.staffId)})<br><b>Designation</b> ${esc(p.role || '')}</td><td><b>Monthly salary</b> ${inr(p.salary)}<br><b>Paid days</b> ${p.paidDays} of ${p.days}<br><span class="muted">${p.counts.P} present · ${p.counts.H} half · ${p.counts.L} leave · ${p.counts.WO} week off · ${p.counts.A} absent</span></td></tr></table>
    <table><thead><tr><th>Earnings</th><th class="r">₹</th><th>Deductions</th><th class="r">₹</th></tr></thead><tbody><tr><td>Salary for paid days</td><td class="r">${inr(p.gross)}</td><td>PF</td><td class="r">${inr(p.pf)}</td></tr><tr><td>Overtime (${p.otHours} hrs)</td><td class="r">${inr(p.otPay)}</td><td>ESI</td><td class="r">${inr(p.esi)}</td></tr><tr><td>Bonus / incentive</td><td class="r">${inr(p.bonus)}</td><td>Advance recovered</td><td class="r">${inr(p.advance)}</td></tr><tr><td></td><td></td><td>Other</td><td class="r">${inr(p.other)}</td></tr>
    <tr class="tot"><td>Total earnings</td><td class="r">${inr(p.gross + p.otPay + p.bonus)}</td><td>Total deductions</td><td class="r">${inr(p.advance + p.pf + p.esi + p.other)}</td></tr><tr class="tot"><td colspan="3">Net pay</td><td class="r">${inr(p.net)}</td></tr></tbody></table>
    <p>${p.status === 'Paid' ? `Paid on ${fmtD(p.paidOn)} by ${esc(p.payMode)}.` : 'Not yet paid.'}</p><p style="margin-top:50px;display:flex;justify-content:space-between"><span>Employee signature</span><span>For ${esc(S().name)}</span></p>`);
}
function payroll(el, acts) {
  const mon = STATE.payMon || iso().slice(0, 7), PR = L('payroll').filter(p => p.month === mon).sort((a, b) => a.staffId.localeCompare(b.staffId)), w = can('payroll', 'w'), set = S();
  if (w) topBtn(acts, PR.length ? 'Recalculate from attendance' : 'Generate payroll', () => act(async () => {
    const docs = L('staff').filter(s => s.status !== 'Inactive' || PR.some(p => p.staffId === s.id)).map(s => { const old = find('payroll', `${mon}_${s.id}`); return old?.status === 'Paid' ? null : calcPay(s, mon, old || {}); }).filter(Boolean);
    if (!docs.length) throw new Error('Add staff first, or everyone is already paid.'); await saveMany('payroll', docs); }, 'Payroll calculated from attendance'));
  const unmarked = sum(PR, p => p.counts?.unmarked);
  el.innerHTML = `<div class="bar"><label class="f">Month<input class="in" type="month" id="m" value="${mon}"></label>${PR.length ? '<button class="btn btn-g" id="reg">Print salary register</button>' : ''}</div>
    <div class="grid g4" style="margin-bottom:16px">${kpi('Staff on payroll', PR.length)}${kpi('Net payable', inr(sum(PR, p => p.net)))}${kpi('Paid', inr(sum(PR.filter(p => p.status === 'Paid'), p => p.net)))}${kpi('Still to pay', inr(sum(PR.filter(p => p.status !== 'Paid'), p => p.net)))}</div>
    ${unmarked && !set.payUnmarked ? `<p class="note" style="margin:0 0 14px">${unmarked} staff-days this month have no attendance marked and are <b>not paid</b>. Mark them on the Attendance page, or switch on “pay unmarked days” in Settings.</p>` : ''}
    <div class="table-wrap"><table><thead><tr><th>Staff</th><th class="r">Salary</th><th>Paid days</th><th class="r">Earned</th><th class="r">OT</th><th class="r">Bonus</th><th class="r">Deductions</th><th class="r">Net pay</th><th>Status</th><th></th></tr></thead><tbody>${PR.map(p => `<tr><td><b>${esc(p.name)}</b><div class="small muted">${esc(p.staffId)}</div></td><td class="r">${inr(p.salary)}</td><td>${p.paidDays}/${p.days}<div class="small muted">${p.counts.P}P ${p.counts.H}H ${p.counts.A}A ${p.counts.L}L ${p.counts.WO}WO${p.counts.unmarked ? ` · ${p.counts.unmarked} unmarked` : ''}</div></td><td class="r">${inr(p.gross)}</td><td class="r">${inr(p.otPay)}</td><td class="r">${inr(p.bonus)}</td><td class="r">${inr(p.advance + p.pf + p.esi + p.other)}</td><td class="r"><b>${inr(p.net)}</b></td><td>${st(p.status)}</td>
      <td><div class="row-acts"><button class="btn btn-s btn-g" data-slip="${esc(p.id)}">Payslip</button>${w && p.status !== 'Paid' ? `<button class="btn btn-s btn-g" data-adj="${esc(p.id)}">Adjust</button><button class="btn btn-s btn-ok" data-pay="${esc(p.id)}">Pay</button>` : ''}</div></td></tr>`).join('') || `<tr><td colspan="10" class="empty">No payroll for ${monthName(mon)} yet.${w ? ' Press “Generate payroll”.' : ''}</td></tr>`}</tbody></table></div>
    <p class="muted small" style="margin-top:12px">Paid days = present + week offs + paid leave + half of each half day. Overtime is paid at ${set.otRate}× the hourly rate (day salary ÷ 8). PF ${set.pfOn ? `${set.pfRate}%` : 'off'} · ESI ${set.esiOn ? `${set.esiRate}%` : 'off'} (change in Settings). Paying a salary records it as an expense.</p>`;
  $('#m', el).onchange = e => { STATE.payMon = e.target.value || iso().slice(0, 7); render(); };
  $$('[data-slip]', el).forEach(b => b.onclick = () => payslip(find('payroll', b.dataset.slip)));
  $$('[data-adj]', el).forEach(b => b.onclick = () => { const p = find('payroll', b.dataset.adj); formModal(`Adjust · ${p.name}`, [{ name: 'bonus', label: 'Bonus / incentive (₹)', type: 'number', min: 0 }, { name: 'advance', label: 'Advance to recover (₹)', type: 'number', min: 0 }, { name: 'other', label: 'Other deductions (₹)', type: 'number', min: 0 }, { name: 'pf', label: 'PF (₹)', type: 'number', min: 0 }, { name: 'esi', label: 'ESI (₹)', type: 'number', min: 0 }, { name: 'note', label: 'Note', full: true }], p,
    async v => { const n = { ...p, ...v }; n.net = n.gross + n.otPay + n.bonus - n.advance - n.pf - n.esi - n.other; await save('payroll', n); toast('Payroll updated'); }); });
  $$('[data-pay]', el).forEach(b => b.onclick = () => { const p = find('payroll', b.dataset.pay); formModal(`Pay salary · ${p.name}`, [{ name: 'payMode', label: 'Paid by', type: 'select', options: ['Bank transfer', 'UPI', 'Cash', 'Cheque'] }, { name: 'paidOn', label: 'Date', type: 'date' }], { payMode: 'Bank transfer', paidOn: iso() },
    async v => { await save('payroll', { ...p, ...v, status: 'Paid' }); if (can('expenses', 'w')) await save('expenses', { date: v.paidOn, category: 'Salary', amount: p.net, paidTo: p.name, mode: v.payMode, note: `Salary ${monthName(p.month)} · ${p.staffId}` }); toast(`${inr(p.net)} paid to ${p.name}`); }); });
  const reg = $('#reg', el); if (reg) reg.onclick = () => printDoc(`Salary register ${monthName(mon)}`, `<h2>Salary register · ${monthName(mon)}</h2><table><thead><tr><th>ID</th><th>Name</th><th>Paid days</th><th class="r">Earned</th><th class="r">OT</th><th class="r">Bonus</th><th class="r">PF</th><th class="r">ESI</th><th class="r">Advance/other</th><th class="r">Net</th><th>Status</th><th>Signature</th></tr></thead><tbody>${PR.map(p => `<tr><td>${esc(p.staffId)}</td><td>${esc(p.name)}</td><td>${p.paidDays}/${p.days}</td><td class="r">${inr(p.gross)}</td><td class="r">${inr(p.otPay)}</td><td class="r">${inr(p.bonus)}</td><td class="r">${inr(p.pf)}</td><td class="r">${inr(p.esi)}</td><td class="r">${inr(p.advance + p.other)}</td><td class="r"><b>${inr(p.net)}</b></td><td>${esc(p.status)}</td><td></td></tr>`).join('')}<tr class="tot"><td colspan="9">Total</td><td class="r">${inr(sum(PR, p => p.net))}</td><td colspan="2"></td></tr></tbody></table>`);
}

/* ---------------- accounts ---------------- */
function accounts(el, acts) {
  const mon = STATE.accMon || iso().slice(0, 7), view = STATE.accView || 'summary', set = S();
  const I = L('income').filter(i => (i.date || '').startsWith(mon)), X = L('expenses').filter(x => (x.date || '').startsWith(mon));
  const EF = [{ name: 'date', label: 'Date', type: 'date', required: true }, { name: 'category', label: 'Category', type: 'select', options: set.expenseCats }, { name: 'amount', label: 'Amount (₹)', type: 'number', min: 0, required: true }, { name: 'paidTo', label: 'Paid to' }, { name: 'mode', label: 'Paid by', type: 'select', options: ['Cash', 'UPI', 'Card', 'Bank transfer', 'Cheque'] }, { name: 'bill', label: 'Bill / invoice no.' }, { name: 'note', label: 'Note', full: true }];
  const IF = [{ name: 'date', label: 'Date', type: 'date', required: true }, { name: 'category', label: 'Category', type: 'select', options: ['Room', 'Restaurant', 'Freeze Bar', 'Rooftop & events', 'Laundry', 'Other'] }, { name: 'amount', label: 'Amount (₹)', type: 'number', min: 0, required: true }, { name: 'mode', label: 'Received by', type: 'select', options: ['Cash', 'UPI', 'Card', 'Bank transfer'] }, { name: 'note', label: 'Note', full: true }];
  if (can('expenses', 'w')) topBtn(acts, '+ Expense', () => formModal('Add expense', EF, { date: iso(), mode: 'Cash', category: set.expenseCats[0] }, async v => { await save('expenses', v); toast('Expense saved'); }));
  if (can('income', 'w')) topBtn(acts, '+ Income', () => formModal('Add income', IF, { date: iso(), mode: 'Cash', category: 'Restaurant' }, async v => { await save('income', v); toast('Income saved'); }), 'btn-g');
  const byCat = (arr) => Object.entries(arr.reduce((o, x) => (o[x.category || 'Other'] = (o[x.category || 'Other'] || 0) + num(x.amount), o), {})).sort((a, b) => b[1] - a[1]);
  const bars = (arr, color) => { const mx = Math.max(1, ...arr.map(a => a[1])); return arr.map(([k, v]) => `<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;font-size:.88rem"><span>${esc(k)}</span><b>${inr(v)}</b></div><div style="height:8px;border-radius:6px;background:#eef0f8;overflow:hidden"><div style="height:100%;width:${v / mx * 100}%;background:${color};border-radius:6px"></div></div></div>`).join('') || '<p class="muted">Nothing yet.</p>'; };
  const ti = sum(I, i => i.amount), tx = sum(X, x => x.amount);
  const table = (rows, kind) => `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>${kind === 'income' ? 'Reference' : 'Paid to'}</th><th>Mode</th><th>Note</th><th class="r">Amount</th><th></th></tr></thead><tbody>${rows.sort((a, b) => b.date.localeCompare(a.date)).map(r => `<tr><td class="nowrap">${fmtD(r.date)}</td><td>${esc(r.category)}</td><td>${esc(kind === 'income' ? r.ref || '' : r.paidTo || '')}</td><td>${esc(r.mode || '')}</td><td class="small">${esc(r.note || '')}${r.bill ? ' · Bill ' + esc(r.bill) : ''}</td><td class="r"><b>${inr(r.amount)}</b></td><td><div class="row-acts">${isMgr() ? `<button class="btn btn-s btn-del" data-d="${kind}|${esc(r.id)}">Delete</button>` : ''}</div></td></tr>`).join('') || '<tr><td colspan="7" class="empty">Nothing recorded this month.</td></tr>'}</tbody></table></div>`;
  const B = L('bookings'), D = daysIn(mon), R = L('rooms').length, roomNights = sum(B.filter(b => !['Cancelled', 'No-show'].includes(b.status)), b => { let n = 0; for (let k = 1; k <= D; k++) { const d = `${mon}-${pad(k)}`; if (b.ci <= d && d < b.co) n++; } return n; });
  el.innerHTML = `<div class="bar"><label class="f">Month<input class="in" type="month" id="m" value="${mon}"></label></div><div class="tabs">${[['summary', 'Summary'], ['income', 'Income'], ['expenses', 'Expenses']].filter(([k]) => k === 'summary' || can(k)).map(([k, l]) => `<button data-v="${k}" class="${k === view ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${view === 'summary' ? `<div class="grid g4" style="margin-bottom:16px">${kpi('Income', inr(ti))}${kpi('Expenses', inr(tx))}${kpi(ti - tx >= 0 ? 'Profit' : 'Loss', inr(Math.abs(ti - tx)))}${kpi('Occupancy', R ? Math.round(roomNights / (R * D) * 100) + '%' : '—', `${roomNights} room-nights sold`)}</div><div class="grid g2"><div class="card"><h3>Income by category</h3>${bars(byCat(I), 'linear-gradient(90deg,#1fbf83,#0f9a66)')}</div><div class="card"><h3>Expenses by category</h3>${bars(byCat(X), 'linear-gradient(90deg,#ff7aae,#e23d7f)')}</div></div>` : view === 'income' ? table(I, 'income') : table(X, 'expenses')}`;
  $('#m', el).onchange = e => { STATE.accMon = e.target.value || iso().slice(0, 7); render(); };
  $$('[data-v]', el).forEach(b => b.onclick = () => { STATE.accView = b.dataset.v; render(); });
  $$('[data-d]', el).forEach(b => b.onclick = () => { const [c, id] = b.dataset.d.split('|'); if (confirm('Delete this entry?')) act(() => remove(c, id), 'Deleted'); });
}

/* ---------------- settings, logins, activity ---------------- */
async function settings(el) {
  const s = S(), mgr = isMgr();
  el.innerHTML = `<div class="grid g2">
    <div class="card"><h3>My login</h3><p class="muted">${esc(ME.name)} · ${esc(ME.username)} · ${esc(ROLES[ME.role] || ME.role)}</p><form class="form" id="pw" style="margin-top:12px"><label class="f">Current password<input class="in" type="password" name="current" autocomplete="current-password" required></label><label class="f">New password (8+ characters)<input class="in" type="password" name="password" autocomplete="new-password" required></label><div class="acts"><button class="btn btn-p">Change password</button></div></form></div>
    ${mgr ? `<div class="card"><h3>Hotel details</h3><form class="form" id="hotel">${fieldsHTML([{ name: 'name', label: 'Hotel name' }, { name: 'gstin', label: 'GSTIN' }, { name: 'phone', label: 'Phone' }, { name: 'email', label: 'Email' }, { name: 'gstRate', label: 'GST on room tariff (%)', type: 'number', min: 0, step: '0.5' }, { name: 'address', label: 'Address', full: true }], s)}<div class="acts"><button class="btn btn-p">Save</button></div></form><p class="muted small" style="margin-top:8px">Rooms up to ₹7,500 a night are usually charged 5% GST. Please confirm the rate with your accountant.</p></div>` : ''}
  </div>
  ${mgr ? `<div class="grid g2" style="margin-top:16px"><div class="card"><h3>Room types &amp; tariff</h3><div id="rt"></div><button class="btn btn-g btn-s" id="rt-add" style="margin-top:10px">+ Add room type</button> <button class="btn btn-p btn-s" id="rt-save" style="margin-top:10px">Save room types</button></div>
    <div class="card"><h3>Payroll rules</h3><form class="form" id="payset">${fieldsHTML([{ name: 'pfOn', label: 'Deduct PF', type: 'check' }, { name: 'pfRate', label: 'PF employee share (%)', type: 'number', step: '0.01' }, { name: 'esiOn', label: 'Deduct ESI (salary up to ₹21,000)', type: 'check' }, { name: 'esiRate', label: 'ESI employee share (%)', type: 'number', step: '0.01' }, { name: 'otRate', label: 'Overtime pay (× hourly rate)', type: 'number', step: '0.25' }, { name: 'payUnmarked', label: 'Pay days with no attendance marked', type: 'check' }], s)}<div class="acts"><button class="btn btn-p">Save</button></div></form></div></div>
  <div class="card" style="margin-top:16px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0">Staff logins</h3><button class="btn btn-p btn-s" id="u-add">+ Add login</button></div><div id="users" class="muted">Loading…</div><p class="muted small" style="margin-top:10px">Owner / Manager: everything. Front desk: bookings, enquiries, rooms, guests and attendance (no salaries). Accounts: staff, attendance, payroll, income and expenses.</p></div>
  <div class="card" style="margin-top:16px"><h3>Recent activity</h3><div id="log" class="muted">Loading…</div></div>` : ''}`;
  $('#pw', el).onsubmit = e => { e.preventDefault(); const f = e.target; act(async () => { await call('password', { current: f.current.value, password: f.password.value }); f.reset(); }, 'Password changed'); };
  if (!mgr) return;
  $('#hotel', el).onsubmit = e => { e.preventDefault(); const v = readForm(e.target, [{ name: 'name' }, { name: 'gstin' }, { name: 'phone' }, { name: 'email' }, { name: 'gstRate', type: 'number' }, { name: 'address' }]); act(() => save('settings', { ...s, ...v }), 'Hotel details saved'); };
  $('#payset', el).onsubmit = e => { e.preventDefault(); const v = readForm(e.target, [{ name: 'pfOn', type: 'check' }, { name: 'pfRate', type: 'number' }, { name: 'esiOn', type: 'check' }, { name: 'esiRate', type: 'number' }, { name: 'otRate', type: 'number' }, { name: 'payUnmarked', type: 'check' }]); act(() => save('settings', { ...s, ...v }), 'Payroll rules saved'); };
  let types = s.roomTypes.map(t => ({ ...t }));
  const drawRT = () => { $('#rt', el).innerHTML = `<table><thead><tr><th>Type</th><th>Rate ₹</th><th>Max guests</th><th></th></tr></thead><tbody>${types.map((t, i) => `<tr><td><input class="in" data-i="${i}" data-k="name" value="${esc(t.name)}"></td><td><input class="in" type="number" min="0" data-i="${i}" data-k="rate" value="${esc(t.rate)}" style="width:110px"></td><td><input class="in" type="number" min="1" data-i="${i}" data-k="max" value="${esc(t.max)}" style="width:80px"></td><td><button class="btn btn-s btn-del" data-x="${i}">×</button></td></tr>`).join('')}</tbody></table>`;
    $$('#rt input', el).forEach(i => i.oninput = () => { types[+i.dataset.i][i.dataset.k] = i.type === 'number' ? num(i.value) : i.value; }); $$('#rt [data-x]', el).forEach(b => b.onclick = () => { types.splice(+b.dataset.x, 1); drawRT(); }); };
  drawRT(); $('#rt-add', el).onclick = () => { types.push({ name: 'New room type', rate: 2000, max: 2 }); drawRT(); };
  $('#rt-save', el).onclick = () => { types = types.filter(t => t.name.trim()); if (!types.length) return toast('Keep at least one room type', 1); act(() => save('settings', { ...S(), roomTypes: types }), 'Room types saved'); };
  const drawUsers = users => { $('#users', el).innerHTML = `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>${users.map(u => `<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.username)}</td><td>${esc(ROLES[u.role] || u.role)}</td><td>${u.active ? chip('Active', 'c-green') : chip('Switched off')}</td><td><div class="row-acts">${u.role === 'admin' && ME.role !== 'admin' ? '' : `<button class="btn btn-s btn-g" data-u="${u.id}">Edit</button>`}</div></td></tr>`).join('')}</tbody></table></div>`;
    $$('[data-u]', el).forEach(b => b.onclick = () => userForm(users.find(u => u.id === +b.dataset.u), drawUsers)); };
  const roleOpts = Object.entries(ROLES).filter(([k]) => k !== 'admin' || ME.role === 'admin');
  const userForm = (u, cb) => formModal(u ? `Login · ${u.username}` : 'Add login', [{ name: 'name', label: 'Name', required: true }, ...(u ? [] : [{ name: 'username', label: 'Username', required: true }]), { name: 'role', label: 'Role', type: 'select', options: roleOpts }, { name: 'password', label: u ? 'New password (leave empty to keep)' : 'Password (8+ characters)', type: 'password', required: !u }, ...(u ? [{ name: 'active', label: 'Login switched on', type: 'check' }] : [])],
    u || { role: 'frontdesk' }, async v => { const j = await call('saveUser', { id: u?.id || 0, ...v, active: u ? v.active : true }); cb(j.users); toast('Login saved'); });
  $('#u-add', el).onclick = () => userForm(null, drawUsers);
  call('users').then(j => drawUsers(j.users)).catch(e => $('#users', el).textContent = e.message);
  call('log').then(j => { $('#log', el).innerHTML = `<div class="table-wrap" style="max-height:340px;overflow:auto"><table><tbody>${j.log.map(l => `<tr><td class="nowrap small">${esc(l.at)}</td><td><b>${esc(l.username)}</b></td><td>${esc(l.action)} ${esc(l.collection || '')} ${esc(l.record || '')}</td><td class="small muted">${esc(l.note || '')}</td></tr>`).join('') || '<tr><td class="empty">No activity yet.</td></tr>'}</tbody></table></div>`; }).catch(e => $('#log', el).textContent = e.message);
}

boot();
