/* Staff sign-in for the master portals: accounts, roles, session, login page.
   NOTE: this runs in the browser only. Before launch, move sign-in to your server
   (hashed passwords in a database, server-side sessions, HTTPS-only cookies). */
'use strict';

/* Compact SHA-256 (hex) — used so passwords are never stored in plain text. */
function sha256(input) {
  let ascii = unescape(encodeURIComponent(input));
  const rot = (v, a) => (v >>> a) | (v << (32 - a)), maxWord = 2 ** 32, words = [], bitLen = ascii.length * 8;
  let hash = [], k = [], n = 0; const composite = {};
  for (let c = 2; n < 64; c++) { if (!composite[c]) { for (let i = 0; i < 313; i += c) composite[i] = c; hash[n] = (c ** .5 * maxWord) | 0; k[n++] = (c ** (1 / 3) * maxWord) | 0; } }
  ascii += '\x80'; while (ascii.length % 64 - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) words[i >> 2] |= ascii.charCodeAt(i) << ((3 - i) % 4) * 8;
  words[words.length] = (bitLen / maxWord) | 0; words[words.length] = bitLen;
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, j += 16), old = hash; hash = hash.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
      const t1 = hash[7] + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] + (w[i] = i < 16 ? w[i] : (w[i - 16] + (rot(w15, 7) ^ rot(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rot(w2, 17) ^ rot(w2, 19) ^ (w2 >>> 10))) | 0);
      const t2 = (rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(t1 + t2) | 0].concat(hash); hash[4] = (hash[4] + t1) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
  }
  return hash.slice(0, 8).map(h => (h >>> 0).toString(16).padStart(8, '0')).join('');
}
const passHash = (username, password) => sha256(String(username).trim().toLowerCase() + ':jacknjose:' + password);

/* Roles → which portals they can open. 'admin' opens everything and manages staff. */
const ROLES = {
  admin: { label: 'Group administrator', portals: ['travels-admin', 'hotels-admin', 'logistics-admin', 'hotel-crm', 'fleet', 'payments-admin', 'notify-admin', 'admin'] },
  finance: { label: 'Accounts & payments', portals: ['payments-admin', 'admin'] },
  travels: { label: 'Travels manager', portals: ['travels-admin', 'admin'] },
  hotels: { label: 'Hotels manager', portals: ['hotels-admin', 'hotel-crm', 'admin'] },
  logistics: { label: 'Logistics manager', portals: ['logistics-admin', 'fleet', 'admin'] },
  fleet: { label: 'Fleet manager', portals: ['fleet', 'admin'] },
};
const PROTECTED = ['travels-admin', 'hotels-admin', 'logistics-admin', 'fleet', 'payments-admin', 'notify-admin', 'hotel-crm', 'admin'];
const PORTAL_LABEL = { 'travels-admin': 'Travels portal', 'hotels-admin': 'Hotels portal', 'logistics-admin': 'Logistics portal', fleet: 'Fleet portal', 'payments-admin': 'Payments portal', 'notify-admin': 'Notifications portal', 'hotel-crm': 'Hotel CRM', admin: 'Staff dashboard' };
const DEMO_LOGINS = [['admin', 'Admin@123', 'admin', 'Group Administrator'], ['travels.manager', 'Travels@123', 'travels', 'Travels Desk'], ['hotels.manager', 'Hotels@123', 'hotels', 'Hotels Desk'], ['logistics.manager', 'Logistics@123', 'logistics', 'Logistics Desk'], ['fleet.manager', 'Fleet@123', 'fleet', 'Fleet Control'], ['accounts', 'Accounts@123', 'finance', 'Accounts Team']];
SEED.staffUsers = () => DEMO_LOGINS.map(([username, pw, role, name], i) => ({ id: 'USR' + (101 + i), name, username, role, passHash: passHash(username, pw), status: 'Active', lastLogin: '', createdAt: new Date().toISOString(), sample: true }));

