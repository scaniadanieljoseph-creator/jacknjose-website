/* SMS & email notifications: event templates, outbox, delivery, and the Notifications master portal.
   TEST mode simulates delivery in the browser. LIVE mode POSTs each message to your server endpoint,
   which sends it through your SMS provider (DLT-registered) and email provider. See README "Notifications". */
'use strict';

const num = n => Math.round(Number(n) || 0).toLocaleString('en-IN');
const NOTIFY_EVENTS = {
  bus_booked: { label: 'Bus ticket confirmed', group: 'Travels', audience: 'Passenger',
    sms: 'Jack & Jose: PNR {{pnr}} confirmed. {{route}}, {{date}} {{time}} from {{boarding}}. Seats {{seats}}. Rs.{{amount}} paid.',
    subject: 'Your bus ticket {{pnr}} · {{route}} on {{date}}',
    email: 'Hi {{name}},\n\nYour bus ticket is confirmed.\n\nPNR: {{pnr}}\nJourney: {{route}}\nDate: {{date}}, departs {{time}}\nBoarding point: {{boarding}}\nDropping point: {{dropping}}\nOperator: {{operator}} · Bus {{busNo}}\nSeats: {{seats}}\nAmount paid: ₹{{amount}}\n\nPlease reach the boarding point 15 minutes early with a photo ID. To cancel, open Manage booking on jacknjose.co.in and enter your PNR.\n\nHappy journey,\nJack & Jose Travels',
    vars: b => ({ pnr: b.id, route: `${b.from} to ${b.to}`, date: fmtDate(b.date), time: b.dep, boarding: b.boarding, dropping: b.dropping, operator: b.operator, busNo: b.busNo, seats: b.seats.join(', '), amount: num(b.total) }),
    to: b => [{ name: b.passengers?.[0]?.name, phone: b.phone, email: b.email }], ref: b => b.id, sample: () => Store.get('busBookings')[0] },
  bus_cancelled: { label: 'Bus ticket cancelled', group: 'Travels', audience: 'Passenger',
    sms: 'Jack & Jose: PNR {{pnr}} ({{route}}, {{date}}) is cancelled. Refund of Rs.{{refund}} will reach your original payment method in 1-7 working days.',
    subject: 'Cancelled: bus ticket {{pnr}} · refund ₹{{refund}}',
    email: 'Hi {{name}},\n\nYour bus ticket {{pnr}} for {{route}} on {{date}} has been cancelled.\n\nRefund: ₹{{refund}} (75% of ₹{{amount}})\nUPI and wallet refunds arrive in 1–2 days; cards and net banking in 5–7 working days.\n\nJack & Jose Travels',
    vars: b => ({ pnr: b.id, route: `${b.from} to ${b.to}`, date: fmtDate(b.date), amount: num(b.total), refund: num(b.refund ?? b.total * .75) }),
    to: b => [{ name: b.passengers?.[0]?.name, phone: b.phone, email: b.email }], ref: b => b.id, sample: () => Store.get('busBookings').find(b => b.status === 'Cancelled') || Store.get('busBookings')[0] },
  hotel_booked: { label: 'Hotel booking confirmed', group: 'Hotels', audience: 'Guest',
    sms: 'Jack & Jose Hotels: Booking {{bid}} confirmed at {{hotel}}, {{city}}. Check-in {{checkin}} 12 PM, check-out {{checkout}}. {{rooms}}. Paid Rs.{{amount}}.',
    subject: 'Booking confirmed: {{hotel}} · {{checkin}}',
    email: 'Hi {{name}},\n\nYour stay is booked.\n\nBooking ID: {{bid}}\nHotel: {{hotel}}, {{city}}\nCheck-in: {{checkin}} from 12:00 PM\nCheck-out: {{checkout}} by 11:00 AM\nRoom: {{rooms}} · {{guests}} guest(s)\nAmount paid: ₹{{amount}} (incl. GST)\n\nCarry a government photo ID at check-in. Free cancellation until 24 hours before check-in.\n\nJack & Jose Hotels',
    vars: b => ({ bid: b.id, hotel: b.hotelName, city: b.city, checkin: fmtDate(b.checkIn), checkout: fmtDate(b.checkOut), rooms: `${b.roomType} x ${b.rooms}`, guests: b.guests, amount: num(b.total) }),
    to: b => [{ name: b.guest, phone: b.phone, email: b.email }], ref: b => b.id, sample: () => Store.get('hotelBookings')[0] },
  hotel_cancelled: { label: 'Hotel booking cancelled', group: 'Hotels', audience: 'Guest',
    sms: 'Jack & Jose Hotels: Booking {{bid}} at {{hotel}} is cancelled. Full refund of Rs.{{amount}} is on its way to your original payment method.',
    subject: 'Cancelled: {{hotel}} booking {{bid}}', email: 'Hi {{name}},\n\nYour booking {{bid}} at {{hotel}}, {{city}} for {{checkin}} has been cancelled.\n\nRefund: ₹{{amount}} to your original payment method.\n\nJack & Jose Hotels',
    vars: b => ({ bid: b.id, hotel: b.hotelName, city: b.city, checkin: fmtDate(b.checkIn), amount: num(b.total) }), to: b => [{ name: b.guest, phone: b.phone, email: b.email }], ref: b => b.id, sample: () => Store.get('hotelBookings')[0] },
  hotel_checkin: { label: 'Welcome at check-in', group: 'Hotels', audience: 'Guest',
    sms: 'Welcome to {{hotel}}, {{name}}! Your room is ready. Front desk is open 24x7. Check-out is {{checkout}} by 11 AM. - Jack & Jose Hotels',
    subject: 'Welcome to {{hotel}}', email: 'Hi {{name}},\n\nWelcome to {{hotel}}. We hope you enjoy your stay.\n\nCheck-out: {{checkout}} by 11:00 AM\nWiFi details and the in-room dining menu are at the front desk.\n\nJack & Jose Hotels',
    vars: b => ({ hotel: b.hotelName, checkout: fmtDate(b.checkOut) }), to: b => [{ name: b.guest, phone: b.phone, email: b.email }], ref: b => b.id, sample: () => Store.get('hotelBookings')[0] },
  hotel_checkout: { label: 'Thank you at check-out', group: 'Hotels', audience: 'Guest', smsOff: true,
    sms: 'Thank you for staying at {{hotel}}, {{name}}. We hope to see you again. - Jack & Jose Hotels',
    subject: 'Thank you for staying at {{hotel}}', email: 'Hi {{name}},\n\nThank you for staying at {{hotel}}. Your final bill for booking {{bid}} is ₹{{amount}}.\n\nWe would love to hear about your stay. Just reply to this email.\n\nJack & Jose Hotels',
    vars: b => ({ hotel: b.hotelName, bid: b.id, amount: num(b.total) }), to: b => [{ name: b.guest, phone: b.phone, email: b.email }], ref: b => b.id, sample: () => Store.get('hotelBookings')[0] },
  parcel_booked: { label: 'Parcel booked (to sender)', group: 'Logistics', audience: 'Sender',
    sms: 'Jack & Jose Logistics: Parcel booked. AWB {{awb}}, {{pkgs}} pkg to {{receiver}}, {{to}}. Paid Rs.{{amount}}. Track at jacknjose.co.in',
    subject: 'Parcel booked · AWB {{awb}}', email: 'Hi {{name}},\n\nYour parcel is booked.\n\nAWB: {{awb}}\nFrom: {{from}}\nTo: {{receiver}}, {{to}}\nService: {{service}}\nPackages: {{pkgs}} · {{weight}} kg\nAmount: ₹{{amount}}\n\nTrack it any time on jacknjose.co.in with your AWB number.\n\nJack & Jose Logistics',
    vars: p => ({ awb: p.id, from: branchName(p.fromBranch), to: p.toCity, receiver: p.receiver, service: p.service, pkgs: p.pkgs, weight: p.weight, amount: num(p.total) }),
    to: p => [{ name: p.sender, phone: p.senderPhone, email: p.senderEmail }], ref: p => p.id, sample: () => Store.get('parcels')[0], also: ['parcel_incoming'] },
  parcel_incoming: { label: 'Parcel on its way (to receiver)', group: 'Logistics', audience: 'Receiver', emailOff: true,
    sms: 'Jack & Jose Logistics: {{sender}} has sent you a parcel, AWB {{awb}}. Expected delivery to {{to}} soon. We will SMS you before delivery.',
    subject: 'A parcel is on its way to you · AWB {{awb}}', email: 'Hi {{name}},\n\n{{sender}} has sent you a parcel (AWB {{awb}}). We will message you before delivery.\n\nJack & Jose Logistics',
    vars: p => ({ awb: p.id, sender: p.sender, to: p.toCity }), to: p => [{ name: p.receiver, phone: p.receiverPhone }], ref: p => p.id, sample: () => Store.get('parcels')[0] },
  parcel_update: { label: 'Parcel status update', group: 'Logistics', audience: 'Sender & receiver',
    sms: 'Jack & Jose Logistics: AWB {{awb}} is now {{status}}{{where}}. Track at jacknjose.co.in',
    subject: 'AWB {{awb}}: {{status}}', email: 'Hi {{name}},\n\nUpdate on parcel {{awb}}: {{status}}{{where}}.\n\nJack & Jose Logistics',
    when: p => ['In Transit', 'Out for Delivery', 'Delivered', 'Cancelled'].includes(p.status),
    vars: p => ({ awb: p.id, status: p.status.toUpperCase(), where: p.status === 'Out for Delivery' ? ` in ${p.toCity}. Keep your phone reachable` : p.status === 'Delivered' ? ` to ${p.receiver}` : '' }),
    to: p => [...(['In Transit', 'Delivered', 'Cancelled'].includes(p.status) ? [{ name: p.sender, phone: p.senderPhone, email: p.senderEmail }] : []), ...(['Out for Delivery', 'Delivered'].includes(p.status) ? [{ name: p.receiver, phone: p.receiverPhone }] : [])],
    ref: p => p.id, sample: () => ({ ...Store.get('parcels')[0], status: 'Out for Delivery' }) },
  shipment_booked: { label: 'Freight shipment booked', group: 'Transports', audience: 'Shipper',
    sms: 'Jack & Jose Transports: Shipment {{sid}} booked, {{mode}} {{route}}. Pickup {{pickup}}. Est. freight Rs.{{amount}}. Our team will call to confirm.',
    subject: 'Shipment {{sid}} booked · {{route}}', email: 'Hi {{name}},\n\nThank you for booking with Jack & Jose Transports.\n\nShipment ID: {{sid}}\nMode: {{mode}}\nRoute: {{route}}\nPickup date: {{pickup}}\nEstimated freight: ₹{{amount}}\n\nOur operations team will call you to confirm the pickup slot. The final price is confirmed after weighment.\n\nJack & Jose Transports',
    vars: s => ({ sid: s.id, mode: `${MODE_INFO[s.mode].label} ${s.load === 'FTL' ? 'full load' : 'part load'}`, route: `${s.from} to ${s.to}`, pickup: fmtDate(s.pickupDate), amount: num(s.total) }),
    to: s => [{ name: s.contact, phone: s.phone, email: s.email }], ref: s => s.id, sample: () => Store.get('shipments')[0] },
  shipment_update: { label: 'Freight status update', group: 'Transports', audience: 'Shipper',
    sms: 'Jack & Jose Transports: Shipment {{sid}} ({{route}}) is now {{status}}.', subject: 'Shipment {{sid}}: {{status}}', email: 'Hi {{name}},\n\nYour shipment {{sid}} ({{route}}) is now: {{status}}.\n\nJack & Jose Transports',
    vars: s => ({ sid: s.id, route: `${s.from} to ${s.to}`, status: SHIP_STAGES(s.intl)[s.stage] }), to: s => [{ name: s.contact, phone: s.phone, email: s.email }], ref: s => s.id, sample: () => Store.get('shipments')[0] },
  payment_refund: { label: 'Refund issued by staff', group: 'Payments', audience: 'Customer',
    sms: 'Jack & Jose: Refund of Rs.{{refund}} issued for payment {{pid}} ({{reason}}). It reaches your account in 1-7 working days.',
    subject: 'Refund of ₹{{refund}} issued', email: 'Hi {{name}},\n\nWe have issued a refund of ₹{{refund}} for payment {{pid}}.\nReason: {{reason}}\nRefund reference: {{rid}}\n\nUPI and wallet refunds arrive in 1–2 days; cards and net banking in 5–7 working days.\n\nJack & Jose',
    vars: p => ({ pid: p.id, refund: num(p.refund?.amount), reason: p.refund?.reason, rid: p.refund?.id }), to: p => [{ name: p.customer?.name, phone: p.customer?.phone, email: p.customer?.email }], ref: p => p.bookingId || p.id,
    sample: () => { const p = Store.get('payments').find(x => x.refunds?.length) || Store.get('payments')[0]; return { ...p, refund: p.refunds?.[0] || { amount: 500, reason: 'Booking cancelled', id: 'rfnd_demo' } }; } },
  media_request: { label: 'Shoot request received', group: 'Elsha Media', audience: 'Client',
    sms: 'Elsha Media: We got your request {{ref}} for {{service}} on {{date}} in {{place}}. Our producer will call you within one working day.',
    subject: 'We received your request · {{service}}', email: 'Hi {{name}},\n\nThank you for choosing Elsha Media.\n\nReference: {{ref}}\nService: {{service}}\nPackage: {{pkg}}\nDate: {{date}}\nLocation: {{place}}\n\nOur producer will call you within one working day to confirm the crew and a final quote.\n\nElsha Media & Designers',
    vars: b => ({ ref: b.id, service: b.service, pkg: b.pkg || 'Custom quote', date: fmtDate(b.date), place: b.location }), to: b => [{ name: b.name, phone: b.phone, email: b.email }], ref: b => b.id, sample: () => Store.get('mediaBookings')[0],
    ops: b => ({ kind: 'shoot request', ref: b.id, customer: b.name, phone: b.phone, summary: `${b.service}, ${b.pkg || 'custom quote'}, ${fmtDate(b.date)} in ${b.location}. ${b.message || ''}` }) },
  eee_request: { label: 'Energy audit requested', group: 'Elsha EEE', audience: 'Client',
    sms: 'Elsha Energy Efficiency: Thank you, {{org}}. Ref {{ref}}. An energy engineer will call you within two working days to schedule the site audit.',
    subject: 'Your energy audit request · {{ref}}', email: 'Hi {{name}},\n\nThank you for contacting Elsha Energy Efficiency on behalf of {{org}}.\n\nReference: {{ref}}\nFacility: {{type}}, {{city}}\nProducts in your quote: {{items}}\n\nAn energy engineer will call you within two working days to schedule the walk-through audit.\n\nElsha Energy Efficiency (EEE)',
    vars: q => ({ ref: q.id, org: q.org, type: q.type, city: q.city, items: q.items?.length ? q.items.map(i => `${i.qty} x ${i.name}`).join('; ') : 'none yet' }), to: q => [{ name: q.contact, phone: q.phone, email: q.email }], ref: q => q.id, sample: () => Store.get('eeeEnquiries')[0],
    ops: q => ({ kind: 'energy audit request', ref: q.id, customer: `${q.contact} (${q.org})`, phone: q.phone, summary: `${q.type} in ${q.city}, monthly bill ₹${num(q.bill)}. ${q.items?.length || 0} product(s) in quote.` }) },
  contact_received: { label: 'Contact message received', group: 'Website', audience: 'Visitor',
    sms: 'Jack & Jose: Thanks {{name}}, we got your message about {{service}}. The team will reply within one working day.',
    subject: 'We got your message', email: 'Hi {{name}},\n\nThanks for writing to us about {{service}}. The team will reply within one working day.\n\nYour message:\n{{message}}\n\nJack & Jose',
    vars: m => ({ service: m.service, message: m.message }), to: m => [{ name: m.name, phone: m.phone, email: m.email }], ref: m => m.id, sample: () => ({ id: 'MSGDEMO', name: 'Visitor', phone: '+91 98765 43210', email: 'visitor@example.com', service: 'Hotels', message: 'Do you have group rates for 40 people?' }),
    ops: m => ({ kind: 'website message', ref: m.id, customer: m.name, phone: m.phone, summary: `${m.service}: ${m.message}` }) },
  ops_alert: { label: 'New enquiry alert (internal)', group: 'Internal', audience: 'Operations team', smsOff: true, internal: true,
    sms: 'New {{kind}} {{ref}} from {{customer}}, {{phone}}.', subject: 'New {{kind}}: {{ref}} from {{customer}}',
    email: 'A new {{kind}} has arrived.\n\nReference: {{ref}}\nCustomer: {{customer}}\nPhone: {{phone}}\n\n{{summary}}\n\nFollow up in the Staff dashboard.',
    vars: v => v, to: () => [], ref: v => v.ref, sample: () => ({ kind: 'shoot request', ref: 'ELM2101', customer: 'Anitha Varghese', phone: '+91 96550 00000', summary: 'Wedding photography, Signature package.' }) },
  test_message: { label: 'Test message', group: 'Internal', audience: 'Staff', internal: true,
    sms: 'Jack & Jose test SMS sent at {{time}}. If you received this, SMS delivery works.', subject: 'Test email from Jack & Jose', email: 'This is a test email sent at {{time}}.\n\nIf you received it, email delivery is working.',
    vars: () => ({ time: new Date().toLocaleString('en-IN') }), to: () => [], ref: () => 'TEST', sample: () => ({}) },
};
SEED.notifyTemplates = () => Object.entries(NOTIFY_EVENTS).map(([id, d], i) => ({ id, smsOn: !d.smsOff, emailOn: !d.emailOff, sms: d.sms, subject: d.subject, email: d.email, dltId: '1107' + String(170000000000000 + hashStr(id) % 99999999999).slice(0, 15) }));
SEED.notifySettings = () => ({ mode: 'test', smsOn: true, emailOn: true, smsProvider: 'MSG91', senderId: 'JKNJSE', peId: '1101000000000000000', emailProvider: 'Amazon SES', fromName: 'Jack & Jose', fromEmail: 'bookings@jacknjose.co.in', replyTo: 'support@jacknjose.co.in', opsEmail: 'operations@jacknjose.co.in', endpoint: 'https://api.jacknjose.co.in/notify', smsRate: 0.18 });
SEED.notifications = () => {
  const out = [], push = (key, o) => { try { buildMessages(key, o).forEach(m => out.push({ ...m, status: 'Delivered', createdAt: o.createdAt || m.createdAt, deliveredAt: o.createdAt || m.createdAt, sample: true })); } catch (e) { /* skip incomplete sample */ } };
  Store.get('busBookings').filter(b => b.sample).slice(0, 6).forEach(b => { push('bus_booked', b); if (b.status === 'Cancelled') push('bus_cancelled', b); });
  Store.get('hotelBookings').filter(b => b.sample).slice(0, 5).forEach(b => push('hotel_booked', b));
  Store.get('parcels').filter(b => b.sample).slice(0, 4).forEach(p => push('parcel_booked', p));
  Store.get('shipments').filter(b => b.sample).slice(0, 2).forEach(s => push('shipment_booked', s));
  Store.get('mediaBookings').filter(b => b.sample).slice(0, 2).forEach(b => push('media_request', b));
  if (out.length) out.push({ ...out[out.length - 1], id: 'ntf_' + rid(), channel: 'email', to: 'rahul.menon@exmaple.con', subject: 'Your bus ticket JJB7314', status: 'Failed', error: 'Hard bounce: recipient domain does not exist', sample: true });
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

const fill = (t, v) => String(t || '').replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] ?? '');
const validPhone = p => String(p || '').replace(/\D/g, '').length >= 10;
const validEmail = e => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(e || ''));
function smsSegments(text) {
  const t = String(text || ''), unicode = /[^\x0A\x0D\x20-\x7E£¥èéùìòÇØøÅå]/.test(t), len = t.length;
  const per = unicode ? (len <= 70 ? 70 : 67) : (len <= 160 ? 160 : 153);
  return { len, unicode, segments: Math.max(1, Math.ceil(len / per)) };
}
const maskPhone = p => { const d = String(p || '').replace(/\D/g, ''); return d.length >= 4 ? `+${d.length > 10 ? d.slice(0, d.length - 10) : '91'} ••••• ${d.slice(-5)}` : p; };
const maskEmail = e => { const [u, d] = String(e || '').split('@'); return d ? `${u[0]}•••@${d}` : e; };
const notifyTemplate = key => ({ ...SEED.notifyTemplates().find(t => t.id === key), ...(Store.get('notifyTemplates').find(t => t.id === key) || {}) });

