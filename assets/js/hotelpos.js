/* Hotel logins by property and job, the waiter portal, the kitchen / bar display and the billing counter.
   Loaded after hotelcrm.js; these screens are tabs of the Hotel CRM. */
'use strict';

/* job → [label, CRM tabs it may open] ('*' = every tab) */
const HC_LEVELS = {
  manager: ['Hotel manager', '*'],
  frontdesk: ['Front desk / reception', ['dash', 'front', 'rooms', 'guests', 'hk', 'bill', 'wifi']],
  cashier: ['Cashier / billing', ['counter', 'waiter', 'bill']],
  waiter: ['Waiter / steward', ['waiter']],
  kitchen: ['Kitchen display', ['kds']],
  bar: ['Bar staff', ['waiter', 'kds', 'bar']],
  housekeeping: ['Housekeeping', ['hk']],
};
/* Which hotel and job the signed-in person has. Group administrators and hotel logins without a hotel see every property. */
function hcAccess() {
  const u = typeof Auth !== 'undefined' ? Auth.user() : null; if (!u) return null;
  if (u.role === 'admin') return { hotelId: '', level: 'manager' };
  if (u.role !== 'hotels') return null;
  const a = Store.get('hc_access').find(x => x.id === u.id) || { hotelId: u.hotelId, level: u.hotelLevel };
  return { hotelId: a.hotelId || '', level: HC_LEVELS[a.level] ? a.level : 'manager' };
}
const hcRestricted = () => { const a = hcAccess(); return !!a && (!!a.hotelId || a.level !== 'manager'); };
function hcRoleLabel(u) { if (!u || u.role !== 'hotels') return ''; const a = hcAccess(); if (!a || (!a.hotelId && a.level === 'manager')) return ''; const h = a.hotelId ? Store.find('hotels', a.hotelId) : null; return HC_LEVELS[a.level][0] + (h ? ' · ' + h.name : ''); }
const hcCanTab = t => { const a = hcAccess(); if (!a) return false; const tabs = HC_LEVELS[a.level][1]; return tabs === '*' || tabs.includes(t); };
/* Keeps the hotel/job of every hotel login where the hotel screens can read it (staff accounts themselves are visible to administrators only). */
function hcSyncAccess() {
  const U = Store.get('staffUsers'), A = Store.get('hc_access');
  U.filter(u => u.role === 'hotels').forEach(u => { const want = { hotelId: u.hotelId || '', level: HC_LEVELS[u.hotelLevel] ? u.hotelLevel : 'manager', name: u.name }, cur = A.find(a => a.id === u.id);
    if (!cur) Store.add('hc_access', { id: u.id, ...want }); else if (cur.hotelId !== want.hotelId || cur.level !== want.level || cur.name !== want.name) Store.update('hc_access', u.id, want); });
  A.filter(a => !U.some(u => u.id === a.id && u.role === 'hotels')).forEach(a => Store.remove('hc_access', a.id));
}

(() => { // sample data for the browser-only demo
  const H = 'HTL301', demo = () => SITE_CONFIG.simulate(), old = SEED.hc_orders, ago = m => new Date(Date.now() - m * 60000).toISOString();
  SEED.hc_access = () => demo() ? [['USR107', 'manager'], ['USR108', 'waiter'], ['USR109', 'kitchen'], ['USR110', 'cashier']].map(([id, level]) => ({ id, hotelId: H, level, sample: true })) : [];
  SEED.hc_bills = () => [];
  SEED.hc_orders = () => { const base = old ? old() : []; if (!demo()) return base; const M = SEED.hc_menu(), B = SEED.hc_bar(), it = (x, qty, gstPct, note = '') => ({ id: x.id, name: x.name, qty, price: +x.price, gstPct, note });
    const mk = (id, dept, table, items, status, mins, extra = {}) => { const sub = items.reduce((s, i) => s + i.price * i.qty, 0), tax = Math.round(items.reduce((s, i) => s + i.price * i.qty * i.gstPct / 100, 0) * 100) / 100; return { id, hotelId: H, dept, table, stayId: '', guestName: '', covers: 2, waiter: 'Suresh', items, sub, tax, total: Math.round(sub + tax), status, createdAt: ago(mins), sample: true, ...extra }; };
    return [...base, mk('KOT51001', 'Restaurant', 'Table 2', [it(M[2], 1, 5), it(M[4], 2, 5, 'Less spicy')], 'Ready', 14), mk('KOT51002', 'Restaurant', 'Table 2', [it(M[9] || M[1], 2, 5)], 'New', 2), mk('KOT51003', 'Restaurant', 'Table 7', [it(M[0], 3, 5), it(M[1], 1, 5, 'No onion')], 'Preparing', 9, { covers: 4 }), mk('KOT51004', 'Restaurant', 'Table 9', [it(M[3], 1, 5), it(M[5] || M[2], 2, 5)], 'Served', 38, { billReq: true }), mk('BAR51005', 'Bar', 'Bar 3', [it(B[0], 2, 18), it(B[4] || B[1], 1, 18)], 'New', 3)]; };
})();

