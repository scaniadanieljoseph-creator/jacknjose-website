/* Group pages (home, ventures, contact, admin hub), navigation and boot */
'use strict';

const VERTICALS = [
  { id: 'transports', venture: 'jj', icon: 'truck', title: 'Transports', text: 'Air, road and sea freight. Full and part truck loads across India and to the world.' },
  { id: 'logistics', venture: 'jj', icon: 'box', title: 'Logistics', text: 'Parcel booking with pickup, loading, unloading, door delivery and live tracking.' },
  { id: 'fleet', venture: 'jj', icon: 'fleet', title: 'Fleet management', text: 'One portal for every truck, bus and car: live positions, trips, compliance and service.' },
  { id: 'travels', venture: 'jj', icon: 'bus', title: 'Travels', text: 'Bus tickets to cities across India with live seat maps and an agent network.' },
  { id: 'hotels', venture: 'jj', icon: 'hotel', title: 'Hotels', text: 'Hotel rooms from backwater resorts to business stays, with instant vouchers.' },
  { id: 'media', venture: 'el', icon: 'camera', title: 'Media & Design', text: 'Photography, videography, drone aerials and design studio by Elsha.' },
  { id: 'eee', venture: 'el', icon: 'bolt', title: 'EEE · Energy Efficiency', text: 'Energy audits, consultation and efficient appliances for hostels and companies.' },
];
const PORTALS = [['travels-admin', 'bus', 'Travels portal', 'Buses, agents and ticket bookings'], ['hotels-admin', 'hotel', 'Hotels portal', 'Partner hotels, rates and guest bookings'], ['logistics-admin', 'box', 'Logistics portal', 'Parcels, loading sheets and branches'], ['fleet', 'fleet', 'Fleet portal', 'Vehicles, trips, maintenance and alerts'], ['payments-admin', 'chart', 'Payments portal', 'Collections, refunds and settlements'], ['notify-admin', 'mail', 'Notifications portal', 'SMS & email log, templates and providers']];