function buildMessages(key, o, recipients) {
  const def = NOTIFY_EVENTS[key]; if (!def || !o || (def.when && !def.when(o))) return [];
  const t = notifyTemplate(key), S = Store.get('notifySettings'), vars = def.vars(o), ref = def.ref ? def.ref(o) : '', out = [];
  for (const r of (recipients || def.to(o))) {
    const v = { ...vars, name: (r.name || 'Customer').split(' ')[0] };
    const base = { event: key, ref, toName: r.name || '', mode: S.mode, createdAt: new Date().toISOString() };
    if (t.smsOn && S.smsOn && r.phone) { const body = fill(t.sms, v); out.push({ ...base, id: 'ntf_' + rid(), channel: 'sms', to: r.phone, body, dltId: t.dltId, senderId: S.senderId, provider: S.smsProvider, ...smsSegments(body) }); }
    if (t.emailOn && S.emailOn && r.email) out.push({ ...base, id: 'ntf_' + rid(), channel: 'email', to: r.email, subject: fill(t.subject, v), body: fill(t.email, v), from: `${S.fromName} <${S.fromEmail}>`, provider: S.emailProvider });
  }
  return out;
}

const Notify = {
  event(key, o) {
    const def = NOTIFY_EVENTS[key]; if (!def || !o) return [];
    if (Launch.on() && Store.get('notifySettings').mode !== 'live') return []; // launch mode without a sending server: nothing is really sent, so nothing is logged
    const sent = buildMessages(key, o).map(m => this.dispatch(m));
    (def.also || []).forEach(k => sent.push(...this.event(k, o)));
    if (def.ops) { const S = Store.get('notifySettings'); if (S.opsEmail) buildMessages('ops_alert', def.ops(o), [{ name: 'Operations', email: S.opsEmail }]).forEach(m => sent.push(this.dispatch(m))); }
    return sent;
  },
  test(channel, to) {
    const r = channel === 'sms' ? { name: 'Staff', phone: to } : { name: 'Staff', email: to };
    const t = notifyTemplate('test_message'), S = Store.get('notifySettings');
    const save = { ...S, smsOn: true, emailOn: true }, msgs = (() => { const keep = Store.get('notifySettings'); Store.set('notifySettings', save); const m = buildMessages('test_message', {}, [r]); Store.set('notifySettings', keep); return m; })();
    return msgs.filter(m => m.channel === channel).map(m => this.dispatch(m));
  },
  dispatch(m) {
    const err = m.channel === 'sms' ? (validPhone(m.to) ? '' : 'Invalid mobile number') : (validEmail(m.to) ? '' : 'Invalid email address');
    const rec = { ...m, status: err ? 'Failed' : 'Queued', error: err };
    Store.add('notifications', rec);
    if (err) return rec;
    const S = Store.get('notifySettings');
    if (S.mode === 'live') {
      fetch(S.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: rec.id, channel: rec.channel, to: rec.to, subject: rec.subject, body: rec.body, dltTemplateId: rec.dltId, senderId: rec.senderId, from: rec.from, replyTo: S.replyTo, event: rec.event, ref: rec.ref }) })
        .then(r => Store.update('notifications', rec.id, r.ok ? { status: 'Sent' } : { status: 'Failed', error: `Server replied ${r.status}` }))
        .catch(e => Store.update('notifications', rec.id, { status: 'Failed', error: 'Could not reach the notification server: ' + e.message }));
    } else {
      setTimeout(() => Store.update('notifications', rec.id, { status: 'Sent' }), 500);
      setTimeout(() => Store.update('notifications', rec.id, { status: 'Delivered', deliveredAt: new Date().toISOString() }), 2500);
    }
    return rec;
  },
  /* One line on tickets/vouchers saying where confirmations went */
  note(ref) {
    const M = Store.get('notifications').filter(n => n.ref === ref && !NOTIFY_EVENTS[n.event]?.internal);
    if (!M.length) return '';
    const last = {}; M.forEach(n => { const k = n.channel + n.to; if (!last[k]) last[k] = n; });
    return `<div class="notify-note">${Object.values(last).map(n => `<span class="${n.status === 'Failed' ? 'bad' : ''}">${icon(n.channel === 'sms' ? 'phone' : 'mail')} ${n.status === 'Failed' ? 'Could not send' : 'Sent'} ${n.channel === 'sms' ? 'SMS to ' + esc(maskPhone(n.to)) : 'email to ' + esc(maskEmail(n.to))}</span>`).join('')}</div>`;
  },
};

