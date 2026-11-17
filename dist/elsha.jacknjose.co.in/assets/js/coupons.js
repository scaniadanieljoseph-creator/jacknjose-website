/* Discount coupons for customers: created in the Travels and Hotels portals, applied by customers at checkout
   (bus tickets and hotel rooms) and by staff at the booking counter. The server checks every coupon again. */
'use strict';

const CPN_SALT = 'jjcpn:';
const cpnNorm = c => String(c || '').trim().toUpperCase().replace(/\s+/g, '');
const cpnHash = c => sha256(CPN_SALT + cpnNorm(c));
const cpnAll = () => Store.get('coupons');
const cpnToday = () => todayISO();
const cpnLive = c => c.status === 'Active' && (!c.from || c.from <= cpnToday()) && (!c.to || c.to >= cpnToday());
const cpnFind = code => { const n = cpnNorm(code); if (!n) return null; const h = cpnHash(n); return cpnAll().find(c => cpnNorm(c.code) === n || c.codeHash === h) || null; };
/* Bookings that used a coupon (staff and the browser-only demo can count them; on the live site the server counts for customers). */
const cpnUses = code => { const n = cpnNorm(code); return [...Store.get('busBookings'), ...Store.get('hotelBookings')].filter(b => cpnNorm(b.coupon) === n && b.status !== 'Cancelled'); };
const cpnText = c => c.type === 'flat' ? `${inr(c.value)} off` : `${c.value}% off${+c.maxDiscount ? ` up to ${inr(c.maxDiscount)}` : ''}`;
const cpnFor = c => ({ bus: 'Bus tickets', hotel: 'Hotel rooms', both: 'Bus tickets & hotels' }[c.appliesTo || 'both']);
/* Check a code for one booking. ctx: { kind: 'bus'|'hotel', amount (before GST), from, to, city, phone } */
function cpnCheck(code, ctx) {
  const c = cpnFind(code); if (!cpnNorm(code)) return { msg: 'Enter a coupon code' };
  if (!c || c.status !== 'Active') return { msg: 'This coupon code is not valid' };
  if (c.from && c.from > cpnToday()) return { msg: `This coupon starts on ${fmtDate(c.from)}` };
  if (c.to && c.to < cpnToday()) return { msg: 'This coupon has expired' };
  if ((c.appliesTo || 'both') !== 'both' && c.appliesTo !== ctx.kind) return { msg: `This coupon is only for ${cpnFor(c).toLowerCase()}` };
  if (ctx.kind === 'bus' && (c.routeFrom || c.routeTo) && !((!c.routeFrom || sameCity(c.routeFrom, ctx.from)) && (!c.routeTo || sameCity(c.routeTo, ctx.to)))) return { msg: `This coupon is only for ${c.routeFrom || 'any city'} → ${c.routeTo || 'any city'}` };
  if (ctx.kind === 'hotel' && c.city && !sameCity(c.city, ctx.city)) return { msg: `This coupon is only for hotels in ${c.city}` };
  if (+c.minAmount && ctx.amount < +c.minAmount) return { msg: `Book for ${inr(c.minAmount)} or more to use this coupon` };
  if (c.code) { const U = cpnUses(c.code); if (+c.limit && U.length >= +c.limit) return { msg: 'This coupon has been fully used' };
    const ph = String(ctx.phone || '').replace(/\D/g, '').slice(-10); if (ph.length === 10 && +c.perCustomer && U.filter(b => String(b.phone || '').replace(/\D/g, '').slice(-10) === ph).length >= +c.perCustomer) return { msg: 'You have already used this coupon' }; }
  const raw = c.type === 'flat' ? +c.value : ctx.amount * (+c.value || 0) / 100, discount = Math.min(ctx.amount, Math.round(+c.maxDiscount && c.type !== 'flat' ? Math.min(raw, +c.maxDiscount) : raw));
  return { ok: true, c, code: cpnNorm(code), discount, msg: `${cpnNorm(code)} applied · you save ${inr(discount)}` };
}
/* The coupon box shown at checkout. getCtx() gives the booking details; onChange(result|null) updates the totals. */
function cpnBox(kind) {
  const offers = cpnAll().filter(c => cpnLive(c) && c.show && c.code && ['both', kind].includes(c.appliesTo || 'both'));
  return `<div class="cpn-box"><label class="field" style="flex:1 1 180px"><span>Coupon code</span><input class="input mono" id="cpn-in" autocomplete="off" autocapitalize="characters" placeholder="Have a code?"></label><button type="button" class="btn btn-outline" id="cpn-go">Apply</button>
    <div class="cpn-msg muted small" id="cpn-msg" role="status"></div>${offers.length ? `<div class="cpn-offers">${offers.map(c => `<button type="button" class="cpn-chip" data-cpn="${esc(c.code)}"><b class="mono">${esc(c.code)}</b><span>${esc(cpnText(c))}${c.title ? ' · ' + esc(c.title) : ''}</span></button>`).join('')}</div>` : ''}</div>`;
}
function cpnBind(root, getCtx, onChange) {
  let cur = null; const inp = $('#cpn-in', root), msg = $('#cpn-msg', root), btn = $('#cpn-go', root); if (!inp) return { get: () => null, recheck: () => null };
  const show = (t, ok) => { msg.textContent = t || ''; msg.className = `cpn-msg small ${ok ? 'ok' : t ? 'err' : 'muted'}`; };
  const apply = () => { if (cur) { cur = null; inp.disabled = false; btn.textContent = 'Apply'; show(''); onChange(null); return; }
    const r = cpnCheck(inp.value, getCtx()); if (!r.ok) { show(r.msg, false); return onChange(null); } cur = r; inp.value = r.code; inp.disabled = true; btn.textContent = 'Remove'; show(r.msg, true); onChange(r); };
  btn.onclick = apply; inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
  $$('[data-cpn]', root).forEach(b => b.onclick = () => { if (cur) apply(); inp.value = b.dataset.cpn; apply(); });
  return { get: () => cur, recheck() { if (!cur) return null; const r = cpnCheck(cur.code, getCtx()); if (!r.ok) { cur = null; inp.disabled = false; btn.textContent = 'Apply'; show(r.msg, false); onChange(null); return r; } cur = r; show(r.msg, true); onChange(r); return r; } };
}

