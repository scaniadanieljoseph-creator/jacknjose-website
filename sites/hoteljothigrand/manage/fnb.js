'use strict';
/* Hotel Jothi Grand: restaurant & Freeze Bar (waiter, kitchen / bar display, billing counter, menu, bar stock) and housekeeping.
   Loaded after app.js and uses its helpers ($, L, save, saveMany, call, can, S, STATE, VIEWS…). */

const DEPTS = {
  Restaurant: { label: 'Restaurant', coll: 'menu', station: 'Kitchen', tables: 'restTables', prefix: 'Table', taxKey: 'foodTax', income: 'Restaurant', send: 'Send to kitchen' },
  Bar: { label: 'Freeze Bar', coll: 'bar', station: 'Bar', tables: 'barTables', prefix: 'Bar', taxKey: 'barTax', income: 'Freeze Bar', send: 'Send to bar' },
};
const OPEN = ['New', 'Preparing', 'Ready', 'Served'];
const ORDER_C = { New: 'c-red', Preparing: 'c-amber', Ready: 'c-green', Served: 'c-blue', Billed: '', Cancelled: '' };
const ORDER_L = { New: 'New', Preparing: 'Cooking', Ready: 'Ready', Served: 'Served', Billed: 'Billed', Cancelled: 'Cancelled' };
const ochip = s => chip(ORDER_L[s] || s, ORDER_C[s] || '');
const deptsFor = () => Object.keys(DEPTS).filter(d => can(DEPTS[d].coll) && !(ME.role === 'bar' && d !== 'Bar') && !(ME.role === 'kitchen' && d !== 'Restaurant'));
const openOrders = (dept, table) => L('orders').filter(o => OPEN.includes(o.status) && (!dept || o.dept === dept) && (!table || o.table === table));
const minsAgo = t => Math.max(0, Math.round((Date.now() - new Date(t)) / 60000));
const lineTotals = items => { const sub = sum(items, i => i.price * i.qty), tax = sum(items, i => i.price * i.qty * (+i.tax || 0) / 100); return { sub: num(sub), tax: num(tax) }; };
const inHouse = () => L('bookings').filter(b => b.status === 'Checked-in' && b.room);
const roomLabel = b => `Room ${roomNo(b.room) || '?'}`;
const itemsFor = dept => L(DEPTS[dept].coll).filter(i => dept === 'Bar' ? (i.stock === '' || i.stock == null || +i.stock > 0) && i.available !== false : i.available !== false);
const vegDot = t => t ? `<i class="veg ${t === 'Veg' ? 'v' : t === 'Egg' ? 'e' : 'n'}" title="${esc(t)}"></i>` : '';