function headerHtml() {
  const dd = (items) => items.map(v => `<a href="#${v.id}"><span class="dd-icon ${v.venture === 'el' ? 'g' : ''}">${icon(v.icon)}</span><div><b>${v.title}</b><span>${v.text.split('.')[0]}.</span></div></a>`).join('');
  return `<div class="wrap nav"><a class="brand" href="#home"><span class="brand-mark">${BRAND_MARK}</span><span>Elsha<small>by Jack &amp; Jose</small></span></a>
    <button class="menu-btn" aria-label="Open menu" id="menu-btn">☰</button>
    <nav class="nav-links" id="nav-links">
      <div class="nav-item"><button class="nav-link" data-nav="jack transports logistics fleet travels hotels bus hotel">Jack &amp; Jose <span class="caret">▼</span></button><div class="dropdown"><a href="#jack-jose"><span class="dd-icon">${icon('globe')}</span><div><b>About Jack &amp; Jose</b><span>Travels and transports venture.</span></div></a>${dd(VERTICALS.filter(v => v.venture === 'jj'))}</div></div>
      <div class="nav-item"><button class="nav-link" data-nav="elsha media eee">Elsha <span class="caret">▼</span></button><div class="dropdown"><a href="#elsha"><span class="dd-icon g">${icon('leaf')}</span><div><b>About Elsha</b><span>Media, design and energy venture.</span></div></a>${dd(VERTICALS.filter(v => v.venture === 'el'))}</div></div>
      <a class="nav-link" href="#travels" data-nav="travels bus">Bus tickets</a><a class="nav-link" href="#hotels" data-nav="hotels hotel">Hotels</a>
      <div class="nav-item"><button class="nav-link" data-nav="admin login">${Auth.user() ? esc(Auth.user().name.split(' ')[0]) : 'Staff'} <span class="caret">▼</span></button><div class="dropdown" style="right:0;left:auto">
        ${Auth.user() ? `<div class="small muted" style="padding:6px 10px">Signed in as <b>${esc(Auth.user().username)}</b> · ${esc(ROLES[Auth.user().role].label)}</div>` : `<a href="#login"><span class="dd-icon g">${icon('shield')}</span><div><b>Staff sign in</b><span>Access the master portals.</span></div></a>`}
        <a href="#admin"><span class="dd-icon">${icon('grid')}</span><div><b>All portals & enquiries</b><span>Staff dashboard.</span></div></a>${PORTALS.filter(([id]) => !Auth.user() || Auth.can(id)).map(([id, ic, t, d]) => `<a href="#${id}"><span class="dd-icon">${icon(ic)}</span><div><b>${t}</b><span>${d}.</span></div></a>`).join('')}
        ${Auth.user() ? `<a href="#home" data-logout><span class="dd-icon" style="background:var(--danger-soft);color:var(--danger)">${icon('shield')}</span><div><b>Sign out</b><span>End this staff session.</span></div></a>` : ''}</div></div>
      <a class="btn btn-green btn-sm nav-cta" href="#contact">Contact us</a></nav></div>`;
}
function footerHtml() {
  return `<div class="wrap"><div class="footer-grid"><div class="stack"><a class="brand" href="#home"><span class="brand-mark">${BRAND_MARK}</span><span>Elsha<small>by Jack &amp; Jose</small></span></a><p style="max-width:40ch">Jack &amp; Jose runs travels and transports. Elsha runs media, design and energy efficiency. Both are part of one group.</p></div>
    <div><h4>Jack &amp; Jose</h4>${VERTICALS.filter(v => v.venture === 'jj').map(v => `<a href="#${v.id}">${v.title}</a>`).join('')}</div>
    <div><h4>Elsha</h4>${VERTICALS.filter(v => v.venture === 'el').map(v => `<a href="#${v.id}">${v.title}</a>`).join('')}<a href="#elsha">About Elsha</a></div>
    <div><h4>Company</h4><a href="#contact">Contact</a><a href="#terms">Terms of service</a><a href="#privacy">Privacy policy</a><a href="#refunds">Cancellation &amp; refunds</a><a href="#login">Staff sign in</a></div></div>
    <div class="legal"><span>© ${new Date().getFullYear()} Jack &amp; Jose · jacknjose.co.in</span><span>${[SITE_CONFIG.phone, SITE_CONFIG.email, SITE_CONFIG.supportEmail, SITE_CONFIG.gstin && 'GSTIN ' + SITE_CONFIG.gstin].filter(Boolean).map(esc).join(' · ') || 'Fares and freight rates shown are estimates until confirmed.'}</span></div></div>`;
}
const vertCard = v => `<a class="card svc ${v.venture}" href="#${v.id}">${pic(v.id)}<div class="ico ${v.venture === 'el' ? 'g' : ''}">${icon(v.icon)}</div><h3>${v.title}</h3><p>${v.text}</p><span class="more">${['fleet'].includes(v.id) ? 'Open portal' : 'Explore'} →</span></a>`;

