/* Jack & Jose Group — core utilities, data store, router, UI helpers */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const pad = n => String(n).padStart(2, '0');
const todayISO = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmtDate = iso => { if (!iso) return '—'; const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso); return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };
const fmtDateTime = iso => { const d = new Date(iso); return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
function hashStr(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const genId = (prefix, len = 6) => prefix + Array.from({ length: len }, () => '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 34)]).join('');
const genNum = (prefix, len = 9) => prefix + Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');

/* ---------- Data store (browser storage with in-memory fallback) ----------
   Replace with API calls to your backend before going live. */
const SEED = {};
const Store = (() => {
  const mem = {};
  const NS = 'jj_v1_';
  return {
    get(k) {
      if (k in mem) return mem[k];
      let v;
      try { const raw = localStorage.getItem(NS + k); if (raw) v = JSON.parse(raw); } catch (e) { /* storage unavailable */ }
      if (v === undefined) v = SEED[k] ? SEED[k]() : [];
      mem[k] = v;
      return v;
    },
    set(k, v) { mem[k] = v; this.lastError = null; try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) { this.lastError = e; } },
    add(k, item) { const a = [item, ...this.get(k)]; this.set(k, a); return item; },
    find(k, id) { return this.get(k).find(x => x.id === id); },
    update(k, id, patch) { this.set(k, this.get(k).map(x => x.id === id ? { ...x, ...(typeof patch === 'function' ? patch(x) : patch) } : x)); },
    remove(k, id) { this.set(k, this.get(k).filter(x => x.id !== id)); },
    resetAll() { Object.keys(SEED).forEach(k => { delete mem[k]; try { localStorage.removeItem(NS + k); } catch (e) { } }); },
  };
})();
const Session = { // per-tab state such as current search
  _m: {},
  get(k) { if (k in this._m) return this._m[k]; try { const v = sessionStorage.getItem('jj_' + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { this._m[k] = v; try { sessionStorage.setItem('jj_' + k, JSON.stringify(v)); } catch (e) { } },
};

/* ---------- Geography ---------- */
const INDIA_CITIES = {
  'Kochi': [9.93, 76.27], 'Thiruvananthapuram': [8.52, 76.94], 'Kozhikode': [11.26, 75.78], 'Thrissur': [10.53, 76.21],
  'Kottayam': [9.59, 76.52], 'Alappuzha': [9.50, 76.34], 'Kannur': [11.87, 75.37], 'Palakkad': [10.79, 76.65],
  'Coimbatore': [11.02, 76.96], 'Madurai': [9.93, 78.12], 'Tiruchirappalli': [10.79, 78.70], 'Salem': [11.66, 78.15],
  'Tirunelveli': [8.71, 77.76], 'Nagercoil': [8.18, 77.41], 'Vellore': [12.92, 79.13], 'Puducherry': [11.94, 79.81],
  'Chennai': [13.08, 80.27], 'Bengaluru': [12.97, 77.59], 'Mysuru': [12.30, 76.64], 'Mangaluru': [12.91, 74.86],
  'Hubballi': [15.36, 75.12], 'Goa': [15.49, 73.83], 'Hyderabad': [17.39, 78.49], 'Visakhapatnam': [17.69, 83.22],
  'Vijayawada': [16.51, 80.65], 'Tirupati': [13.63, 79.42], 'Mumbai': [19.08, 72.88], 'Pune': [18.52, 73.86],
  'Nashik': [20.00, 73.79], 'Nagpur': [21.15, 79.09], 'Ahmedabad': [23.02, 72.57], 'Surat': [21.17, 72.83],
  'Vadodara': [22.31, 73.18], 'Rajkot': [22.30, 70.80], 'Udaipur': [24.59, 73.71], 'Jaipur': [26.91, 75.79],
  'Indore': [22.72, 75.86], 'Bhopal': [23.26, 77.41], 'Raipur': [21.25, 81.63], 'Delhi': [28.61, 77.21],
  'Agra': [27.18, 78.01], 'Lucknow': [26.85, 80.95], 'Kanpur': [26.45, 80.33], 'Varanasi': [25.32, 82.97],
  'Patna': [25.59, 85.14], 'Ranchi': [23.34, 85.31], 'Kolkata': [22.57, 88.36], 'Bhubaneswar': [20.30, 85.82],
  'Guwahati': [26.14, 91.74], 'Chandigarh': [30.73, 76.78], 'Amritsar': [31.63, 74.87], 'Dehradun': [30.32, 78.03],
  'Shimla': [31.10, 77.17], 'Srinagar': [34.08, 74.80],
};
const WORLD_CITIES = {
  'Dubai (UAE)': [25.20, 55.27], 'Abu Dhabi (UAE)': [24.45, 54.38], 'Doha (Qatar)': [25.29, 51.53], 'Jeddah (Saudi Arabia)': [21.49, 39.19],
  'Muscat (Oman)': [23.59, 58.41], 'Colombo (Sri Lanka)': [6.93, 79.86], 'Singapore': [1.35, 103.82], 'Kuala Lumpur (Malaysia)': [3.14, 101.69],
  'Bangkok (Thailand)': [13.76, 100.50], 'Hong Kong': [22.32, 114.17], 'Shanghai (China)': [31.23, 121.47], 'Tokyo (Japan)': [35.68, 139.69],
  'Sydney (Australia)': [-33.87, 151.21], 'Nairobi (Kenya)': [-1.29, 36.82], 'Durban (South Africa)': [-29.86, 31.02],
  'London (UK)': [51.51, -0.13], 'Rotterdam (Netherlands)': [51.92, 4.48], 'Hamburg (Germany)': [53.55, 9.99], 'Frankfurt (Germany)': [50.11, 8.68],
  'New York (USA)': [40.71, -74.01], 'Los Angeles (USA)': [34.05, -118.24], 'Toronto (Canada)': [43.65, -79.38],
};
const ALL_PLACES = { ...INDIA_CITIES, ...WORLD_CITIES };
const cityKey = name => { if (!name) return null; const n = String(name).trim().toLowerCase(); return Object.keys(ALL_PLACES).find(k => k.toLowerCase() === n) || Object.keys(ALL_PLACES).find(k => k.toLowerCase().startsWith(n)) || null; };
function distanceKm(a, b) {
  const A = ALL_PLACES[cityKey(a)], B = ALL_PLACES[cityKey(b)];
  if (!A || !B) return 350 + (hashStr(String(a) + b) % 900); // unknown place: plausible estimate
  const R = 6371, toR = x => x * Math.PI / 180;
  const dLat = toR(B[0] - A[0]), dLon = toR(B[1] - A[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(A[0])) * Math.cos(toR(B[0])) * Math.sin(dLon / 2) ** 2;
  return Math.max(15, Math.round(2 * R * Math.asin(Math.sqrt(h))));
}
const roadKm = (a, b) => Math.round(distanceKm(a, b) * 1.28);
const isIndia = name => !!INDIA_CITIES[cityKey(name)];

/* Elsha symbol: a lowercase “e” with a leaf at its tail (energy) and a sun / record dot (media). */
const BRAND_MARK = '<svg viewBox="0 0 64 64" role="img" aria-label="Elsha"><defs><linearGradient id="elg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b57b7"/><stop offset=".55" stop-color="#0b8f9c"/><stop offset="1" stop-color="#1fbf7a"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#elg)"/><path d="M15.5 33.500H46.500A15.5 15.5 0 1 0 41.5 45" fill="none" stroke="#ffffff" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 46.500c2.5-7 9-9.5 15.5-8-.500 7-6 12-15.5 8z" fill="#c8f9d9"/><path d="M41.5 46c4-3 7.5-4.8 11.5-6" fill="none" stroke="#11895a" stroke-width="1.3" stroke-linecap="round"/><circle cx="31" cy="25" r="3.4" fill="#ffd76a"/></svg>';

/* ---------- Icons (inline SVG, stroke style) ---------- */
const ICONS = {
  truck: '<path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8"/>',
  fleet: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 20h10M12 16v4M7 9h3M7 12h6"/><circle cx="17" cy="10" r="2"/>',
  bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 21v-3M16 21v-3"/><circle cx="8" cy="14.5" r="1"/><circle cx="16" cy="14.5" r="1"/>',
  hotel: '<path d="M3 21V7l9-4 9 4v14M9 21v-5h6v5M8 10h2M14 10h2M8 13h2M14 13h2"/>',
  camera: '<path d="M4 7h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="4"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  plane: '<path d="M2 16l20-7-3-2-7 2-5-5-2 1 3 6-4 1-2-2-1 1 1 5z"/>',
  ship: '<path d="M3 17l2 4h14l2-4H3zM6 17V9h12v8M12 9V3M9 6h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  pen: '<path d="M4 20l4-1L19 8l-3-3L5 16zM14 6l3 3"/>',
  leaf: '<path d="M5 21c0-9 6-15 16-16-1 10-7 16-16 16zM5 21l8-8"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M16 4a3.5 3.5 0 010 7M18 14c2.5.5 4 2.8 4 6"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  wrench: '<path d="M14 6a4 4 0 015 5l-9 9-3-3 9-9a4 4 0 01-2-2z"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  phone: '<path d="M5 3h4l2 5-3 2a11 11 0 006 6l2-3 5 2v4a2 2 0 01-2 2A17 17 0 013 5a2 2 0 012-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
};
const icon = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* ---------- Toast & modal ---------- */
function toast(msg, type = 'ok') {
  let box = $('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; box.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function openModal(title, bodyHtml, { wide = false, onMount } = {}) {
  closeModal();
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-head"><h3>${esc(title)}</h3><button class="modal-x" aria-label="Close" data-close>×</button></div>
    <div class="modal-body">${bodyHtml}</div></div>`;
  back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-close]')) closeModal(); });
  document.body.appendChild(back);
  document.body.style.overflow = 'hidden';
  const m = $('.modal', back);
  if (onMount) onMount(m);
  const f = $('input, select, textarea', $('.modal-body', back)); if (f) setTimeout(() => f.focus(), 50);
  return m;
}
function closeModal() { $$('.modal-back').forEach(m => m.remove()); document.body.style.overflow = ''; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
function confirmBox(message, onYes, yesLabel = 'Delete') {
  openModal('Please confirm', `<p>${esc(message)}</p><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-outline" data-close>Keep it</button><button class="btn btn-danger" id="cf-yes">${esc(yesLabel)}</button></div>`,
    { onMount: m => $('#cf-yes', m).onclick = () => { closeModal(); onYes(); } });
}

/* ---------- Forms ---------- */
function fieldHtml(f, v = {}) {
  const val = v[f.name] ?? f.default ?? '';
  const id = 'f-' + f.name;
  const req = f.required ? 'required' : '';
  let input;
  if (f.type === 'select') {
    const opts = typeof f.options === 'function' ? f.options() : f.options;
    input = `<select class="input" id="${id}" name="${f.name}" ${req}>${opts.map(op => { const [ov, ol] = Array.isArray(op) ? op : [op, op]; return `<option value="${esc(ov)}" ${String(ov) === String(val) ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`;
  } else if (f.type === 'textarea') {
    input = `<textarea class="input" id="${id}" name="${f.name}" ${req} placeholder="${esc(f.placeholder || '')}">${esc(val)}</textarea>`;
  } else if (f.type === 'checkbox') {
    return `<label class="check ${f.full ? 'full' : ''}"><input type="checkbox" id="${id}" name="${f.name}" ${val ? 'checked' : ''}> ${esc(f.label)}</label>`;
  } else {
    input = `<input class="input" id="${id}" type="${f.type || 'text'}" name="${f.name}" value="${esc(val)}" ${req} ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} ${f.step ? `step="${f.step}"` : ''} ${f.list ? `list="${f.list}"` : ''} ${f.pattern ? `pattern="${f.pattern}"` : ''} placeholder="${esc(f.placeholder || '')}" autocomplete="off">`;
  }
  return `<label class="field ${f.full ? 'full' : ''}"><span>${esc(f.label)}</span>${input}</label>`;
}
const formHtml = (fields, v) => fields.map(f => fieldHtml(f, v)).join('');
function readForm(form, fields) {
  const o = {};
  for (const f of fields) {
    const el = form.elements[f.name]; if (!el) continue;
    if (f.type === 'checkbox') o[f.name] = el.checked;
    else if (f.type === 'number') o[f.name] = Number(el.value);
    else o[f.name] = String(el.value).trim();
  }
  return o;
}

/* ---------- Generic CRUD table (used by every master portal) ---------- */
function renderCrud(el, o) {
  const rows = o.rows ? o.rows() : Store.get(o.key);
  el.innerHTML = `<div class="crud-bar">
      <input class="input" type="search" placeholder="Search ${esc(o.plural.toLowerCase())}…" data-crud-search aria-label="Search">
      <span class="muted small" data-crud-count>${rows.length} ${esc(o.plural.toLowerCase())}</span><span class="spacer"></span>
      ${o.toolbar || ''}
      ${o.noAdd ? '' : `<button class="btn btn-primary" data-crud-add>+ Add ${esc(o.single)}</button>`}
    </div>
    <div class="table-wrap"><table class="table"><thead><tr>${o.columns.map(c => `<th>${esc(c.label)}</th>`).join('')}<th></th></tr></thead><tbody>
    ${rows.map(r => `<tr data-text="${esc(JSON.stringify(r).toLowerCase())}">${o.columns.map(c => `<td>${c.render ? c.render(r) : esc(r[c.field])}</td>`).join('')}
      <td class="row-actions">${(o.actions || []).map(a => (a.show ? a.show(r) : true) ? `<button class="btn btn-sm btn-ghost" data-crud-act="${a.id}" data-id="${esc(r.id)}">${esc(a.label)}</button>` : '').join('')}
      ${o.noEdit ? '' : `<button class="btn btn-sm btn-ghost" data-crud-edit="${esc(r.id)}">Edit</button>`}
      ${o.noDelete ? '' : `<button class="btn btn-sm btn-danger-ghost" data-crud-del="${esc(r.id)}">Delete</button>`}</td></tr>`).join('')
    || `<tr><td class="empty" colspan="${o.columns.length + 1}">No ${esc(o.plural.toLowerCase())} yet. ${o.noAdd ? '' : `Use “Add ${esc(o.single)}” to create the first one.`}</td></tr>`}
    </tbody></table></div>`;
  const rerender = () => { renderCrud(el, o); o.onChange && o.onChange(); };
  $('[data-crud-search]', el).addEventListener('input', e => {
    const q = e.target.value.toLowerCase(); let n = 0;
    $$('tbody tr[data-text]', el).forEach(tr => { const hit = tr.dataset.text.includes(q); tr.hidden = !hit; if (hit) n++; });
    $('[data-crud-count]', el).textContent = `${n} ${o.plural.toLowerCase()}`;
  });
  const openForm = (row) => {
    const fields = typeof o.fields === 'function' ? o.fields(row) : o.fields;
    openModal(row ? `Edit ${o.single}` : `Add ${o.single}`, `<form class="form-grid" id="crud-form">${formHtml(fields, row || {})}
      <div class="full" style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary">${row ? 'Save changes' : 'Add ' + esc(o.single)}</button></div></form>`, {
      onMount: m => $('#crud-form', m).addEventListener('submit', ev => {
        ev.preventDefault();
        const data = readForm(ev.target, fields);
        if (o.validate) { const err = o.validate(data, row); if (err) return toast(err, 'err'); }
        if (o.transform) o.transform(data, row);
        if (row) { Store.update(o.key, row.id, data); toast(`${o.single} updated`); }
        else { const item = { id: o.newId ? o.newId(data) : genId(o.idPrefix || 'ID'), createdAt: new Date().toISOString(), ...(o.defaults || {}), ...data }; Store.add(o.key, item); toast(`${o.single} added`); }
        closeModal(); rerender();
      }),
    });
  };
  el.onclick = e => {
    const add = e.target.closest('[data-crud-add]'), ed = e.target.closest('[data-crud-edit]'), del = e.target.closest('[data-crud-del]'), act = e.target.closest('[data-crud-act]');
    if (add || ed || del || act) e.stopPropagation(); // a list inside another container must not also trigger that container's older handler
    if (add) openForm(null);
    if (ed) openForm(Store.find(o.key, ed.dataset.crudEdit));
    if (del) { const r = Store.find(o.key, del.dataset.crudDel); const blocked = o.beforeDelete && o.beforeDelete(r); if (blocked) return toast(blocked, 'err'); confirmBox(`Delete ${o.single.toLowerCase()} “${o.label ? o.label(r) : r.id}”? This cannot be undone.`, () => { Store.remove(o.key, r.id); toast(`${o.single} deleted`); rerender(); }); }
    if (act) { const a = (o.actions || []).find(x => x.id === act.dataset.crudAct); if (!a) return; a.run(Store.find(o.key, act.dataset.id), rerender); }
  };
}
const statusChip = (s) => {
  const map = { Confirmed: 'green', Active: 'green', Available: 'green', Delivered: 'green', Completed: 'green', 'Checked-in': 'blue', 'On Trip': 'blue', 'In Transit': 'blue', Ongoing: 'blue', Booked: 'blue', Loaded: 'blue', 'Picked Up': 'blue', Unloaded: 'blue', 'Out for Delivery': 'blue', New: 'blue', Maintenance: 'warn', Requested: 'warn', Reserved: 'blue', 'No-show': 'danger', Published: 'green', Challenged: 'warn', Upheld: 'blue', Removed: 'danger', Received: 'green', Captured: 'green', Sent: 'blue', Queued: 'warn', Processed: 'green', Scheduled: 'blue', Refunded: '', 'Partially refunded': 'warn', Failed: 'danger', Pending: 'warn', Contacted: 'warn', Inactive: 'danger', Cancelled: 'danger', 'Checked-out': '' };
  return `<span class="chip ${map[s] ?? ''}">${esc(s)}</span>`;
};

/* ---------- Layout fragments ---------- */
function pageHero({ eyebrow, title, lead, elsha = false, extra = '' }) {
  const slot = (location.hash || '').slice(1), art = typeof SCENES !== 'undefined' && (SCENES[slot] || SITE_CONFIG.photos?.[slot]) ? pic(slot, 'hero-pic') : '';
  return `<section class="hero page-hero ${elsha ? 'elsha' : ''}"><canvas data-routes></canvas><div class="wrap ${art ? 'hero-grid' : ''}">
    <div><div class="eyebrow">${eyebrow}</div><h1 style="margin-top:10px">${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}${extra}</div>${art}</div></section>`;
}
function adminShell({ title, sub, tabs, active, base, green = false }) {
  return `<section class="admin-top ${green ? 'g' : ''}"><div class="wrap">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:end">
      <div><div class="eyebrow">Master portal</div><h1 style="margin-top:6px">${title}</h1><p style="margin-top:6px">${sub}</p></div>
      <div class="admin-user">${typeof Auth !== 'undefined' && Auth.user() ? `<span class="user-chip"><span class="avatar">${esc(Auth.user().name.split(' ').map(w => w[0]).slice(0, 2).join(''))}</span><span><b>${esc(Auth.user().name)}</b><small>${esc(ROLES[Auth.user().role].label)}</small></span></span>
        <select class="input portal-switch" aria-label="Switch portal" onchange="go(this.value)">${ROLES[Auth.user().role].portals.map(p => `<option value="${p}" ${location.hash === '#' + p ? 'selected' : ''}>${PORTAL_LABEL[p]}</option>`).join('')}</select>
        <button class="btn btn-outline btn-sm on-dark" data-logout>Sign out</button>` : ''}
      <a class="btn btn-light btn-sm" href="#${base}">← Booking site</a></div></div>
    <nav class="admin-tabs" role="tablist">${tabs.map(([id, label]) => `<button role="tab" data-tab="${id}" class="${id === active ? 'on' : ''}">${label}</button>`).join('')}</nav>
  </div></section><section class="section-tight"><div class="wrap" id="admin-body"></div></section>`;
}
function bindTabs(root, render) {
  $$('.admin-tabs button', root).forEach(b => b.onclick = () => {
    $$('.admin-tabs button', root).forEach(x => x.classList.toggle('on', x === b));
    Session.set('tab_' + location.hash, b.dataset.tab);
    render(b.dataset.tab);
  });
}
const kpi = (label, value, small = '', alert = false) => `<div class="kpi ${alert ? 'alert' : ''}"><span>${esc(label)}</span><b>${value}</b>${small ? `<small>${small}</small>` : ''}</div>`;
const bars = (items) => { const max = Math.max(1, ...items.map(i => i[1])); return `<div class="bars">${items.map(([l, v, d]) => `<div class="bar-row"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l)}</span><div class="track"><div class="fill" style="width:${(v / max) * 100}%"></div></div><b class="num" style="text-align:right">${d ?? v}</b></div>`).join('') || '<p class="muted">No data yet.</p>'}</div>`; };

/* ---------- Animated route canvas for heroes ---------- */
function startRouteCanvas(canvas) {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const r = rng(hashStr(location.hash || 'home'));
  const pts = Array.from({ length: 26 }, () => ({ x: r(), y: r() }));
  const links = Array.from({ length: 22 }, () => [Math.floor(r() * pts.length), Math.floor(r() * pts.length)]).filter(([a, b]) => a !== b);
  const movers = links.map((l, i) => ({ l, t: r(), s: 0.0012 + r() * 0.0025 }));
  let w = 0, h = 0, raf;
  const size = () => { const d = window.devicePixelRatio || 1; w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = w * d; canvas.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  size();
  const P = p => [p.x * w, p.y * h];
  const curve = (a, b, t) => { const [x1, y1] = P(a), [x2, y2] = P(b); const cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - 60; const u = 1 - t; return [u * u * x1 + 2 * u * t * cx + t * t * x2, u * u * y1 + 2 * u * t * cy + t * t * y2]; };
  function frame() {
    if (!canvas.isConnected) return cancelAnimationFrame(raf);
    if (canvas.clientWidth !== w) size();
    ctx.clearRect(0, 0, w, h);
    ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1;
    links.forEach(([a, b]) => { const [x1, y1] = P(pts[a]), [x2, y2] = P(pts[b]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2, Math.min(y1, y2) - 60, x2, y2); ctx.stroke(); });
    ctx.setLineDash([]);
    pts.forEach(p => { const [x, y] = P(p); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); });
    movers.forEach(m => { if (!reduce) m.t = (m.t + m.s) % 1; const [x, y] = curve(pts[m.l[0]], pts[m.l[1]], m.t); ctx.fillStyle = 'rgba(159,240,200,.95)'; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill(); });
    if (!reduce) raf = requestAnimationFrame(frame);
  }
  frame();
}

/* ---------- Router ---------- */
const ROUTES = {};
const route = (name, fn) => { ROUTES[name] = fn; };
function go(name) { if (location.hash === '#' + name) render(); else location.hash = name; }
let fleetTimer = null;
function render() {
  // On the Elsha subdomain (elsha.jacknjose.co.in) the site opens on the Elsha page; the logo still leads to the group home.
  const startPage = 'home';
  const name = (location.hash || '#' + startPage).slice(1) || startPage;
  const fn = ROUTES[name] || ROUTES.home;
  if (fleetTimer) { clearInterval(fleetTimer); fleetTimer = null; }
  closeModal();
  const app = $('#app');
  app.innerHTML = '';
  if (typeof Auth !== 'undefined' && PROTECTED.includes(name) && !Auth.can(name)) {
    if (!Auth.user()) { Session.set('afterLogin', name); location.replace('#login'); return; }
    app.innerHTML = noAccessHtml(name);
  } else fn(app);
  $$('canvas[data-routes]', app).forEach(startRouteCanvas);
  window.scrollTo(0, 0);
  if (typeof Remote !== 'undefined' && Remote.on && !PROTECTED.includes(name)) Remote.refreshIfStale(45000); // customers: quietly pick up new listings, photos and seat availability
  if (typeof Remote !== 'undefined' && Remote.on && PROTECTED.includes(name)) Remote.refreshIfStale().then(changed => { if (changed && !$('.modal-back') && (location.hash || '#home').slice(1) === name && !document.activeElement?.matches?.('input, textarea, select')) { const y = scrollY; render(); window.scrollTo(0, y); } });
  $$('.nav-links').forEach(n => n.classList.remove('open'));
  $$('.nav-item').forEach(n => n.classList.remove('open'));
  $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav.split(' ').includes(name.split('-')[0])));
  document.title = (ROUTE_TITLES[name] ? ROUTE_TITLES[name] + ' · ' : '') + 'Elsha by Jack & Jose';
}
const ROUTE_TITLES = {};
window.addEventListener('hashchange', render);

/* datalists for city inputs */
function injectDatalists() {
  const dl = (id, list) => `<datalist id="${id}">${list.map(c => `<option value="${esc(c)}"></option>`).join('')}</datalist>`;
  const div = document.createElement('div'); div.hidden = true;
  div.innerHTML = dl('dl-india', Object.keys(INDIA_CITIES).sort()) + dl('dl-world', [...Object.keys(INDIA_CITIES).sort(), ...Object.keys(WORLD_CITIES).sort()]);
  document.body.appendChild(div);
}