/* Add demo accounts introduced after a browser already saved the staff list. */
function ensureDemoStaff() {
  const U = Store.get('staffUsers'); if (!U.some(u => u.sample)) return;
  SEED.staffUsers().filter(d => !U.some(u => u.username === d.username)).forEach(d => Store.add('staffUsers', d));
}
/* Set to false in the live build (tools/build-dist.js) so demo passwords are not shown publicly. */
const SHOW_DEMO_LOGINS = true;
const SESSION_HOURS = 8, MAX_TRIES = 5, LOCK_MIN = 2;
const Auth = {
  _key: 'jj_v1_auth',
  _read(store) { try { const v = JSON.parse(store.getItem(this._key) || 'null'); return v && v.exp > Date.now() ? v : null; } catch (e) { return null; } },
  session() {
    if (this._mem && this._mem.exp > Date.now()) return this._mem;
    const s = this._read(window.sessionStorage) || this._read(window.localStorage);
    this._mem = s; return s;
  },
  user() { const s = this.session(); if (!s) return null; const u = Store.find('staffUsers', s.uid); return u && u.status === 'Active' ? u : null; },
  can(routeName) { const u = this.user(); return !!u && (ROLES[u.role]?.portals || []).includes(routeName); },
  home() { const u = this.user(); return u ? ROLES[u.role].portals[0] : 'login'; },
  login(username, password, remember) {
    const lock = Session.get('authLock') || { n: 0, until: 0 };
    if (lock.until > Date.now()) return { error: `Too many wrong attempts. Try again in ${Math.ceil((lock.until - Date.now()) / 60000)} minute(s).` };
    const u = Store.get('staffUsers').find(x => x.username.toLowerCase() === username.trim().toLowerCase());
    if (!u || u.passHash !== passHash(username, password)) {
      lock.n++; if (lock.n >= MAX_TRIES) { lock.until = Date.now() + LOCK_MIN * 60000; lock.n = 0; } Session.set('authLock', lock);
      return { error: lock.until > Date.now() ? `Too many wrong attempts. Sign-in is locked for ${LOCK_MIN} minutes.` : `Wrong username or password. ${MAX_TRIES - lock.n} attempt(s) left.` };
    }
    if (u.status !== 'Active') return { error: 'This account is disabled. Ask the group administrator to enable it.' };
    Session.set('authLock', { n: 0, until: 0 });
    const s = { uid: u.id, exp: Date.now() + SESSION_HOURS * 3600e3 };
    this._mem = s;
    try { (remember ? localStorage : sessionStorage).setItem(this._key, JSON.stringify(s)); } catch (e) { /* in-memory session only */ }
    Store.update('staffUsers', u.id, { lastLogin: new Date().toISOString() });
    return { user: u };
  },
  logout() { this._mem = null; try { sessionStorage.removeItem(this._key); localStorage.removeItem(this._key); } catch (e) { } },
};