/* ---------- shared helpers ---------- */
const hcOpenOrders = dept => HC.list('orders').filter(o => (!dept || o.dept === dept) && !['Billed', 'Cancelled'].includes(o.status));
const hcMins = o => Math.max(0, Math.round((Date.now() - new Date(o.createdAt)) / 60000));
const hcTables = dept => { const c = HC.cfg(), n = dept === 'Bar' ? +c.barTables || 8 : +c.restTables || 12, base = Array.from({ length: n }, (_, i) => `${dept === 'Bar' ? 'Bar' : 'Table'} ${i + 1}`); return [...base, ...new Set(hcOpenOrders(dept).map(o => o.table).filter(t => !base.includes(t)))]; };
const HC_CARTS = {}; // unsent items per hotel + department + table, kept while the waiter moves between screens
function hcLive(el, again, ms = 20000) { // keep a display fresh while it is on screen
  clearInterval(window.hcLiveTimer); window.hcLiveTimer = setInterval(() => { if (!document.body.contains(el) || $('.modal-back')) { if (!document.body.contains(el)) clearInterval(window.hcLiveTimer); return; }
    if (typeof Remote !== 'undefined' && Remote.on) Remote.refreshIfStale(ms - 2000).then(() => document.body.contains(el) && !$('.modal-back') && again()); else again(); }, ms);
}
const hcOrderChip = s => `<span class="chip ${{ New: 'danger', Preparing: 'warn', Ready: 'green', Served: 'blue' }[s] || ''}">${{ New: 'New', Preparing: 'Cooking', Ready: 'Ready', Served: 'Served' }[s] || esc(s)}</span>`;

