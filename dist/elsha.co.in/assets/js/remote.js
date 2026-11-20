/* Database connection. Active when SITE_CONFIG.api is set (e.g. 'api/').
   The rest of the site keeps using Store.get / Store.set as before; here those calls are redirected to the server:
   data is loaded once at start, and every add / change / delete is sent to the API as it happens. */
'use strict';

const REMOTE_OBJECT_KEYS = ['gatewaySettings', 'notifySettings'];     // single settings objects
const REMOTE_DEFAULT_KEYS = ['notifyTemplates', ...REMOTE_OBJECT_KEYS]; // fall back to built-in defaults when the database has none
const REMOTE_PUBLIC_CREATE = ['busBookings', 'hotelBookings', 'parcels', 'shipments', 'mediaBookings', 'eeeEnquiries', 'messages', 'reviews'];

const Remote = {
  on: !!SITE_CONFIG.api,
  user: null, token: null, cache: {}, own: {}, lastBoot: 0, lastSig: '', saving: 0, offline: false,
  url(a, params = '') { return SITE_CONFIG.api.replace(/\/?$/, '/') + '?a=' + a + params; },
  async call(a, body, params = '') {
    const r = await fetch(this.url(a, params), { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(this.token ? { 'X-Auth': this.token } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    const j = await r.json().catch(() => ({ error: 'bad_response', message: 'The server sent an unreadable reply.' }));
    if (!r.ok) throw Object.assign(new Error(j.message || j.error || 'HTTP ' + r.status), { status: r.status, code: j.error });
    return j;
  },
  /* Load everything this visitor (or signed-in staff member) may see */
  async load() {
    const data = await this.call('boot'); this.offline = false; this.lastBoot = Date.now(); this.apiVersion = data.apiVersion || 1;
    const sig = JSON.stringify(data.collections).length + ':' + hashStr(JSON.stringify(data.collections));
    const changed = sig !== this.lastSig; this.lastSig = sig;
    if (this.token && !data.user) this.forget(); // session expired on the server
    this.user = data.user || null;
    const next = {};
    for (const [k, list] of Object.entries(data.collections || {})) {
      if (REMOTE_OBJECT_KEYS.includes(k)) { if (list[0]) { const { id, ...rest } = list[0]; next[k] = rest; } }
      else if (list.length || !REMOTE_DEFAULT_KEYS.includes(k)) next[k] = list;
    }
    /* keep records this visitor created or looked up (their own bookings), which the public list does not include */
    for (const [k, map] of Object.entries(this.own)) { const have = new Set((next[k] || []).map(d => d.id)); const mine = [...map.values()].filter(d => !have.has(d.id)); if (mine.length) next[k] = [...mine, ...(next[k] || []).filter(d => !mine.some(m => m._pid === d.id))]; }
    this.cache = next;
    return changed;
  },
  remember(k, doc, pid) { (this.own[k] = this.own[k] || new Map()).set(doc.id, pid ? { ...doc, _pid: pid } : doc); },
  /* Send the difference between the old and new value of a collection */
  sync(k, prev, next) {
    if (REMOTE_OBJECT_KEYS.includes(k)) return this.save(k, { id: 'main', ...next });
    const before = new Map((prev || []).map(d => [d.id, JSON.stringify(d)]));
    for (const d of next) { if (before.get(d.id) !== JSON.stringify(d)) this.save(k, d, !before.has(d.id)); before.delete(d.id); }
    for (const id of before.keys()) this.remove(k, id);
  },
  save(k, doc, isNew = false) {
    const { _pid, ...clean } = doc; this.saving++;
    return this.call('save', { c: k, doc: clean }).then(() => { if (!this.user) this.remember(k, doc); })
      .catch(e => this.failed(k, e, isNew)).finally(() => this.saving--);
  },
  remove(k, id) { this.saving++; return this.call('delete', { c: k, id }).catch(e => this.failed(k, e)).finally(() => this.saving--); },
  failed(k, e, isNew) {
    console.warn('Not saved to the database:', k, e.message);
    if (this.user) toast(`Not saved to the database: ${e.message}`, 'err');
    else if (isNew && REMOTE_PUBLIC_CREATE.includes(k)) toast(e.status ? e.message : 'We could not reach our server. Please send your request on WhatsApp or call us.', 'err');
  },
  async fetchOne(k, id) {
    try { const r = await this.call('one', null, `&c=${encodeURIComponent(k)}&id=${encodeURIComponent(id)}`); this.remember(k, r.doc, r.pid);
      const list = (this.cache[k] || []).filter(d => d.id !== r.doc.id && d.id !== r.pid); this.cache[k] = [{ ...r.doc, _pid: r.pid }, ...list]; return this.cache[k][0]; }
    catch (e) { if (e.status !== 404 && e.status !== 400) toast('Could not reach the server. Check your connection and try again.', 'err'); return undefined; }
  },
  keep(remember) { try { (remember ? localStorage : sessionStorage).setItem('jj_token', this.token); } catch (e) { /* in-memory only */ } },
  forget() { this.token = null; try { sessionStorage.removeItem('jj_token'); localStorage.removeItem('jj_token'); } catch (e) { } },
  async init() {
    try { this.token = sessionStorage.getItem('jj_token') || localStorage.getItem('jj_token') || null; } catch (e) { this.token = null; }
    try { await this.load(); } catch (e) { this.offline = true; this.user = null; console.warn('Database unavailable:', e.message); return e; }
    return null;
  },
  /* Staff pages re-check the server so two people working at once see each other's changes */
  async refreshIfStale(ms = 15000) { if (!this.on || this.saving || Date.now() - this.lastBoot < ms) return false; try { return await this.load(); } catch (e) { return false; } },
};

/* Look one record up by its ID: local data first, then the server (customers only hold their own bookings). */
Store.lookup = async (k, id) => { const local = Store.find(k, id); if (local || !Remote.on) return local; return Remote.fetchOne(k, id); };

if (Remote.on) {
  Store.get = k => (k in Remote.cache) ? Remote.cache[k] : (Remote.cache[k] = REMOTE_DEFAULT_KEYS.includes(k) && SEED[k] ? SEED[k]() : []);
  Store.set = (k, v) => { const prev = Remote.cache[k]; Remote.cache[k] = v; Store.lastError = null; Remote.sync(k, prev, v); };
  Store.resetAll = () => toast('The website is connected to the database, so there is no sample data to reset.', 'err');

  Auth.user = () => Remote.user;
  Auth.login = async (username, password, remember) => {
    try { const r = await Remote.call('login', { username: username.trim(), hash: passHash(username, password) }); Remote.token = r.token; Remote.keep(remember); await Remote.load(); return { user: Remote.user || r.user }; }
    catch (e) { return { error: e.status ? e.message : 'Could not reach the server. Check your connection and try again.' }; }
  };
  Auth.logout = () => { Remote.call('logout', {}).catch(() => { }); Remote.forget(); Remote.user = null; Remote.cache = {}; Remote.lastSig = ''; Remote.load().then(() => render()).catch(() => { }); };
}

/* Staff dashboard card (administrator): database status, starter listings, backup */
function dbCardHtml() {
  const n = k => Store.get(k).length;
  return `<div class="card stack" style="margin-top:18px"><div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center"><div><b>Database ${Remote.offline ? '<span class="chip danger">Not reachable</span>' : '<span class="chip green">Connected</span>'}</b>
    <p class="muted small">Everything staff and customers enter is saved on your server: ${n('buses')} buses, ${n('hotels')} hotels, ${n('branches')} branches, ${n('vehicles')} vehicles, ${n('busBookings') + n('hotelBookings')} bookings, ${n('parcels')} parcels.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-outline" id="db-seed">Load sample listings</button><button class="btn btn-outline" id="db-backup">Download backup</button></div></div>
    <p class="muted small">“Load sample listings” adds example agents, hotels, branches and vehicles so the portals are not empty (no sample buses). Edit or delete them and add your own. It never adds customer bookings.</p></div>`;
}
function bindDbCard(body, again) {
  $('#db-seed', body).onclick = () => confirmBox('Add the sample agents, hotels, branches and vehicles to the database? Existing records with the same ID are overwritten.', async () => {
    try { const r = await Remote.call('import', { collections: Object.fromEntries(['agents', 'hotels', 'branches', 'vehicles', 'trips', 'maintenance'].map(k => [k, SEED[k]()])) }); await Remote.load(); toast(`${r.saved} sample records added`); again(); }
    catch (e) { toast('Could not load the sample listings: ' + e.message, 'err'); } }, 'Add sample listings');
  $('#db-backup', body).onclick = async () => {
    try { const data = await Remote.call('export'), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })); a.download = `elsha-backup-${todayISO()}.json`; document.body.appendChild(a); a.click(); a.remove(); toast('Backup downloaded'); }
    catch (e) { toast('Backup failed: ' + e.message, 'err'); } };
}
