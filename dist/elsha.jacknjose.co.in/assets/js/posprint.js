/* POS (thermal receipt) printing for restaurant and bar bills and kitchen tickets.
   Two ways to print, chosen per computer under Billing counter → Printer settings:
   1. "browser": the bill is laid out for 80 mm or 58 mm paper and sent through the normal print box to the POS printer's driver.
   2. "direct": ESC/POS commands go straight to the printer over USB or a serial / Bluetooth port (Chrome or Edge on a computer or Android).
      This also cuts the paper and can open the cash drawer. */
'use strict';

const POS = {
  key: 'jj_pos_printer', port: null, usb: null, usbEp: 0,
  cfg() { let c = {}; try { c = JSON.parse(localStorage.getItem(this.key) || '{}'); } catch (e) { /* defaults */ } return { paper: '80', mode: 'browser', auto: true, copies: 1, drawer: false, kot: false, baud: 9600, header: '', footer: 'Thank you. Please visit again.', ...c }; },
  save(p) { try { localStorage.setItem(this.key, JSON.stringify({ ...this.cfg(), ...p })); } catch (e) { toast('This browser could not remember the printer settings', 'err'); } },
  cols() { return this.cfg().paper === '58' ? 32 : 48; },
  connected() { return !!(this.port || this.usb); },
  async connect(kind) {
    if (kind === 'usb') { if (!navigator.usb) throw new Error('This browser cannot talk to USB printers. Use Chrome or Edge.');
      const d = await navigator.usb.requestDevice({ filters: [{ classCode: 7 }] }); await this.openUsb(d); }
    else { if (!navigator.serial) throw new Error('This browser cannot talk to serial or Bluetooth printers. Use Chrome or Edge on a computer.');
      const p = await navigator.serial.requestPort(); await p.open({ baudRate: +this.cfg().baud || 9600 }); this.port = p; this.usb = null; }
  },
  async openUsb(d) { await d.open(); if (!d.configuration) await d.selectConfiguration(1);
    for (const i of d.configuration.interfaces) for (const alt of i.alternates) { const ep = alt.endpoints.find(e => e.direction === 'out' && e.type === 'bulk'); if (ep && (alt.interfaceClass === 7 || !this.usbEp)) { await d.claimInterface(i.interfaceNumber); this.usb = d; this.usbEp = ep.endpointNumber; this.port = null; return; } }
    throw new Error('That USB device does not look like a receipt printer.'); },
  async ensure() { // reuse a printer this browser was already allowed to use
    if (this.connected()) return true;
    try { if (navigator.serial) { const [p] = await navigator.serial.getPorts(); if (p) { await p.open({ baudRate: +this.cfg().baud || 9600 }); this.port = p; return true; } } } catch (e) { /* try USB next */ }
    try { if (navigator.usb) { const [d] = await navigator.usb.getDevices(); if (d) { await this.openUsb(d); return true; } } } catch (e) { /* not connected */ }
    return false; },
  async send(bytes) { if (!(await this.ensure())) throw new Error('No printer is connected. Open Printer settings and connect it.');
    if (this.usb) { for (let i = 0; i < bytes.length; i += 4096) await this.usb.transferOut(this.usbEp, bytes.slice(i, i + 4096)); }
    else { const w = this.port.writable.getWriter(); try { await w.write(bytes); } finally { w.releaseLock(); } } },
};