/* ---------- Portal: create and track coupons ---------- */
function cpnAdmin(body, again, kind) {
  if (typeof Remote !== 'undefined' && Remote.on && (Remote.apiVersion || 1) < 6) { body.innerHTML = `<div class="card stack"><h3>One update needed on your server</h3><p>Coupons need the latest database program.</p><ol style="padding-left:20px;display:grid;gap:6px"><li>In cPanel → Files, open the <b>api.jacknjose.co.in</b> folder.</li><li>Click <b>Upload</b>, tick <b>Overwrite existing files</b>, and choose the new <b>index.php</b> file.</li><li>Reload this page.</li></ol></div>`; return; }
  const all = cpnAll(), live = all.filter(cpnLive), uses = c => cpnUses(c.code), saved = L => L.reduce((s, b) => s + (+b.discount || 0), 0), sales = L => L.reduce((s, b) => s + (+b.total || 0), 0), U = all.flatMap(uses);
  body.innerHTML = `<div class="kpis" style="margin-bottom:14px">${kpi('Live coupons', live.length, `${all.length} in all`)}${kpi('Times used', U.length)}${kpi('Discount given', inr(saved(U)))}${kpi('Sales with coupons', inr(sales(U)), 'incl. GST')}</div><div id="cp-crud"></div>
    <p class="muted small" style="margin-top:10px">Customers type the code at checkout. Tick “Show on the website” to list the offer on the booking page; leave it unticked for a private code you give to selected customers. The discount comes off the fare before GST.</p>`;
  renderCrud($('#cp-crud', body), { key: 'coupons', single: 'Coupon', plural: 'Coupons', idPrefix: 'CPN', label: r => r.code, rows: () => cpnAll().filter(c => !kind || ['both', kind].includes(c.appliesTo || 'both')),
    defaults: { status: 'Active' },
    fields: [{ name: 'code', label: 'Coupon code', required: true, placeholder: 'e.g. DIWALI200' }, { name: 'title', label: 'Offer name (shown to customers)', placeholder: 'Diwali offer' },
      { name: 'type', label: 'Discount', type: 'select', options: [['pct', 'Percentage (%)'], ['flat', 'Fixed amount (₹)']] }, { name: 'value', label: 'Value (% or ₹)', type: 'number', min: 1, step: 'any', required: true, default: 10 },
      { name: 'maxDiscount', label: 'Maximum discount (₹, for %)', type: 'number', min: 0, default: 0 }, { name: 'minAmount', label: 'Minimum booking amount (₹)', type: 'number', min: 0, default: 0 },
      { name: 'appliesTo', label: 'Use on', type: 'select', options: kind === 'hotel' ? [['hotel', 'Hotel rooms'], ['both', 'Bus tickets & hotels']] : [['bus', 'Bus tickets'], ['both', 'Bus tickets & hotels'], ['hotel', 'Hotel rooms']] },
      ...(kind === 'hotel' ? [{ name: 'city', label: 'Only hotels in city (optional)', list: 'dl-india' }] : [{ name: 'routeFrom', label: 'Only from city (optional)', list: 'dl-india' }, { name: 'routeTo', label: 'Only to city (optional)', list: 'dl-india' }]),
      { name: 'from', label: 'Valid from', type: 'date', default: todayISO() }, { name: 'to', label: 'Valid till', type: 'date', default: todayISO(30) },
      { name: 'limit', label: 'Total uses allowed (0 = no limit)', type: 'number', min: 0, default: 0 }, { name: 'perCustomer', label: 'Uses per mobile number (0 = no limit)', type: 'number', min: 0, default: 1 },
      { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }, { name: 'show', label: 'Show on the website', type: 'checkbox', default: true }],
    validate: (d, row) => { d.code = cpnNorm(d.code); if (!/^[A-Z0-9_-]{3,20}$/.test(d.code)) return 'Code: 3–20 letters or numbers, no spaces';
      if (cpnAll().some(c => cpnNorm(c.code) === d.code && c.id !== row?.id)) return `The code ${d.code} already exists`;
      if (d.type === 'pct' && d.value > 90) return 'A percentage discount can be at most 90%'; if (d.to && d.from && d.to < d.from) return 'Valid till is before Valid from'; return null; },
    columns: [{ label: 'Code', render: r => `<b class="mono">${esc(r.code)}</b><div class="muted small">${esc(r.title || '')}</div>` }, { label: 'Offer', render: r => `${esc(cpnText(r))}${+r.minAmount ? `<div class="muted small">min ${inr(r.minAmount)}</div>` : ''}` },
      { label: 'Use on', render: r => `${esc(cpnFor(r))}<div class="muted small">${esc(r.city || [r.routeFrom, r.routeTo].filter(Boolean).join(' → ') || 'everywhere')}</div>` }, { label: 'Valid', render: r => `${r.from ? fmtDate(r.from) : '—'} – ${r.to ? fmtDate(r.to) : '—'}` },
      { label: 'Used', render: r => { const L = uses(r); return `<b>${L.length}</b>${+r.limit ? ` / ${r.limit}` : ''}<div class="muted small">saved ${inr(saved(L))}</div>`; } }, { label: 'Shown', render: r => r.show ? 'On website' : 'Private' },
      { label: 'Status', render: r => statusChip(r.status !== 'Active' ? 'Inactive' : !r.to || r.to >= cpnToday() ? (r.from > cpnToday() ? 'Scheduled' : 'Active') : 'Expired') }],
    actions: [{ id: 'use', label: 'Bookings', run: r => { const L = uses(r); openModal(`Bookings with ${r.code}`, `<div class="table-wrap"><table class="table"><thead><tr><th>Booking</th><th>For</th><th>Customer</th><th>Discount</th><th>Paid</th><th>Status</th></tr></thead><tbody>${L.map(b => `<tr><td class="mono">${esc(b.id)}</td><td>${b.busId ? `${esc(b.from)} → ${esc(b.to)} · ${fmtDate(b.date)}` : `${esc(b.hotelName || '')} · ${fmtDate(b.checkIn)}`}</td><td>${esc(b.passengers?.[0]?.name || b.guest || '')}<div class="muted small">${esc(b.phone || '')}</div></td><td>${inr(b.discount)}</td><td>${inr(b.total)}</td><td>${statusChip(b.status)}</td></tr>`).join('') || '<tr><td class="empty" colspan="6">Not used yet.</td></tr>'}</tbody></table></div>`, { wide: true }); } },
      { id: 'tg', label: 'On / off', run: (r, rr) => { Store.update('coupons', r.id, { status: r.status === 'Active' ? 'Inactive' : 'Active' }); rr(); } }] });
  const add = $('#cp-crud [data-crud-add]', body); if (add) add.textContent = '+ New coupon';
}