ROUTE_TITLES.home = '';
route('home', app => {
  app.innerHTML = `<section class="hero"><canvas data-routes></canvas><div class="wrap">
    <div class="eyebrow">Jack &amp; Jose · Elsha</div><h1 style="margin-top:12px">Moving people and cargo across India. Creating images and saving energy.</h1>
    <p class="lead">Book a bus seat, a hotel room, a parcel or a full truckload with Jack &amp; Jose. Hire Elsha for photography, design and energy-efficiency consulting.</p>
    <div class="search-box" style="margin-top:32px;max-width:1000px"><div class="tabs" id="qb-tabs">${[['bus', 'bus', 'Bus tickets'], ['hotel', 'hotel', 'Hotels'], ['parcel', 'box', 'Send parcel'], ['freight', 'truck', 'Freight quote']].map(([k, i, l], n) => `<button class="tab ${n ? '' : 'on'}" data-qb="${k}">${icon(i).replace('<svg', '<svg style="width:18px;height:18px"')} ${l}</button>`).join('')}</div><div id="qb-body"></div></div></div></section>
  <section class="section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Two ventures, one group</div><h2 style="margin-top:6px">Jack &amp; Jose and Elsha</h2></div></div>
    <div class="grid g2"><a class="venture jj" href="#jack-jose">${pic('jj', 'venture-art')}<span class="eyebrow" style="color:#9ff0c8">Travels &amp; Transports</span><h2>Jack &amp; Jose</h2><p>Bus and hotel bookings, freight by road, air and sea, parcel logistics and a fleet run from one control room.</p><div class="chips">${VERTICALS.filter(v => v.venture === 'jj').map(v => `<span class="chip">${v.title}</span>`).join('')}</div><span class="go">Explore Jack &amp; Jose →</span></a>
    <a class="venture el" href="#elsha">${pic('eee', 'venture-art')}<span class="eyebrow" style="color:#c6f6dd">Media, Design &amp; Energy</span><h2>Elsha</h2><p>Photographers, filmmakers and designers, plus EEE: energy-efficiency consulting and appliance supply for hostels and companies.</p><div class="chips">${VERTICALS.filter(v => v.venture === 'el').map(v => `<span class="chip">${v.title}</span>`).join('')}</div><span class="go">Explore Elsha →</span></a></div></div></section>
  <section class="section band"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Everything we do</div><h2 style="margin-top:6px">Seven services</h2></div><p>Each service has its own booking page, and the operational ones have a master portal for our staff.</p></div><div class="grid g4">${VERTICALS.map(vertCard).join('')}</div></div></section>
  <section class="section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">On the road, at sea and behind the lens</div><h2 style="margin-top:6px">A look at what we run</h2></div></div>
    <div class="photo-grid">${[['travels', 'Overnight sleeper buses', 'travels'], ['hotels', 'Backwater and city stays', 'hotels'], ['sea', 'Sea freight from Kochi', 'transports'], ['air', 'Air cargo worldwide', 'transports'], ['logistics', 'Parcel hubs and door delivery', 'logistics'], ['fleet', 'A fleet tracked live', 'fleet'], ['media', 'Films and photography', 'media'], ['eee', 'Solar and efficient buildings', 'eee']].map(([k, cap, to]) => `<a class="photo" href="#${to}">${pic(k)}<span>${cap}</span></a>`).join('')}</div></div></section>
  <section class="section"><div class="wrap"><div class="stats">${[[Object.keys(INDIA_CITIES).length, 'Indian cities on our bus and freight network'], [Object.keys(WORLD_CITIES).length, 'International ports and airports for freight'], [Store.get('branches').filter(b => b.status === 'Active').length, 'Parcel branches and hubs'], [Store.get('hotels').filter(h => h.active === 'Active').length, 'Partner hotels listed']].map(([n, l]) => `<div class="stat"><b data-count="${n}">${n}</b><span>${l}</span></div>`).join('')}</div></div></section>
  <section class="section-tight"><div class="wrap"><div class="venture jj" style="min-height:0;flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:space-between"><div style="display:grid;gap:8px"><h2>Need to move a full truckload this week?</h2><p>Get an instant estimate for any city pair, then book pickup online.</p></div><a class="btn btn-light btn-lg" href="#transports">Get a freight quote</a></div></div></section>`;
  const body = $('#qb-body', app);
  const qb = k => {
    $$('[data-qb]', app).forEach(t => t.classList.toggle('on', t.dataset.qb === k));
    if (k === 'bus') { body.innerHTML = busSearchForm(); bindBusSearch(body); }
    if (k === 'hotel') { body.innerHTML = hotelSearchForm(); bindHotelSearch(body); }
    if (k === 'parcel') body.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between"><p style="max-width:56ch">Book at any of our ${Store.get('branches').filter(b => b.status === 'Active').length} branches with door pickup, loading and unloading help. Track every step with your airway bill number.</p><a class="btn btn-green btn-lg" href="#logistics">Book a parcel</a></div>`;
    if (k === 'freight') body.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between"><p style="max-width:56ch">Road FTL and PTL across India, air cargo and sea containers worldwide. Instant estimate with GST and transit time.</p><a class="btn btn-green btn-lg" href="#transports">Get freight quote</a></div>`;
  };
  $$('[data-qb]', app).forEach(t => t.onclick = () => qb(t.dataset.qb)); qb('bus');
  $$('[data-count]', app).forEach(el => { const n = +el.dataset.count; if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; let i = 0; const t = setInterval(() => { i++; el.textContent = Math.round(n * i / 30); if (i >= 30) clearInterval(t); }, 30); });
});