/* ---- plain-text layout shared by bills and kitchen tickets: [{ t, align, bold, big }] ---- */
const posTxt = s => String(s ?? '').replace(/₹\s?/g, 'Rs.').replace(/×/g, 'x').replace(/→/g, '->').replace(/[–—]/g, '-').replace(/·/g, '-').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7e]/g, '?');
const posLR = (l, r, n) => { l = posTxt(l); r = posTxt(r); const room = n - r.length - 1; if (l.length > room) l = l.slice(0, Math.max(0, room)); return l + ' '.repeat(Math.max(1, n - l.length - r.length)) + r; };
const posWrap = (s, n) => { const out = []; let cur = ''; posTxt(s).split(' ').forEach(w => { while (w.length > n) { if (cur) { out.push(cur); cur = ''; } out.push(w.slice(0, n)); w = w.slice(n); } if ((cur + ' ' + w).trim().length > n) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); if (cur) out.push(cur); return out.length ? out : ['']; };
const posMoney = n => (Math.round((+n || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(+n || 0) ? 0 : 2, maximumFractionDigits: 2 });
function posBillLines(b) {
  const c = POS.cfg(), n = POS.cols(), h = Store.find('hotels', b.hotelId) || {}, food = b.dept !== 'Bar', half = Math.round(b.tax * 50) / 100, rule = { t: '-'.repeat(n) }, L = [], C = (t, o = {}) => posWrap(t, o.big ? Math.floor(n / 2) : n).forEach(x => L.push({ t: x, align: 'c', ...o }));
  const W = n < 40 ? [3, 7, 8] : [4, 8, 10], nameW = n - W[0] - W[1] - W[2], row = (a, q, r, m) => posTxt(a).padEnd(nameW).slice(0, nameW) + String(q).padStart(W[0]) + String(r).padStart(W[1]) + String(m).padStart(W[2]);
  C(h.name || SITE_CONFIG.name, { bold: true, big: true }); if (h.area || h.city) C([h.area, h.city].filter(Boolean).join(', ')); if (SITE_CONFIG.gstin) C('GSTIN ' + SITE_CONFIG.gstin); if (c.header) C(c.header);
  C(food ? 'RESTAURANT BILL' : 'BAR BILL', { bold: true }); L.push(rule);
  L.push({ t: posLR('Bill: ' + b.id, fmtDateTime(b.createdAt), n) }); L.push({ t: posLR(b.table + (b.guestName ? ' - ' + b.guestName : ''), b.waiter ? 'Waiter: ' + b.waiter : '', n) }); L.push(rule);
  L.push({ t: row('Item', 'Qty', 'Rate', 'Amount'), bold: true }); L.push(rule);
  b.items.forEach(i => { const w = posWrap(i.name, nameW); L.push({ t: row(w[0], i.qty, posMoney(i.price), posMoney(i.price * i.qty)) }); w.slice(1).forEach(x => L.push({ t: x })); });
  L.push(rule); L.push({ t: posLR('Subtotal', posMoney(b.sub), n) }); if (b.discount) L.push({ t: posLR('Discount', '-' + posMoney(b.discount), n) }); if (b.service) L.push({ t: posLR('Service charge', posMoney(b.service), n) });
  if (food) { L.push({ t: posLR('CGST', half.toFixed(2), n) }); L.push({ t: posLR('SGST', (b.tax - half).toFixed(2), n) }); } else L.push({ t: posLR('Tax', (+b.tax).toFixed(2), n) });
  L.push(rule); L.push({ t: posLR('TOTAL', 'Rs.' + posMoney(b.total), Math.floor(n / 2)), bold: true, big: true }); L.push(rule);
  L.push({ t: posLR(b.settled === 'Room' ? 'Posted to room folio' : 'Paid by', b.settled === 'Room' ? b.table : b.method || '', n) }); L.push({ t: posLR('Cashier', b.cashier || '', n) }); L.push({ t: '' }); if (c.footer) C(c.footer);
  return L;
}
function posKotLines(o) {
  const n = POS.cols(), L = [], rule = { t: '-'.repeat(n) };
  L.push({ t: o.dept === 'Bar' ? 'BAR ORDER' : 'KITCHEN ORDER', align: 'c', bold: true }); L.push({ t: posTxt(o.table), align: 'c', bold: true, big: true }); L.push({ t: posLR(o.id, fmtDateTime(o.createdAt), n) }); if (o.waiter || o.covers) L.push({ t: posLR(o.waiter ? 'Waiter: ' + o.waiter : '', o.covers ? o.covers + ' guests' : '', n) }); L.push(rule);
  o.items.forEach(i => { posWrap(`${i.qty} x ${i.name}`, Math.floor(n / 2)).forEach(x => L.push({ t: x, bold: true, big: true })); if (i.note) posWrap('  ** ' + i.note, n).forEach(x => L.push({ t: x, bold: true })); });
  L.push(rule); return L;
}
/* ---- ESC/POS bytes ---- */
function posEscPos(lines, { cut = true, drawer = false } = {}) {
  const out = [0x1b, 0x40]; let align = '', bold = false, big = false;
  lines.forEach(l => { const a = l.align === 'c' ? 1 : l.align === 'r' ? 2 : 0; if (a !== align) { out.push(0x1b, 0x61, a); align = a; } if (!!l.bold !== bold) { bold = !!l.bold; out.push(0x1b, 0x45, bold ? 1 : 0); } if (!!l.big !== big) { big = !!l.big; out.push(0x1d, 0x21, big ? 0x11 : 0x00); }
    for (const ch of posTxt(l.t)) out.push(ch.charCodeAt(0)); out.push(0x0a); });
  out.push(0x1b, 0x45, 0, 0x1d, 0x21, 0, 0x1b, 0x61, 0, 0x0a, 0x0a, 0x0a, 0x0a); if (cut) out.push(0x1d, 0x56, 0x42, 0x00); if (drawer) out.push(0x1b, 0x70, 0x00, 0x19, 0xfa);
  return new Uint8Array(out);
}
/* ---- browser printing on receipt-width paper ---- */
const POS_CSS = `html,body{margin:0;padding:0;background:#fff;color:#000}*{box-sizing:border-box}.tk{font-family:"Courier New",ui-monospace,monospace;font-weight:600;white-space:pre;overflow:hidden;page-break-after:always;break-after:page}.tk:last-child{page-break-after:auto;break-after:auto}.tk div{min-height:1.25em;line-height:1.25}.tk .c{text-align:center}.tk .b{font-weight:800}.tk .g{font-size:200%;line-height:1.15}`;
const posLinesHtml = lines => `<div class="tk">${lines.map(l => `<div class="${[l.align === 'c' ? 'c' : '', l.bold ? 'b' : '', l.big ? 'g' : ''].join(' ').trim()}">${esc(l.t) || ' '}</div>`).join('')}</div>`;
function posBrowserPrint(lines, copies = 1) {
  if (SITE_CONFIG.allowPrint === false) return toast('Printing works on the live website. This preview only shows the bill.', 'err');
  const c = POS.cfg(), w = c.paper === '58' ? 58 : 80, body = w - 8, n = POS.cols(), f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;left:-9999px;top:0;width:' + w + 'mm;height:10px;border:0';
  document.body.appendChild(f); const d = f.contentDocument; d.open();
  d.write(`<!doctype html><html><head><meta charset="utf-8"><title>Print</title><style>${POS_CSS}body{width:${w}mm;padding:2mm 4mm 4mm}.tk{width:${body}mm;font-size:${(body / n / 0.6).toFixed(3)}mm}</style></head><body>${Array.from({ length: Math.max(1, +copies || 1) }, () => posLinesHtml(lines)).join('')}</body></html>`); d.close();
  setTimeout(() => { const tk = d.querySelector('.tk'), mm = Math.ceil(tk.getBoundingClientRect().height * 25.4 / 96) + 12, st = d.createElement('style'); st.textContent = `@page{size:${w}mm ${mm}mm;margin:0}`; d.head.appendChild(st);
    try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast('The print box could not be opened', 'err'); } setTimeout(() => f.remove(), 120000); }, 200);
}
/* ---- what the screens call ---- */
async function posPrint(lines, { copies = 1, drawer = false, quiet = false } = {}) {
  const c = POS.cfg();
  if (c.mode === 'direct') { try { const bytes = posEscPos(lines, { drawer }); for (let i = 0; i < Math.max(1, +copies || 1); i++) await POS.send(i ? posEscPos(lines) : bytes); if (!quiet) toast('Sent to the POS printer'); return true; }
    catch (e) { toast(`${e.message || 'The printer did not respond'} Using the print box instead.`, 'err'); } }
  posBrowserPrint(lines, copies); return false;
}
const posPrintBill = (b, o = {}) => posPrint(posBillLines(b), { copies: POS.cfg().copies, drawer: POS.cfg().drawer && b.method === 'Cash' && !o.reprint, ...o });
const posPrintKot = o => posPrint(posKotLines(o), { quiet: true });
function posPreview(lines) { return `<div class="pos-paper p${POS.cfg().paper}">${posLinesHtml(lines)}</div>`; }
function posSettings(after) {
  const c = POS.cfg(), can = { usb: !!navigator.usb, serial: !!navigator.serial };
  openModal('POS printer settings', `<form id="ps" class="stack"><p class="muted small">These settings are remembered on this computer only, so each billing counter can have its own printer.</p>
    <div class="form-grid"><label class="field"><span>Paper width</span><select class="input" name="paper"><option value="80" ${c.paper === '80' ? 'selected' : ''}>80 mm (3 inch)</option><option value="58" ${c.paper === '58' ? 'selected' : ''}>58 mm (2 inch)</option></select></label>
      <label class="field"><span>How to print</span><select class="input" name="mode"><option value="browser" ${c.mode === 'browser' ? 'selected' : ''}>Through the print box (printer driver)</option><option value="direct" ${c.mode === 'direct' ? 'selected' : ''}>Direct to the printer (ESC/POS)</option></select></label>
      <label class="field"><span>Copies of each bill</span><input class="input" type="number" name="copies" min="1" max="3" value="${c.copies}"></label><label class="field"><span>Serial speed (direct, serial only)</span><select class="input" name="baud">${[9600, 19200, 38400, 57600, 115200].map(x => `<option ${+c.baud === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="field full"><span>Extra line under the hotel name</span><input class="input" name="header" value="${esc(c.header)}" placeholder="e.g. Phone 97910 66604 · FSSAI 1234567890"></label><label class="field full"><span>Last line of the bill</span><input class="input" name="footer" value="${esc(c.footer)}"></label>
      <label class="check full"><input type="checkbox" name="auto" ${c.auto ? 'checked' : ''}> Print the bill automatically when it is paid</label>
      <label class="check full"><input type="checkbox" name="kot" ${c.kot ? 'checked' : ''}> Print a kitchen / bar ticket on this printer when an order is sent from this computer</label>
      <label class="check full"><input type="checkbox" name="drawer" ${c.drawer ? 'checked' : ''}> Open the cash drawer for cash bills (direct printing only)</label></div>
    <div class="card stack" style="background:var(--surface-2)"><b>Direct printing</b><div class="muted small" id="ps-state"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn btn-outline btn-sm" data-con="usb" ${can.usb ? '' : 'disabled'}>Connect USB printer</button><button type="button" class="btn btn-outline btn-sm" data-con="serial" ${can.serial ? '' : 'disabled'}>Connect serial / Bluetooth printer</button></div>
      <p class="muted small">Direct printing needs Chrome or Edge. If Windows does not let the browser use a USB printer, pair it as a serial (COM) or Bluetooth printer, or use the print box method.</p></div>
    <details class="muted small"><summary>Setting up the print box method</summary><ol style="padding-left:18px;display:grid;gap:4px;margin-top:6px"><li>Install the printer’s driver and print its test page from Windows.</li><li>In the print box choose the POS printer, paper size 80 mm (or 58 mm), Margins: None, and turn off Headers and footers.</li><li>To skip the print box each time, start Chrome with the option <span class="mono">--kiosk-printing</span> and make the POS printer the default printer.</li></ol></details>
    <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap"><button type="button" class="btn btn-outline" id="ps-test">Save and print a test</button><button class="btn btn-primary">Save</button></div></form>`, { onMount: m => {
      const f = $('#ps', m), state = () => { $('#ps-state', m).textContent = POS.usb ? `Connected by USB: ${POS.usb.productName || 'receipt printer'}` : POS.port ? 'Connected by serial / Bluetooth port' : 'No printer connected for direct printing yet.'; };
      const keep = () => POS.save({ paper: f.paper.value, mode: f.mode.value, copies: Math.min(3, Math.max(1, +f.copies.value || 1)), baud: +f.baud.value, header: f.header.value.trim(), footer: f.footer.value.trim(), auto: f.auto.checked, kot: f.kot.checked, drawer: f.drawer.checked });
      POS.ensure().then(state); state();
      $$('[data-con]', m).forEach(b => b.onclick = async () => { keep(); try { await POS.connect(b.dataset.con); f.mode.value = 'direct'; keep(); toast('Printer connected'); } catch (e) { if (e.name !== 'NotFoundError') toast(e.message || 'Could not connect to the printer', 'err'); } state(); });
      $('#ps-test', m).onclick = () => { keep(); const n = POS.cols(); posPrint([{ t: 'TEST PRINT', align: 'c', bold: true, big: true }, { t: SITE_CONFIG.name, align: 'c' }, { t: '-'.repeat(n) }, { t: posLR('Paper', POS.cfg().paper + ' mm', n) }, { t: posLR('Columns', String(n), n) }, { t: '1234567890'.repeat(5).slice(0, n) }, { t: '-'.repeat(n) }, { t: 'If this line is cut off, choose 58 mm.', align: 'c' }]); };
      f.onsubmit = e => { e.preventDefault(); keep(); closeModal(); toast('Printer settings saved'); after && after(); }; } });
}
