'use strict';
/* Hotel Jothi Grand: staff check in / out from their own phone with a selfie and GPS location.
   The server stamps the time and works out the distance from the hotel. */

const distTxt = m => m == null ? '' : m >= 1000 ? (m / 1000).toFixed(1) + ' km' : m + ' m';
const mapLink = loc => loc ? `https://www.google.com/maps?q=${loc.lat},${loc.lng}` : '';
function distChip(m) {
  if (m == null) return '';
  const r = +S().radius || 200; return chip(`${distTxt(m)} from hotel`, m <= r ? 'c-green' : m <= r * 3 ? 'c-amber' : 'c-red');
}
/* one cell of the manager's daily register: what the person recorded from the phone */
function punchCell(a) {
  if (!a || !a.inAt) return '<span class="muted small">—</span>';
  const side = (t, ph, loc, d, lab) => t ? `<div class="punch"><b>${lab} ${esc(String(t).slice(11, 16))}</b>${ph ? thumb(ph, 'selfie') : ''}${loc ? `<a href="${mapLink(loc)}" target="_blank" rel="noopener" title="Open in Google Maps">📍</a>` : ''}${distChip(d)}</div>` : '';
  return side(a.inAt, a.inPhoto, a.inLoc, a.inDist, 'In') + side(a.outAt, a.outPhoto, a.outLoc, a.outDist, 'Out') + (a.hours ? `<div class="small muted">${a.hours} h on duty</div>` : '');
}
function getPosition() {
  return new Promise((ok, no) => {
    if (!navigator.geolocation) return no(new Error('This phone cannot share its location in the browser.'));
    navigator.geolocation.getCurrentPosition(p => ok({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      e => no(new Error(e.code === 1 ? 'Location is blocked. In the browser, allow location for this site (tap the lock icon next to the address), then try again.' : 'Could not find your location. Switch on GPS / location and try again.')), { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  });
}

async function myatt(el) {
  const mon = STATE.myMon || iso().slice(0, 7);
  el.innerHTML = '<p class="muted">Loading…</p>';
  let j; try { j = await call('myAttendance', { month: mon }); } catch (e) { el.innerHTML = `<div class="card"><p>${esc(e.message)}</p></div>`; return; }
  if (route() !== 'myatt') return;
  const rec = j.records.sort((a, b) => b.date.localeCompare(a.date)), today = j.now.slice(0, 10);
  const t = rec.find(r => r.date === today), open = rec.find(r => r.inAt && !r.outAt && (Date.parse(j.now.replace(' ', 'T')) - Date.parse(r.inAt.replace(' ', 'T'))) < 16 * 3600e3);
  const next = open ? 'out' : (t && t.inAt ? '' : 'in'), rules = j.rules;
  el.innerHTML = `<div class="punch-card card">
      <div class="pc-top"><div><small class="muted">${esc(j.staff.id)} · ${esc(j.staff.role)}</small><h2>${esc(j.staff.name)}</h2><p class="muted" id="clock"></p></div>${chip(next === 'out' ? 'On duty' : t && t.outAt ? 'Done for today' : 'Not checked in', next === 'out' ? 'c-green' : t && t.outAt ? 'c-blue' : 'c-amber')}</div>
      ${open ? `<p>Checked in at <b>${esc(open.inAt.slice(11, 16))}</b>${open.date !== today ? ' (yesterday)' : ''} ${distChip(open.inDist)}</p>` : t && t.outAt ? `<p>Checked in ${esc(t.inAt.slice(11, 16))} · out ${esc(t.outAt.slice(11, 16))} · ${t.hours} h</p>` : ''}
      ${next ? `<button class="btn btn-p punch-btn" id="punch">${next === 'in' ? '📸 Check in' : '📸 Check out'}</button>` : '<p class="muted">See you next shift.</p>'}
      <p class="small muted" style="margin:10px 0 0">${[rules.photo ? 'a selfie' : '', rules.location ? 'your location' : ''].filter(Boolean).join(' and ') ? `Needs ${[rules.photo ? 'a selfie' : '', rules.location ? 'your location' : ''].filter(Boolean).join(' and ')}.` : ''}${rules.onSite ? ` You must be within ${rules.radius} m of the hotel.` : ''}</p>
      <div id="pmsg"></div></div>
    <div class="bar" style="margin-top:18px"><label class="f">Month<input class="in" type="month" id="mm" value="${mon}" max="${today.slice(0, 7)}"></label><span class="grow"></span><span class="muted small">${rec.filter(r => ['P', 'H'].includes(r.status)).length} day(s) present · ${Math.round(rec.reduce((s2, r) => s2 + (+r.hours || 0), 0) * 10) / 10} h</span></div>
    <div class="table-wrap"><table><thead><tr><th>Date</th><th>Status</th><th>Check-in / out</th></tr></thead><tbody>${rec.map(r => `<tr><td class="nowrap">${fmtD(r.date)}</td><td>${r.status ? chip(ATT[r.status] || r.status, r.status === 'A' ? 'c-red' : r.status === 'P' ? 'c-green' : '') : ''}</td><td>${r.inAt ? punchCell(r) : `<span class="muted small">${r.leaveType ? esc((LEAVE_SHORT[r.leaveType] || r.leaveType) + ' leave · approved') : esc([r.in, r.out].filter(Boolean).join(' – ') || 'marked by manager')}</span>`}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">Nothing this month yet.</td></tr>'}</tbody></table></div>${leaveBlock(j)}`;
  hydrateThumbs(el); bindLeave(el, j);
  const tick = () => { const c = $('#clock'); if (!c) return clearInterval(STATE.clk); c.textContent = new Date().toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
  clearInterval(STATE.clk); tick(); STATE.clk = setInterval(tick, 1000);
  $('#mm', el).onchange = e => { STATE.myMon = e.target.value || today.slice(0, 7); render(); };
  const btn = $('#punch', el); if (!btn) return;
  btn.onclick = async () => {
    const msg = $('#pmsg', el), say = (t2, bad) => { msg.innerHTML = `<p class="${bad ? 'note' : 'muted'}" style="margin-top:12px">${t2}</p>`; };
    btn.disabled = true;
    try {
      const where = rules.location ? getPosition() : Promise.resolve(null); where.catch(() => {});   // ask for location while the camera opens
      let photo = null;
      if (rules.photo) { const shot = await camera('user', next === 'in' ? 'Selfie to check in' : 'Selfie to check out'); if (!shot) { btn.disabled = false; return; } say('Uploading your selfie…'); photo = await uploadFile('attendance', shot, `${j.staff.id}-${next}-${today}`); }
      say('Finding your location…'); const loc = await where;
      const r = await call('punch', { type: next, photo: photo?.id || '', ...(loc || {}) });
      toast(next === 'in' ? `Checked in at ${r.record.in}` : `Checked out at ${r.record.out} · ${r.record.hours} h`); render();
    } catch (e) { say(esc(e.message), true); btn.disabled = false; }
  };
}

Object.assign(VIEWS, { myatt });
