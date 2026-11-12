/* Payment gateway: checkout for bus & hotel bookings, refunds, settlements, and the Payments master portal.
   TEST mode runs a full simulated gateway in the browser.
   LIVE mode (Razorpay) loads Razorpay Checkout — you must create orders and verify payment signatures
   on your server before trusting a payment. See README "Payments". */
'use strict';

const PAY_METHODS = {
  upi: { label: 'UPI', icon: 'phone', mdr: 0 },          // UPI P2M: zero MDR in India
  card: { label: 'Card', icon: 'grid', mdr: 0.02 },      // RuPay debit: zero MDR (handled below)
  netbanking: { label: 'Net banking', icon: 'building', mdr: 0.019 },
  wallet: { label: 'Wallet', icon: 'box', mdr: 0.02 },
};
const NB_BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Federal Bank', 'South Indian Bank', 'Kotak Mahindra Bank', 'Canara Bank', 'Bank of Baroda', 'Punjab National Bank'];
const WALLETS = ['Paytm', 'PhonePe', 'Amazon Pay', 'MobiKwik'];
const PROVIDERS = ['Razorpay', 'PayU', 'Cashfree', 'CCAvenue'];

SEED.gatewaySettings = () => ({ provider: 'Razorpay', mode: 'test', keyId: 'rzp_test_JJdemo00000000', merchantName: 'Jack & Jose', convFeePct: 0, settlementDays: 2, methods: { upi: true, card: true, netbanking: true, wallet: true } });
SEED.payments = () => {
  const r = rng(2026), out = [], methods = ['upi', 'upi', 'upi', 'card', 'card', 'netbanking', 'wallet'];
  const mk = (type, b, name, phone) => {
    const m = methods[Math.floor(r() * methods.length)], d = payDetail(m, r, name);
    const p = { id: 'pay_' + rid(r), orderId: 'order_' + rid(r), bookingType: type, bookingId: b.id, amount: b.total, convFee: 0, method: m, detail: d.detail, brand: d.brand || '', status: 'Captured', customer: { name, phone, email: b.email || '' }, provider: 'Razorpay', mode: 'test', refunds: [], createdAt: b.createdAt, sample: true };
    Object.assign(p, gatewayFee(p));
    if (b.status === 'Cancelled') { const amt = type === 'bus' ? Math.round(b.total * .75) : b.total; p.refunds.push({ id: 'rfnd_' + rid(r), amount: amt, reason: 'Booking cancelled', at: new Date(new Date(b.createdAt).getTime() + 864e5).toISOString() }); p.status = amt >= p.amount ? 'Refunded' : 'Partially refunded'; }
    out.push(p);
  };
  Store.get('busBookings').filter(b => b.sample).forEach(b => mk('bus', b, b.passengers?.[0]?.name || 'Customer', b.phone));
  Store.get('hotelBookings').filter(b => b.sample).forEach(b => mk('hotel', b, b.guest, b.phone));
  // a couple of failed attempts, as every real gateway log has them
  [['bus', 1180, 'Card declined by issuing bank'], ['hotel', 5376, 'UPI request expired']].forEach(([t, amt, reason], i) => out.push({ id: 'pay_' + rid(r), orderId: 'order_' + rid(r), bookingType: t, bookingId: '', amount: amt, convFee: 0, method: i ? 'upi' : 'card', detail: i ? 'rahul.m@okicici' : 'Visa •••• 0002', status: 'Failed', failReason: reason, customer: { name: SAMPLE_NAMES[i + 1], phone: '', email: '' }, provider: 'Razorpay', mode: 'test', refunds: [], fee: 0, tax: 0, createdAt: new Date(Date.now() - (i + 1) * 5 * 3600e3).toISOString(), sample: true }));
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};
function rid(r = Math.random) { return Array.from({ length: 14 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz0123456789'[Math.floor(r() * 57)]).join(''); }
function payDetail(m, r, name) {
  const first = String(name || 'user').split(' ')[0].toLowerCase();
  if (m === 'upi') return { detail: `${first}@ok${['axis', 'hdfcbank', 'icici', 'sbi'][Math.floor(r() * 4)]}` };
  if (m === 'card') { const brand = ['Visa', 'Mastercard', 'RuPay'][Math.floor(r() * 3)]; return { detail: `${brand} •••• ${1000 + Math.floor(r() * 8999)}`, brand }; }
  if (m === 'netbanking') return { detail: NB_BANKS[Math.floor(r() * 6)] };
  return { detail: WALLETS[Math.floor(r() * WALLETS.length)] };
}
function gatewayFee(p) {
  const rate = p.method === 'card' && p.brand === 'RuPay' ? 0 : PAY_METHODS[p.method]?.mdr ?? 0.02;
  const fee = Math.round(p.amount * rate * 100) / 100; return { fee, tax: Math.round(fee * 0.18 * 100) / 100 };
}
const refunded = p => (p.refunds || []).reduce((s, x) => s + x.amount, 0);
const cardBrand = n => /^4/.test(n) ? 'Visa' : /^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n) ? 'Mastercard' : /^3[47]/.test(n) ? 'Amex' : /^(60|65|81|82|508)/.test(n) ? 'RuPay' : '';
const luhn = n => { let s = 0, alt = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return n.length >= 12 && s % 10 === 0; };

const Pay = {
  settings() { return Store.get('gatewaySettings'); },
  forBooking(id) { return Store.get('payments').find(p => p.bookingId === id && p.status !== 'Failed'); },
  /* Small "Payment" cell for tickets and vouchers */
  kv(bookingId) {
    const p = this.forBooking(bookingId); if (!p) return '';
    const rf = refunded(p);
    return `<div><span>Payment</span><b>${esc(PAY_METHODS[p.method]?.label || p.method)}</b><div class="muted small mono">${esc(p.id)}</div>${rf ? `<div class="small" style="color:var(--green)">Refunded ${inr(rf)}</div>` : ''}</div>`;
  },
  refundBooking(bookingId, amount, reason) {
    const p = this.forBooking(bookingId); if (!p) return null;
    return this.refund(p.id, amount, reason);
  },
  refund(paymentId, amount, reason) {
    const p = Store.find('payments', paymentId); if (!p || p.status === 'Failed') return null;
    const amt = Math.min(Math.round(amount * 100) / 100, p.amount - refunded(p)); if (amt <= 0) return null;
    const rf = { id: 'rfnd_' + rid(), amount: amt, reason: reason || 'Refund', at: new Date().toISOString() };
    const total = refunded(p) + amt;
    Store.update('payments', p.id, { refunds: [...(p.refunds || []), rf], status: total >= p.amount ? 'Refunded' : 'Partially refunded' });
    return rf;
  },
  /* Open the checkout. opts: { amount, description, bookingType, bookingId, customer:{name,phone,email}, onSuccess(payment), onCancel() } */
  checkout(opts) {
    if (Launch.on()) return opts.onSuccess({ requested: true }); // launch mode: no simulated payment, the request goes to the business
    const s = this.settings();
    const convFee = Math.round(opts.amount * (+s.convFeePct || 0) / 100);
    const total = opts.amount + convFee;
    if (s.mode === 'live') return liveCheckout(opts, s, total, convFee);
    const enabled = Object.keys(PAY_METHODS).filter(k => s.methods?.[k]);
    if (!enabled.length) { toast('No payment methods are enabled. Turn one on in the Payments portal.', 'err'); return; }
    const order = 'order_' + rid();
    let method = enabled[0], tries = 0;
    const record = (status, data) => {
      const p = { id: 'pay_' + rid(), orderId: order, bookingType: opts.bookingType, bookingId: status === 'Captured' ? opts.bookingId : '', amount: total, convFee, method, ...data, status, customer: opts.customer, provider: s.provider, mode: 'test', refunds: [], createdAt: new Date().toISOString() };
      Object.assign(p, status === 'Captured' ? gatewayFee(p) : { fee: 0, tax: 0 });
      Store.add('payments', p); return p;
    };
    const m = openModal('Secure payment', `<div class="pg">
      <div class="pg-head"><div style="display:flex;gap:12px;align-items:center;min-width:0"><span class="brand-mark">${BRAND_MARK}</span><div style="min-width:0"><b>${esc(s.merchantName)}</b><div class="small" style="opacity:.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(opts.description)}</div></div></div>
        <div style="text-align:right"><div class="pg-amt num">${inr(total)}</div>${convFee ? `<div class="small" style="opacity:.85">incl. ${inr(convFee)} convenience fee</div>` : ''}</div></div>
      <div class="pg-test">TEST MODE · no real money moves · ${esc(s.provider)}</div>
      <div class="pg-body"><nav class="pg-methods" role="tablist">${enabled.map(k => `<button type="button" role="tab" data-pm="${k}" class="${k === method ? 'on' : ''}">${icon(PAY_METHODS[k].icon)}<span>${PAY_METHODS[k].label}</span></button>`).join('')}</nav><div class="pg-pane" id="pg-pane"></div></div>
      <div class="pg-foot"><span>${icon('shield')} Secured by ${esc(s.provider)} · PCI DSS · 256-bit TLS</span><button type="button" class="btn btn-ghost btn-sm" id="pg-cancel">Cancel payment</button></div></div>`, { wide: true });
    const pane = $('#pg-pane', m);
    const busy = (msg) => { pane.innerHTML = `<div class="pg-wait"><span class="spinner" aria-hidden="true"></span><b>${msg}</b><p class="muted small">Don't close this window or press back.</p></div>`; $$('[data-pm]', m).forEach(b => b.disabled = true); };
    const success = (data) => { const p = record('Captured', data); pane.innerHTML = `<div class="pg-wait"><span class="pg-tick">✓</span><b>Payment successful</b><p class="muted small mono">${p.id}</p></div>`; setTimeout(() => { closeModal(); opts.onSuccess(p); }, 900); };
    const fail = (data, reason) => {
      record('Failed', { ...data, failReason: reason }); tries++;
      $$('[data-pm]', m).forEach(b => b.disabled = false);
      pane.innerHTML = `<div class="pg-wait"><span class="pg-tick bad">!</span><b>Payment failed</b><p class="muted">${esc(reason)}</p><p class="muted small">No money was taken. If your account was debited, it will be reversed by your bank within 5–7 working days.</p><button class="btn btn-primary" id="pg-retry">Try again</button></div>`;
      $('#pg-retry', pane).onclick = () => show(method);
    };
    const hint = t => `<div class="pg-hint"><b>Test details:</b> ${t}</div>`;
    function show(k) {
      method = k; $$('[data-pm]', m).forEach(b => b.classList.toggle('on', b.dataset.pm === k));
      if (k === 'upi') {
        pane.innerHTML = `<div class="pg-split"><form id="pg-upi" class="stack"><h3>Pay with UPI ID</h3><label class="field"><span>UPI ID</span><input class="input mono" id="pg-vpa" name="vpa" placeholder="name@okhdfcbank" autocomplete="off" required></label><button class="btn btn-green">Pay ${inr(total)}</button>${hint('<span class="mono">success@upi</span> pays, <span class="mono">failure@upi</span> fails.')}</form>
          <div class="stack" style="justify-items:center;text-align:center"><h3>Scan QR</h3>${fakeQr(order)}<p class="muted small">Test QR, not scannable. In live mode the gateway shows a real UPI QR.</p><button type="button" class="btn btn-outline btn-sm" id="pg-qr">Simulate QR payment</button></div></div>`;
        $('#pg-upi', pane).onsubmit = e => { e.preventDefault(); const v = e.target.vpa.value.trim().toLowerCase();
          if (!/^[a-z0-9._-]{2,}@[a-z]{2,}$/.test(v)) return toast('Enter a valid UPI ID, like name@okaxis', 'err');
          busy(`Approve the request of ${inr(total)} in your UPI app`); setTimeout(() => v.startsWith('failure') ? fail({ detail: v }, 'The payment request was declined in the UPI app.') : success({ detail: v }), 2200); };
        $('#pg-qr', pane).onclick = () => { busy('Waiting for payment confirmation'); setTimeout(() => success({ detail: 'UPI QR' }), 1600); };
      }
      if (k === 'card') {
        pane.innerHTML = `<form id="pg-card" class="stack" autocomplete="off"><h3>Debit or credit card</h3><div class="form-grid">
          <label class="field full"><span>Card number <b id="pg-brand" style="color:var(--blue)"></b></span><input class="input mono" id="pg-cn" name="cn" inputmode="numeric" placeholder="1234 5678 9012 3456" maxlength="23" required></label>
          <label class="field"><span>Expiry (MM/YY)</span><input class="input mono" id="pg-exp" name="exp" placeholder="MM/YY" maxlength="5" inputmode="numeric" required></label>
          <label class="field"><span>CVV</span><input class="input mono" id="pg-cvv" name="cvv" type="password" inputmode="numeric" maxlength="4" required></label>
          <label class="field full"><span>Name on card</span><input class="input" id="pg-cname" name="cname" value="${esc(opts.customer.name || '')}" required></label></div>
          <button class="btn btn-green">Pay ${inr(total)}</button>${hint('<span class="mono">4111 1111 1111 1111</span> succeeds, <span class="mono">4000 0000 0000 0002</span> is declined. Any future expiry, any CVV. OTP <span class="mono">123456</span>.')}</form>`;
        const f = $('#pg-card', pane);
        f.cn.oninput = () => { const d = f.cn.value.replace(/\D/g, '').slice(0, 19); f.cn.value = d.replace(/(.{4})/g, '$1 ').trim(); $('#pg-brand', pane).textContent = cardBrand(d); };
        f.exp.oninput = () => { const d = f.exp.value.replace(/\D/g, '').slice(0, 4); f.exp.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; };
        f.onsubmit = e => { e.preventDefault(); const n = f.cn.value.replace(/\D/g, ''), brand = cardBrand(n), [mm, yy] = f.exp.value.split('/').map(Number), now = new Date();
          if (!luhn(n)) return toast('That card number isn’t valid. Check the digits.', 'err');
          if (!mm || mm > 12 || !yy || (2000 + yy) * 12 + mm < now.getFullYear() * 12 + now.getMonth() + 1) return toast('Enter a valid future expiry date', 'err');
          if (!/^\d{3,4}$/.test(f.cvv.value)) return toast('CVV is the 3 or 4 digits on the back of the card', 'err');
          const data = { detail: `${brand || 'Card'} •••• ${n.slice(-4)}`, brand };
          if (n === '4000000000000002') { busy('Contacting your bank'); return setTimeout(() => fail(data, 'Your card was declined by the issuing bank.'), 1500); }
          otp(data);
        };
      }
      if (k === 'netbanking') {
        pane.innerHTML = `<div class="stack"><h3>Choose your bank</h3><div class="pg-banks">${NB_BANKS.map((b, i) => `<button type="button" class="pg-bank ${i ? '' : 'on'}" data-bank="${esc(b)}"><span class="bank-ini">${esc(b.split(' ').map(w => w[0]).join('').slice(0, 3))}</span>${esc(b)}</button>`).join('')}</div><button class="btn btn-green" id="pg-nb">Pay ${inr(total)}</button>${hint('the bank page lets you choose success or failure.')}</div>`;
        let bank = NB_BANKS[0];
        $$('[data-bank]', pane).forEach(b => b.onclick = () => { bank = b.dataset.bank; $$('[data-bank]', pane).forEach(x => x.classList.toggle('on', x === b)); });
        $('#pg-nb', pane).onclick = () => { busy(`Redirecting to ${bank}`); setTimeout(() => {
          pane.innerHTML = `<div class="pg-bankpage"><div class="pg-bankbar">${esc(bank)} · Internet Banking (test)</div><div class="stack" style="padding:18px"><div class="line-item"><span>Merchant</span><b>${esc(s.merchantName)}</b></div><div class="line-item"><span>Amount</span><b>${inr(total)}</b></div>
            <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-green" id="nb-ok">Authorise payment</button><button class="btn btn-outline" id="nb-no">Decline</button></div></div></div>`;
          $('#nb-ok', pane).onclick = () => { busy('Confirming with your bank'); setTimeout(() => success({ detail: bank }), 1200); };
          $('#nb-no', pane).onclick = () => fail({ detail: bank }, 'The payment was declined on the bank page.');
        }, 1200); };
      }
      if (k === 'wallet') {
        pane.innerHTML = `<div class="stack"><h3>Pay with a wallet</h3><div class="pg-banks">${WALLETS.map((w, i) => `<button type="button" class="pg-bank ${i ? '' : 'on'}" data-wallet="${w}"><span class="bank-ini">${w.slice(0, 2)}</span>${w}</button>`).join('')}</div>
          <label class="field"><span>Wallet mobile number</span><input class="input" id="pg-wph" value="${esc(opts.customer.phone || '')}" inputmode="tel"></label><button class="btn btn-green" id="pg-w">Pay ${inr(total)}</button></div>`;
        let w = WALLETS[0];
        $$('[data-wallet]', pane).forEach(b => b.onclick = () => { w = b.dataset.wallet; $$('[data-wallet]', pane).forEach(x => x.classList.toggle('on', x === b)); });
        $('#pg-w', pane).onclick = () => { if (!/^[0-9+ ]{10,15}$/.test($('#pg-wph', pane).value)) return toast('Enter the mobile number linked to your wallet', 'err'); busy(`Debiting your ${w} wallet`); setTimeout(() => success({ detail: w }), 1500); };
      }
    }
    function otp(data) {
      let left = 3;
      pane.innerHTML = `<form id="pg-otp" class="stack" style="max-width:360px"><div class="pg-bankbar">3-D Secure · ${esc(data.brand || 'Card')} (test)</div><h3>Enter the OTP</h3><p class="muted small">Sent to the mobile number registered with your bank, ending ${esc(String(opts.customer.phone || '').replace(/\D/g, '').slice(-4) || '••••')}.</p>
        <label class="field"><span>One-time password</span><input class="input mono" id="pg-otpin" name="otp" inputmode="numeric" maxlength="6" required autocomplete="one-time-code"></label><button class="btn btn-green">Verify & pay</button>${hint('OTP <span class="mono">123456</span>.')}</form>`;
      $('#pg-otp', pane).onsubmit = e => { e.preventDefault();
        if (e.target.otp.value === '123456') { busy('Authorising your card'); setTimeout(() => success(data), 1300); return; }
        left--; if (!left) return fail(data, 'Wrong OTP entered 3 times.');
        toast(`Wrong OTP. ${left} attempt(s) left.`, 'err'); e.target.otp.value = ''; };
    }
    $$('[data-pm]', m).forEach(b => b.onclick = () => show(b.dataset.pm));
    $('#pg-cancel', m).onclick = () => { closeModal(); toast('Payment cancelled. Nothing was booked.', 'err'); opts.onCancel && opts.onCancel(); };
    show(method);
  },
};

/* LIVE: Razorpay Checkout. Needs https://checkout.razorpay.com/v1/checkout.js and a server that creates the order
   and verifies razorpay_signature before the booking is treated as paid. */
function liveCheckout(opts, s, total, convFee) {
  if (s.provider !== 'Razorpay') { toast(`Live ${s.provider} checkout needs your server integration. Switch to test mode or Razorpay.`, 'err'); return; }
  const start = () => {
    if (!window.Razorpay) { toast('Could not load Razorpay Checkout. Check your internet connection or site security settings.', 'err'); return; }
    const rz = new window.Razorpay({ key: s.keyId, amount: Math.round(total * 100), currency: 'INR', name: s.merchantName, description: opts.description,
      prefill: { name: opts.customer.name, contact: opts.customer.phone, email: opts.customer.email }, notes: { booking_id: opts.bookingId, type: opts.bookingType }, theme: { color: '#0b57b7' },
      handler: resp => { const p = { id: resp.razorpay_payment_id, orderId: resp.razorpay_order_id || '', signature: resp.razorpay_signature || '', bookingType: opts.bookingType, bookingId: opts.bookingId, amount: total, convFee, method: 'card', detail: 'Razorpay', status: 'Captured', customer: opts.customer, provider: 'Razorpay', mode: 'live', refunds: [], fee: 0, tax: 0, createdAt: new Date().toISOString() };
        Store.add('payments', p); opts.onSuccess(p); },
      modal: { ondismiss: () => { toast('Payment cancelled. Nothing was booked.', 'err'); opts.onCancel && opts.onCancel(); } } });
    rz.on('payment.failed', e => toast('Payment failed: ' + (e.error?.description || 'please try again'), 'err'));
    rz.open();
  };
  if (window.Razorpay) return start();
  const sc = document.createElement('script'); sc.src = 'https://checkout.razorpay.com/v1/checkout.js'; sc.onload = start; sc.onerror = start; document.head.appendChild(sc);
}

function fakeQr(seed) {
  const N = 25, r = rng(hashStr(seed)), cells = [];
  const finder = (x, y) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let on;
    if (finder(x, y)) { const fx = x >= N - 7 ? x - (N - 7) : x, fy = y >= N - 7 ? y - (N - 7) : y; on = fx === 0 || fy === 0 || fx === 6 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4); }
    else on = r() < .48;
    if (on) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
  }
  return `<svg viewBox="-2 -2 ${N + 4} ${N + 4}" width="170" height="170" role="img" aria-label="Test UPI QR code" style="background:#fff;border-radius:10px;max-width:100%"><g fill="#0c1e33">${cells.join('')}</g></svg>`;
}