ROUTE_TITLES['jack-jose'] = 'Jack & Jose';
route('jack-jose', app => {
  app.innerHTML = pageHero({ eyebrow: 'Travels & Transports', title: 'Jack & Jose', lead: 'Passenger travel and goods movement under one roof: buses, hotels, freight, parcels and the fleet that runs them.' }) +
  `<section class="section"><div class="wrap"><div class="grid g3">${VERTICALS.filter(v => v.venture === 'jj').map(vertCard).join('')}</div></div></section>
  <section class="section band"><div class="wrap"><div class="section-head"><div><div class="eyebrow">For our team</div><h2 style="margin-top:6px">Master portals</h2></div><p>Staff, agents and branch managers run daily operations here.</p></div><div class="grid g4">${PORTALS.map(([id, ic, t, d]) => `<a class="card svc" href="#${id}"><div class="ico">${icon(ic)}</div><h3>${t}</h3><p>${d}</p><span class="more">Open →</span></a>`).join('')}</div></div></section>`;
});
ROUTE_TITLES.elsha = 'Elsha';
route('elsha', app => {
  app.innerHTML = pageHero({ elsha: true, eyebrow: 'Media, Design & Energy', title: 'Elsha', lead: 'Elsha brings together photographers, filmmakers and designers with an energy-efficiency team that helps hostels and companies cut their power bills.' }) +
  `<section class="section"><div class="wrap"><div class="grid g2">${VERTICALS.filter(v => v.venture === 'el').map(vertCard).join('')}</div></div></section>
  <section class="section band"><div class="wrap grid g2"><div class="stack"><div class="eyebrow">Elsha Media &amp; Designers</div><h2>Photography, films and brand design</h2><p class="muted">Weddings, corporate films, product catalogues and drone aerials, with an in-house design studio for logos, brochures and social media.</p><div><a class="btn btn-green" href="#media">See media services</a></div></div>
    <div class="stack"><div class="eyebrow">EEE · Elsha Energy Efficiency</div><h2>Consultation and efficient appliances</h2><p class="muted">Energy audits, savings reports, and supply and installation of LED, BLDC fans, heat pumps, inverter ACs and rooftop solar.</p><div><a class="btn btn-green" href="#eee">See energy services</a></div></div></div></section>`;
});

ROUTE_TITLES.contact = 'Contact';
route('contact', app => {
  app.innerHTML = pageHero({ eyebrow: 'Contact', title: 'Talk to the right team', lead: 'Send us a message and the team for that service will reply within one working day.' }) +
  `<section class="wrap overlap"><div class="search-box"><div class="split"><form id="ct" class="form-grid">
    <label class="field"><span>Your name</span><input class="input" id="ct-name" name="name" required></label><label class="field"><span>Mobile</span><input class="input" id="ct-ph" name="phone" required pattern="[0-9+ ]{10,15}"></label>
    <label class="field"><span>Email</span><input class="input" id="ct-em" name="email" type="email"></label><label class="field"><span>Service</span><select class="input" id="ct-svc" name="service">${VERTICALS.map(v => `<option>${v.title}</option>`).join('')}<option>Other</option></select></label>
    <label class="field full"><span>Message</span><textarea class="input" id="ct-msg" name="message" required></textarea></label><button class="btn btn-green btn-lg full">Send message</button></form>
    <div class="stack" style="align-content:start">${[['pin', 'Head office', SITE_CONFIG.address], ['mail', 'Bookings & enquiries', SITE_CONFIG.email], ['mail', 'Customer care', SITE_CONFIG.supportEmail], ['phone', 'Phone', SITE_CONFIG.phone], ['phone', 'WhatsApp', SITE_CONFIG.whatsapp ? '+' + SITE_CONFIG.whatsapp.replace(/\D/g, '') : ''], ['clock', 'Hours', SITE_CONFIG.hours]].filter(r => r[2]).map(([i, t, d]) => `<div style="display:flex;gap:12px;align-items:flex-start"><div class="ico">${icon(i)}</div><div><b>${t}</b><div class="muted" style="user-select:all">${d}</div></div></div>`).join('')}</div></div></div></section><div style="height:40px"></div>`;
  $('#ct', app).onsubmit = e => { e.preventDefault(); const f = e.target; Store.add('messages', { id: genId('MSG', 5), name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), service: f.service.value, message: f.message.value.trim(), status: 'New', createdAt: new Date().toISOString() }); if (Launch.request('contact', Store.get('messages')[0])) { f.reset(); return; } Notify.event('contact_received', Store.get('messages')[0]); f.reset(); toast('Message saved. The team will reply within one working day.'); };
});
SEED.messages = () => [];

