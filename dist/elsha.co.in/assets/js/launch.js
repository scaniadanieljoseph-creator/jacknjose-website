/* Launch mode: booking requests to WhatsApp / email, legal pages, contact helpers.
   Active when SITE_CONFIG.bookingMode === 'request' and a WhatsApp number or email is set in config.js. */
'use strict';

const REQUEST_BUILDERS = {
  bus: b => ({ title: 'Bus booking request', ref: b.id, lines: [`Route: ${b.from} to ${b.to}`, `Date: ${fmtDate(b.date)}, departs ${b.dep}`, `Bus: ${b.operator} · ${b.type}`, `Seats: ${b.seats.join(', ')}`, `Passengers: ${b.passengers.map(p => `${p.name} (${p.age}, ${p.gender[0]})`).join('; ')}`, `Boarding: ${b.boarding}`, `Dropping: ${b.dropping}`, `Fare: Rs.${num(b.total)} incl. GST`, `Mobile: ${b.phone}${b.email ? ' · ' + b.email : ''}`] }),
  hotel: b => ({ title: 'Hotel booking request', ref: b.id, lines: [`Hotel: ${b.hotelName}, ${b.city}`, `Check-in: ${fmtDate(b.checkIn)} · Check-out: ${fmtDate(b.checkOut)} (${b.nights} night${b.nights > 1 ? 's' : ''})`, `Room: ${b.roomType} x ${b.rooms} · ${b.guests} guest(s)`, `Total: Rs.${num(b.total)} incl. GST`, `Guest: ${b.guest} · ${b.phone}${b.email ? ' · ' + b.email : ''}`, b.request ? `Request: ${b.request}` : ''] }),
  parcel: p => ({ title: 'Parcel booking request', ref: p.id, lines: [`From: ${branchName(p.fromBranch)}`, `To: ${p.receiver}, ${p.receiverAddress}, ${p.toCity} · ${p.receiverPhone}`, `Parcel: ${p.type}, ${p.pkgs} pkg, ${p.weight} kg · ${p.service}`, `Add-ons: ${[p.addons.pickup && 'door pickup', p.addons.loading && 'loading help', p.addons.unloading && 'unloading help', p.addons.insure && 'insurance'].filter(Boolean).join(', ') || 'none'}`, `Estimate: Rs.${num(p.total)}`, `Sender: ${p.sender} · ${p.senderPhone}`] }),
  freight: s => ({ title: 'Freight booking request', ref: s.id, lines: [`Mode: ${MODE_INFO[s.mode].label} · ${s.load === 'FTL' ? 'full load' : 'part load'}${s.vehicle ? ' · ' + s.vehicle : ''}`, `Route: ${s.from} to ${s.to}`, `Goods: ${s.goods}, ${num(s.weight)} kg`, `Pickup: ${fmtDate(s.pickupDate)} · ${s.address || ''}`, `Estimate: Rs.${num(s.total)}`, `Company: ${s.company} · ${s.contact} · ${s.phone}`] }),
  media: b => ({ title: 'Shoot booking request', ref: b.id, lines: [`Service: ${b.service} · ${b.pkg || 'custom quote'}`, `Date: ${fmtDate(b.date)} · ${b.location}`, `Client: ${b.name} · ${b.phone}${b.email ? ' · ' + b.email : ''}`, b.message ? `Brief: ${b.message}` : ''] }),
  eee: q => ({ title: 'Energy audit request', ref: q.id, lines: [`Organisation: ${q.org} (${q.type}), ${q.city}`, q.bill ? `Monthly bill: Rs.${num(q.bill)}` : '', q.items.length ? `Products: ${q.items.map(i => `${i.qty} x ${i.name}`).join('; ')}` : '', `Contact: ${q.contact} · ${q.phone}${q.email ? ' · ' + q.email : ''}`] }),
  contact: m => ({ title: 'Website enquiry', ref: m.id, lines: [`About: ${m.service}`, `Message: ${m.message}`, `From: ${m.name} · ${m.phone}${m.email ? ' · ' + m.email : ''}`] }),
};
const Launch = {
  on: () => SITE_CONFIG.canRequest(),
  payLabel: () => SITE_CONFIG.canRequest() ? 'Send booking request' : 'Continue to payment',
  payNote: () => SITE_CONFIG.canRequest() ? 'We check availability and reply with a confirmation and payment details. Your booking is confirmed only once we reply.' : null,
  /* Returns true when it handled the confirmation (launch mode); false in demo mode. */
  request(kind, o) {
    if (!this.on()) return false;
    const d = REQUEST_BUILDERS[kind](o), text = [`*${d.title}* · ${d.ref}`, ...d.lines.filter(Boolean), '', `Sent from ${location.hostname || SITE_CONFIG.domain}`].join('\n');
    const wa = SITE_CONFIG.whatsapp ? `https://wa.me/${SITE_CONFIG.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}` : '';
    const mail = SITE_CONFIG.email ? `mailto:${SITE_CONFIG.email}?${SITE_CONFIG.supportEmail ? 'cc=' + SITE_CONFIG.supportEmail + '&' : ''}subject=${encodeURIComponent(`${d.title} ${d.ref}`)}&body=${encodeURIComponent(text.replace(/\*/g, ''))}` : '';
    openModal('One last step: send your request', `<div class="notice g"><b>Your details are ready.</b> Send them to ${esc(SITE_CONFIG.name)} with one tap. We reply with availability, confirmation and how to pay.</div>
      <pre class="request-text" id="rq-text">${esc(text.replace(/\*/g, ''))}</pre>
      <div style="display:flex;gap:10px;flex-wrap:wrap">${wa ? `<a class="btn btn-green btn-lg" href="${wa}" target="_blank" rel="noopener" id="rq-wa">Send on WhatsApp</a>` : ''}${mail ? `<a class="btn ${wa ? 'btn-outline' : 'btn-green'} btn-lg" href="${mail}" id="rq-mail">Send by email</a>` : ''}<button class="btn btn-outline btn-lg" type="button" id="rq-copy">Copy details</button></div>
      <p class="muted small">Reference <b class="mono">${esc(d.ref)}</b>. This is a request, not a confirmed booking, until we reply.${SITE_CONFIG.phone ? ` You can also call ${esc(SITE_CONFIG.phone)}.` : ''}</p>`, {
      wide: true, onMount: m => {
        $('#rq-copy', m).onclick = () => { const done = () => toast('Details copied'); (navigator.clipboard?.writeText(text.replace(/\*/g, '')) || Promise.reject()).then(done).catch(() => { const r = document.createRange(); r.selectNodeContents($('#rq-text', m)); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Select and copy the highlighted text'); }); };
        $$('#rq-wa, #rq-mail', m).forEach(a => a.addEventListener('click', () => toast('Opening… press Send to deliver your request')));
      } });
    return true;
  },
};

/* ---------- Legal pages ---------- */
const legalPage = (title, updated, sections) => pageHero({ eyebrow: 'Policies', title }) + `<section class="wrap overlap"><div class="search-box legal"><p class="muted small">Last updated ${updated} · ${esc(SITE_CONFIG.legalName)}${SITE_CONFIG.gstin ? ' · GSTIN ' + esc(SITE_CONFIG.gstin) : ''}</p>
  ${sections.map(([h, body]) => `<h3>${h}</h3>${body.map(p => `<p>${p}</p>`).join('')}`).join('')}
  <p class="muted small">Questions about this page? <a href="#contact">Contact us</a>.</p></div></section><div style="height:40px"></div>`;
const LEGAL_DATE = '11 November 2026';
ROUTE_TITLES.terms = 'Terms of service';
route('terms', app => { app.innerHTML = legalPage('Terms of service', LEGAL_DATE, [
  ['1. Who we are', [`This website is operated by ${esc(SITE_CONFIG.legalName)} (“we”, “us”), ${esc(SITE_CONFIG.address)}. It covers our Jack &amp; Jose services (bus tickets, hotels, freight transport, parcel logistics, fleet) and our Elsha services (media, design and energy efficiency).`]],
  ['2. Bookings and requests', ['A booking made or requested on this website becomes confirmed only when we send you a confirmation with a PNR, booking ID, airway bill or shipment ID.', 'Fares, room rates, freight and parcel prices shown before confirmation are estimates. Freight and parcel charges are finalised after weighment and measurement.', 'You are responsible for giving correct passenger, guest, consignee and contact details. Carry a valid government photo ID for bus travel and hotel check-in.']],
  ['3. Bus travel', ['Buses are run by Jack &amp; Jose Travels and partner operators. Departure and arrival times can change because of traffic, weather or breakdowns. Please reach the boarding point 15 minutes early.', 'Luggage is carried at the passenger’s risk. Prohibited and hazardous goods are not allowed on board.']],
  ['4. Hotels', ['Standard check-in is 12:00 PM and check-out 11:00 AM unless the hotel states otherwise. Hotels may refuse admission without valid ID or for conduct that disturbs other guests.']],
  ['5. Freight and parcels', ['You must declare goods truthfully and must not send items banned by law. Goods move under the Carriage by Road Act, 2007 and our consignment note terms. Our liability for loss or damage is limited as stated on the consignment note unless you buy transit insurance.']],
  ['6. Media and energy services', ['Shoot dates are blocked on receipt of the agreed advance. Energy-saving figures on this site are estimates; actual savings depend on your site and usage and are set out in the audit report.']],
  ['7. Payments', ['Payments are collected through licensed payment gateways or by the methods stated in your confirmation. We do not store card details.']],
  ['8. Cancellations and refunds', ['See our <a href="#refunds">Cancellation &amp; refund policy</a>.']],
  ['9. Liability', ['To the extent permitted by law, we are not liable for indirect or consequential losses. Nothing in these terms limits rights you have under the Consumer Protection Act, 2019.']],
  ['10. Governing law', [`These terms are governed by the laws of India. Courts at ${esc(SITE_CONFIG.jurisdiction)} have exclusive jurisdiction.`]],
]); });
ROUTE_TITLES.privacy = 'Privacy policy';
route('privacy', app => { app.innerHTML = legalPage('Privacy policy', LEGAL_DATE, [
  ['What we collect', ['Name, mobile number, email, travel and stay details, passenger age and gender (required for bus manifests), pickup and delivery addresses, company and GSTIN for freight invoices, and messages you send us.']],
  ['Why we use it', ['To make and manage your booking, deliver your parcel or shipment, send confirmations and service updates by SMS, WhatsApp or email, issue invoices, handle refunds and meet legal requirements.']],
  ['Who we share it with', ['Only those who need it to serve you: the bus operator or hotel you booked, delivery staff, payment gateways, and SMS/email providers. We do not sell personal data.']],
  ['Storage on your device', ['This website keeps your recent searches and requests in your browser’s local storage so you can view them again. Clearing your browser data removes them.']],
  ['Your rights', ['Under the Digital Personal Data Protection Act, 2023 you may ask us to access, correct or erase your personal data, or withdraw consent for marketing messages. Use the <a href="#contact">Contact</a> page; we respond within 30 days.']],
  ['Retention', ['Booking and invoice records are kept for the period required by tax and transport laws, then deleted or anonymised.']],
]); });
ROUTE_TITLES.refunds = 'Cancellation & refunds';
route('refunds', app => { app.innerHTML = legalPage('Cancellation &amp; refund policy', LEGAL_DATE, [
  ['Bus tickets', ['Cancel any time up to the day of travel for a 75% refund of the ticket amount. No refund after the bus has departed or for no-shows.', 'If we or the operator cancel the service, you get a 100% refund.']],
  ['Hotels', ['Free cancellation with a full refund until 24 hours before the check-in date. Later cancellations and no-shows are charged one night.']],
  ['Parcels', ['A parcel can be cancelled for a full refund before it is picked up or handed over at the branch. After that, charges are not refundable; loss or damage claims follow the consignment note.']],
  ['Freight', ['Cancel a shipment at least 24 hours before the pickup slot for a full refund of any advance. Later cancellations may be charged vehicle detention at actuals.']],
  ['Media shoots', ['The booking advance is refundable up to 15 days before the shoot date, and adjustable against a new date after that.']],
  ['How refunds are paid', ['Refunds go back to the original payment method: 1–2 working days for UPI and wallets, 5–7 working days for cards and net banking. Payment-gateway charges, where applicable, are not refundable.']],
]); });

/* Floating WhatsApp button (only when a number is configured) */
function mountWhatsApp() {
  if (!SITE_CONFIG.whatsapp || document.getElementById('wa-fab')) return;
  const a = document.createElement('a'); a.id = 'wa-fab'; a.className = 'wa-fab'; a.target = '_blank'; a.rel = 'noopener';
  a.href = `https://wa.me/${SITE_CONFIG.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hello Jack & Jose, I have a question about ')}`;
  a.setAttribute('aria-label', 'Chat with us on WhatsApp');
  a.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.200 8.200 0 01-4.2-1.200l-.3-.2-3 .8.8-2.900-.2-.3A8.200 8.200 0 1112 20.200zm4.500-6.100c-.2-.1-1.500-.700-1.700-.800s-.400-.100-.600.100-.700.800-.800 1-.300.200-.500.100a6.700 6.700 0 01-3.300-2.900c-.300-.400.300-.400.700-1.300.100-.200 0-.300 0-.500l-.800-1.800c-.200-.500-.400-.400-.600-.400h-.500a1 1 0 00-.700.300 2.900 2.900 0 00-.900 2.200 5.100 5.100 0 001.100 2.700 11.700 11.700 0 004.500 3.900c1.700.700 2.300.800 3.100.700a2.700 2.700 0 001.800-1.200 2.200 2.200 0 00.100-1.200c0-.200-.200-.200-.400-.300z"/></svg><span>Chat</span>`;
  document.body.appendChild(a);
}