/* ---------- Payments master portal ---------- */
function settlementsList() {
  const s = Pay.settings(), P = Store.get('payments').filter(p => p.status !== 'Failed' && p.mode !== 'live'), days = {};
  const day = iso => iso.slice(0, 10);
  P.forEach(p => { const d = day(p.createdAt); (days[d] = days[d] || { gross: 0, fee: 0, refunds: 0, n: 0 }); days[d].gross += p.amount; days[d].fee += p.fee + p.tax; days[d].n++; });
  P.forEach(p => (p.refunds || []).forEach(rf => { const d = day(rf.at); (days[d] = days[d] || { gross: 0, fee: 0, refunds: 0, n: 0 }); days[d].refunds += rf.amount; }));
  return Object.entries(days).sort((a, b) => b[0].localeCompare(a[0])).map(([d, v]) => {
    const dt = new Date(d + 'T00:00:00'); dt.setDate(dt.getDate() + (+s.settlementDays || 2));
    const on = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`, done = on <= todayISO();
    return { id: 'setl_' + hashStr(d).toString(36).toUpperCase(), day: d, on, ...v, net: v.gross - v.fee - v.refunds, status: done ? 'Processed' : 'Scheduled', utr: done ? 'UTR' + String(hashStr('utr' + d)).padStart(12, '0').slice(0, 12) : '' };
  });
}
function paymentDetail(p) {
  const rf = refunded(p);
  return `<div class="ticket"><div class="ticket-head"><div><div class="small" style="opacity:.8">${esc(p.provider)} · ${p.mode === 'live' ? 'Live' : 'Test'} payment</div><b class="mono" style="font-size:1.1rem">${esc(p.id)}</b></div><div style="text-align:right"><div class="pg-amt num">${inr(p.amount)}</div>${statusChip(p.status)}</div></div>
    <div class="ticket-body"><div class="kv"><div><span>Order</span><b class="mono small">${esc(p.orderId)}</b></div><div><span>Booking</span><b class="mono">${esc(p.bookingId || '—')}</b><div class="muted small">${p.bookingType === 'bus' ? 'Bus ticket' : 'Hotel stay'}</div></div><div><span>Method</span><b>${esc(PAY_METHODS[p.method]?.label || p.method)}</b><div class="muted small">${esc(p.detail)}</div></div><div><span>Time</span><b>${fmtDateTime(p.createdAt)}</b></div></div>
    <div class="kv"><div><span>Customer</span><b>${esc(p.customer?.name)}</b><div class="muted small">${esc(p.customer?.phone)} ${esc(p.customer?.email)}</div></div><div><span>Gateway fee + GST</span><b>${inr(p.fee + p.tax)}</b></div><div><span>Refunded</span><b>${inr(rf)}</b></div><div><span>Net to merchant</span><b>${inr(p.status === 'Failed' ? 0 : p.amount - p.fee - p.tax - rf)}</b></div></div>
    ${p.failReason ? `<div class="notice" style="background:var(--danger-soft)">${esc(p.failReason)}</div>` : ''}</div>
    ${(p.refunds || []).length ? `<div class="ticket-perf"></div><div class="ticket-body"><h4>Refunds</h4>${p.refunds.map(r => `<div class="line-item"><span><span class="mono small">${esc(r.id)}</span> · ${esc(r.reason)} · ${fmtDateTime(r.at)}</span><b>${inr(r.amount)}</b></div>`).join('')}</div>` : ''}</div>`;
}
function refundDialog(p, after) {
  const max = p.amount - refunded(p);
  openModal('Refund ' + p.id, `<form id="rf" class="stack"><div class="notice">Paid ${inr(p.amount)} by ${esc(PAY_METHODS[p.method]?.label)} · already refunded ${inr(refunded(p))}. You can refund up to <b>${inr(max)}</b>.</div>
    <div class="form-grid"><label class="field"><span>Amount (₹)</span><input class="input" id="rf-amt" name="amt" type="number" min="1" max="${max}" step="0.01" value="${max}" required></label><label class="field"><span>Reason</span><select class="input" id="rf-why" name="why"><option>Booking cancelled</option><option>Service not provided</option><option>Duplicate payment</option><option>Goodwill / compensation</option><option>Other</option></select></label></div>
    <p class="muted small">Refunds reach UPI and wallets within 1–2 days, cards and net banking within 5–7 working days. The gateway fee is not returned.</p>
    <div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-danger">Refund</button></div></form>`, {
    onMount: m => $('#rf', m).onsubmit = e => { e.preventDefault(); const a = +e.target.amt.value; if (!(a > 0) || a > max) return toast(`Enter an amount between ₹1 and ${inr(max)}`, 'err');
      const r = Pay.refund(p.id, a, e.target.why.value); closeModal(); if (r) Notify.event('payment_refund', { ...Store.find('payments', p.id), refund: r }); if (r) toast(`Refund ${r.id} of ${inr(r.amount)} issued`); after && after(); } });
}