/* ---------- Previews ---------- */
function smsPreview(m) {
  const s = smsSegments(m.body);
  return `<div class="sms-phone"><div class="sms-top"><b>${esc(m.senderId || Store.get('notifySettings').senderId)}</b><span class="small">${m.createdAt ? fmtDateTime(m.createdAt) : 'now'}</span></div><div class="sms-bubble">${esc(m.body)}</div></div>
    <div class="small muted" style="text-align:center">${s.len} characters · ${s.unicode ? 'Unicode' : 'GSM-7'} · ${s.segments} SMS credit${s.segments > 1 ? 's' : ''}${m.dltId ? ` · DLT template <span class="mono">${esc(m.dltId)}</span>` : ''}</div>`;
}
function emailPreview(m) {
  const S = Store.get('notifySettings');
  return `<div class="email-mock"><div class="email-meta"><div><span>From</span>${esc(m.from || `${S.fromName} <${S.fromEmail}>`)}</div><div><span>To</span>${esc(m.toName ? `${m.toName} <${m.to}>` : m.to || '—')}</div><div><span>Subject</span><b>${esc(m.subject)}</b></div></div>
    <div class="email-frame"><div class="email-brand"><span class="brand-mark">J&amp;J</span><b>Jack &amp; Jose</b></div><div class="email-body">${esc(m.body).split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}</div>
    <div class="email-foot">Jack &amp; Jose · Kochi, Kerala · jacknjose.co.in<br>You received this because you made a booking or enquiry with us.</div></div></div>`;
}
const messagePreview = m => m.channel === 'sms' ? smsPreview(m) : emailPreview(m);