ROUTE_TITLES.admin = 'Portals';
route('admin', app => {
  const isAdmin = Auth.user()?.role === 'admin';
  const tabs = [['portals', 'Portals'], ['ship', 'Freight shipments'], ['media', 'Media bookings'], ['eee', 'EEE enquiries'], ['msg', 'Messages'], ...(isAdmin ? [['users', 'Staff users']] : [])];
  let active = Session.get('tab_#admin') || 'portals'; if (!tabs.some(t => t[0] === active)) active = 'portals';
  app.innerHTML = adminShell({ title: 'Staff dashboard', sub: 'Jump into a master portal or follow up on bookings and enquiries.', tabs, active, base: 'home' });
  const body = $('#admin-body', app);
  const follow = (key) => [{ id: 'st', label: 'Next status', show: r => !['Confirmed', 'Closed'].includes(r.status), run: (r, rr) => { const order = ['New', 'Contacted', 'Confirmed']; const n = order[Math.min(order.length - 1, order.indexOf(r.status) + 1)] || 'Contacted'; Store.update(key, r.id, { status: n }); toast(`${r.id} → ${n}`); rr(); } }];
  const show = tab => {
    if (tab === 'portals') {
      const B = Store.get('busBookings'), H = Store.get('hotelBookings'), P = Store.get('parcels'), V = Store.get('vehicles');
      body.innerHTML = `<div class="kpis">${kpi('Bus bookings', B.filter(b => b.status === 'Confirmed').length)}${kpi('Hotel bookings', H.filter(b => b.status !== 'Cancelled').length)}${kpi('Parcels in network', P.filter(p => !['Delivered', 'Cancelled'].includes(p.status)).length)}${kpi('Vehicles on trip', V.filter(v => v.status === 'On Trip').length, `${vehicleAlerts().length} fleet alerts`)}${kpi('Open enquiries', [...Store.get('mediaBookings'), ...Store.get('eeeEnquiries'), ...Store.get('messages')].filter(x => x.status === 'New').length)}</div>
        <div class="grid g4" style="margin-top:18px">${PORTALS.map(([id, ic, t, d]) => Auth.can(id) ? `<a class="card svc" href="#${id}"><div class="ico">${icon(ic)}</div><h3>${t}</h3><p>${d}</p><span class="more">Open →</span></a>` : `<div class="card svc" style="opacity:.55"><div class="ico">${icon(ic)}</div><h3>${t}</h3><p>${d}</p><span class="more" style="color:var(--muted)">No access for your role</span></div>`).join('')}</div>
        ${isAdmin ? `<div class="card" style="margin-top:18px;display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center"><div><b>Demo data</b><p class="muted small">This preview stores bookings in this browser only. Reset to restore the sample records and staff accounts.</p></div><button class="btn btn-outline" id="reset">Reset sample data</button></div>` : ''}`;
      if (isAdmin) $('#reset', body).onclick =() => confirmBox('Erase every booking, branch, vehicle and enquiry saved in this browser and restore the sample data?', () => { Store.resetAll(); toast('Sample data restored'); show('portals'); }, 'Reset data');
    }
    if (tab === 'ship') renderCrud(body, { key: 'shipments', single: 'Shipment', plural: 'Shipments', noAdd: true, noEdit: true, label: r => r.id,
      columns: [{ label: 'ID', render: r => `<span class="mono">${esc(r.id)}</span>` }, { label: 'Mode', render: r => `${MODE_INFO[r.mode].label} · ${r.load === 'FTL' ? 'Full' : 'Part'}` }, { label: 'Route', render: r => `${esc(r.from)} → ${esc(r.to)}` }, { label: 'Shipper', render: r => `${esc(r.company)}<div class="muted small">${esc(r.contact)} · ${esc(r.phone)}</div>` }, { label: 'Pickup', render: r => fmtDate(r.pickupDate) }, { label: 'Freight', render: r => inr(r.total) }, { label: 'Status', render: r => statusChip(SHIP_STAGES(r.intl)[r.stage]) }],
      actions: [{ id: 'adv', label: 'Advance', show: r => r.stage < SHIP_STAGES(r.intl).length - 1, run: (r, rr) => { Store.update('shipments', r.id, { stage: r.stage + 1 }); Notify.event('shipment_update', Store.find('shipments', r.id)); toast(`${r.id} → ${SHIP_STAGES(r.intl)[r.stage + 1]}`); rr(); } }] });
    if (tab === 'media') renderCrud(body, { key: 'mediaBookings', single: 'Booking', plural: 'Media bookings', noAdd: true, noEdit: true, label: r => r.id,
      columns: [{ label: 'Ref', render: r => `<span class="mono">${esc(r.id)}</span>` }, { label: 'Service', render: r => `${esc(r.service)}<div class="muted small">${esc(r.pkg || 'Custom quote')}</div>` }, { label: 'Date & place', render: r => `${fmtDate(r.date)}<div class="muted small">${esc(r.location)}</div>` }, { label: 'Client', render: r => `${esc(r.name)}<div class="muted small">${esc(r.phone)}</div>` }, { label: 'Status', render: r => statusChip(r.status) }], actions: follow('mediaBookings') });
    if (tab === 'eee') renderCrud(body, { key: 'eeeEnquiries', single: 'Enquiry', plural: 'EEE enquiries', noAdd: true, noEdit: true, label: r => r.org,
      columns: [{ label: 'Ref', render: r => `<span class="mono">${esc(r.id)}</span>` }, { label: 'Organisation', render: r => `${esc(r.org)}<div class="muted small">${esc(r.type)} · ${esc(r.city)}</div>` }, { label: 'Monthly bill', render: r => r.bill ? inr(r.bill) : '—' }, { label: 'Products', render: r => r.items.length ? r.items.map(i => `${i.qty} × ${esc(i.name)}`).join('<br>') : '—' }, { label: 'Contact', render: r => `${esc(r.contact)}<div class="muted small">${esc(r.phone)}</div>` }, { label: 'Status', render: r => statusChip(r.status) }], actions: follow('eeeEnquiries') });
    if (tab === 'msg') renderCrud(body, { key: 'messages', single: 'Message', plural: 'Messages', noAdd: true, noEdit: true, label: r => r.id,
      columns: [{ label: 'Received', render: r => fmtDateTime(r.createdAt) }, { label: 'From', render: r => `${esc(r.name)}<div class="muted small">${esc(r.phone)} ${esc(r.email)}</div>` }, { label: 'Service', field: 'service' }, { label: 'Message', render: r => `<div style="max-width:40ch">${esc(r.message)}</div>` }, { label: 'Status', render: r => statusChip(r.status) }], actions: follow('messages') });
    if (tab === 'users' && isAdmin) {
      const me = Auth.user();
      const admins = (except) => Store.get('staffUsers').filter(u => u.role === 'admin' && u.status === 'Active' && u.id !== except).length;
      renderCrud(body, { key: 'staffUsers', single: 'Staff user', plural: 'Staff users', idPrefix: 'USR', label: r => r.username,
        fields: [{ name: 'name', label: 'Full name', required: true }, { name: 'username', label: 'Username', required: true, placeholder: 'e.g. kochi.branch' }, { name: 'role', label: 'Role', type: 'select', options: Object.entries(ROLES).map(([k, v]) => [k, v.label]) },
          { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }, { name: 'password', label: 'Password (leave blank to keep current)', type: 'password', full: true, placeholder: 'At least 8 characters with a number' }],
        validate: (d, row) => {
          d.username = d.username.toLowerCase();
          if (!/^[a-z0-9._-]{3,30}$/.test(d.username)) return 'Username: 3–30 characters, letters, numbers, dot, dash or underscore';
          if (Store.get('staffUsers').some(u => u.username === d.username && u.id !== row?.id)) return `Username ${d.username} is taken`;
          if (row && row.id === me.id && (d.status !== 'Active' || d.role !== 'admin')) return 'You can’t disable or demote your own account';
          if (!row && !d.password) return 'Set a password for the new user';
          if (d.password && (d.password.length < 8 || !/\d/.test(d.password))) return 'Password needs at least 8 characters including a number';
          if (row && row.role === 'admin' && (d.role !== 'admin' || d.status !== 'Active') && admins(row.id) === 0) return 'Keep at least one active group administrator';
          if (row && row.username !== d.username && !d.password) return 'Changing the username needs a new password too';
          return null;
        },
        transform: (d, row) => { if (d.password) d.passHash = passHash(d.username, d.password); delete d.password; },
        beforeDelete: r => r.id === me.id ? 'You can’t delete the account you’re signed in with' : (r.role === 'admin' && admins(r.id) === 0 ? 'Keep at least one active group administrator' : null),
        columns: [{ label: 'User', render: r => `<b>${esc(r.name)}</b><div class="muted small mono">${esc(r.username)}${r.id === me.id ? ' · you' : ''}</div>` }, { label: 'Role', render: r => `<span class="chip ${r.role === 'admin' ? 'green' : 'blue'}">${esc(ROLES[r.role]?.label || r.role)}</span>` },
          { label: 'Portals', render: r => (ROLES[r.role]?.portals || []).map(p => PORTAL_LABEL[p].replace(' portal', '')).join(', ') }, { label: 'Last sign-in', render: r => r.lastLogin ? fmtDateTime(r.lastLogin) : '—' }, { label: 'Status', render: r => statusChip(r.status) }] });
    }
  };
  bindTabs(app, show); show(active);
});