/* ---------- Waiter portal: tables → order → send to kitchen / bar ---------- */
function hcWaiter(body, again) {
  const a = hcAccess(), st = Object.assign({ dept: a?.level === 'bar' ? 'Bar' : 'Restaurant', table: '', stayId: '' }, Session.get('hcWaiter') || {}), bar = st.dept === 'Bar', set = p => { Session.set('hcWaiter', Object.assign(st, p)); again(); };
  const items = HC.list(bar ? 'bar' : 'menu'), open = hcOpenOrders(st.dept), inH = HC.list('stays').filter(s => s.status === 'Checked-in'), me = Auth.user()?.name || '';
  const deptBar = `<div class="chips">${['Restaurant', 'Bar'].map(d => `<button class="chip ${d === st.dept ? 'on' : ''}" data-dept="${d}">${d === 'Bar' ? 'Bar' : 'Restaurant'}</button>`).join('')}</div>`;
  if (!st.table) {
    const tile = t => { const O = open.filter(o => o.table === t), ready = O.filter(o => o.status === 'Ready').length, cooking = O.filter(o => ['New', 'Preparing'].includes(o.status)).length, req = O.some(o => o.billReq);
      return `<button class="tbl ${O.length ? 'busy' : ''} ${ready ? 'ready' : ''} ${req ? 'req' : ''}" data-table="${esc(t)}"><b>${esc(t)}</b>${O.length ? `<span>${O.reduce((s, o) => s + o.items.reduce((x, i) => x + i.qty, 0), 0)} items · ${inr(hcSum(O, o => o.total))}</span><span class="tbl-tags">${ready ? `<i class="chip green">${ready} ready to serve</i>` : ''}${cooking ? `<i class="chip warn">${cooking} in ${bar ? 'bar' : 'kitchen'}</i>` : ''}${req ? '<i class="chip blue">Bill asked</i>' : ''}</span>` : '<span>Free</span>'}</button>`; };
    body.innerHTML = `<div class="crm-bar" style="margin-bottom:12px">${deptBar}<div class="chips">${inH.length ? `<label class="field" style="min-width:210px"><span>Room service</span><select class="input" id="w-room"><option value="">Choose a room guest</option>${inH.map(s => `<option value="${s.id}">${esc(hcRoomNo(s.roomId))} · ${esc(s.guestName)}</option>`).join('')}</select></label>` : ''}${a?.level === 'manager' ? `<label class="field" style="width:120px"><span>${bar ? 'Bar' : 'Restaurant'} tables</span><input class="input" type="number" id="w-count" min="1" max="80" value="${bar ? +HC.cfg().barTables || 8 : +HC.cfg().restTables || 12}"></label>` : ''}</div></div>
      <div class="kpis" style="margin-bottom:14px">${kpi('Tables occupied', new Set(open.map(o => o.table)).size, `of ${hcTables(st.dept).length}`)}${kpi('Ready to serve', open.filter(o => o.status === 'Ready').length, '', open.some(o => o.status === 'Ready'))}${kpi(bar ? 'With the bar' : 'In the kitchen', open.filter(o => ['New', 'Preparing'].includes(o.status)).length)}${kpi('Running bills', inr(hcSum(open, o => o.total)))}</div>
      <div class="tbl-grid">${hcTables(st.dept).map(tile).join('')}</div><p class="muted small" style="margin-top:12px">Tap a table to take an order. Green tables have food ready to serve.</p>`;
    $$('[data-dept]', body).forEach(b => b.onclick = () => set({ dept: b.dataset.dept, table: '' }));
    $$('[data-table]', body).forEach(b => b.onclick = () => set({ table: b.dataset.table, stayId: open.find(o => o.table === b.dataset.table)?.stayId || '' }));
    const r = $('#w-room', body); if (r) r.onchange = e => { const s = inH.find(x => x.id === e.target.value); if (s) set({ table: `Room ${hcRoomNo(s.roomId)}`, stayId: s.id }); };
    const c = $('#w-count', body); if (c) c.onchange = e => { const n = Math.min(80, Math.max(1, +e.target.value || 1)); HC.put('settings', 'CFG' + HC.H(), bar ? { barTables: n } : { restTables: n }); again(); };
    hcLive(body.firstElementChild, again); return;
  }
  /* order screen for one table */
  clearInterval(window.hcLiveTimer);
  const key = [HC.H(), st.dept, st.table].join('|'), cart = HC_CARTS[key] || (HC_CARTS[key] = { lines: new Map(), notes: {}, covers: '', name: '' }), mine = open.filter(o => o.table === st.table).sort((x, y) => String(x.createdAt).localeCompare(String(y.createdAt))), stay = inH.find(s => s.id === st.stayId);
  const avail = items.filter(i => bar ? +i.stock > 0 : i.available !== false), cats = [...new Set(avail.map(i => i.category))], cat = cats.includes(st.cat) ? st.cat : '', q = (st.q || '').toLowerCase();
  const shown = avail.filter(i => (!cat || i.category === cat) && (!q || i.name.toLowerCase().includes(q))).sort((x, y) => (y.special ? 1 : 0) - (x.special ? 1 : 0));
  const taxOf = i => bar ? (i.taxPct ?? HC.cfg().barTax) : HC.cfg().foodGst, lines = [...cart.lines.entries()].map(([id, n]) => ({ it: items.find(i => i.id === id), n })).filter(l => l.it), sub = hcSum(lines, l => l.it.price * l.n), tax = hcSum(lines, l => l.it.price * l.n * taxOf(l.it) / 100);
  const soldOut = bar ? [] : items.filter(i => i.available === false);
  body.innerHTML = `<div class="crm-bar" style="margin-bottom:12px"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn btn-outline" id="w-back">← Tables</button><h3 style="margin:0">${esc(st.table)}${stay ? ` · ${esc(stay.guestName)}` : ''}</h3><span class="chip ${bar ? 'blue' : 'green'}">${esc(st.dept)}</span></div>
      <div class="chips"><label class="field" style="width:90px"><span>Guests</span><input class="input" type="number" id="w-covers" min="1" value="${esc(cart.covers || mine[0]?.covers || '')}"></label>${stay ? '' : `<label class="field" style="width:180px"><span>Customer name</span><input class="input" id="w-name" value="${esc(cart.name || mine[0]?.guestName || '')}" placeholder="Optional"></label>`}</div></div>
    <div class="split"><div class="stack"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input class="input" type="search" id="w-q" placeholder="Search ${bar ? 'drinks' : 'dishes'}…" value="${esc(st.q || '')}" style="max-width:240px"><div class="chips"><button class="chip ${cat ? '' : 'on'}" data-cat="">All</button>${cats.map(c => `<button class="chip ${c === cat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
        <div class="pos-grid">${shown.map(i => `<button class="pos-item ${cart.lines.has(i.id) ? 'picked' : ''}" data-item="${i.id}"><b>${esc(i.name)}${i.special ? ' ★' : ''}</b><span>${inr(i.price)}${bar ? ` · ${i.stock} left` : i.veg ? ` · <i class="veg ${i.veg === 'Veg' ? '' : 'non'}"></i>${esc(i.veg)}` : ''}</span>${cart.lines.has(i.id) ? `<em>${cart.lines.get(i.id)}</em>` : ''}</button>`).join('') || `<div class="card empty-state" style="grid-column:1/-1">${items.length ? 'Nothing matches.' : bar ? 'No bar items yet. The manager adds them under Bar → Stock.' : 'No dishes yet. The manager adds them under Restaurant & kitchen → Menu.'}</div>`}</div>
        ${soldOut.length ? `<p class="muted small"><b>Not available today:</b> ${soldOut.map(i => esc(i.name)).join(', ')}</p>` : ''}</div>
      <aside class="card summary-box stack" style="background:var(--surface-2)"><h3>New items</h3>
        ${lines.map(l => `<div class="w-line"><div class="line-item"><span>${esc(l.it.name)}</span><span><button class="btn btn-sm btn-ghost" data-dec="${l.it.id}" aria-label="One less">−</button> <b>${l.n}</b> <button class="btn btn-sm btn-ghost" data-inc="${l.it.id}" aria-label="One more">+</button> ${inr(l.it.price * l.n)}</span></div><input class="input w-note" data-note="${l.it.id}" value="${esc(cart.notes[l.it.id] || '')}" placeholder="Note for the ${bar ? 'bar' : 'kitchen'} (optional)"></div>`).join('') || `<p class="muted">Tap ${bar ? 'drinks' : 'dishes'} to add them.</p>`}
        <button class="btn btn-green btn-block" id="w-send" ${lines.length ? '' : 'disabled'}>Send to ${bar ? 'bar' : 'kitchen'}${lines.length ? ` · ${inr(sub + tax)}` : ''}</button>
        <h4 style="margin-top:6px">Already ordered</h4>
        ${mine.map(o => `<div class="card kot ${o.status.toLowerCase()}" style="padding:10px 12px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span><b class="mono">${esc(o.id)}</b> <span class="muted small">${hcMins(o)} min ago</span></span>${hcOrderChip(o.status)}</div>${o.items.map(i => `<div class="line-item"><span>${i.qty} × ${esc(i.name)}${i.note ? `<div class="muted small">${esc(i.note)}</div>` : ''}</span><span>${inr(i.price * i.qty)}</span></div>`).join('')}
          <div style="display:flex;gap:6px;flex-wrap:wrap">${o.status === 'Ready' ? `<button class="btn btn-sm btn-primary" data-served="${o.id}">Served to guest</button>` : ''}${o.status === 'New' ? `<button class="btn btn-sm btn-danger-ghost" data-void="${o.id}">Cancel</button>` : ''}</div></div>`).join('') || '<p class="muted">Nothing ordered yet.</p>'}
        ${mine.length ? `<div class="line-item total"><span>Running bill (with tax)</span><span>${inr(hcSum(mine, o => o.total))}</span></div><button class="btn btn-outline btn-block" id="w-bill" ${mine.some(o => o.billReq) ? 'disabled' : ''}>${mine.some(o => o.billReq) ? 'Bill requested at the counter' : 'Guest asks for the bill'}</button>` : ''}</aside></div>`;
  const keep = () => { cart.covers = $('#w-covers', body).value; cart.name = $('#w-name', body)?.value || ''; $$('[data-note]', body).forEach(n => cart.notes[n.dataset.note] = n.value); }, redraw = p => { keep(); p ? set(p) : again(); };
  $('#w-back', body).onclick = () => { keep(); set({ table: '', stayId: '', q: '', cat: '' }); };
  $('#w-q', body).onchange = e => redraw({ q: e.target.value });
  $$('[data-cat]', body).forEach(b => b.onclick = () => redraw({ cat: b.dataset.cat }));
  const bump = (id, d) => { const it = items.find(i => i.id === id), n = (cart.lines.get(id) || 0) + d; if (bar && n > +it.stock) return toast(`Only ${it.stock} ${it.unit || ''} of ${it.name} in stock`, 'err'); n > 0 ? cart.lines.set(id, n) : cart.lines.delete(id); redraw(); };
  $$('[data-item]', body).forEach(b => b.onclick = () => bump(b.dataset.item, 1)); $$('[data-inc]', body).forEach(b => b.onclick = () => bump(b.dataset.inc, 1)); $$('[data-dec]', body).forEach(b => b.onclick = () => bump(b.dataset.dec, -1));
  $('#w-send', body).onclick = () => { keep();
    const o = HC.add('orders', { id: genNum(bar ? 'BAR' : 'KOT', 5), dept: st.dept, table: st.table, stayId: stay?.id || '', guestName: stay?.guestName || cart.name, covers: +cart.covers || 0, waiter: me, items: lines.map(l => ({ id: l.it.id, name: l.it.name, qty: l.n, price: +l.it.price, gstPct: taxOf(l.it), note: (cart.notes[l.it.id] || '').trim() })), sub, tax: Math.round(tax * 100) / 100, total: Math.round(sub + tax), status: 'New' });
    if (bar) lines.forEach(l => HC.upd('bar', l.it.id, { stock: +l.it.stock - l.n }));
    cart.lines.clear(); cart.notes = {}; toast(`${o.id} sent to the ${bar ? 'bar' : 'kitchen'} · ${st.table}`); again(); };
  $$('[data-served]', body).forEach(b => b.onclick = () => { HC.upd('orders', b.dataset.served, { status: 'Served', servedAt: hcNow() }); redraw(); });
  $$('[data-void]', body).forEach(b => b.onclick = () => { const o = HC.find('orders', b.dataset.void); confirmBox(`Cancel ${o.id}?`, () => { if (o.dept === 'Bar') o.items.forEach(i => { const it = HC.find('bar', i.id); if (it) HC.upd('bar', it.id, { stock: +it.stock + i.qty }); }); HC.upd('orders', o.id, { status: 'Cancelled' }); redraw(); }, 'Cancel order'); });
  const wb = $('#w-bill', body); if (wb) wb.onclick = () => { mine.forEach(o => HC.upd('orders', o.id, { billReq: true })); toast(`Bill for ${st.table} requested at the billing counter`); redraw(); };
}

/* ---------- Kitchen / bar display (kiosk) ---------- */
function hcKds(body, again) {
  const a = hcAccess(), st = Object.assign({ dept: a?.level === 'bar' ? 'Bar' : 'Restaurant', full: false }, Session.get('hcKds') || {}), bar = st.dept === 'Bar', set = p => { Session.set('hcKds', Object.assign(st, p)); again(); };
  const O = hcOpenOrders(st.dept).filter(o => ['New', 'Preparing', 'Ready'].includes(o.status)).sort((x, y) => String(x.createdAt).localeCompare(String(y.createdAt))), prep = Object.fromEntries(HC.list('menu').map(m => [m.id, +m.prepMin || 15]));
  const late = o => o.status !== 'Ready' && hcMins(o) > Math.max(10, ...o.items.map(i => prep[i.id] || 15)), nxt = { New: ['Preparing', bar ? 'Start' : 'Start cooking'], Preparing: ['Ready', 'Ready'], Ready: ['Served', 'Collected'] };
  const col = (status, title) => { const L = O.filter(o => o.status === status); return `<div class="kds-col ${status.toLowerCase()}"><h3>${title} <span>${L.length}</span></h3>${L.map(o => `<div class="kds-card ${late(o) ? 'late' : ''}"><div class="kds-top"><b>${esc(o.table)}</b><span>${hcMins(o)} min</span></div><div class="kds-meta"><span class="mono">${esc(o.id)}</span>${o.waiter ? ` · ${esc(o.waiter)}` : ''}${o.covers ? ` · ${o.covers} guests` : ''}</div>
      <ul>${o.items.map(i => `<li><b>${i.qty} ×</b> ${esc(i.name)}${i.note ? `<em>${esc(i.note)}</em>` : ''}</li>`).join('')}</ul><button class="btn ${status === 'New' ? 'btn-primary' : status === 'Preparing' ? 'btn-green' : 'btn-outline'} btn-block" data-step="${o.id}">${nxt[status][1]}</button></div>`).join('') || '<p class="kds-none">Nothing here</p>'}</div>`; };
  body.innerHTML = `<div class="kds ${st.full ? 'full' : ''}"><div class="kds-bar"><div class="chips">${a?.level === 'kitchen' ? '' : ['Restaurant', 'Bar'].map(d => `<button class="chip ${d === st.dept ? 'on' : ''}" data-dept="${d}">${d === 'Bar' ? 'Bar' : 'Kitchen'}</button>`).join('')}<b class="kds-title">${esc(HC.hotel()?.name || '')} · ${bar ? 'Bar orders' : 'Kitchen orders'}</b></div>
      <div class="chips"><span class="kds-clock">${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>${bar ? '' : '<button class="btn btn-sm btn-outline" id="k-menu">Dish availability</button>'}<button class="btn btn-sm btn-outline" id="k-full">${st.full ? 'Exit full screen' : 'Full screen'}</button></div></div>
    <div class="kds-cols">${col('New', 'New orders')}${col('Preparing', bar ? 'Being made' : 'Cooking')}${col('Ready', bar ? 'Ready at the counter' : 'Ready to serve')}</div></div>`;
  document.body.classList.toggle('kds-on', !!st.full);
  $$('[data-dept]', body).forEach(b => b.onclick = () => set({ dept: b.dataset.dept }));
  $$('[data-step]', body).forEach(b => b.onclick = () => { const o = HC.find('orders', b.dataset.step); HC.upd('orders', o.id, { status: nxt[o.status][0], [o.status === 'New' ? 'startedAt' : o.status === 'Preparing' ? 'readyAt' : 'servedAt']: hcNow() }); again(); });
  $('#k-full', body).onclick = () => { const on = !st.full; try { on ? document.documentElement.requestFullscreen?.() : document.exitFullscreen?.(); } catch (e) { /* the on-page full screen still works */ } set({ full: on }); };
  const km = $('#k-menu', body); if (km) km.onclick = () => { const draw = m => { $('#k-list', m).innerHTML = HC.list('menu').map(i => `<div class="line-item"><span><i class="veg ${i.veg === 'Veg' ? '' : 'non'}"></i>${esc(i.name)} <span class="muted small">${esc(i.category)}</span></span><button class="btn btn-sm ${i.available === false ? 'btn-danger-ghost' : 'btn-ghost'}" data-av="${i.id}">${i.available === false ? 'Sold out · tap to bring back' : 'Available · tap for sold out'}</button></div>`).join('') || '<p class="muted">No dishes on the menu yet.</p>'; $$('[data-av]', m).forEach(b => b.onclick = () => { const i = HC.find('menu', b.dataset.av); HC.upd('menu', i.id, { available: i.available === false }); draw(m); }); };
    openModal('Dish availability today', '<p class="muted small">Waiters only see dishes that are available.</p><div id="k-list"></div>', { onMount: draw }); };
  hcLive(body.firstElementChild, again, 15000);
}

/* ---------- Billing counter: restaurant and bar bills ---------- */
const hcBillNo = dept => { const pre = dept === 'Bar' ? 'BB' : 'RB', n = HC.list('bills').filter(b => b.dept === dept).reduce((m, b) => Math.max(m, +b.no || 0), 0) + 1; return { no: n, id: `${pre}-${String(n).padStart(5, '0')}` }; };
function hcBillPrint(b) {
  const h = Store.find('hotels', b.hotelId) || HC.hotel() || {}, food = b.dept !== 'Bar', half = Math.round(b.tax * 50) / 100;
  openModal(`Bill ${b.id}`, `${printBar('bill')}<div class="print-sheet"><section class="copy receipt"><div class="rc-head"><b>${esc(h.name || SITE_CONFIG.name)}</b><span>${esc([h.area, h.city].filter(Boolean).join(', '))}</span>${SITE_CONFIG.gstin ? `<span>GSTIN ${esc(SITE_CONFIG.gstin)}</span>` : ''}<span class="rc-kind">${food ? 'RESTAURANT' : 'BAR'} BILL</span></div>
    <div class="rc-meta"><span>Bill no: <b>${esc(b.id)}</b></span><span>${fmtDateTime(b.createdAt)}</span><span>${esc(b.table)}${b.guestName ? ' · ' + esc(b.guestName) : ''}</span><span>${b.waiter ? 'Waiter: ' + esc(b.waiter) : ''}</span></div>
    <table class="rc-items"><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>${b.items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${(+i.price).toLocaleString('en-IN')}</td><td>${(i.price * i.qty).toLocaleString('en-IN')}</td></tr>`).join('')}</table>
    <div class="rc-tot"><div><span>Subtotal</span><span>${inr(b.sub)}</span></div>${b.discount ? `<div><span>Discount</span><span>− ${inr(b.discount)}</span></div>` : ''}${b.service ? `<div><span>Service charge</span><span>${inr(b.service)}</span></div>` : ''}${food ? `<div><span>CGST</span><span>₹${half.toFixed(2)}</span></div><div><span>SGST</span><span>₹${(b.tax - half).toFixed(2)}</span></div>` : `<div><span>Tax</span><span>₹${(+b.tax).toFixed(2)}</span></div>`}<div class="rc-grand"><span>TOTAL</span><span>${inr(b.total)}</span></div><div><span>${b.settled === 'Room' ? 'Posted to room folio' : 'Paid by'}</span><span>${b.settled === 'Room' ? esc(b.table) : esc(b.method || '')}</span></div></div>
    <p class="rc-foot">Cashier: ${esc(b.cashier || '')}<br>Thank you. Please visit again.</p></section></div>`);
}
function hcMakeBill(dept, table, after) {
  const O = hcOpenOrders(dept).filter(o => o.table === table), inH = HC.list('stays').filter(s => s.status === 'Checked-in'), map = new Map();
  O.forEach(o => o.items.forEach(i => { const k = i.id + '|' + i.price + '|' + i.gstPct, c = map.get(k); c ? c.qty += i.qty : map.set(k, { ...i, note: '' }); }));
  const items = [...map.values()], sub = hcSum(items, i => i.price * i.qty), tax0 = hcSum(items, i => i.price * i.qty * (i.gstPct || 0) / 100), stayId = O.find(o => o.stayId)?.stayId || '', pending = O.filter(o => ['New', 'Preparing', 'Ready'].includes(o.status)).length;
  openModal(`Bill · ${table} · ${dept}`, `<form id="mb" class="stack">${pending ? `<div class="notice" style="background:var(--warn-soft, #fff4dc)">${pending} order(s) for this table are not served yet. They are included in this bill.</div>` : ''}
    <div class="card" style="background:var(--surface-2)">${items.map(i => `<div class="line-item"><span>${i.qty} × ${esc(i.name)} <span class="muted small">@ ${inr(i.price)}</span></span><span>${inr(i.price * i.qty)}</span></div>`).join('')}<div id="mb-sum"></div></div>
    <div class="form-grid"><label class="field"><span>Discount (₹)</span><input class="input" type="number" name="disc" min="0" max="${sub}" value="0"></label><label class="field"><span>Service charge (%)</span><input class="input" type="number" name="svc" min="0" max="25" step="0.5" value="0"></label>
      <label class="field"><span>Paid by</span><select class="input" name="method">${HC_PAY.slice(0, 3).map(x => `<option>${x}</option>`).join('')}</select></label><label class="field"><span>Or post to a room</span><select class="input" name="stay"><option value="">Not a room guest</option>${inH.map(s => `<option value="${s.id}" ${s.id === stayId ? 'selected' : ''}>${esc(hcRoomNo(s.roomId))} · ${esc(s.guestName)}</option>`).join('')}</select></label></div>
    <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-outline" name="go" value="room">Post to room folio</button><button class="btn btn-green" name="go" value="paid">Paid · print bill</button></div></form>`, { onMount: m => {
      const f = $('#mb', m), calc = () => { const discount = Math.min(sub, +f.disc.value || 0), service = Math.round((sub - discount) * (+f.svc.value || 0)) / 100, taxable = sub - discount + service, tax = Math.round((sub ? tax0 * taxable / sub : 0) * 100) / 100; return { discount, service, tax, total: Math.round(taxable + tax) }; };
      const sum = () => { const c = calc(); $('#mb-sum', m).innerHTML = `<div class="line-item"><span>Subtotal</span><span>${inr(sub)}</span></div>${c.discount ? `<div class="line-item"><span>Discount</span><span>− ${inr(c.discount)}</span></div>` : ''}${c.service ? `<div class="line-item"><span>Service charge</span><span>${inr(c.service)}</span></div>` : ''}<div class="line-item"><span>Tax</span><span>₹${c.tax.toFixed(2)}</span></div><div class="line-item total"><span>Total</span><span>${inr(c.total)}</span></div>`; };
      f.addEventListener('input', sum); sum();
      f.onsubmit = e => { e.preventDefault(); const room = e.submitter?.value === 'room', st = inH.find(s => s.id === f.stay.value), c = calc(); if (room && !st) return toast('Choose the room guest to post this bill to', 'err');
        const n = hcBillNo(dept), b = HC.add('bills', { id: n.id, no: n.no, dept, table: room ? `Room ${hcRoomNo(st.roomId)}` : table, guestName: st?.guestName || O.find(o => o.guestName)?.guestName || '', stayId: room ? st.id : '', orderIds: O.map(o => o.id), waiter: [...new Set(O.map(o => o.waiter).filter(Boolean))].join(', '), items, sub, ...c, method: room ? '' : f.method.value, settled: room ? 'Room' : 'Paid', cashier: Auth.user()?.name || '', date: todayISO() });
        if (room) HC.add('charges', { stayId: st.id, date: todayISO(), dept, desc: `${dept} · ${n.id} · ${items.map(i => i.qty + '× ' + i.name).join(', ').slice(0, 80)}`, amount: sub - c.discount + c.service, gstPct: sub - c.discount + c.service ? Math.round(c.tax / (sub - c.discount + c.service) * 1000) / 10 : 0 }, 'CH');
        else HC.add('payments', { stayId: '', date: todayISO(), amount: c.total, method: f.method.value, dept, note: `${n.id} · ${table}` }, 'PY');
        O.forEach(o => HC.upd('orders', o.id, { status: 'Billed', settled: room ? 'Room' : 'Paid', method: room ? '' : f.method.value, billId: n.id }));
        closeModal(); toast(room ? `${n.id} posted to room ${hcRoomNo(st.roomId)}` : `${n.id} paid · ${inr(c.total)}`); after && after(); hcBillPrint(HC.find('bills', n.id)); }; } });
}
function hcCounter(body, again) {
  const st = Object.assign({ day: todayISO() }, Session.get('hcCounter') || {}), open = hcOpenOrders(), B = HC.list('bills'), day = B.filter(b => b.date === st.day).sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt))), groups = new Map();
  open.forEach(o => { const k = o.dept + '|' + o.table; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o); });
  const G = [...groups.entries()].map(([k, O]) => ({ dept: k.split('|')[0], table: O[0].table, O, total: hcSum(O, o => o.total), req: O.some(o => o.billReq), pending: O.filter(o => o.status !== 'Served').length })).sort((x, y) => (y.req ? 1 : 0) - (x.req ? 1 : 0) || x.table.localeCompare(y.table, 'en', { numeric: true }));
  const paid = day.filter(b => b.settled === 'Paid'), by = m => hcSum(paid.filter(b => b.method === m), b => b.total);
  body.innerHTML = `<div class="kpis">${kpi('Tables to bill', G.length, `${G.filter(g => g.req).length} asked for the bill`, G.some(g => g.req))}${kpi('Running amount', inr(hcSum(G, g => g.total)))}${kpi('Restaurant sales', inr(hcSum(day.filter(b => b.dept !== 'Bar'), b => b.total)), fmtDate(st.day))}${kpi('Bar sales', inr(hcSum(day.filter(b => b.dept === 'Bar'), b => b.total)), fmtDate(st.day))}${kpi('Collected', inr(hcSum(paid, b => b.total)), `Cash ${inr(by('Cash'))} · UPI ${inr(by('UPI'))} · Card ${inr(by('Card'))}`)}${kpi('Posted to rooms', inr(hcSum(day.filter(b => b.settled === 'Room'), b => b.total)))}</div>
    <h3 style="margin:18px 0 10px">Tables to bill</h3><div class="table-wrap"><table class="table"><thead><tr><th>Table</th><th>Section</th><th>Orders</th><th>Items</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${G.map((g, i) => `<tr class="${g.req ? 'row-low' : ''}"><td><b>${esc(g.table)}</b>${g.O.find(o => o.guestName) ? `<div class="muted small">${esc(g.O.find(o => o.guestName).guestName)}</div>` : ''}</td><td>${esc(g.dept)}</td><td>${g.O.map(o => `<span class="mono small">${esc(o.id)}</span>`).join('<br>')}</td><td>${g.O.flatMap(o => o.items).map(x => `${x.qty} × ${esc(x.name)}`).join('<br>')}</td><td><b>${inr(g.total)}</b></td><td>${g.req ? '<span class="chip blue">Bill asked</span> ' : ''}${g.pending ? `<span class="chip warn">${g.pending} not served</span>` : '<span class="chip green">All served</span>'}</td><td class="row-actions"><button class="btn btn-sm btn-green" data-bill="${i}">Make bill</button></td></tr>`).join('') || '<tr><td class="empty" colspan="7">No open tables. Orders taken by the waiters appear here.</td></tr>'}</tbody></table></div>
    <div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin:22px 0 10px"><h3 style="margin:0">Bills</h3><label class="field"><span>Date</span><input class="input" type="date" id="c-day" value="${st.day}"></label><button class="btn btn-outline" id="c-sum">Day summary</button></div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Bill no.</th><th>Time</th><th>Table</th><th>Section</th><th>Items</th><th>Total</th><th>Settled</th><th>Cashier</th><th></th></tr></thead><tbody>${day.map(b => `<tr><td class="mono">${esc(b.id)}</td><td>${fmtDateTime(b.createdAt)}</td><td>${esc(b.table)}${b.guestName ? `<div class="muted small">${esc(b.guestName)}</div>` : ''}</td><td>${esc(b.dept)}</td><td>${b.items.reduce((s, i) => s + i.qty, 0)}</td><td><b>${inr(b.total)}</b></td><td>${b.settled === 'Room' ? '<span class="chip blue">Room folio</span>' : `<span class="chip green">${esc(b.method)}</span>`}</td><td>${esc(b.cashier || '')}</td><td class="row-actions"><button class="btn btn-sm btn-ghost" data-print="${b.id}">Print</button></td></tr>`).join('') || '<tr><td class="empty" colspan="9">No bills on this date.</td></tr>'}</tbody></table></div>`;
  $$('[data-bill]', body).forEach(b => b.onclick = () => { const g = G[+b.dataset.bill]; hcMakeBill(g.dept, g.table, again); });
  $$('[data-print]', body).forEach(b => b.onclick = () => hcBillPrint(HC.find('bills', b.dataset.print)));
  $('#c-day', body).onchange = e => { Session.set('hcCounter', { day: e.target.value || todayISO() }); again(); };
  $('#c-sum', body).onclick = () => { const items = new Map(); day.forEach(b => b.items.forEach(i => { const c = items.get(i.name) || { qty: 0, amt: 0, dept: b.dept }; c.qty += i.qty; c.amt += i.qty * i.price; items.set(i.name, c); })); const h = HC.hotel() || {};
    openModal(`Day summary · ${fmtDate(st.day)}`, `${printBar('summary')}<div class="print-sheet"><section class="copy"><header><div class="ph-brand"><b>${esc(h.name || '')}</b><span>${esc([h.area, h.city].filter(Boolean).join(', '))}</span></div><div class="ph-kind"><b>DAY SALES SUMMARY</b><span>${fmtDate(st.day)}</span></div></header>
      <table class="ph-table"><tr><th>Section</th><th>Bills</th><th>Subtotal</th><th>Discount</th><th>Tax</th><th>Total</th></tr>${['Restaurant', 'Bar'].map(d => { const L = day.filter(b => b.dept === d); return `<tr><td>${d}</td><td>${L.length}</td><td>${inr(hcSum(L, b => b.sub))}</td><td>${inr(hcSum(L, b => b.discount))}</td><td>${inr(hcSum(L, b => b.tax))}</td><td>${inr(hcSum(L, b => b.total))}</td></tr>`; }).join('')}<tr><th>Total</th><th>${day.length}</th><th>${inr(hcSum(day, b => b.sub))}</th><th>${inr(hcSum(day, b => b.discount))}</th><th>${inr(hcSum(day, b => b.tax))}</th><th>${inr(hcSum(day, b => b.total))}</th></tr></table>
      <table class="ph-table"><tr><th>Collected by</th><th>Amount</th></tr>${['Cash', 'UPI', 'Card'].map(x => `<tr><td>${x}</td><td>${inr(by(x))}</td></tr>`).join('')}<tr><td>Posted to room folios</td><td>${inr(hcSum(day.filter(b => b.settled === 'Room'), b => b.total))}</td></tr></table>
      <table class="ph-table"><tr><th>Item</th><th>Section</th><th>Qty sold</th><th>Amount</th></tr>${[...items.entries()].sort((x, y) => y[1].amt - x[1].amt).map(([n, c]) => `<tr><td>${esc(n)}</td><td>${esc(c.dept)}</td><td>${c.qty}</td><td>${inr(c.amt)}</td></tr>`).join('') || '<tr><td colspan="4">No sales.</td></tr>'}</table>
      <div class="ph-sign"><div><span>Cashier</span><i></i></div><div><span>Manager</span><i></i></div></div></section></div>`, { wide: true }); };
  hcLive(body.firstElementChild, again, 20000);
}