ROUTE_TITLES['payments-admin'] = 'Payments portal';
route('payments-admin', app => {
  const tabs = [['dash', 'Dashboard'], ['txn', 'Transactions'], ['refunds', 'Refunds'], ['settle', 'Settlements'], ['settings', 'Gateway settings']];
  const active = Session.get('tab_#payments-admin') || 'dash';
  app.innerHTML = adminShell({ title: 'Payments master portal', sub: 'Every rupee collected for bus tickets and hotel stays: payments, refunds and bank settlements.', tabs, active, base: 'home' });
  const body = $('#admin-body', app);
  const show = tab => {
    const P = Store.get('payments'), ok = P.filter(p => p.status !== 'Failed'), s = Pay.settings();
    if (tab === 'dash') {
      const gross = ok.reduce((t, p) => t + p.amount, 0), rf = ok.reduce((t, p) => t + refunded(p), 0), fees = ok.reduce((t, p) => t + p.fee + p.tax, 0);
      const rate = P.length ? Math.round(ok.length / P.length * 100) : 0;
      const byM = {}; ok.forEach(p => { const k = PAY_METHODS[p.method]?.label || p.method; byM[k] = (byM[k] || 0) + p.amount; });
      const byB = { 'Bus tickets': 0, 'Hotel stays': 0 }; ok.forEach(p => { byB[p.bookingType === 'bus' ? 'Bus tickets' : 'Hotel stays'] += p.amount; });
      const next = settlementsList().filter(x => x.status === 'Scheduled').reduce((t, x) => t + x.net, 0);
      body.innerHTML = `<div class="notice ${s.mode === 'live' ? 'g' : ''}" style="margin-bottom:14px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><span>Gateway: <b>${esc(s.provider)}</b> · <b>${s.mode === 'live' ? 'LIVE' : 'TEST'} mode</b> · settlement T+${s.settlementDays}</span><button class="btn btn-ghost btn-sm" data-goto="settings">Change settings</button></div>
        <div class="kpis">${kpi('Collected', inr(gross), `${ok.length} successful payments`)}${kpi('Refunded', inr(rf), `${ok.filter(p => p.refunds?.length).length} refunds`)}${kpi('Gateway fees + GST', inr(fees))}${kpi('Net revenue', inr(gross - rf - fees))}${kpi('Success rate', rate + '%', `${P.length - ok.length} failed attempts`, rate < 85)}${kpi('Next settlement', inr(next), 'scheduled to bank')}</div>
        <div class="grid g2" style="margin-top:18px"><div class="card"><h3 style="margin-bottom:14px">Collections by method</h3>${bars(Object.entries(byM).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v, inr(v)]))}<p class="muted small" style="margin-top:12px">UPI and RuPay debit cards carry zero MDR in India, so they cost nothing to accept.</p></div>
        <div class="card"><h3 style="margin-bottom:14px">Collections by business</h3>${bars(Object.entries(byB).map(([k, v]) => [k, v, inr(v)]))}</div></div>
        <div class="card" style="margin-top:18px"><h3 style="margin-bottom:12px">Latest transactions</h3><div class="table-wrap"><table class="table"><thead><tr><th>Payment</th><th>For</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead><tbody>
        ${P.slice(0, 7).map(p => `<tr><td class="mono small">${esc(p.id)}</td><td>${p.bookingType === 'bus' ? 'Bus' : 'Hotel'} <span class="mono small">${esc(p.bookingId || '')}</span></td><td>${esc(PAY_METHODS[p.method]?.label)}<div class="muted small">${esc(p.detail)}</div></td><td>${inr(p.amount)}</td><td>${statusChip(p.status)}</td></tr>`).join('')}</tbody></table></div></div>`;
      $$('[data-goto]', body).forEach(b => b.onclick = () => $(`.admin-tabs [data-tab="${b.dataset.goto}"]`).click());
    }
    if (tab === 'txn') renderCrud(body, { key: 'payments', single: 'Payment', plural: 'Payments', noAdd: true, noEdit: true, noDelete: true,
      columns: [{ label: 'Payment', render: r => `<span class="mono small">${esc(r.id)}</span><div class="muted small">${fmtDateTime(r.createdAt)}</div>` }, { label: 'Booking', render: r => `${r.bookingType === 'bus' ? 'Bus ticket' : 'Hotel stay'}<div class="mono small">${esc(r.bookingId || '—')}</div>` }, { label: 'Customer', render: r => `${esc(r.customer?.name)}<div class="muted small">${esc(r.customer?.phone)}</div>` },
        { label: 'Method', render: r => `${esc(PAY_METHODS[r.method]?.label)}<div class="muted small">${esc(r.detail)}</div>` }, { label: 'Amount', render: r => `${inr(r.amount)}${refunded(r) ? `<div class="small" style="color:var(--danger)">−${inr(refunded(r))}</div>` : ''}` }, { label: 'Fee', render: r => inr(r.fee + r.tax) }, { label: 'Status', render: r => statusChip(r.status) }],
      actions: [{ id: 'v', label: 'Details', run: r => openModal('Payment details', paymentDetail(r), { wide: true }) }, { id: 'rf', label: 'Refund', show: r => ['Captured', 'Partially refunded'].includes(r.status), run: (r, rr) => refundDialog(r, rr) }] });
    if (tab === 'refunds') {
      const R = ok.flatMap(p => (p.refunds || []).map(r => ({ ...r, p }))).sort((a, b) => b.at.localeCompare(a.at));
      body.innerHTML = `<div class="kpis" style="margin-bottom:16px">${kpi('Refunds issued', R.length)}${kpi('Total refunded', inr(R.reduce((t, r) => t + r.amount, 0)))}</div><div class="table-wrap"><table class="table"><thead><tr><th>Refund</th><th>Payment</th><th>Booking</th><th>Customer</th><th>Reason</th><th>Amount</th><th>Status</th></tr></thead><tbody>
        ${R.map(r => { const done = (Date.now() - new Date(r.at)) > 2 * 864e5 || ['upi', 'wallet'].includes(r.p.method); return `<tr><td class="mono small">${esc(r.id)}<div class="muted small">${fmtDateTime(r.at)}</div></td><td class="mono small">${esc(r.p.id)}</td><td class="mono small">${esc(r.p.bookingId)}</td><td>${esc(r.p.customer?.name)}</td><td>${esc(r.reason)}</td><td>${inr(r.amount)}</td><td><span class="chip ${done ? 'green' : 'warn'}">${done ? 'Processed' : 'Pending at bank'}</span></td></tr>`; }).join('') || '<tr><td colspan="7" class="empty">No refunds yet.</td></tr>'}</tbody></table></div>`;
    }
    if (tab === 'settle') {
      const S = settlementsList();
      body.innerHTML = `<p class="muted" style="margin-bottom:12px">Each day's collections, less gateway fees and refunds, are paid to the company bank account ${s.settlementDays} working day(s) later (T+${s.settlementDays}).</p>
        <div class="table-wrap"><table class="table"><thead><tr><th>Settlement</th><th>Collections of</th><th>Payments</th><th>Gross</th><th>Fees + GST</th><th>Refunds</th><th>Net to bank</th><th>Status</th></tr></thead><tbody>
        ${S.map(x => `<tr><td class="mono small">${x.id}<div class="muted small">${x.utr}</div></td><td>${fmtDate(x.day)}</td><td>${x.n}</td><td>${inr(x.gross)}</td><td>${inr(x.fee)}</td><td>${inr(x.refunds)}</td><td><b>${inr(x.net)}</b></td><td><span class="chip ${x.status === 'Processed' ? 'green' : 'blue'}">${x.status}</span><div class="muted small">${fmtDate(x.on)}</div></td></tr>`).join('') || '<tr><td colspan="8" class="empty">No settlements yet.</td></tr>'}</tbody></table></div>`;
    }
    if (tab === 'settings') {
      body.innerHTML = `<div class="split"><form class="card stack" id="gs"><h3>Gateway settings</h3><div class="form-grid">
        <label class="field"><span>Provider</span><select class="input" id="gs-prov" name="provider">${PROVIDERS.map(p => `<option ${p === s.provider ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
        <label class="field"><span>Mode</span><select class="input" id="gs-mode" name="mode"><option value="test" ${s.mode === 'test' ? 'selected' : ''}>Test (simulated)</option><option value="live" ${s.mode === 'live' ? 'selected' : ''}>Live (real money)</option></select></label>
        <label class="field full"><span>Key ID (public)</span><input class="input mono" id="gs-key" name="keyId" value="${esc(s.keyId)}" autocomplete="off"></label>
        <label class="field"><span>Name on checkout</span><input class="input" id="gs-name" name="merchantName" value="${esc(s.merchantName)}" required></label>
        <label class="field"><span>Convenience fee %</span><input class="input" id="gs-fee" name="convFeePct" type="number" min="0" max="5" step="0.1" value="${s.convFeePct}"></label>
        <label class="field"><span>Settlement cycle (days)</span><input class="input" id="gs-days" name="settlementDays" type="number" min="0" max="7" value="${s.settlementDays}"></label></div>
        <div><h4 style="margin-bottom:8px">Payment methods shown to customers</h4><div class="chips">${Object.entries(PAY_METHODS).map(([k, v]) => `<label class="check chip"><input type="checkbox" name="m_${k}" ${s.methods?.[k] ? 'checked' : ''}> ${v.label}</label>`).join('')}</div></div>
        <button class="btn btn-primary">Save settings</button></form>
        <div class="stack" style="align-content:start"><div class="notice" style="background:var(--danger-soft)"><b>Never enter the key secret here.</b><p style="margin-top:6px">Only the public Key ID belongs in the website. The secret stays on your server, which creates orders and verifies each payment signature.</p></div>
        <div class="notice"><b>Going live with Razorpay</b><ol style="margin:8px 0 0;padding-left:18px;display:grid;gap:4px"><li>Complete KYC in the Razorpay dashboard.</li><li>Add a server endpoint that creates an order and verifies <span class="mono">razorpay_signature</span>.</li><li>Paste the <span class="mono">rzp_live_…</span> Key ID, switch to Live, save.</li><li>Set up webhooks for payment.captured and refund.processed.</li></ol></div></div></div>`;
      $('#gs', body).onsubmit = e => { e.preventDefault(); const f = e.target, key = f.keyId.value.trim();
        if (f.provider.value === 'Razorpay' && key && !/^rzp_(test|live)_\w{6,}$/.test(key)) return toast('A Razorpay Key ID starts with rzp_test_ or rzp_live_', 'err');
        if (f.mode.value === 'live' && f.provider.value === 'Razorpay' && !key.startsWith('rzp_live_')) return toast('Live mode needs a rzp_live_ Key ID', 'err');
        const methods = Object.fromEntries(Object.keys(PAY_METHODS).map(k => [k, f['m_' + k].checked]));
        if (!Object.values(methods).some(Boolean)) return toast('Keep at least one payment method turned on', 'err');
        Store.set('gatewaySettings', { provider: f.provider.value, mode: f.mode.value, keyId: key, merchantName: f.merchantName.value.trim(), convFeePct: +f.convFeePct.value || 0, settlementDays: +f.settlementDays.value || 0, methods });
        toast('Gateway settings saved'); };
    }
  };
  bindTabs(app, show); show(active);
});