/* ---------- Boot ---------- */
function refreshHeader() {
  $('#site-header').innerHTML = headerHtml();
  if (!SITE_CONFIG.showStaffMenu && !Auth.user()) $('[data-nav="admin login"]')?.parentElement.remove();
  $('#menu-btn').onclick = () => $('#nav-links').classList.toggle('open');
  $$('.nav-item > .nav-link').forEach(b => b.onclick = () => { const it = b.parentElement, was = it.classList.contains('open'); $$('.nav-item').forEach(n => n.classList.remove('open')); it.classList.toggle('open', !was); });
}
function boot() {
  startBackground();
  mountWhatsApp();
  ensureDemoStaff();
  refreshHeader();
  $('#site-footer').innerHTML = footerHtml();
  injectDatalists();
  document.addEventListener('click', e => {
    const lo = e.target.closest('[data-logout]'); if (lo) { e.preventDefault(); const u = Auth.user(); Auth.logout(); refreshHeader(); toast(u ? `${u.name} signed out` : 'Signed out'); go('login'); return; }
    const s = e.target.closest('[data-scroll]'); if (s) { e.preventDefault(); $('#' + s.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' }); return; }
    if (!e.target.closest('.nav-item')) $$('.nav-item').forEach(n => n.classList.remove('open'));
    const a = e.target.closest('a[href^="#"]'); if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); render(); }
  });
  render();
}
document.addEventListener('DOMContentLoaded', boot);