/* ---------- receipt and kitchen ticket printing (any printer installed on the computer, including 58 / 80 mm receipt printers) ---------- */
function printTicket(title, html) {
  const paper = S().paper || '80', w = paper === '58' ? '48mm' : paper === '80' ? '72mm' : '180mm', win = open('', '_blank', 'width=420,height=640');
  if (!win) return toast('Allow pop-ups to print', 1);
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{margin:2mm;${paper === 'A4' ? '' : `size:${paper === '58' ? '58mm' : '80mm'} auto`}}body{margin:0;font:600 ${paper === '58' ? 11 : 12.5}px/1.35 "Courier New",monospace;color:#000}.t{width:${w};margin:0 auto}.c{text-align:center}.b{font-weight:800}.big{font-size:1.35em}.row{display:flex;justify-content:space-between;gap:6px}.row span:first-child{flex:1}hr{border:0;border-top:1px dashed #000;margin:5px 0}img{width:46px;margin:0 auto 3px;display:block}.note{font-style:italic;padding-left:12px}@media screen{body{background:#eee;padding:12px}.t{background:#fff;padding:10px}}</style></head><body><div class="t">${html}</div><script>setTimeout(()=>{print();setTimeout(()=>close(),600)},300)<\/script></body></html>`);
  win.document.close();
}
function kotHtml(o) {
  return `<div class="c b big">${o.dept === 'Bar' ? 'BAR ORDER' : 'KITCHEN ORDER'}</div><div class="c b big">${esc(o.table)}</div><hr><div class="row"><span>${esc(o.id)}</span><span>${new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div><div>Waiter: ${esc(o.waiter || '')}${o.covers ? ' · Covers ' + o.covers : ''}</div><hr>
    ${o.items.map(i => `<div class="row b big"><span>${i.qty} × ${esc(i.name)}</span></div>${i.note ? `<div class="note">» ${esc(i.note)}</div>` : ''}`).join('')}<hr><div class="c">${o.items.reduce((t, i) => t + i.qty, 0)} item(s)</div>`;
}
const printKot = o => printTicket(`KOT ${o.id}`, kotHtml(o));
function billHtml(b) {
  const s = S();
  return `<img src="../img/logo-gold-360.png" alt=""><div class="c b big">${esc(s.name)}</div><div class="c">${b.dept === 'Bar' ? 'Freeze Bar' : 'Restaurant'}</div><div class="c">${esc(s.address)}</div><div class="c">Ph ${esc(s.phone)}</div><div class="c">GSTIN ${esc(s.gstin)}</div><hr>
    <div class="row"><span>Bill ${esc(b.id)}</span><span>${new Date(b.createdAt).toLocaleDateString('en-IN')}</span></div><div class="row"><span>${esc(b.table)}</span><span>${new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div>${b.guest ? `<div>Guest: ${esc(b.guest)}</div>` : ''}<hr>
    ${b.items.map(i => `<div>${esc(i.name)}</div><div class="row"><span>&nbsp; ${i.qty} × ${num(i.price)}</span><span>${num(i.price * i.qty).toFixed(2)}</span></div>`).join('')}<hr>
    <div class="row"><span>Subtotal</span><span>${b.sub.toFixed(2)}</span></div>${b.discount ? `<div class="row"><span>Discount</span><span>-${b.discount.toFixed(2)}</span></div>` : ''}${b.service ? `<div class="row"><span>Service charge</span><span>${b.service.toFixed(2)}</span></div>` : ''}
    ${b.tax ? `<div class="row"><span>CGST</span><span>${(b.tax / 2).toFixed(2)}</span></div><div class="row"><span>SGST</span><span>${(b.tax - num(b.tax / 2)).toFixed(2)}</span></div>` : ''}${b.round ? `<div class="row"><span>Round off</span><span>${b.round.toFixed(2)}</span></div>` : ''}
    <hr><div class="row b big"><span>TOTAL</span><span>₹${b.total.toFixed(2)}</span></div><div class="row"><span>Paid by</span><span>${esc(b.payMode === 'Room' ? 'Room ' + (b.roomNo || '') : b.payMode)}</span></div>${b.status === 'Cancelled' ? '<div class="c b big">*** CANCELLED ***</div>' : ''}<hr><div class="c">Thank you! Visit again.</div>`;
}
const printBill = b => printTicket(`Bill ${b.id}`, billHtml(b));

/* ---------- Waiter: tables → order → send ---------- */
function waiter(el, acts) {
  const depts = deptsFor(); if (!depts.length) { el.innerHTML = '<p class="muted">No menu is available for your login.</p>'; return; }
  const dept = depts.includes(STATE.wDept) ? STATE.wDept : depts[0], D = DEPTS[dept];
  if (STATE.wTable) return waiterOrder(el, acts, dept, STATE.wTable);
  const tables = Array.from({ length: +S()[D.tables] || 8 }, (_, i) => `${D.prefix} ${i + 1}`).concat(dept === 'Restaurant' ? ['Takeaway'] : []);
  const tile = (t, sub = '', bookingId = '') => { const O = openOrders(dept, t), tot = sum(O, o => o.sub + o.tax), ready = O.filter(o => o.status === 'Ready').length, first = O.map(o => o.createdAt).sort()[0];
    return `<button class="tbl ${O.length ? 'busy' : ''} ${O.some(o => o.billReq) ? 'billreq' : ''}" data-t="${esc(t)}" data-b="${esc(bookingId)}"><b>${esc(t)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}${O.length ? `<span>${inr(tot)} · ${minsAgo(first)} min</span>${ready ? `<em>${ready} ready</em>` : ''}${O.some(o => o.billReq) ? '<em class="bq">Bill asked</em>' : ''}` : '<span>Free</span>'}</button>`; };
  el.innerHTML = `${depts.length > 1 ? `<div class="tabs">${depts.map(d => `<button data-d="${d}" class="${d === dept ? 'on' : ''}">${DEPTS[d].label}<span>${openOrders(d).length}</span></button>`).join('')}</div>` : ''}
    <div class="tables">${tables.map(t => tile(t)).join('')}</div>
    <h3 style="margin:24px 0 10px;font-size:1rem">Room service · guests in the hotel</h3><div class="tables">${inHouse().map(b => tile(roomLabel(b), b.guest, b.id)).join('') || '<p class="muted">No guests are checked in.</p>'}</div>`;
  $$('[data-d]', el).forEach(b => b.onclick = () => { STATE.wDept = b.dataset.d; render(); });
  $$('[data-t]', el).forEach(b => b.onclick = () => { STATE.wDept = dept; STATE.wTable = b.dataset.t; STATE.wBooking = b.dataset.b; STATE.wCat = ''; STATE.wQ = ''; render(); });
}
function waiterOrder(el, acts, dept, table) {
  const D = DEPTS[dept], key = `${dept}|${table}`, cart = (STATE.carts = STATE.carts || {})[key] = (STATE.carts[key] || []);
  const all = itemsFor(dept), cats = [...new Set(all.map(i => i.category || 'Other'))], cat = cats.includes(STATE.wCat) ? STATE.wCat : '', q = (STATE.wQ || '').toLowerCase();
  const shown = all.filter(i => (!cat || (i.category || 'Other') === cat) && (!q || i.name.toLowerCase().includes(q))).sort((a, b) => a.name.localeCompare(b.name));
  const O = openOrders(dept, table).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), t = lineTotals(cart), sent = sum(O, o => o.sub + o.tax);
  topBtn(acts, '← All tables', () => { STATE.wTable = ''; render(); }, 'btn-g');
  $('#title').textContent = `${table} · ${D.label}`;
  el.innerHTML = `<div class="pos"><div class="pos-menu"><div class="bar" style="margin-bottom:10px"><input class="in" id="wq" placeholder="Search the menu" value="${esc(STATE.wQ || '')}" style="max-width:320px"></div>
      <div class="cats"><button data-c="" class="${!cat ? 'on' : ''}">All</button>${cats.map(c => `<button data-c="${esc(c)}" class="${c === cat ? 'on' : ''}">${esc(c)}</button>`).join('')}</div>
      <div class="items">${shown.map(i => { const inCart = cart.find(c => c.id === i.id); return `<button class="item ${inCart ? 'in' : ''}" data-i="${esc(i.id)}">${vegDot(i.type)}<b>${esc(i.name)}</b><span>${inr(i.price)}${dept === 'Bar' && i.unit ? ` · ${esc(i.unit)}` : ''}</span>${inCart ? `<em>${inCart.qty}</em>` : ''}${dept === 'Bar' && i.stock !== '' && i.stock != null && +i.stock <= (+i.reorder || 0) ? `<small class="low">${i.stock} left</small>` : ''}</button>`; }).join('') || `<p class="muted">${all.length ? 'Nothing matches.' : `No ${dept === 'Bar' ? 'bar items' : 'dishes'} yet. A manager adds them on the ${dept === 'Bar' ? 'Bar & stock' : 'Restaurant menu'} page.`}</p>`}</div></div>
    <div class="pos-cart card"><h3>New order</h3>${cart.length ? cart.map((c, k) => `<div class="cart-row"><div><b>${esc(c.name)}</b><div class="small muted">${inr(c.price)}${c.note ? ` · <i>${esc(c.note)}</i>` : ''}</div></div><div class="qty"><button data-m="${k}">−</button><span>${c.qty}</span><button data-p="${k}">+</button></div><button class="btn btn-s btn-g" data-n="${k}" title="Add a note">✎</button></div>`).join('') : '<p class="muted small">Tap dishes on the left to add them.</p>'}
      ${cart.length ? `<div class="list-row"><span>Covers</span><input class="in" id="cov" type="number" min="1" value="${esc(STATE.wCovers || 2)}" style="width:80px"></div><div class="list-row"><span>Order value</span><b>${inr(t.sub + t.tax)}</b></div><button class="btn btn-p" id="send" style="width:100%;margin-top:8px">${D.send}</button><button class="btn btn-g btn-s" id="clr" style="width:100%;margin-top:6px">Clear</button>` : ''}
      <h3 style="margin-top:20px">Sent for this table ${O.length ? `· ${inr(sent)}` : ''}</h3>${O.map(o => `<div class="sent"><div class="list-row" style="padding:4px 0;border:0"><b>${esc(o.id)}</b>${ochip(o.status)}</div><div class="small">${o.items.map(i => `${i.qty} × ${esc(i.name)}`).join(', ')}</div><div class="small muted">${minsAgo(o.createdAt)} min ago · ${esc(o.waiter || '')}</div>
        <div class="row-acts" style="justify-content:flex-start;margin-top:6px">${o.status === 'Ready' ? `<button class="btn btn-s btn-ok" data-served="${esc(o.id)}">Served</button>` : ''}${o.status === 'New' ? `<button class="btn btn-s btn-del" data-cx="${esc(o.id)}">Cancel</button>` : ''}</div></div>`).join('') || '<p class="muted small">Nothing sent yet.</p>'}
      ${O.length ? `<button class="btn btn-warn" id="billreq" style="width:100%;margin-top:10px">${O.some(o => o.billReq) ? 'Bill already requested' : 'Ask the counter for the bill'}</button>` : ''}</div></div>
    ${cart.length ? `<div class="cart-bar"><button class="btn btn-g" id="see">${cart.reduce((n, c) => n + c.qty, 0)} item(s) · ${inr(t.sub + t.tax)}</button><button class="btn btn-p" id="send2">${D.send}</button></div>` : ''}`;
  const keep = () => { const i = $('#wq'); if (i && document.activeElement !== i) return; };
  $('#wq', el).oninput = e => { STATE.wQ = e.target.value; clearTimeout(STATE.qt); STATE.qt = setTimeout(() => { render(); const i = $('#wq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 200); }; keep();
  $$('[data-c]', el).forEach(b => b.onclick = () => { STATE.wCat = b.dataset.c; render(); });
  $$('[data-i]', el).forEach(b => b.onclick = () => { const i = find(D.coll, b.dataset.i), c = cart.find(x => x.id === i.id);
    if (dept === 'Bar' && i.stock !== '' && i.stock != null && (c ? c.qty : 0) + 1 > +i.stock) return toast(`Only ${i.stock} ${i.name} left in stock`, 1);
    if (c) c.qty++; else cart.push({ id: i.id, name: i.name, price: +i.price, tax: i.tax === '' || i.tax == null ? +S()[D.taxKey] || 0 : +i.tax, qty: 1, note: '' }); render(); });
  $$('[data-p]', el).forEach(b => b.onclick = () => { cart[+b.dataset.p].qty++; render(); });
  $$('[data-m]', el).forEach(b => b.onclick = () => { const c = cart[+b.dataset.m]; if (--c.qty <= 0) cart.splice(+b.dataset.m, 1); render(); });
  $$('[data-n]', el).forEach(b => b.onclick = () => { const c = cart[+b.dataset.n]; const n = prompt(`Note for ${c.name} (e.g. less spicy, no onion)`, c.note || ''); if (n !== null) { c.note = n.slice(0, 80); render(); } });
  const cov = $('#cov', el); if (cov) cov.onchange = () => { STATE.wCovers = +cov.value || 1; };
  const clr = $('#clr', el); if (clr) clr.onclick = () => { cart.length = 0; render(); };
  const send = $('#send', el); if (send) send.onclick = () => act(async () => { send.disabled = true; const t2 = lineTotals(cart);
    const o = await save('orders', { dept, table, bookingId: STATE.wBooking || '', covers: +(cov?.value || 1), waiter: ME.name, items: cart.map(c => ({ ...c })), sub: t2.sub, tax: t2.tax, status: 'New', createdAt: new Date().toISOString() });
    cart.length = 0; toast(`${o.id} sent to the ${D.station.toLowerCase()}`); });
  const see = $('#see', el); if (see) see.onclick = () => $('.pos-cart', el).scrollIntoView({ behavior: 'smooth' });
  const s2 = $('#send2', el); if (s2) s2.onclick = () => $('#send', el).click();
  $$('[data-served]', el).forEach(b => b.onclick = () => act(() => save('orders', { ...find('orders', b.dataset.served), status: 'Served', servedAt: new Date().toISOString() }), 'Marked served'));
  $$('[data-cx]', el).forEach(b => b.onclick = () => { const why = prompt('Why cancel this order?'); if (why) act(() => save('orders', { ...find('orders', b.dataset.cx), status: 'Cancelled', cancelReason: why.slice(0, 120), cancelledBy: ME.name }), 'Order cancelled'); });
  const br = $('#billreq', el); if (br) br.onclick = () => act(() => saveMany('orders', O.map(o => ({ ...o, billReq: true }))), 'The counter can see that this table wants the bill');
}

/* ---------- Kitchen / bar display (kiosk) ---------- */
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) {} };
function beep() { try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(); o.type = 'triangle'; o.frequency.value = 880; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(.001, a.currentTime); g.gain.exponentialRampToValueAtTime(.4, a.currentTime + .02); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + .5); o.start(); o.stop(a.currentTime + .55); setTimeout(() => a.close(), 800); } catch (e) {} }
const kdsDept = () => { const d = deptsFor(); return ME.role === 'kitchen' ? 'Restaurant' : ME.role === 'bar' ? 'Bar' : (STATE.kdsDept === 'All' || d.includes(STATE.kdsDept) ? STATE.kdsDept : 'All'); };
POLL_HOOKS.push(fresh => {   // a new order arrived: ring and (if switched on) print the kitchen ticket
  if (!ME || route() !== 'kitchen') return; const dept = kdsDept();
  const neu = (fresh.orders || []).filter(o => o.status === 'New' && (dept === 'All' || o.dept === dept) && minsAgo(o.createdAt) < 3 && !(STATE.kotSeen = STATE.kotSeen || new Set()).has(o.id));
  if (!neu.length) return; neu.forEach(o => STATE.kotSeen.add(o.id));
  if (lsGet('jg_kds_sound', true)) beep();
  if (lsGet('jg_kds_print', false)) neu.forEach(printKot);
});
function kitchen(el, acts) {
  const dept = kdsDept(), O = L('orders').filter(o => ['New', 'Preparing', 'Ready'].includes(o.status) && (dept === 'All' || o.dept === dept)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  (STATE.kotSeen = STATE.kotSeen || new Set()); O.forEach(o => STATE.kotSeen.add(o.id));
  const sound = lsGet('jg_kds_sound', true), auto = lsGet('jg_kds_print', false);
  topBtn(acts, STATE.kdsFull ? 'Exit full screen' : 'Full screen', () => { STATE.kdsFull = !STATE.kdsFull; try { STATE.kdsFull ? document.documentElement.requestFullscreen?.() : document.exitFullscreen?.(); } catch (e) {} render(); }, 'btn-g');
  const next = { New: ['Start cooking', 'Preparing'], Preparing: ['Ready', 'Ready'], Ready: ['Served', 'Served'] };
  el.innerHTML = `<div class="bar">${ME.role === 'kitchen' || ME.role === 'bar' ? '' : `<div class="tabs" style="margin:0">${['All', ...deptsFor()].map(d => `<button data-d="${d}" class="${d === dept ? 'on' : ''}">${d === 'All' ? 'Everything' : DEPTS[d].station}</button>`).join('')}</div>`}<span class="grow"></span>
      <label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="snd" ${sound ? 'checked' : ''}> Ring for new orders</label><label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="ap" ${auto ? 'checked' : ''}> Print new tickets</label></div>
    <div class="grid g3" style="margin-bottom:14px">${['New', 'Preparing', 'Ready'].map(s => kpi(ORDER_L[s], O.filter(o => o.status === s).length)).join('')}</div>
    <div class="kds">${O.map(o => { const m = minsAgo(o.createdAt);
      return `<div class="kot ${o.status} ${m >= 20 ? 'late' : m >= 10 ? 'slow' : ''}"><div class="kot-h"><div><b>${esc(o.table)}</b><small>${esc(o.id)} · ${esc(o.waiter || '')}</small></div><span class="tm">${m} min</span></div>
        <ul>${o.items.map(i => `<li><b>${i.qty}×</b> ${esc(i.name)}${i.note ? `<em>${esc(i.note)}</em>` : ''}</li>`).join('')}</ul>
        <div class="kot-f">${ochip(o.status)}${o.dept === 'Bar' && dept === 'All' ? chip('Bar', 'c-violet') : ''}<span class="grow"></span><button class="btn btn-s btn-g" data-pr="${esc(o.id)}">Print</button><button class="btn btn-s ${o.status === 'Preparing' ? 'btn-ok' : 'btn-p'}" data-nx="${esc(o.id)}">${next[o.status][0]}</button></div></div>`; }).join('') || '<div class="card" style="text-align:center;padding:50px"><b style="font-size:1.2rem">All caught up</b><p class="muted">New orders appear here by themselves.</p></div>'}</div>`;
  $$('[data-d]', el).forEach(b => b.onclick = () => { STATE.kdsDept = b.dataset.d; render(); });
  $('#snd', el).onchange = e => { lsSet('jg_kds_sound', e.target.checked); if (e.target.checked) beep(); };
  $('#ap', el).onchange = e => lsSet('jg_kds_print', e.target.checked);
  $$('[data-pr]', el).forEach(b => b.onclick = () => printKot(find('orders', b.dataset.pr)));
  $$('[data-nx]', el).forEach(b => b.onclick = () => { const o = find('orders', b.dataset.nx), n = next[o.status][1]; act(() => save('orders', { ...o, status: n, [n === 'Preparing' ? 'startedAt' : n === 'Ready' ? 'readyAt' : 'servedAt']: new Date().toISOString(), cook: n === 'Preparing' ? ME.name : o.cook || '' }), `${o.table}: ${ORDER_L[n]}`); });
}

/* ---------- Billing counter ---------- */
function counter(el, acts) {
  const view = STATE.cView || 'open', w = can('bills', 'w');
  el.innerHTML = `<div class="tabs">${[['open', 'Tables to bill'], ['bills', 'Bills'], ['report', 'Day report']].map(([k, l]) => `<button data-v="${k}" class="${k === view ? 'on' : ''}">${l}${k === 'open' ? `<span>${new Set(openOrders().filter(o => deptsFor().includes(o.dept)).map(o => o.dept + o.table)).size}</span>` : ''}</button>`).join('')}</div><div id="cv"></div>`;
  $$('[data-v]', el).forEach(b => b.onclick = () => { STATE.cView = b.dataset.v; render(); });
  const box = $('#cv', el);
  if (view === 'open') {
    const groups = {}; openOrders().filter(o => deptsFor().includes(o.dept)).forEach(o => { (groups[o.dept + '|' + o.table] = groups[o.dept + '|' + o.table] || []).push(o); });
    box.innerHTML = `<div class="tables wide">${Object.entries(groups).sort((a, b) => (b[1].some(o => o.billReq) - a[1].some(o => o.billReq)) || a[0].localeCompare(b[0])).map(([k, O]) => { const [d, t] = k.split('|');
      return `<div class="card tb-card ${O.some(o => o.billReq) ? 'billreq' : ''}"><div class="list-row" style="border:0;padding:0"><b style="font-size:1.1rem">${esc(t)}</b>${chip(DEPTS[d].label, d === 'Bar' ? 'c-violet' : 'c-blue')}</div><div class="small muted">${O.length} order(s) · ${O.reduce((n, o) => n + o.items.reduce((x, i) => x + i.qty, 0), 0)} items${O.some(o => o.billReq) ? ' · <b style="color:var(--rose-d)">bill asked</b>' : ''}</div><div style="font-size:1.4rem;font-weight:600;margin:8px 0">${inr(sum(O, o => o.sub + o.tax))}</div><div class="small">${O.map(o => ochip(o.status)).join(' ')}</div>${w ? `<button class="btn btn-p" data-bill="${esc(k)}" style="width:100%;margin-top:10px">Make bill</button>` : ''}</div>`; }).join('') || '<p class="muted">No tables waiting for a bill.</p>'}</div>`;
    $$('[data-bill]', box).forEach(b => b.onclick = () => { const [d, t] = b.dataset.bill.split('|'); makeBill(d, t); });
  }
  if (view === 'bills') {
    const day = STATE.cDay || iso(), B = L('bills').filter(b => (b.createdAt || '').slice(0, 10) === day && deptsFor().includes(b.dept)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    box.innerHTML = `<div class="bar"><label class="f">Date<input class="in" type="date" id="cd" value="${day}"></label></div><div class="table-wrap"><table><thead><tr><th>Bill</th><th>Time</th><th>Table</th><th>Paid by</th><th class="r">Total</th><th>Status</th><th></th></tr></thead><tbody>${B.map(b => `<tr><td><b>${esc(b.id)}</b><div class="small muted">${esc(b.cashier || '')}</div></td><td>${new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td><td>${esc(b.table)}</td><td>${esc(b.payMode === 'Room' ? 'Room ' + (b.roomNo || '') : b.payMode)}</td><td class="r"><b>${inr(b.total)}</b></td><td>${b.status === 'Cancelled' ? chip('Cancelled', 'c-red') : chip(b.payMode === 'Room' ? 'On room bill' : 'Paid', 'c-green')}</td><td><div class="row-acts"><button class="btn btn-s btn-g" data-rp="${esc(b.id)}">Reprint</button>${isMgr() && b.status !== 'Cancelled' && b.payMode !== 'Room' ? `<button class="btn btn-s btn-del" data-cxb="${esc(b.id)}">Cancel</button>` : ''}</div></td></tr>`).join('') || '<tr><td colspan="7" class="empty">No bills on this day.</td></tr>'}</tbody></table></div>`;
    $('#cd', box).onchange = e => { STATE.cDay = e.target.value || iso(); render(); };
    $$('[data-rp]', box).forEach(b => b.onclick = () => printBill(find('bills', b.dataset.rp)));
    $$('[data-cxb]', box).forEach(b => b.onclick = () => { const x = find('bills', b.dataset.cxb), why = prompt(`Cancel bill ${x.id}? Reason:`); if (why) act(async () => { await save('bills', { ...x, status: 'Cancelled', cancelReason: why.slice(0, 120), cancelledBy: ME.name }); if (x.incomeId && find('income', x.incomeId)) await remove('income', x.incomeId); }, 'Bill cancelled'); });
  }
  if (view === 'report') dayReport(box);
}
function makeBill(dept, table) {
  const D = DEPTS[dept], O = openOrders(dept, table), s = S(), merged = {};
  O.forEach(o => o.items.forEach(i => { const k = i.id + '|' + i.price + '|' + i.tax; merged[k] = merged[k] || { id: i.id, name: i.name, price: i.price, tax: i.tax, qty: 0 }; merged[k].qty += i.qty; }));
  const items = Object.values(merged), base = lineTotals(items), bookingId = O.find(o => o.bookingId)?.bookingId || '', notServed = O.filter(o => o.status !== 'Served').length, guests = inHouse();
  modal(`Bill · ${table} · ${D.label}`, `${notServed ? `<p class="note" style="margin:0 0 12px">${notServed} order(s) are not marked served yet. You can still bill them.</p>` : ''}
    <div class="table-wrap" style="margin-bottom:14px"><table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>${items.map(i => `<tr><td>${esc(i.name)}${i.tax ? ` <span class="small muted">${i.tax}% tax</span>` : ''}</td><td class="r">${i.qty}</td><td class="r">${inr(i.price)}</td><td class="r">${inr(i.price * i.qty)}</td></tr>`).join('')}</tbody></table></div>
    <form class="form" id="bf"><label class="f">Discount<input class="in" name="disc" value="0" placeholder="e.g. 100 or 10%"></label><label class="f">Service charge (%)<input class="in" name="svc" type="number" min="0" step="0.5" value="${+s.service || 0}"></label>
      <label class="f">Paid by<select class="in" name="mode"><option>Cash</option><option>UPI</option><option>Card</option>${guests.length && ROOM_POST() ? '<option value="Room">Add to room bill</option>' : ''}</select></label>
      <label class="f" id="rmf" style="display:none">Room<select class="in" name="room">${guests.map(b => `<option value="${esc(b.id)}" ${b.id === bookingId ? 'selected' : ''}>${esc(roomLabel(b))} · ${esc(b.guest)}</option>`).join('')}</select></label>
      <label class="f">Guest name (optional)<input class="in" name="guest"></label>
      <div class="card full" id="bt" style="padding:14px"></div><div class="acts"><button type="button" class="btn btn-g" data-cancel>Cancel</button><button class="btn btn-p">Save &amp; print bill</button></div></form>`, m => {
    const f = $('#bf', m);
    const calc = () => { const raw = f.disc.value.trim(), pct = raw.endsWith('%'), dv = Math.max(0, parseFloat(raw) || 0), discount = num(Math.min(base.sub, pct ? base.sub * dv / 100 : dv)), ratio = base.sub ? 1 - discount / base.sub : 1;
      const service = num((base.sub - discount) * (+f.svc.value || 0) / 100), tax = num(base.tax * ratio), exact = base.sub - discount + service + tax, total = Math.round(exact);
      return { sub: base.sub, discount, service, tax, round: num(total - exact), total }; };
    const draw = () => { const c = calc(); $('#rmf', m).style.display = f.mode.value === 'Room' ? '' : 'none';
      $('#bt', m).innerHTML = `<div class="list-row"><span>Subtotal</span><b>${inr(c.sub)}</b></div>${c.discount ? `<div class="list-row"><span>Discount</span><b>− ${inr(c.discount)}</b></div>` : ''}${c.service ? `<div class="list-row"><span>Service charge</span><b>${inr(c.service)}</b></div>` : ''}<div class="list-row"><span>Tax</span><b>${inr(c.tax)}</b></div><div class="list-row"><span><b>Total</b></span><b style="font-size:1.4rem">${inr(c.total)}</b></div>`; };
    if (bookingId && ROOM_POST() && guests.some(b => b.id === bookingId)) f.mode.value = 'Room';
    f.addEventListener('input', draw); f.addEventListener('change', draw); draw(); $('[data-cancel]', m).onclick = closeModal;
    f.onsubmit = e => { e.preventDefault(); const c = calc(), btn = $('button.btn-p', f); btn.disabled = true;
      act(async () => {
        const mode = f.mode.value, bk = mode === 'Room' ? f.room.value : '';
        const bill = await save('bills', { dept, table, orderIds: O.map(o => o.id), items, ...c, payMode: mode, bookingId: bk, roomNo: bk ? roomNo(find('bookings', bk)?.room) : '', guest: f.guest.value.trim() || (bk ? find('bookings', bk)?.guest : ''), cashier: ME.name, status: 'Paid', createdAt: new Date().toISOString() });
        await saveMany('orders', O.map(o => ({ ...o, status: 'Billed', billId: bill.id, billReq: false })));
        if (dept === 'Bar' && can('bar', 'w')) { const upd = items.map(i => { const x = find('bar', i.id); return x && x.stock !== '' && x.stock != null ? { ...x, stock: Math.max(0, +x.stock - i.qty) } : null; }).filter(Boolean); if (upd.length) await saveMany('bar', upd); }
        if (mode === 'Room') { const j = await call('roomCharge', { booking: bk, amount: c.total, desc: `${D.label} bill ${bill.id}` }); upsert('bookings', j.doc); }
        else { const inc = await save('income', { date: iso(), category: D.income, amount: c.total, mode, ref: bill.id, note: table }); await save('bills', { ...bill, incomeId: inc.id }); }
        closeModal(); printBill(find('bills', bill.id));
      }, `Bill saved for ${table}`).finally(() => { btn.disabled = false; }); };
  });
}
const ROOM_POST = () => ['admin', 'manager', 'frontdesk', 'cashier', 'bar'].includes(ME.role);
function dayReport(box) {
  const day = STATE.rDay || iso(), B = L('bills').filter(b => (b.createdAt || '').slice(0, 10) === day && b.status !== 'Cancelled' && deptsFor().includes(b.dept)), byMode = m => sum(B.filter(b => b.payMode === m), b => b.total);
  const items = {}; B.forEach(b => b.items.forEach(i => { const k = (b.dept === 'Bar' ? 'Bar · ' : '') + i.name; items[k] = items[k] || { qty: 0, amt: 0 }; items[k].qty += i.qty; items[k].amt += i.qty * i.price; }));
  const html = `<h2 style="margin:0 0 6px">Restaurant &amp; bar sales · ${fmtD(day)}</h2><table><thead><tr><th>Section</th><th class="r">Bills</th><th class="r">Subtotal</th><th class="r">Discount</th><th class="r">Service</th><th class="r">Tax</th><th class="r">Total</th></tr></thead><tbody>${Object.keys(DEPTS).map(d => { const X = B.filter(b => b.dept === d); return `<tr><td>${DEPTS[d].label}</td><td class="r">${X.length}</td><td class="r">${inr(sum(X, b => b.sub))}</td><td class="r">${inr(sum(X, b => b.discount))}</td><td class="r">${inr(sum(X, b => b.service))}</td><td class="r">${inr(sum(X, b => b.tax))}</td><td class="r"><b>${inr(sum(X, b => b.total))}</b></td></tr>`; }).join('')}<tr class="tot"><td>Total</td><td class="r">${B.length}</td><td class="r">${inr(sum(B, b => b.sub))}</td><td class="r">${inr(sum(B, b => b.discount))}</td><td class="r">${inr(sum(B, b => b.service))}</td><td class="r">${inr(sum(B, b => b.tax))}</td><td class="r"><b>${inr(sum(B, b => b.total))}</b></td></tr></tbody></table>
    <table style="margin-top:14px"><thead><tr><th>Collected by</th><th class="r">Amount</th></tr></thead><tbody>${['Cash', 'UPI', 'Card'].map(m => `<tr><td>${m}</td><td class="r">${inr(byMode(m))}</td></tr>`).join('')}<tr><td>Added to room bills</td><td class="r">${inr(byMode('Room'))}</td></tr></tbody></table>
    <table style="margin-top:14px"><thead><tr><th>Item</th><th class="r">Qty sold</th><th class="r">Amount</th></tr></thead><tbody>${Object.entries(items).sort((a, b) => b[1].amt - a[1].amt).map(([n, v]) => `<tr><td>${esc(n)}</td><td class="r">${v.qty}</td><td class="r">${inr(v.amt)}</td></tr>`).join('') || '<tr><td colspan="3">No sales.</td></tr>'}</tbody></table>`;
  box.innerHTML = `<div class="bar"><label class="f">Date<input class="in" type="date" id="rd" value="${day}"></label><button class="btn btn-g" id="rp">Print report</button></div><div class="grid g4" style="margin-bottom:14px">${kpi('Total sales', inr(sum(B, b => b.total)))}${kpi('Cash', inr(byMode('Cash')))}${kpi('UPI & card', inr(byMode('UPI') + byMode('Card')))}${kpi('On room bills', inr(byMode('Room')))}</div><div class="card rep">${html}</div>`;
  $('#rd', box).onchange = e => { STATE.rDay = e.target.value || iso(); render(); };
  $('#rp', box).onclick = () => printDoc(`Sales ${day}`, html + '<p style="margin-top:40px;display:flex;justify-content:space-between"><span>Cashier</span><span>Manager</span></p>');
}

/* ---------- Restaurant menu ---------- */
const SAMPLE_MENU = [['Idli (2) with sambar & chutney', 'Breakfast', 'Veg', 60], ['Masala dosa', 'Breakfast', 'Veg', 90], ['Pongal', 'Breakfast', 'Veg', 80], ['Tomato soup', 'Soups & starters', 'Veg', 110], ['Chicken 65', 'Soups & starters', 'Non-veg', 220], ['Paneer tikka', 'Soups & starters', 'Veg', 220], ['South Indian meals', 'Main course', 'Veg', 180], ['Chettinad chicken curry', 'Main course', 'Non-veg', 260], ['Fish curry', 'Main course', 'Non-veg', 280], ['Chicken biryani', 'Biryani & rice', 'Non-veg', 240], ['Veg biryani', 'Biryani & rice', 'Veg', 180], ['Parotta (2)', 'Breads', 'Veg', 50], ['Veg fried rice', 'Chinese', 'Veg', 170], ['Gobi manchurian', 'Chinese', 'Veg', 170], ['Gulab jamun', 'Desserts', 'Veg', 80], ['Filter coffee', 'Beverages', 'Veg', 40], ['Fresh lime soda', 'Beverages', 'Veg', 70]];
function menu(el, acts) {
  const s = S(), w = can('menu', 'w'), mgr = isMgr() || ME.role === 'accounts';
  const F = [{ name: 'name', label: 'Dish', required: true }, { name: 'category', label: 'Category', type: 'select', options: s.menuCats }, { name: 'type', label: 'Veg / non-veg', type: 'select', options: ['Veg', 'Non-veg', 'Egg'] }, { name: 'price', label: 'Price (₹, before tax)', type: 'number', min: 0, required: true }, { name: 'tax', label: 'GST %', type: 'number', min: 0, step: '0.5' }, { name: 'available', label: 'Available today', type: 'check' }, { name: 'desc', label: 'Description', full: true }];
  const edit = x => formModal(x ? x.name : 'Add dish', F, x || { category: s.menuCats[0], type: 'Veg', tax: s.foodTax, available: true }, async v => { await save('menu', { ...(x || {}), ...v }); toast('Menu saved'); });
  if (w && ME.role !== 'kitchen') topBtn(acts, '+ Add dish', () => edit());
  if (isMgr() && !L('menu').length) topBtn(acts, 'Load a sample menu', () => confirm('Add 17 common dishes with sample prices? Edit the prices afterwards.') && act(async () => { for (const [name, category, type, price] of SAMPLE_MENU) await save('menu', { name, category: s.menuCats.includes(category) ? category : s.menuCats[0], type, price, tax: s.foodTax, available: true }); }, 'Sample menu added. Please set your own prices.'), 'btn-g');
  const q = (STATE.mQ || '').toLowerCase(), M = L('menu').filter(i => !q || i.name.toLowerCase().includes(q)), cats = [...new Set([...s.menuCats, ...M.map(i => i.category)])].filter(c => M.some(i => i.category === c));
  el.innerHTML = `<div class="bar"><input class="in" id="q" placeholder="Search dishes" value="${esc(STATE.mQ || '')}" style="max-width:360px"><span class="muted small grow" style="text-align:right">${L('menu').filter(i => i.available === false).length} dish(es) switched off today</span></div>
    ${cats.map(c => `<h3 style="margin:18px 0 8px;font-size:1rem">${esc(c)}</h3><div class="table-wrap"><table><tbody>${M.filter(i => i.category === c).sort((a, b) => a.name.localeCompare(b.name)).map(i => `<tr><td>${vegDot(i.type)}<b>${esc(i.name)}</b>${i.desc ? `<div class="small muted">${esc(i.desc)}</div>` : ''}</td><td class="r">${inr(i.price)}<div class="small muted">${i.tax ?? s.foodTax}% GST</div></td><td style="width:170px"><label class="sw"><input type="checkbox" data-av="${esc(i.id)}" ${i.available !== false ? 'checked' : ''} ${w ? '' : 'disabled'}><span></span>${i.available !== false ? 'Available' : 'Not today'}</label></td><td style="width:150px"><div class="row-acts">${w && ME.role !== 'kitchen' ? `<button class="btn btn-s btn-g" data-e="${esc(i.id)}">Edit</button>` : ''}${isMgr() ? `<button class="btn btn-s btn-del" data-d="${esc(i.id)}">Delete</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div>`).join('') || `<p class="muted">No dishes yet.${isMgr() ? ' Add them one by one or load the sample menu and change the prices.' : ''}</p>`}`;
  void mgr;
  $('#q', el).oninput = e => { STATE.mQ = e.target.value; clearTimeout(STATE.qt); STATE.qt = setTimeout(() => { render(); const i = $('#q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
  $$('[data-av]', el).forEach(c => c.onchange = () => act(() => save('menu', { ...find('menu', c.dataset.av), available: c.checked }), c.checked ? 'Back on the menu' : 'Marked not available today'));
  $$('[data-e]', el).forEach(b => b.onclick = () => edit(find('menu', b.dataset.e)));
  $$('[data-d]', el).forEach(b => b.onclick = () => confirm('Delete this dish?') && act(() => remove('menu', b.dataset.d), 'Dish deleted'));
}

/* ---------- Bar items and stock ---------- */
function barstock(el, acts) {
  const s = S(), w = can('bar', 'w');
  const F = [{ name: 'name', label: 'Item', required: true, placeholder: 'e.g. Signature whisky 30 ml' }, { name: 'category', label: 'Category', type: 'select', options: s.barCats }, { name: 'unit', label: 'Serving', placeholder: '30 ml peg, pint, bottle, plate' }, { name: 'price', label: 'Price (₹)', type: 'number', min: 0, required: true }, { name: 'tax', label: 'Tax %', type: 'number', min: 0, step: '0.5' }, { name: 'stock', label: 'Stock in servings (empty = not counted)', type: 'number', min: 0 }, { name: 'reorder', label: 'Warn when stock falls to', type: 'number', min: 0 }, { name: 'available', label: 'On the bar menu', type: 'check' }];
  const edit = x => formModal(x ? x.name : 'Add bar item', F, x || { category: s.barCats[0], tax: s.barTax, reorder: 5, available: true }, async v => { const raw = $('#modal-body form').elements.stock.value.trim(); await save('bar', { ...(x || {}), ...v, stock: raw === '' ? '' : Math.max(0, Math.round(+raw)) }); toast('Bar item saved'); });
  if (w && ME.role !== 'cashier') topBtn(acts, '+ Add bar item', () => edit());
  const B = L('bar').sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name)), counted = B.filter(i => i.stock !== '' && i.stock != null), low = counted.filter(i => +i.stock <= (+i.reorder || 0));
  const t = iso(), sold = {}; L('bills').filter(b => b.dept === 'Bar' && b.status !== 'Cancelled' && (b.createdAt || '').slice(0, 10) === t).forEach(b => b.items.forEach(i => sold[i.id] = (sold[i.id] || 0) + i.qty));
  el.innerHTML = `<div class="grid g4" style="margin-bottom:16px">${kpi('Bar items', B.length)}${kpi('Low stock', low.length, low.slice(0, 3).map(i => esc(i.name)).join(', '))}${kpi('Sold today', Object.values(sold).reduce((a, b) => a + b, 0) + ' servings')}${kpi('Open bar orders', openOrders('Bar').length)}</div>
    <div class="table-wrap"><table><thead><tr><th>Item</th><th>Category</th><th class="r">Price</th><th class="r">Stock</th><th class="r">Sold today</th><th></th></tr></thead><tbody>${B.map(i => { const lo = i.stock !== '' && i.stock != null && +i.stock <= (+i.reorder || 0);
      return `<tr><td><b>${esc(i.name)}</b>${i.unit ? `<div class="small muted">${esc(i.unit)}</div>` : ''}${i.available === false ? chip('Off menu') : ''}</td><td>${esc(i.category || '')}</td><td class="r">${inr(i.price)}<div class="small muted">${i.tax ?? s.barTax}% tax</div></td><td class="r">${i.stock === '' || i.stock == null ? '<span class="muted">not counted</span>' : `<b ${lo ? 'style="color:var(--red)"' : ''}>${i.stock}</b>${lo ? '<div class="small" style="color:var(--red)">reorder</div>' : ''}`}</td><td class="r">${sold[i.id] || 0}</td>
        <td><div class="row-acts">${w ? `<button class="btn btn-s btn-ok" data-in="${esc(i.id)}">+ Stock</button>${ME.role !== 'cashier' ? `<button class="btn btn-s btn-g" data-e="${esc(i.id)}">Edit</button>` : ''}` : ''}${isMgr() ? `<button class="btn btn-s btn-del" data-d="${esc(i.id)}">Delete</button>` : ''}</div></td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">No bar items yet.</td></tr>'}</tbody></table></div>
    <p class="muted small" style="margin-top:10px">Stock goes down automatically when a bar bill is made. Use “+ Stock” when a delivery arrives; its cost can be recorded as a Bar stock expense.</p>`;
  $$('[data-e]', el).forEach(b => b.onclick = () => edit(find('bar', b.dataset.e)));
  $$('[data-d]', el).forEach(b => b.onclick = () => confirm('Delete this bar item?') && act(() => remove('bar', b.dataset.d), 'Deleted'));
  $$('[data-in]', el).forEach(b => b.onclick = () => { const x = find('bar', b.dataset.in);
    formModal(`Add stock · ${x.name}`, [{ name: 'qty', label: 'Servings received', type: 'number', min: 1, required: true }, { name: 'cost', label: 'Purchase cost (₹, optional)', type: 'number', min: 0 }, { name: 'supplier', label: 'Supplier / bill no.' }], {},
      async v => { if (v.qty <= 0) throw new Error('Enter how many servings arrived.'); const log = [...(x.stockLog || []), { date: iso(), qty: v.qty, cost: v.cost, supplier: v.supplier, by: ME.name }].slice(-30);
        await save('bar', { ...x, stock: (x.stock === '' || x.stock == null ? 0 : +x.stock) + v.qty, stockLog: log });
        if (v.cost > 0 && can('expenses', 'w')) await save('expenses', { date: iso(), category: 'Bar stock', amount: v.cost, paidTo: v.supplier, mode: 'Cash', note: `${v.qty} × ${x.name}` });
        toast(`Stock of ${x.name} is now ${(x.stock === '' || x.stock == null ? 0 : +x.stock) + v.qty}`); }); });
}

/* ---------- Housekeeping ---------- */
const CLEAN = ['Dirty', 'In progress', 'Clean', 'Inspected'], CLEAN_C = { Dirty: 'c-red', 'In progress': 'c-amber', Clean: 'c-blue', Inspected: 'c-green' };
const TASK_TYPES = ['Checkout clean', 'Stay-over clean', 'Deep clean', 'Maintenance', 'Laundry', 'Guest request', 'Lost & found', 'Public area'];
function housekeeping(el, acts) {
  const view = STATE.hkView || 'board', w = can('tasks', 'w'), R = L('rooms').sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));
  const HK = L('staff').filter(s => s.status !== 'Inactive' && ['Housekeeping', 'Maintenance'].includes(s.dept)), staffOpts = [['', 'Unassigned'], ...L('staff').filter(s => s.status !== 'Inactive').map(s => [s.id, `${s.name} · ${s.dept}`])];
  const T = L('tasks');
  const taskForm = (x, pre = {}) => formModal(x ? x.type : 'New task', [{ name: 'type', label: 'Task', type: 'select', options: TASK_TYPES }, { name: 'room', label: 'Room', type: 'select', options: [['', 'Public area / none'], ...R.map(r => [r.id, `Room ${r.number}`])] }, { name: 'assignedTo', label: 'Assigned to', type: 'select', options: staffOpts }, { name: 'priority', label: 'Priority', type: 'select', options: ['Normal', 'High', 'Urgent'] }, { name: 'note', label: 'Details', full: true, placeholder: 'Tap leaking in 203, extra towels for 105, phone charger found…' }],
    x || { type: 'Stay-over clean', priority: 'Normal', ...pre }, async v => { const d = await save('tasks', { ...(x || { status: 'Open', createdAt: new Date().toISOString(), raisedBy: ME.name }), ...v });
      if (!x && d.type === 'Maintenance' && d.room) { const r = find('rooms', d.room); if (r && r.status !== 'Occupied' && confirm(`Block room ${r.number} for maintenance?`)) await save('rooms', { ...r, status: 'Maintenance' }); }
      toast('Task saved'); });
  if (w) topBtn(acts, '+ New task', () => taskForm());
  el.innerHTML = `<div class="tabs"><button data-v="board" class="${view === 'board' ? 'on' : ''}">Cleaning board</button><button data-v="tasks" class="${view === 'tasks' ? 'on' : ''}">Tasks &amp; maintenance<span>${T.filter(t => t.status !== 'Done').length}</span></button></div><div id="hv"></div>`;
  $$('[data-v]', el).forEach(b => b.onclick = () => { STATE.hkView = b.dataset.v; render(); });
  const box = $('#hv', el), canRooms = can('rooms', 'w');
  if (view === 'board') {
    const clean = r => r.clean || 'Inspected', nextS = { Dirty: 'In progress', 'In progress': 'Clean', Clean: 'Inspected', Inspected: 'Dirty' }, lbl = { Dirty: 'Start cleaning', 'In progress': 'Mark clean', Clean: 'Inspect & release', Inspected: 'Mark dirty' };
    const guest = r => L('bookings').find(b => b.room === r.id && b.status === 'Checked-in');
    box.innerHTML = `<div class="grid g4" style="margin-bottom:16px">${CLEAN.map(c => kpi(c, R.filter(r => clean(r) === c).length)).join('')}</div>
      <div class="table-wrap"><table><thead><tr><th>Room</th><th>Occupancy</th><th>Cleaning</th><th>Attendant</th><th>Open tasks</th><th></th></tr></thead><tbody>${R.map(r => { const g = guest(r), ot = T.filter(t => t.room === r.id && t.status !== 'Done');
        return `<tr><td><b>${esc(r.number)}</b> <span class="small muted">${esc(r.type)}</span></td><td>${st(r.status || 'Available')}${g ? `<div class="small muted">${esc(g.guest)} · till ${fmtD(g.co)}</div>` : ''}</td><td>${chip(clean(r), CLEAN_C[clean(r)])}</td><td>${canRooms ? `<select class="in" data-att="${esc(r.id)}" style="padding:6px 8px;min-width:150px"><option value="">Unassigned</option>${HK.map(s => `<option value="${esc(s.id)}" ${r.attendant === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>` : esc(staffName(r.attendant) || '—')}</td><td class="small">${ot.map(t => esc(t.type)).join(', ') || '—'}</td>
          <td><div class="row-acts">${canRooms ? `<button class="btn btn-s ${clean(r) === 'Clean' ? 'btn-ok' : 'btn-g'}" data-nx="${esc(r.id)}">${lbl[clean(r)]}</button>` : ''}${w ? `<button class="btn btn-s btn-g" data-tk="${esc(r.id)}">+ Task</button>` : ''}</div></td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">Add rooms first.</td></tr>'}</tbody></table></div>
      <p class="muted small" style="margin-top:10px">Order: Dirty → In progress → Clean → Inspected by the supervisor. Inspecting a room that was waiting for cleaning makes it Available for the front desk. Rooms are marked Dirty automatically at check-out.</p>`;
    $$('[data-nx]', box).forEach(b => b.onclick = () => { const r = find('rooms', b.dataset.nx), n = nextS[clean(r)]; act(async () => {
      const upd = { ...r, clean: n, cleanedBy: n === 'Clean' ? ME.name : r.cleanedBy || '', inspectedBy: n === 'Inspected' ? ME.name : r.inspectedBy || '' };
      if (n === 'Inspected' && r.status === 'Cleaning') upd.status = 'Available';
      if (n === 'Dirty' && r.status === 'Available') upd.status = 'Cleaning';
      await save('rooms', upd);
      if (n === 'Clean' && can('tasks', 'w')) { const done = T.filter(t => t.room === r.id && /clean/i.test(t.type) && t.status !== 'Done').map(t => ({ ...t, status: 'Done', doneAt: new Date().toISOString(), doneBy: ME.name })); if (done.length) await saveMany('tasks', done); }
    }, `Room ${r.number}: ${n}${n === 'Inspected' && r.status === 'Cleaning' ? ' · now available' : ''}`); });
    $$('[data-att]', box).forEach(s => s.onchange = () => act(() => save('rooms', { ...find('rooms', s.dataset.att), attendant: s.value }), 'Attendant assigned'));
    $$('[data-tk]', box).forEach(b => b.onclick = () => taskForm(null, { room: b.dataset.tk }));
  } else {
    const f = STATE.hkF || 'Open', rows = T.filter(t => f === 'All' || (f === 'Open' ? t.status !== 'Done' : t.status === 'Done')).sort((a, b) => ({ Urgent: 0, High: 1, Normal: 2 }[a.priority] - { Urgent: 0, High: 1, Normal: 2 }[b.priority]) || String(b.createdAt).localeCompare(String(a.createdAt)));
    box.innerHTML = `<div class="tabs">${['Open', 'Done', 'All'].map(k => `<button data-f="${k}" class="${k === f ? 'on' : ''}">${k}</button>`).join('')}</div><div class="table-wrap"><table><thead><tr><th>Task</th><th>Room</th><th>Assigned to</th><th>Priority</th><th>Raised</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(t => `<tr><td><b>${esc(t.type)}</b>${t.note ? `<div class="small muted">${esc(t.note)}</div>` : ''}</td><td>${t.room ? 'Room ' + esc(roomNo(t.room)) : 'Public area'}</td><td>${esc(t.assignedTo ? staffName(t.assignedTo) : 'Unassigned')}</td><td>${chip(t.priority || 'Normal', t.priority === 'Urgent' ? 'c-red' : t.priority === 'High' ? 'c-amber' : '')}</td><td class="small nowrap">${esc(String(t.createdAt || '').slice(0, 16).replace('T', ' '))}<div class="muted">${esc(t.raisedBy || '')}</div></td><td>${chip(t.status, t.status === 'Done' ? 'c-green' : t.status === 'In progress' ? 'c-amber' : 'c-pink')}${t.doneBy ? `<div class="small muted">${esc(t.doneBy)}</div>` : ''}</td>
      <td><div class="row-acts">${w && t.status === 'Open' ? `<button class="btn btn-s btn-g" data-st="${esc(t.id)}|In progress">Start</button>` : ''}${w && t.status !== 'Done' ? `<button class="btn btn-s btn-ok" data-st="${esc(t.id)}|Done">Done</button><button class="btn btn-s btn-g" data-e="${esc(t.id)}">Edit</button>` : ''}${isMgr() ? `<button class="btn btn-s btn-del" data-d="${esc(t.id)}">Delete</button>` : ''}</div></td></tr>`).join('') || '<tr><td colspan="7" class="empty">No tasks here.</td></tr>'}</tbody></table></div>`;
    $$('[data-f]', box).forEach(b => b.onclick = () => { STATE.hkF = b.dataset.f; render(); });
    $$('[data-e]', box).forEach(b => b.onclick = () => taskForm(find('tasks', b.dataset.e)));
    $$('[data-d]', box).forEach(b => b.onclick = () => confirm('Delete this task?') && act(() => remove('tasks', b.dataset.d), 'Deleted'));
    $$('[data-st]', box).forEach(b => b.onclick = () => { const [id, s2] = b.dataset.st.split('|'), t = find('tasks', id); act(async () => {
      await save('tasks', { ...t, status: s2, ...(s2 === 'Done' ? { doneAt: new Date().toISOString(), doneBy: ME.name } : {}) });
      if (s2 === 'Done' && t.type === 'Maintenance' && t.room && can('rooms', 'w')) { const r = find('rooms', t.room); if (r?.status === 'Maintenance') await save('rooms', { ...r, status: 'Available' }); }
    }, s2 === 'Done' ? 'Task done' : 'Task started'); });
  }
}

/* keep timers and waiting tables up to date on the live screens */
setInterval(() => { if (!ME || document.hidden || $('#modal').classList.contains('open')) return; const r = route(); if (['kitchen', 'waiter', 'counter'].includes(r) && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) render(); }, 30000);
addEventListener('hashchange', () => { if (route() !== 'waiter') STATE.wTable = ''; });

Object.assign(VIEWS, { waiter, kitchen, counter, menu, barstock, housekeeping });