/* ---------- Notifications master portal ---------- */
ROUTE_TITLES['notify-admin'] = 'Notifications portal';
route('notify-admin', app => {
  const tabs = [['dash', 'Dashboard'], ['outbox', 'Message log'], ['templates', 'Templates'], ['settings', 'Providers & settings']];
  const active = Session.get('tab_#notify-admin') || 'dash';
  app.innerHTML = adminShell({ title: 'Notifications portal', sub: 'SMS and email sent to passengers, guests, shippers and clients, and the templates behind them.', tabs, active, base: 'home' });
  const body = $('#admin-body', app);
  const evLabel = k => NOTIFY_EVENTS[k]?.label || k;
  const show = tab => {
    const N = Store.get('notifications'), S = Store.get('notifySettings');
    if (tab === 'dash') {
      const month = todayISO().slice(0, 7), sms = N.filter(n => n.channel === 'sms' && n.status !== 'Failed'), mth = sms.filter(n => n.createdAt.slice(0, 7) === month);
      const credits = mth.reduce((t, n) => t + (n.segments || 1), 0), done = N.filter(n => n.status !== 'Failed' && n.status !== 'Queued'), dl = N.filter(n => n.status === 'Delivered').length;
      const byEv = {}; N.forEach(n => { byEv[evLabel(n.event)] = (byEv[evLabel(n.event)] || 0) + 1; });
      const fails = N.filter(n => n.status === 'Failed').slice(0, 5);
      body.innerHTML = `<div class="notice" style="margin-bottom:14px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><span>SMS via <b>${esc(S.smsProvider)}</b> (sender ID <span class="mono">${esc(S.senderId)}</span>) · Email via <b>${esc(S.emailProvider)}</b> · <b>${S.mode === 'live' ? 'LIVE' : 'TEST'} mode</b>${S.smsOn ? '' : ' · SMS paused'}${S.emailOn ? '' : ' · Email paused'}</span><button class="btn btn-ghost btn-sm" data-goto="settings">Change</button></div>
        <div class="kpis">${kpi('Messages sent', N.length, `${N.filter(n => n.createdAt.slice(0, 10) === todayISO()).length} today`)}${kpi('Delivered', N.length ? Math.round(dl / N.length * 100) + '%' : '—', `${dl} messages`)}${kpi('Failed', N.filter(n => n.status === 'Failed').length, 'check and resend', N.some(n => n.status === 'Failed'))}${kpi('SMS credits this month', credits, `≈ ${inr(credits * (+S.smsRate || 0))} at ₹${S.smsRate}/credit`)}${kpi('Emails sent', N.filter(n => n.channel === 'email').length)}</div>
        <div class="grid g2" style="margin-top:18px"><div class="card"><h3 style="margin-bottom:14px">Messages by event</h3>${bars(Object.entries(byEv).sort((a, b) => b[1] - a[1]).slice(0, 8))}</div>
        <div class="card"><h3 style="margin-bottom:12px">Recent failures</h3><div class="stack">${fails.map(n => `<div class="alert-item crit"><div><b>${n.channel === 'sms' ? 'SMS' : 'Email'} to ${esc(n.to)}</b><div class="small">${esc(n.error)} · ${esc(evLabel(n.event))}</div></div></div>`).join('') || '<p class="muted">No failed messages.</p>'}</div></div></div>`;
      $$('[data-goto]', body).forEach(b => b.onclick = () => $(`.admin-tabs [data-tab="${b.dataset.goto}"]`).click());
    }
    if (tab === 'outbox') renderCrud(body, { key: 'notifications', single: 'Message', plural: 'Messages', noAdd: true, noEdit: true, label: r => r.id,
      columns: [{ label: 'Sent', render: r => `<span style="white-space:nowrap">${fmtDateTime(r.createdAt)}</span>` }, { label: 'Channel', render: r => `<span class="chip ${r.channel === 'sms' ? 'blue' : 'green'}">${r.channel === 'sms' ? 'SMS' : 'Email'}</span>` }, { label: 'To', render: r => `${esc(r.toName || '')}<div class="muted small mono">${esc(r.to)}</div>` },
        { label: 'Event', render: r => `${esc(evLabel(r.event))}<div class="muted small mono">${esc(r.ref)}</div>` }, { label: 'Message', render: r => `<div style="max-width:38ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.subject || r.body)}</div>${r.channel === 'sms' ? `<div class="muted small">${r.segments || 1} credit(s)</div>` : ''}` },
        { label: 'Status', render: r => `${statusChip(r.status)}${r.error ? `<div class="small" style="color:var(--danger);max-width:24ch">${esc(r.error)}</div>` : ''}` }],
      actions: [{ id: 'v', label: 'View', run: r => openModal(r.channel === 'sms' ? 'SMS' : 'Email', messagePreview(r), { wide: r.channel === 'email' }) }, { id: 'rs', label: 'Resend', run: (r, rr) => { const { id, status, error, deliveredAt, sample, ...rest } = r; const m = Notify.dispatch({ ...rest, id: 'ntf_' + rid(), mode: Store.get('notifySettings').mode, createdAt: new Date().toISOString() }); toast(m.status === 'Failed' ? `Not sent: ${m.error}` : 'Message queued again', m.status === 'Failed' ? 'err' : 'ok'); rr(); } }] });
    if (tab === 'templates') {
      const T = Object.keys(NOTIFY_EVENTS).filter(k => k !== 'test_message').map(k => notifyTemplate(k));
      body.innerHTML = `<p class="muted" style="margin-bottom:12px">Each event can send an SMS, an email, or both. Words in <span class="mono">{{double braces}}</span> are filled in from the booking. In India, every SMS template must be registered on the DLT portal with the exact wording, so change SMS text only after the new version is approved.</p>
        <div class="table-wrap"><table class="table"><thead><tr><th>Event</th><th>Sent to</th><th>SMS</th><th>Email</th><th></th></tr></thead><tbody>
        ${T.map(t => { const d = NOTIFY_EVENTS[t.id]; return `<tr><td><b>${esc(d.label)}</b><div class="muted small">${esc(d.group)}</div></td><td>${esc(d.audience)}</td><td>${t.smsOn ? `<span class="chip blue">On</span> <span class="muted small">${smsSegments(t.sms).segments} credit(s)</span>` : '<span class="chip">Off</span>'}</td><td>${t.emailOn ? '<span class="chip green">On</span>' : '<span class="chip">Off</span>'}</td><td class="row-actions"><button class="btn btn-sm btn-ghost" data-tpl="${t.id}">Edit</button></td></tr>`; }).join('')}</tbody></table></div>`;
      $$('[data-tpl]', body).forEach(b => b.onclick = () => editTemplate(b.dataset.tpl));
    }
    if (tab === 'settings') {
      body.innerHTML = `<div class="split"><form class="card stack" id="ns"><h3>Providers & sending</h3><div class="form-grid">
        <label class="field"><span>Mode</span><select class="input" id="ns-mode" name="mode"><option value="test" ${S.mode === 'test' ? 'selected' : ''}>Test (simulated delivery)</option><option value="live" ${S.mode === 'live' ? 'selected' : ''}>Live (send through server)</option></select></label>
        <label class="field"><span>Server endpoint (live)</span><input class="input mono" id="ns-ep" name="endpoint" value="${esc(S.endpoint)}" placeholder="https://api.jacknjose.co.in/notify"></label>
        <label class="check"><input type="checkbox" name="smsOn" ${S.smsOn ? 'checked' : ''}> Send SMS</label><label class="check"><input type="checkbox" name="emailOn" ${S.emailOn ? 'checked' : ''}> Send email</label>
        <label class="field"><span>SMS provider</span><select class="input" id="ns-sp" name="smsProvider">${['MSG91', 'Fast2SMS', 'Gupshup', 'Twilio', 'Exotel'].map(p => `<option ${p === S.smsProvider ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
        <label class="field"><span>SMS sender ID (6 letters)</span><input class="input mono" id="ns-sid" name="senderId" value="${esc(S.senderId)}" maxlength="6" required></label>
        <label class="field"><span>DLT principal entity ID</span><input class="input mono" id="ns-pe" name="peId" value="${esc(S.peId)}"></label>
        <label class="field"><span>Cost per SMS credit (₹)</span><input class="input" id="ns-rate" name="smsRate" type="number" min="0" step="0.01" value="${S.smsRate}"></label>
        <label class="field"><span>Email provider</span><select class="input" id="ns-ep2" name="emailProvider">${['Amazon SES', 'SendGrid', 'Zoho ZeptoMail', 'Brevo', 'SMTP server'].map(p => `<option ${p === S.emailProvider ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
        <label class="field"><span>From name</span><input class="input" id="ns-fn" name="fromName" value="${esc(S.fromName)}" required></label>
        <label class="field"><span>From email</span><input class="input" id="ns-fe" name="fromEmail" type="email" value="${esc(S.fromEmail)}" required></label>
        <label class="field"><span>Reply-to email</span><input class="input" id="ns-rt" name="replyTo" type="email" value="${esc(S.replyTo)}"></label>
        <label class="field full"><span>Operations alerts go to</span><input class="input" id="ns-ops" name="opsEmail" type="email" value="${esc(S.opsEmail)}" placeholder="Leave blank to turn off internal alerts"></label></div>
        <button class="btn btn-primary">Save settings</button></form>
        <div class="stack" style="align-content:start"><form class="card stack" id="nt"><h3>Send a test message</h3><div class="form-grid"><label class="field"><span>Channel</span><select class="input" id="nt-ch" name="ch"><option value="sms">SMS</option><option value="email">Email</option></select></label><label class="field"><span>Send to</span><input class="input" id="nt-to" name="to" placeholder="+91 98xxxxxxxx or name@example.com" required></label></div><button class="btn btn-green">Send test</button></form>
        <div class="notice" style="background:var(--danger-soft)"><b>No API keys here.</b><p style="margin-top:6px">SMS and email provider keys stay on your server. This website only sends each message to your endpoint, which signs in to the providers.</p></div>
        <div class="notice"><b>Before SMS goes live in India</b><ol style="margin:8px 0 0;padding-left:18px;display:grid;gap:4px"><li>Register Jack & Jose as a principal entity on a DLT portal (Jio, Vi, Airtel or BSNL).</li><li>Register the sender ID <span class="mono">${esc(S.senderId)}</span> as a header.</li><li>Register each SMS template exactly as written and paste its template ID in Templates.</li></ol></div></div></div>`;
      $('#ns', body).onsubmit = e => { e.preventDefault(); const f = e.target;
        if (!/^[A-Z]{6}$/i.test(f.senderId.value)) return toast('The sender ID must be exactly 6 letters', 'err');
        if (f.mode.value === 'live' && !/^https:\/\//.test(f.endpoint.value.trim())) return toast('Live mode needs an https:// server endpoint', 'err');
        Store.set('notifySettings', { ...S, mode: f.mode.value, endpoint: f.endpoint.value.trim(), smsOn: f.smsOn.checked, emailOn: f.emailOn.checked, smsProvider: f.smsProvider.value, senderId: f.senderId.value.toUpperCase(), peId: f.peId.value.trim(), smsRate: +f.smsRate.value || 0, emailProvider: f.emailProvider.value, fromName: f.fromName.value.trim(), fromEmail: f.fromEmail.value.trim(), replyTo: f.replyTo.value.trim(), opsEmail: f.opsEmail.value.trim() });
        toast('Notification settings saved'); };
      $('#nt', body).onsubmit = e => { e.preventDefault(); const f = e.target, [m] = Notify.test(f.ch.value, f.to.value.trim());
        if (!m) return toast('Nothing sent', 'err'); if (m.status === 'Failed') return toast(m.error, 'err');
        toast(`Test ${f.ch.value === 'sms' ? 'SMS' : 'email'} sent`); openModal('Test message', messagePreview(m), { wide: m.channel === 'email' }); };
    }
  };
  function editTemplate(id) {
    const d = NOTIFY_EVENTS[id], t = notifyTemplate(id);
    let sampleObj; try { sampleObj = d.sample(); } catch (e) { sampleObj = null; }
    const vars = sampleObj ? { ...d.vars(sampleObj), name: 'Anitha' } : { name: 'Anitha' };
    openModal('Template · ' + d.label, `<form id="tf" class="stack"><div class="chips"><span class="muted small">Placeholders:</span>${Object.keys(vars).map(k => `<button type="button" class="chip" data-ph="${k}">{{${k}}}</button>`).join('')}</div>
      <div class="grid g2"><div class="stack"><label class="check"><input type="checkbox" name="smsOn" ${t.smsOn ? 'checked' : ''}> Send SMS</label>
        <label class="field"><span>SMS text <b id="tf-count" class="mono" style="text-transform:none;letter-spacing:0"></b></span><textarea class="input" id="tf-sms" name="sms" rows="4">${esc(t.sms)}</textarea></label>
        <label class="field"><span>DLT template ID</span><input class="input mono" id="tf-dlt" name="dltId" value="${esc(t.dltId)}" maxlength="19"></label>
        <label class="check"><input type="checkbox" name="emailOn" ${t.emailOn ? 'checked' : ''}> Send email</label>
        <label class="field"><span>Email subject</span><input class="input" id="tf-sub" name="subject" value="${esc(t.subject)}"></label>
        <label class="field"><span>Email body</span><textarea class="input" id="tf-email" name="email" rows="9">${esc(t.email)}</textarea></label></div>
        <div class="stack" style="align-content:start"><h4>Preview with sample data</h4><div id="tf-prev-sms"></div><div id="tf-prev-email"></div></div></div>
      <div style="display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap"><button type="button" class="btn btn-outline" id="tf-reset">Restore default wording</button><div style="display:flex;gap:10px"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary">Save template</button></div></div></form>`, {
      wide: true, onMount: m => {
        const f = $('#tf', m); let lastFocus = f.sms;
        const prev = () => { const s = smsSegments(fill(f.sms.value, vars)); $('#tf-count', m).textContent = `· ${s.len} chars · ${s.segments} credit${s.segments > 1 ? 's' : ''}${s.unicode ? ' · Unicode (uses more credits)' : ''}`;
          $('#tf-prev-sms', m).innerHTML = f.smsOn.checked ? smsPreview({ body: fill(f.sms.value, vars), dltId: f.dltId.value }) : '<p class="muted small">SMS off for this event.</p>';
          $('#tf-prev-email', m).innerHTML = f.emailOn.checked ? emailPreview({ to: 'anitha@example.com', toName: 'Anitha', subject: fill(f.subject.value, vars), body: fill(f.email.value, vars) }) : '<p class="muted small">Email off for this event.</p>'; };
        f.addEventListener('input', prev); f.addEventListener('change', prev); prev();
        [f.sms, f.subject, f.email].forEach(x => x.addEventListener('focus', () => lastFocus = x));
        $$('[data-ph]', m).forEach(b => b.onclick = () => { const el = lastFocus, ins = `{{${b.dataset.ph}}}`, at = el.selectionStart ?? el.value.length; el.value = el.value.slice(0, at) + ins + el.value.slice(el.selectionEnd ?? at); el.focus(); prev(); });
        $('#tf-reset', m).onclick = () => { f.sms.value = d.sms; f.subject.value = d.subject; f.email.value = d.email; prev(); };
        f.onsubmit = e => { e.preventDefault();
          if (f.smsOn.checked && !f.sms.value.trim()) return toast('Write the SMS text or turn SMS off', 'err');
          if (f.emailOn.checked && (!f.subject.value.trim() || !f.email.value.trim())) return toast('Write the email subject and body, or turn email off', 'err');
          const unknown = [...(f.sms.value + f.subject.value + f.email.value).matchAll(/\{\{(\w+)\}\}/g)].map(x => x[1]).filter(k => !(k in vars));
          if (unknown.length) return toast(`Unknown placeholder: {{${unknown[0]}}}`, 'err');
          const rec = { id, smsOn: f.smsOn.checked, emailOn: f.emailOn.checked, sms: f.sms.value.trim(), dltId: f.dltId.value.trim(), subject: f.subject.value.trim(), email: f.email.value };
          const all = Store.get('notifyTemplates'); Store.set('notifyTemplates', all.some(x => x.id === id) ? all.map(x => x.id === id ? rec : x) : [...all, rec]);
          closeModal(); toast('Template saved'); show('templates'); };
      } });
  }
  bindTabs(app, show); show(active);
});