ROUTE_TITLES.login = 'Staff sign in';
route('login', app => {
  if (Auth.user()) { const want = Session.get('afterLogin'); return go(want && Auth.can(want) ? want : Auth.home()); }
  const want = Session.get('afterLogin');
  app.innerHTML = `<section class="login-page"><div class="wrap"><div class="login-card">
    <div class="login-side"><canvas data-routes></canvas><div style="position:relative;display:grid;gap:16px">
      <div class="eyebrow" style="color:#9ff0c8">Staff only</div><h1 style="font-size:clamp(1.6rem,3vw,2.2rem)">Jack &amp; Jose master portals</h1>
      <p style="color:#d6e6f5">Sign in with the account your administrator gave you. You'll only see the portals your role allows.</p>
      <ul class="login-list">${PROTECTED.map(p => `<li>${icon({ 'travels-admin': 'bus', 'hotels-admin': 'hotel', 'logistics-admin': 'box', fleet: 'fleet', 'payments-admin': 'chart', 'notify-admin': 'mail', 'hotel-crm': 'building', admin: 'grid' }[p])}<span>${PORTAL_LABEL[p]}</span></li>`).join('')}</ul></div></div>
    <form class="login-form" id="login-form" autocomplete="on" novalidate>
      <div><h2>Sign in</h2>${want ? `<p class="muted" style="margin-top:6px">Sign in to open the <b>${esc(PORTAL_LABEL[want] || 'portal')}</b>.</p>` : ''}</div>
      <div class="notice" id="login-err" role="alert" hidden style="background:var(--danger-soft);color:var(--danger)"></div>
      <label class="field"><span>Username</span><input class="input" id="lg-user" name="username" autocomplete="username" required autocapitalize="none" spellcheck="false"></label>
      <label class="field"><span>Password</span><div style="position:relative"><input class="input" id="lg-pass" name="password" type="password" autocomplete="current-password" required style="padding-right:70px"><button type="button" class="btn btn-ghost btn-sm" id="lg-eye" style="position:absolute;right:4px;top:50%;transform:translateY(-50%)">Show</button></div></label>
      <label class="check"><input type="checkbox" id="lg-rem" name="remember"> Keep me signed in on this device for ${SESSION_HOURS} hours</label>
      <button class="btn btn-primary btn-lg">Sign in</button>
      <p class="muted small">Forgot your password? The group administrator can reset it from Staff dashboard → Staff users.</p>
      ${SHOW_DEMO_LOGINS ? `<details class="demo-creds"><summary>Demo accounts (remove before launch)</summary><div class="table-wrap" style="margin-top:10px"><table class="table"><thead><tr><th>Role</th><th>Username</th><th>Password</th><th></th></tr></thead><tbody>
        ${DEMO_LOGINS.map(([u, p, r]) => `<tr><td>${ROLES[r].label}</td><td class="mono">${u}</td><td class="mono">${p}</td><td><button type="button" class="btn btn-ghost btn-sm" data-fill="${u}|${p}">Use</button></td></tr>`).join('')}</tbody></table></div></details>` : ''}
    </form></div></div></section>`;
  const f = $('#login-form', app), err = $('#login-err', app);
  $('#lg-eye', app).onclick = e => { const p = f.password; p.type = p.type === 'password' ? 'text' : 'password'; e.target.textContent = p.type === 'password' ? 'Show' : 'Hide'; };
  $$('[data-fill]', app).forEach(b => b.onclick = () => { const [u, p] = b.dataset.fill.split('|'); f.username.value = u; f.password.value = p; f.password.focus(); });
  f.onsubmit = async e => {
    e.preventDefault(); err.hidden = true;
    if (!f.username.value.trim() || !f.password.value) { err.textContent = 'Enter your username and password.'; err.hidden = false; return; }
    const btn = $('button.btn-primary', f); btn.disabled = true;
    const r = await Auth.login(f.username.value, f.password.value, f.remember.checked); btn.disabled = false;
    if (r.error) { err.textContent = r.error; err.hidden = false; f.password.value = ''; f.password.focus(); return; }
    refreshHeader(); toast(`Signed in as ${r.user.name}`);
    Session.set('afterLogin', null);
    go(want && Auth.can(want) ? want : Auth.home());
  };
  setTimeout(() => f.username.focus(), 50);
});

/* Shown instead of a portal when the signed-in user's role doesn't include it. */
function noAccessHtml(name) {
  const u = Auth.user();
  return `<section class="section"><div class="wrap" style="max-width:640px"><div class="card stack" style="text-align:center;padding:36px">
    <div class="ico" style="margin:0 auto">${icon('shield')}</div><h2>You don't have access to the ${esc(PORTAL_LABEL[name])}</h2>
    <p class="muted">You're signed in as <b>${esc(u.name)}</b> (${esc(ROLES[u.role].label)}). Ask the group administrator to change your role, or sign in with another account.</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn btn-primary" href="#${Auth.home()}">Go to my portal</a><button class="btn btn-outline" data-logout>Sign in as someone else</button></div></div></div></section>`;
}