/* ---------- Offers on the bus and hotel pages ---------- */
function cpnOffersHtml(kind) {
  const L = cpnAll().filter(c => cpnLive(c) && c.show && c.code && ['both', kind].includes(c.appliesTo || 'both')); if (!L.length) return '';
  return `<section class="section-tight"><div class="wrap"><div class="cpn-strip">${L.map(c => `<div class="cpn-card"><span class="cpn-off">${esc(cpnText(c))}</span><b>${esc(c.title || 'Special offer')}</b><span class="muted small">${[c.routeFrom || c.routeTo ? `${c.routeFrom || 'Any city'} → ${c.routeTo || 'any city'}` : '', c.city ? 'Hotels in ' + c.city : '', +c.minAmount ? 'Min ' + inr(c.minAmount) : '', c.to ? 'Till ' + fmtDate(c.to) : ''].filter(Boolean).map(esc).join(' · ')}</span><button type="button" class="cpn-code mono" data-copy="${esc(c.code)}" title="Copy code">${esc(c.code)}</button></div>`).join('')}</div></div></section>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-copy]'); if (!b) return; const t = b.dataset.copy; (navigator.clipboard?.writeText(t) || Promise.reject()).then(() => toast(`Code ${t} copied. Use it at checkout.`), () => toast(`Use code ${t} at checkout`)); });

(() => { const demo = () => SITE_CONFIG.simulate(); SEED.coupons = () => demo() ? [
  { id: 'CPN101', code: 'FIRST100', title: 'First trip with us', type: 'flat', value: 100, maxDiscount: 0, minAmount: 500, appliesTo: 'bus', from: todayISO(-5), to: todayISO(60), limit: 0, perCustomer: 1, status: 'Active', show: true, sample: true, createdAt: new Date().toISOString() },
  { id: 'CPN102', code: 'STAY15', title: 'Weekend stays', type: 'pct', value: 15, maxDiscount: 1500, minAmount: 2000, appliesTo: 'hotel', from: todayISO(-5), to: todayISO(30), limit: 100, perCustomer: 2, status: 'Active', show: true, sample: true, createdAt: new Date().toISOString() },
  { id: 'CPN103', code: 'VIP250', title: 'Regular customers', type: 'flat', value: 250, maxDiscount: 0, minAmount: 0, appliesTo: 'both', from: todayISO(-5), to: todayISO(90), limit: 20, perCustomer: 1, status: 'Active', show: false, sample: true, createdAt: new Date().toISOString() }] : []; })();
