/* Portal extras: photo & video manager, ratings & reviews (with operator challenges), bus seat-layout editor,
   boarding/dropping points, parcel transhipment hub, and printable parcel copies with QR codes. */
'use strict';

/* =====================================================================
   1. PHOTOS & VIDEOS (buses and hotels)
   Photos are resized in the browser and saved with the other site data. With a server, upload them there instead.
   ===================================================================== */
SEED.media = () => [];
const MAX_PHOTOS = 8;
function resizeImage(file, max = 1000, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Could not read ' + file.name));
    fr.onload = () => { const img = new Image(); img.onerror = () => reject(new Error(file.name + ' is not an image'));
      img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); resolve(c.toDataURL('image/jpeg', quality)); };
      img.src = fr.result; };
    fr.readAsDataURL(file);
  });
}
const Media = {
  of: (type, id, kind) => Store.get('media').filter(m => m.ownerType === type && m.ownerId === id && (!kind || m.kind === kind)).sort((a, b) => (b.cover ? 1 : 0) - (a.cover ? 1 : 0) || String(a.createdAt).localeCompare(String(b.createdAt))),
  cover(type, id) { return this.of(type, id, 'photo')[0]?.src || ''; },
  async addFiles(type, id, files) {
    let added = 0;
    for (const f of [...files]) {
      if (this.of(type, id, 'photo').length >= MAX_PHOTOS) { toast(`Up to ${MAX_PHOTOS} photos each. Remove one to add another.`, 'err'); break; }
      if (!/^image\//.test(f.type)) { toast(`${f.name} is not an image file`, 'err'); continue; }
      try { const src = await resizeImage(f); Store.add('media', { id: genId('MED', 6), ownerType: type, ownerId: id, kind: 'photo', src, caption: f.name.replace(/\.[^.]+$/, ''), createdAt: new Date().toISOString() });
        if (Store.lastError) { Store.remove('media', Store.get('media')[0].id); toast('This browser’s storage is full. Remove some photos first.', 'err'); break; } added++; }
      catch (e) { toast(e.message, 'err'); }
    }
    return added;
  },
  addVideo(type, id, url, caption) {
    if (!/^https:\/\/\S+\.\S+/.test(url)) return 'Paste a full https:// video link (YouTube, Vimeo or an .mp4 file)';
    Store.add('media', { id: genId('MED', 6), ownerType: type, ownerId: id, kind: 'video', src: url, caption: caption || 'Video', createdAt: new Date().toISOString() }); return null;
  },
};
function videoEmbed(v) {
  const yt = v.src.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  const player = yt ? `<div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}" title="${esc(v.caption)}" loading="lazy" allowfullscreen></iframe></div>`
    : /\.(mp4|webm|ogg)(\?|$)/i.test(v.src) ? `<video class="video-frame" controls preload="metadata" src="${esc(v.src)}"></video>` : '';
  return `<div class="stack" style="gap:6px">${player}<a class="small" href="${esc(v.src)}" target="_blank" rel="noopener">▶ ${esc(v.caption)} (opens in a new tab)</a></div>`;
}
/* Public gallery: main picture + thumbnails + videos. Thumbnails swap the main picture in place. */
function galleryHtml(type, id) {
  const ph = Media.of(type, id, 'photo'), vids = Media.of(type, id, 'video');
  if (!ph.length && !vids.length) return '';
  return `<div class="gallery-box">${ph.length ? `<img class="gal-main" src="${ph[0].src}" alt="${esc(ph[0].caption)}">${ph.length > 1 ? `<div class="gal-thumbs">${ph.map((p, i) => `<button type="button" class="${i ? '' : 'on'}" data-gal-thumb aria-label="Photo ${i + 1}"><img src="${p.src}" alt=""></button>`).join('')}</div>` : ''}` : ''}
    ${vids.length ? `<div class="grid g2">${vids.map(videoEmbed).join('')}</div>` : ''}</div>`;
}
/* Staff manager (modal) */
function mediaManager(type, owner, { videos = false, after } = {}) {
  const name = type === 'bus' ? `${owner.busNo} · ${owner.operator}` : owner.name;
  const draw = m => {
    const ph = Media.of(type, owner.id, 'photo'), vids = Media.of(type, owner.id, 'video'), body = $('#mm-body', m);
    body.innerHTML = `<div><h4 style="margin-bottom:8px">Photos <span class="muted small">${ph.length} of ${MAX_PHOTOS}</span></h4>
      <div class="mm-grid">${ph.map((p, i) => `<figure><img src="${p.src}" alt="${esc(p.caption)}">${i === 0 ? '<span class="chip green">Cover</span>' : `<button class="btn btn-sm btn-light" data-mm-cover="${p.id}">Make cover</button>`}<button class="btn btn-sm btn-danger" data-mm-del="${p.id}" aria-label="Remove photo">Remove</button></figure>`).join('')}
        ${ph.length < MAX_PHOTOS ? `<label class="mm-add"><input type="file" accept="image/*" multiple hidden id="mm-file"><span>+ Add photos</span><small>JPG or PNG, resized automatically</small></label>` : ''}</div></div>
      ${videos ? `<div><h4 style="margin-bottom:8px">Videos</h4><div class="stack">${vids.map(v => `<div class="line-item"><span style="overflow-wrap:anywhere"><b>${esc(v.caption)}</b><br><span class="muted small">${esc(v.src)}</span></span><button class="btn btn-sm btn-danger-ghost" data-mm-del="${v.id}">Remove</button></div>`).join('') || '<p class="muted small">No videos yet.</p>'}
        <form id="mm-video" class="form-grid"><label class="field"><span>Video link</span><input class="input" id="mm-url" name="url" placeholder="https://youtu.be/… or https://…/tour.mp4" required></label><label class="field"><span>Title</span><input class="input" id="mm-cap" name="cap" placeholder="Property walk-through"></label><button class="btn btn-outline full">Add video link</button></form>
        <p class="muted small">Upload the video to YouTube or your own hosting, then paste its link here. Video files are too large to keep inside the website itself.</p></div></div>` : ''}`;
    const fi = $('#mm-file', body); if (fi) fi.onchange = async () => { const n = await Media.addFiles(type, owner.id, fi.files); if (n) toast(`${n} photo${n > 1 ? 's' : ''} added`); draw(m); after && after(); };
    $$('[data-mm-del]', body).forEach(b => b.onclick = () => { Store.remove('media', b.dataset.mmDel); draw(m); after && after(); });
    $$('[data-mm-cover]', body).forEach(b => b.onclick = () => { Store.set('media', Store.get('media').map(x => x.ownerType === type && x.ownerId === owner.id && x.kind === 'photo' ? { ...x, cover: x.id === b.dataset.mmCover } : x)); draw(m); after && after(); });
    const vf = $('#mm-video', body); if (vf) vf.onsubmit = e => { e.preventDefault(); const err = Media.addVideo(type, owner.id, vf.url.value.trim(), vf.cap.value.trim()); if (err) return toast(err, 'err'); toast('Video added'); draw(m); after && after(); };
  };
  openModal(`Photos${videos ? ' & videos' : ''} · ${name}`, `<div id="mm-body" class="stack" style="gap:20px"></div>`, { wide: true, onMount: draw });
}

/* =====================================================================
   2. RATINGS & REVIEWS  (customers rate 1–5; operators can reply or challenge; the group administrator decides)
   ===================================================================== */
SEED.reviews = () => {
  if (SITE_CONFIG.bookingMode !== 'demo') return []; // never show sample reviews on the live (launch-mode) site
  const mk = (type, targetId, targetName, i, rating, text, extra = {}) => ({ id: 'REV' + (4101 + i), targetType: type, targetId, targetName, bookingId: '', name: SAMPLE_NAMES[(i * 3) % SAMPLE_NAMES.length], rating, text, status: 'Published', createdAt: new Date(Date.now() - (i + 1) * 864e5 * 2.3).toISOString(), sample: true, ...extra });
  return [
    mk('bus', 'BUS101', 'Jack & Jose Travels · Kochi → Bengaluru', 0, 5, 'Left on time, clean berths and the blanket was fresh. Driver was careful on the ghat section.'),
    mk('bus', 'BUS101', 'Jack & Jose Travels · Kochi → Bengaluru', 1, 4, 'Comfortable sleeper. Charging point at my berth did not work, otherwise good.', { reply: { text: 'Thank you. We have replaced the charging socket at L7.', by: 'Travels Desk', at: new Date(Date.now() - 864e5).toISOString() } }),
    mk('bus', 'BUS103', 'Jack & Jose Travels · Bengaluru → Kochi', 2, 2, 'Bus reached two hours late and nobody informed us.', {}),
    mk('bus', 'BUS104', 'Jack & Jose Travels · Kochi → Chennai', 3, 1, 'Worst service, I was not allowed to board!!', { status: 'Challenged', challenge: { reason: 'Customer did not travel', note: 'Booking shows the passenger cancelled the ticket two hours before departure and was refunded.', by: 'Travels Desk', at: new Date(Date.now() - 864e5 * 1.5).toISOString() } }),
    mk('bus', 'BUS108', 'Jack & Jose Travels · Kochi → Coimbatore', 4, 4, 'Good day service, AC was a bit too cold.'),
    mk('hotel', 'HTL301', 'Jack & Jose Residency', 5, 5, 'Spotless room, quick check-in and a very good breakfast spread.'),
    mk('hotel', 'HTL301', 'Jack & Jose Residency', 6, 4, 'Great location on MG Road. Pool closes early at 7 pm.', { reply: { text: 'Thanks for staying with us. Pool hours are now extended to 9 pm.', by: 'Hotels Desk', at: new Date(Date.now() - 864e5 * 3).toISOString() } }),
    mk('hotel', 'HTL306', 'Backwater Crest Resort', 7, 5, 'The lake view from the room is exactly like the pictures. Houseboat ride arranged by the desk was the highlight.'),
    mk('hotel', 'HTL309', 'Garden City Grand', 8, 3, 'Room was fine but the WiFi kept dropping during my calls.'),
  ];
};
const starStr5 = n => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
const RATING_WORDS = ['', 'Terrible', 'Poor', 'Average', 'Good', 'Excellent'];
const Reviews = {
  of: (type, id) => Store.get('reviews').filter(r => r.targetType === type && r.targetId === id && r.status !== 'Removed'),
  /* Demo mode falls back to the listing's base rating; on the live site only real reviews count. */
  stats(type, id, base) {
    const R = this.of(type, id);
    if (R.length) return { avg: R.reduce((s, r) => s + r.rating, 0) / R.length, count: R.length };
    return SITE_CONFIG.bookingMode === 'demo' && base ? { avg: +base, count: 0 } : null;
  },
  eligible(type, b) { return type === 'bus' ? b.status === 'Confirmed' && b.date <= todayISO() : ['Checked-in', 'Checked-out'].includes(b.status) || (b.status === 'Confirmed' && b.checkIn <= todayISO()); },
  /* Adds "rate your journey / stay" to a ticket or voucher modal */
  attach(m, type, b) {
    const box = document.createElement('div'); box.className = 'card review-box'; $('.modal-body', m).appendChild(box);
    const targetId = type === 'bus' ? b.busId : b.hotelId, targetName = type === 'bus' ? `${b.operator} · ${b.from} → ${b.to}` : b.hotelName, what = type === 'bus' ? 'journey' : 'stay';
    const draw = () => {
      const mine = Store.get('reviews').find(r => r.bookingId === b.id);
      if (mine) { box.innerHTML = `<h3 style="margin-bottom:10px">Your rating</h3>${reviewItem(mine)}`; return; }
      if (!this.eligible(type, b)) { box.innerHTML = `<h3>Rate your ${what}</h3><p class="muted small" style="margin-top:6px">${b.status === 'Cancelled' || b.status === 'Requested' ? `Only confirmed ${type === 'bus' ? 'tickets' : 'bookings'} can be rated.` : `You can rate this ${what} from ${fmtDate(type === 'bus' ? b.date : b.checkIn)}.`}</p>`; return; }
      box.innerHTML = `<form id="rv-form" class="stack"><h3>Rate your ${what}</h3><div class="star-pick" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="star" data-star="${n}" role="radio" aria-checked="false" aria-label="${n} star${n > 1 ? 's' : ''}: ${RATING_WORDS[n]}">★</button>`).join('')}<span class="muted" id="rv-word">Tap a star</span></div>
        <label class="field"><span>Tell others about it</span><textarea class="input" id="rv-text" name="text" placeholder="${type === 'bus' ? 'Punctuality, cleanliness, staff behaviour…' : 'Room, cleanliness, food, staff…'}" required minlength="10"></textarea></label>
        <label class="field"><span>Your name (shown with the review)</span><input class="input" id="rv-name" name="name" value="${esc(type === 'bus' ? b.passengers?.[0]?.name || '' : b.guest || '')}" required></label>
        <button class="btn btn-primary">Submit rating</button></form>`;
      let rating = 0; const f = $('#rv-form', box);
      $$('.star', f).forEach(s => s.onclick = () => { rating = +s.dataset.star; $$('.star', f).forEach(x => { const on = +x.dataset.star <= rating; x.classList.toggle('on', on); x.setAttribute('aria-checked', +x.dataset.star === rating); }); $('#rv-word', f).textContent = `${rating}/5 · ${RATING_WORDS[rating]}`; });
      f.onsubmit = e => { e.preventDefault(); if (!rating) return toast('Tap a star to give your rating', 'err');
        Store.add('reviews', { id: genId('REV', 6), targetType: type, targetId, targetName, bookingId: b.id, name: f.name.value.trim(), rating, text: f.text.value.trim(), status: 'Published', createdAt: new Date().toISOString() });
        toast('Thank you. Your rating is published.'); draw(); };
    };
    draw();
  },
};
function reviewItem(r) {
  return `<div class="review"><div class="review-head"><span class="stars" aria-label="${r.rating} out of 5">${starStr5(r.rating)}</span><b>${esc(r.name)}</b><span class="muted small">${fmtDate(r.createdAt)}</span>${r.sample ? '<span class="chip">Sample</span>' : ''}${r.status === 'Challenged' ? '<span class="chip warn">Disputed by operator · under review</span>' : ''}</div>
    <p>${esc(r.text)}</p>${r.reply ? `<div class="review-reply"><b>Response from ${r.targetType === 'bus' ? 'the operator' : 'the hotel'}</b><p>${esc(r.reply.text)}</p></div>` : ''}</div>`;
}
function reviewsListHtml(type, id, base) {
  const R = Reviews.of(type, id), st = Reviews.stats(type, id, base);
  if (!R.length) return `<p class="muted">No reviews yet. Travellers can rate after their ${type === 'bus' ? 'journey' : 'stay'} from Manage booking.</p>`;
  const dist = [5, 4, 3, 2, 1].map(n => [n, R.filter(r => r.rating === n).length]);
  return `<div class="review-summary"><div><div class="big num">${st.avg.toFixed(1)}</div><div class="stars">${starStr5(st.avg)}</div><div class="muted small">${R.length} review${R.length > 1 ? 's' : ''}</div></div>
    <div class="bars" style="flex:1;min-width:180px">${dist.map(([n, c]) => `<div class="bar-row" style="grid-template-columns:34px 1fr 28px"><span>${n} ★</span><div class="track"><div class="fill" style="width:${R.length ? c / R.length * 100 : 0}%"></div></div><b class="num" style="text-align:right">${c}</b></div>`).join('')}</div></div>
    <div class="stack">${R.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(reviewItem).join('')}</div>`;
}
/* Clickable rating shown on bus cards and hotel cards */
function ratingBadge(type, id, base, name = '') {
  const st = Reviews.stats(type, id, base);
  if (!st) return `<span class="chip">No ratings yet</span>`;
  return `<button type="button" class="rating" data-reviews="${type}|${esc(id)}|${base || ''}|${esc(name)}" title="See reviews">★ ${st.avg.toFixed(1)}${st.count ? ` <span style="font-weight:500">(${st.count})</span>` : ''}</button>`;
}
/* Staff: reply, challenge, and (administrator) decide */
function reviewsAdmin(body, type) {
  const isAdmin = Auth.user()?.role === 'admin', who = Auth.user()?.name || 'Staff';
  const filter = Session.get('rvFilter_' + type) || 'All';
  const all = Store.get('reviews').filter(r => r.targetType === type), R = all.filter(r => filter === 'All' || r.status === filter);
  const live = all.filter(r => r.status !== 'Removed'), avg = live.length ? (live.reduce((s, r) => s + r.rating, 0) / live.length).toFixed(2) : '—';
  body.innerHTML = `<div class="kpis">${kpi('Average rating', avg, `${live.length} published reviews`)}${kpi('5-star', live.filter(r => r.rating === 5).length)}${kpi('1–2 star', live.filter(r => r.rating <= 2).length, 'need attention', live.some(r => r.rating <= 2 && !r.reply))}${kpi('Challenged', all.filter(r => r.status === 'Challenged').length, 'awaiting administrator decision')}${kpi('Removed', all.filter(r => r.status === 'Removed').length)}</div>
    <div class="notice" style="margin:14px 0">Customers rate 1–5 stars after their ${type === 'bus' ? 'journey' : 'stay'}. ${type === 'bus' ? 'Operators' : 'Hotels'} can <b>reply</b> publicly or <b>challenge</b> a rating they believe is wrong. A challenged review stays visible, marked “under review”, until the group administrator upholds or removes it.</div>
    <div class="chips" style="margin-bottom:12px">${['All', 'Published', 'Challenged', 'Upheld', 'Removed'].map(f => `<button class="chip ${f === filter ? 'on' : ''}" data-rvf="${f}">${f}</button>`).join('')}</div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>${type === 'bus' ? 'Bus' : 'Hotel'}</th><th>Customer</th><th>Rating</th><th>Review</th><th>Status</th><th></th></tr></thead><tbody>
    ${R.map(r => `<tr><td style="white-space:nowrap">${fmtDate(r.createdAt)}</td><td>${esc(r.targetName)}</td><td>${esc(r.name)}<div class="muted small mono">${esc(r.bookingId || (r.sample ? 'sample' : ''))}</div></td><td><span class="stars" style="white-space:nowrap">${starStr5(r.rating)}</span></td>
      <td style="min-width:240px;max-width:420px">${esc(r.text)}${r.reply ? `<div class="review-reply small"><b>Reply:</b> ${esc(r.reply.text)}</div>` : ''}${r.challenge ? `<div class="small" style="color:var(--warn);margin-top:6px"><b>Challenge (${esc(r.challenge.reason)}):</b> ${esc(r.challenge.note)} <span class="muted">· ${esc(r.challenge.by)}</span></div>` : ''}${r.resolution ? `<div class="small muted" style="margin-top:6px"><b>Decision:</b> ${esc(r.resolution.decision)}${r.resolution.note ? ' · ' + esc(r.resolution.note) : ''} · ${esc(r.resolution.by)}</div>` : ''}</td>
      <td>${statusChip(r.status)}</td><td class="row-actions">${r.status !== 'Removed' ? `<button class="btn btn-sm btn-ghost" data-rv-reply="${r.id}">${r.reply ? 'Edit reply' : 'Reply'}</button>` : ''}${r.status === 'Published' ? `<button class="btn btn-sm btn-ghost" data-rv-ch="${r.id}">Challenge</button>` : ''}${r.status === 'Challenged' ? (isAdmin ? `<button class="btn btn-sm btn-primary" data-rv-res="${r.id}">Decide</button>` : '<span class="muted small">With administrator</span>') : ''}</td></tr>`).join('') || `<tr><td colspan="7" class="empty">No ${filter === 'All' ? '' : filter.toLowerCase() + ' '}reviews yet.</td></tr>`}</tbody></table></div>`;
  const again = () => reviewsAdmin(body, type);
  $$('[data-rvf]', body).forEach(b => b.onclick = () => { Session.set('rvFilter_' + type, b.dataset.rvf); again(); });
  $$('[data-rv-reply]', body).forEach(b => b.onclick = () => { const r = Store.find('reviews', b.dataset.rvReply);
    openModal('Public reply', `${reviewItem({ ...r, reply: null })}<form id="rp" class="stack"><label class="field"><span>Your reply (customers will see this)</span><textarea class="input" id="rp-text" name="text" required minlength="5">${esc(r.reply?.text || '')}</textarea></label><div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary">Publish reply</button></div></form>`,
      { onMount: m => $('#rp', m).onsubmit = e => { e.preventDefault(); Store.update('reviews', r.id, { reply: { text: e.target.text.value.trim(), by: who, at: new Date().toISOString() } }); closeModal(); toast('Reply published'); again(); } }); });
  $$('[data-rv-ch]', body).forEach(b => b.onclick = () => { const r = Store.find('reviews', b.dataset.rvCh);
    openModal('Challenge this rating', `${reviewItem(r)}<form id="ch" class="stack"><label class="field"><span>Reason</span><select class="input" id="ch-reason" name="reason">${(type === 'bus' ? ['Customer did not travel', 'Review is about a different bus or operator'] : ['Guest did not stay', 'Review is about a different hotel']).concat(['Abusive or offensive language', 'Factually incorrect', 'Conflict of interest / competitor', 'Other']).map(x => `<option>${x}</option>`).join('')}</select></label>
      <label class="field"><span>Evidence / explanation for the administrator</span><textarea class="input" id="ch-note" name="note" required minlength="15" placeholder="e.g. PNR was cancelled before departure; boarding chart attached to ticket JJB…"></textarea></label>
      <p class="muted small">The review stays visible, marked “under review”, until the group administrator decides. A low rating alone is not a reason to remove a review.</p>
      <div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary">Submit challenge</button></div></form>`,
      { onMount: m => $('#ch', m).onsubmit = e => { e.preventDefault(); Store.update('reviews', r.id, { status: 'Challenged', challenge: { reason: e.target.reason.value, note: e.target.note.value.trim(), by: who, at: new Date().toISOString() } }); closeModal(); toast('Challenge sent to the group administrator'); again(); } }); });
  $$('[data-rv-res]', body).forEach(b => b.onclick = () => { const r = Store.find('reviews', b.dataset.rvRes);
    openModal('Decide on challenge', `${reviewItem(r)}<div class="notice" style="background:var(--warn-soft)"><b>${esc(r.challenge.reason)}</b><p style="margin-top:6px">${esc(r.challenge.note)}</p><p class="muted small" style="margin-top:6px">Raised by ${esc(r.challenge.by)} on ${fmtDate(r.challenge.at)}</p></div>
      <label class="field"><span>Note (optional)</span><input class="input" id="rs-note" placeholder="Reason for the decision"></label>
      <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap"><button class="btn btn-outline" id="rs-keep">Uphold review (keep it published)</button><button class="btn btn-danger" id="rs-remove">Remove review</button></div>`,
      { onMount: m => { const done = (status, decision) => { Store.update('reviews', r.id, { status, resolution: { decision, note: $('#rs-note', m).value.trim(), by: who, at: new Date().toISOString() } }); closeModal(); toast(decision); again(); };
        $('#rs-keep', m).onclick = () => done('Upheld', 'Review upheld'); $('#rs-remove', m).onclick = () => done('Removed', 'Review removed'); } }); });
}

/* =====================================================================
   3. BUS VEHICLE TOOLS: seat layout editor, boarding & dropping points
   ===================================================================== */
const tAdd = (hhmm, mins) => { const [h, m] = hhmm.split(':').map(Number), t = (((h * 60 + m + mins) % 1440) + 1440) % 1440; return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`; };
function busStops(b, from, to) {
  const arr = addMins(b.dep, b.durationMin).t;
  const bp = b.boardingPoints?.length ? b.boardingPoints : ['Central Bus Stand', 'Railway Station', 'Bypass Junction'].map((n, i) => ({ name: `${from} ${n}`, offset: i * 15 }));
  const dp = b.droppingPoints?.length ? b.droppingPoints : ['Bypass Junction', 'Central Bus Stand', 'Railway Station'].map((n, i) => ({ name: `${to} ${n}`, offset: i * 15 }));
  return { boarding: bp.map(x => ({ t: tAdd(b.dep, +x.offset || 0), name: x.name })), dropping: dp.map(x => ({ t: tAdd(arr, +x.offset || 0), name: x.name })) };
}
function stopsEditor(bus, after) {
  const cur = busStops(bus, bus.from, bus.to);
  const init = (list, saved, base) => (saved?.length ? saved : list.map((s, i) => ({ name: s.name, offset: i * 15 })));
  const st = { b: init(cur.boarding, bus.boardingPoints).map(x => ({ ...x })), d: init(cur.dropping, bus.droppingPoints).map(x => ({ ...x })) };
  const arr = addMins(bus.dep, bus.durationMin).t;
  const draw = m => {
    const col = (k, title, base, hint) => `<div class="stack"><h4>${title}</h4><p class="muted small">${hint}</p>${st[k].map((s, i) => `<div class="stop-row"><input class="input" data-k="${k}" data-i="${i}" data-f="name" value="${esc(s.name)}" placeholder="Stop name and landmark" aria-label="Stop name"><input class="input" type="number" data-k="${k}" data-i="${i}" data-f="offset" value="${s.offset}" step="5" aria-label="Minutes"><span class="mono small">${tAdd(base, +s.offset || 0)}</span><button type="button" class="btn btn-sm btn-danger-ghost" data-rm="${k}|${i}" aria-label="Remove stop">×</button></div>`).join('')}
      <button type="button" class="btn btn-outline btn-sm" data-add="${k}" style="justify-self:start">+ Add ${k === 'b' ? 'boarding' : 'dropping'} point</button></div>`;
    $('#st-body', m).innerHTML = `<div class="grid g2">${col('b', `Boarding points in ${esc(bus.from)}`, bus.dep, `Minutes after the ${bus.dep} departure.`)}${col('d', `Dropping points in ${esc(bus.to)}`, arr, `Minutes relative to the ${arr} arrival (use minus for earlier stops).`)}</div>`;
    $$('#st-body input', m).forEach(inp => inp.onchange = () => { st[inp.dataset.k][+inp.dataset.i][inp.dataset.f] = inp.dataset.f === 'offset' ? +inp.value : inp.value; draw(m); });
    $$('[data-rm]', m).forEach(b => b.onclick = () => { const [k, i] = b.dataset.rm.split('|'); st[k].splice(+i, 1); draw(m); });
    $$('[data-add]', m).forEach(b => b.onclick = () => { const k = b.dataset.add, last = st[k][st[k].length - 1]; st[k].push({ name: '', offset: last ? +last.offset + 15 : 0 }); draw(m); });
  };
  openModal(`Boarding & dropping points · ${bus.busNo}`, `<div class="notice">${esc(bus.from)} → ${esc(bus.to)} · departs ${bus.dep} · arrives ${arr}. Passengers choose from these points when they book.</div><div id="st-body"></div>
    <div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" id="st-save">Save points</button></div>`, {
    wide: true, onMount: m => { draw(m); $('#st-save', m).onclick = () => {
      const clean = k => st[k].map(s => ({ name: String(s.name).trim(), offset: +s.offset || 0 })).filter(s => s.name).sort((a, b) => a.offset - b.offset);
      const b = clean('b'), d = clean('d'); if (!b.length || !d.length) return toast('Keep at least one boarding point and one dropping point', 'err');
      Store.update('buses', bus.id, { boardingPoints: b, droppingPoints: d }); closeModal(); toast('Boarding and dropping points saved'); after && after(); }; } });
}
const SEAT_PRESETS = {
  'Seater 2+2 (40 seats)': [{ name: 'Seater', sleeper: false, rows: 10, left: 2, right: 2, prefix: '' }],
  'Seater 2+3 (50 seats)': [{ name: 'Seater', sleeper: false, rows: 10, left: 2, right: 3, prefix: '' }],
  'Sleeper 2+1, two decks (36 berths)': [{ name: 'Lower deck', sleeper: true, rows: 6, left: 1, right: 2, prefix: 'L' }, { name: 'Upper deck', sleeper: true, rows: 6, left: 1, right: 2, prefix: 'U' }],
  'Sleeper 1+1, two decks (24 berths)': [{ name: 'Lower deck', sleeper: true, rows: 6, left: 1, right: 1, prefix: 'L' }, { name: 'Upper deck', sleeper: true, rows: 6, left: 1, right: 1, prefix: 'U' }],
  'Lower: sleeper + seats · Upper: sleeper': [{ name: 'Lower deck', mix: 'sleeper-seat', sleeper: false, rows: 6, left: 1, right: 2, prefix: 'L', seatPrefix: 'S' }, { name: 'Upper deck', sleeper: true, rows: 6, left: 1, right: 2, prefix: 'U' }],
  'Lower: seats + sleeper · Upper: sleeper': [{ name: 'Lower deck', mix: 'seat-sleeper', sleeper: false, rows: 6, left: 2, right: 1, prefix: 'L', seatPrefix: 'S' }, { name: 'Upper deck', sleeper: true, rows: 6, left: 1, right: 2, prefix: 'U' }],
  'Seater below + sleeper above': [{ name: 'Lower deck (seats)', sleeper: false, rows: 9, left: 2, right: 2, prefix: 'S' }, { name: 'Upper deck (berths)', sleeper: true, rows: 6, left: 1, right: 2, prefix: 'U' }],
  'Mini bus 2+1 (21 seats)': [{ name: 'Seater', sleeper: false, rows: 7, left: 2, right: 1, prefix: '' }],
};
/* Turns the editor spec into the rows the booking page draws: label = seat, null = aisle, '' = blank space.
   Deck kinds (d.mix): 'seat', 'sleeper', 'sleeper-seat' (berths left of the aisle, seats right) and 'seat-sleeper'.
   In a mixed deck one berth is as long as two seat rows, so d.rows counts berth rows and the grid has twice as many seat rows. */
const deckMix = d => d.mix || (d.sleeper ? 'sleeper' : 'seat');
function buildDeck(d) {
  const removed = new Set(d.removed || []), mix = deckMix(d), keys = [];
  if (mix === 'seat' || mix === 'sleeper') {
    let n = 0;
    const rows = Array.from({ length: d.rows }, (_, r) => { const cells = [], kr = [];
      for (let c = 0; c < d.left + d.right; c++) { if (c === d.left && d.right > 0) { cells.push(null); kr.push(null); } const k = `${r}-${c}`; kr.push(k); cells.push(removed.has(k) ? '' : `${d.prefix || ''}${++n}`); }
      keys.push(kr); return cells; });
    return { name: d.name, sleeper: mix === 'sleeper', rows, keys };
  }
  let nb = 0, ns = 0; const berths = [], berthsLeft = mix === 'sleeper-seat';
  const rows = Array.from({ length: d.rows * 2 }, (_, r) => { const cells = [], kr = [];
    for (let c = 0; c < d.left + d.right; c++) {
      if (c === d.left && d.right > 0) { cells.push(null); kr.push(null); }
      if ((c < d.left) === berthsLeft) { const k = `B${Math.floor(r / 2)}-${c}`;
        if (removed.has(k)) { cells.push(''); kr.push(k); } else if (r % 2 === 0) { const lab = `${d.prefix || ''}${++nb}`; berths.push(lab); cells.push(lab); kr.push(k); } /* odd row: the berth above spans into it */ }
      else { const k = `${r}-${c}`; kr.push(k); cells.push(removed.has(k) ? '' : `${d.seatPrefix || 'S'}${++ns}`); }
    }
    keys.push(kr); return cells; });
  return { name: d.name, sleeper: false, mixed: true, berths, rows, keys };
}
/* Fares: a layout with both berths and seats can price seats as a percentage of the berth fare. */
const isBerth = (bus, label) => seatLayout(bus).some(d => d.sleeper ? d.rows.some(r => r.includes(label)) : (d.berths || []).includes(label));
const hasBothKinds = bus => { const D = seatLayout(bus); return D.some(d => d.sleeper || d.berths?.length) && D.some(d => (!d.sleeper && !d.mixed) || (d.mixed && d.rows.flat().some(c => c && !d.berths.includes(c)))); };
/* Price of one seat: its own fare if staff set one (Seat fares tool), else the seat-% rule for mixed buses, else the bus fare. */
const baseSeatPrice = (bus, label) => bus.layout?.seatPct && hasBothKinds(bus) && !isBerth(bus, label) ? Math.round(bus.fare * bus.layout.seatPct / 100) : +bus.fare;
const seatPrice = (bus, label) => +bus.seatFares?.[label] > 0 ? +bus.seatFares[label] : baseSeatPrice(bus, label);
const allSeatPrices = bus => seatLayout(bus).flatMap(d => d.rows.flat().filter(Boolean)).map(l => seatPrice(bus, l));
const maxFare = bus => Math.max(+bus.fare || 0, ...allSeatPrices(bus));
const fareVaries = bus => { const p = allSeatPrices(bus); return p.length > 0 && Math.min(...p) !== Math.max(...p); };
const fareTotal = (bus, seats) => seats.reduce((s, x) => s + seatPrice(bus, x), 0);
const minFare = bus => { const p = allSeatPrices(bus); return p.length ? Math.min(...p) : +bus.fare; };
/* One seat/berth button class list, shared by the booking page and the editor */
const seatKindClass = (d, c) => d.sleeper ? 'sleeper' : d.mixed && d.berths.includes(c) ? 'sleeper span2' : '';
function seatLayoutEditor(bus, after) {
  const T = BUS_TYPES[bus.type] || {};
  let seatPct = bus.layout?.seatPct || 70;
  let spec = (bus.layout?.spec || SEAT_PRESETS[T.layout === 'sleeper' ? 'Sleeper 2+1, two decks (36 berths)' : 'Seater 2+2 (40 seats)']).map(d => ({ ...d, removed: [...(d.removed || [])] }));
  const draw = m => {
    const decks = spec.map(buildDeck), total = decks.reduce((s, d) => s + d.rows.flat().filter(Boolean).length, 0), nBerth = decks.reduce((s, d) => s + (d.sleeper ? d.rows.flat().filter(Boolean).length : (d.berths || []).length), 0), both = nBerth > 0 && nBerth < total;
    $('#sl-body', m).innerHTML = `<div class="split" style="grid-template-columns:1fr auto"><div class="stack">${spec.map((d, i) => `<div class="card stack"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h4>Deck ${i + 1}</h4>${spec.length > 1 ? `<button type="button" class="btn btn-sm btn-danger-ghost" data-deck-rm="${i}">Remove deck</button>` : ''}</div>
        <div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
          <label class="field"><span>Deck name</span><input class="input" data-d="${i}" data-f="name" value="${esc(d.name)}"></label>
          <label class="field" style="grid-column:span 2"><span>Type</span><select class="input" data-d="${i}" data-f="mix">${[['seat', 'Seats only'], ['sleeper', 'Sleeper berths only'], ['sleeper-seat', 'Sleeper berths (left) + seats (right)'], ['seat-sleeper', 'Seats (left) + sleeper berths (right)']].map(([v, l]) => `<option value="${v}" ${deckMix(d) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="field"><span>${/-/.test(deckMix(d)) ? 'Berth rows' : 'Rows'}</span><input class="input" type="number" min="1" max="16" data-d="${i}" data-f="rows" value="${d.rows}"></label>
          <label class="field"><span>Left of aisle</span><input class="input" type="number" min="1" max="3" data-d="${i}" data-f="left" value="${d.left}"></label>
          <label class="field"><span>Right of aisle</span><input class="input" type="number" min="0" max="3" data-d="${i}" data-f="right" value="${d.right}"></label>
          <label class="field"><span>${/-/.test(deckMix(d)) ? 'Berth no. prefix' : 'Seat no. prefix'}</span><input class="input mono" maxlength="2" data-d="${i}" data-f="prefix" value="${esc(d.prefix || '')}" placeholder="e.g. L"></label>
          ${/-/.test(deckMix(d)) ? `<label class="field"><span>Seat no. prefix</span><input class="input mono" maxlength="2" data-d="${i}" data-f="seatPrefix" value="${esc(d.seatPrefix || 'S')}"></label>` : ''}</div>
          ${/-/.test(deckMix(d)) ? '<p class="muted small">Each berth is as long as two rows of seats.</p>' : ''}</div>`).join('')}
        ${both ? `<div class="card stack"><h4>Fares</h4><label class="field" style="max-width:320px"><span>Seat fare as % of the berth fare</span><input class="input" type="number" min="30" max="100" step="5" id="sl-pct" value="${seatPct}"></label><p class="muted small">Berth ${inr(bus.fare)} · Seat ${inr(bus.fare * seatPct / 100)}. The berth fare is the bus fare set under Edit.</p></div>` : ''}
        ${spec.length < 2 ? '<button type="button" class="btn btn-outline btn-sm" id="sl-add" style="justify-self:start">+ Add upper deck</button>' : ''}</div>
      <div class="stack" style="align-content:start"><div class="eyebrow">Preview · ${both ? `${nBerth} berths + ${total - nBerth} seats` : `${total} ${nBerth ? 'berths' : 'seats'}`}</div><div class="decks">${decks.map((d, i) => `<div class="deck"><div class="deck-title"><span>${esc(d.name)}</span>${i === 0 ? '<span>Driver ⊙</span>' : ''}</div>
        <div class="seat-grid" style="grid-template-columns:${d.rows[0].map(c => c === null ? '18px' : '34px').join(' ')}">${d.rows.map((row, r) => row.map((c, x) => c === null ? '<span class="seat-gap"></span>' : `<button type="button" class="seat ${seatKindClass(d, c)} ${c === '' ? 'blank' : ''}" data-cell="${i}|${d.keys[r][x]}" title="${c === '' ? 'Put it back' : 'Remove (door, stairs, luggage)'}">${c === '' ? '+' : c}</button>`).join('')).join('')}</div></div>`).join('')}</div>
        <p class="muted small" style="max-width:300px">Click a seat to remove it for a door, staircase or luggage space. Click the “+” to put it back. Seats renumber automatically.</p></div></div>`;
    $$('#sl-body [data-d]', m).forEach(inp => inp.onchange = () => { const d = spec[+inp.dataset.d], f = inp.dataset.f;
      if (f === 'name' || f === 'prefix' || f === 'seatPrefix') d[f] = inp.value.trim(); else if (f === 'mix') { d.mix = inp.value; d.sleeper = inp.value === 'sleeper'; d.removed = []; if (/-/.test(d.mix) && !d.seatPrefix) d.seatPrefix = 'S'; } else { d[f] = Math.max(+inp.min, Math.min(+inp.max, Math.round(+inp.value) || +inp.min)); d.removed = []; } draw(m); });
    const pct = $('#sl-pct', m); if (pct) pct.onchange = () => { seatPct = Math.max(30, Math.min(100, +pct.value || 70)); draw(m); };
    $$('[data-cell]', m).forEach(b => b.onclick = () => { const [i, key] = b.dataset.cell.split('|'), d = spec[+i]; d.removed = d.removed.includes(key) ? d.removed.filter(k => k !== key) : [...d.removed, key]; draw(m); });
    $$('[data-deck-rm]', m).forEach(b => b.onclick = () => { spec.splice(+b.dataset.deckRm, 1); draw(m); });
    const add = $('#sl-add', m); if (add) add.onclick = () => { spec.push({ name: 'Upper deck', sleeper: true, rows: 6, left: 1, right: 2, prefix: 'U', removed: [] }); draw(m); };
  };
  openModal(`Seat layout · ${bus.busNo}`, `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end"><label class="field" style="flex:1 1 240px"><span>Start from a standard layout</span><select class="input" id="sl-preset"><option value="">Choose a preset…</option>${Object.keys(SEAT_PRESETS).map(k => `<option>${k}</option>`).join('')}</select></label>
      <span class="muted small" style="padding-bottom:12px">${esc(bus.type)}</span></div><div id="sl-body"></div>
    <div style="display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap"><button class="btn btn-outline" id="sl-reset">Use default for this bus type</button><div style="display:flex;gap:10px"><button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" id="sl-save">Save layout</button></div></div>`, {
    wide: true, onMount: m => { draw(m);
      $('#sl-preset', m).onchange = e => { if (!e.target.value) return; spec = SEAT_PRESETS[e.target.value].map(d => ({ ...d, removed: [] })); draw(m); };
      $('#sl-reset', m).onclick = () => { Store.update('buses', bus.id, { layout: null, seatFares: {} }); closeModal(); toast('Default layout restored'); after && after(); };
      $('#sl-save', m).onclick = () => { const decks = spec.map(buildDeck).map(({ keys, ...d }) => d), labels = decks.flatMap(d => d.rows.flat().filter(Boolean)), nb = decks.reduce((n, d) => n + (d.sleeper ? d.rows.flat().filter(Boolean).length : (d.berths || []).length), 0);
        if (!labels.length) return toast('The layout has no seats', 'err');
        if (new Set(labels).size !== labels.length) return toast('Some seat numbers repeat. Give each deck, and berths and seats, a different prefix (for example L, S and U).', 'err');
        Store.update('buses', bus.id, { layout: { decks, spec, seatPct: nb > 0 && nb < labels.length ? seatPct : null }, seatFares: Object.fromEntries(Object.entries(bus.seatFares || {}).filter(([k]) => labels.includes(k))) }); closeModal(); toast(`Seat layout saved · ${nb && nb < labels.length ? `${nb} berths + ${labels.length - nb} seats` : labels.length + (nb ? ' berths' : ' seats')}`); after && after(); }; } });
}
/* Seat fares: a separate price for each and every seat or sleeper berth. */
function seatFareEditor(bus, after) {
  const decks = seatLayout(bus), all = decks.flatMap(d => d.rows.flat().filter(Boolean));
  const fares = Object.fromEntries(Object.entries(bus.seatFares || {}).filter(([k, v]) => all.includes(k) && +v > 0).map(([k, v]) => [k, +v]));
  const sel = new Set();
  const price = l => fares[l] > 0 ? fares[l] : baseSeatPrice(bus, l);
  const berthsOf = d => d.sleeper ? d.rows.flat().filter(Boolean) : (d.berths || []);
  const groups = [['All', all], ...(decks.length > 1 ? decks.map(d => [d.name, d.rows.flat().filter(Boolean)]) : []),
    ...(all.some(l => isBerth(bus, l)) && all.some(l => !isBerth(bus, l)) ? [['All berths', all.filter(l => isBerth(bus, l))], ['All seats', all.filter(l => !isBerth(bus, l))]] : []),
    ...decks.flatMap(d => { const rows = d.rows.filter(r => r.some(Boolean)), firstCol = d.rows.map(r => r.find(c => c !== null && c !== '')).filter(Boolean), lastCol = d.rows.map(r => [...r].reverse().find(c => c !== null && c !== '')).filter(Boolean);
      return decks.length > 1 ? [] : [['Window side', [...new Set([...firstCol, ...lastCol])]], ['Front 2 rows', rows.slice(0, 2).flat().filter(Boolean)], ['Last 2 rows', rows.slice(-2).flat().filter(Boolean)]]; })];
  const draw = m => {
    const prices = all.map(price), counts = {}; prices.forEach(p => counts[p] = (counts[p] || 0) + 1);
    $('#sf-body', m).innerHTML = `<div class="split" style="grid-template-columns:auto 1fr"><div class="stack" style="align-content:start"><div class="decks">${decks.map((d, i) => `<div class="deck"><div class="deck-title"><span>${esc(d.name)}</span>${i === 0 ? '<span>Driver ⊙</span>' : ''}</div>
        <div class="seat-grid" style="grid-template-columns:${d.rows[0].map(c => c === null ? '18px' : '40px').join(' ')}">${d.rows.flat().map(c => c === null ? '<span class="seat-gap"></span>' : c === '' ? '<span></span>' : `<button type="button" class="seat fare wide ${seatKindClass(d, c)} ${sel.has(c) ? 'sel' : ''} ${fares[c] > 0 ? 'custom' : ''}" data-sf="${esc(c)}" aria-pressed="${sel.has(c)}" aria-label="${esc(c)}, ${inr(price(c))}">${esc(c)}<small>${price(c)}</small></button>`).join('')}</div></div>`).join('')}</div>
        <div class="legend"><span><i></i>Bus fare</span><span><i style="border-color:var(--blue);background:var(--blue-soft)"></i>Own fare set</span><span><i class="s"></i>Selected</span></div></div>
      <div class="stack" style="align-content:start">
        <div><h4 style="margin-bottom:8px">1. Select seats</h4><p class="muted small" style="margin-bottom:8px">Click seats on the map, or pick a group:</p><div class="chips">${groups.map(([n], i) => `<button type="button" class="chip" data-sf-group="${i}">${esc(n)}</button>`).join('')}<button type="button" class="chip" data-sf-clear>Clear selection</button></div></div>
        <form id="sf-apply" class="card stack" style="background:var(--surface-2)"><h4>2. Set the fare</h4><div class="muted small">${sel.size ? `Selected (${sel.size}): <b class="mono">${esc([...sel].slice(0, 14).join(', '))}${sel.size > 14 ? '…' : ''}</b>` : 'No seats selected yet.'}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end"><label class="field" style="flex:1 1 140px"><span>Fare for selected (₹)</span><input class="input" id="sf-amt" type="number" min="1" step="1" placeholder="${bus.fare}" ${sel.size ? '' : 'disabled'} required></label><button class="btn btn-primary" ${sel.size ? '' : 'disabled'}>Apply</button><button type="button" class="btn btn-outline" id="sf-base" ${sel.size ? '' : 'disabled'}>Back to bus fare</button></div></form>
        <div class="card stack"><h4>Fare summary</h4>${Object.entries(counts).sort((a, b) => b[0] - a[0]).map(([p, n]) => `<div class="line-item"><span>${inr(p)}</span><span>${n} ${n === 1 ? 'seat' : 'seats'}</span></div>`).join('')}<div class="line-item total"><span>Full bus</span><span>${inr(prices.reduce((s, p) => s + p, 0))}</span></div>
          <p class="muted small">Bus fare ${inr(bus.fare)} applies to every seat without its own fare${bus.layout?.seatPct && hasBothKinds(bus) ? ` (seats at ${bus.layout.seatPct}%)` : ''}.</p></div></div></div>`;
    $$('[data-sf]', m).forEach(b => b.onclick = () => { const l = b.dataset.sf; sel.has(l) ? sel.delete(l) : sel.add(l); draw(m); });
    $$('[data-sf-group]', m).forEach(b => b.onclick = () => { groups[+b.dataset.sfGroup][1].forEach(l => sel.add(l)); draw(m); });
    $('[data-sf-clear]', m).onclick = () => { sel.clear(); draw(m); };
    $('#sf-apply', m).onsubmit = e => { e.preventDefault(); const v = Math.round(+$('#sf-amt', m).value); if (!(v > 0)) return toast('Enter a fare above ₹0', 'err'); sel.forEach(l => fares[l] = v); toast(`${inr(v)} set for ${sel.size} seat${sel.size > 1 ? 's' : ''}`); sel.clear(); draw(m); };
    $('#sf-base', m).onclick = () => { sel.forEach(l => delete fares[l]); sel.clear(); draw(m); };
    const amt = $('#sf-amt', m); if (amt && sel.size) amt.focus();
  };
  openModal(`Seat fares · ${bus.busNo}`, `<div class="notice">${esc(bus.from)} → ${esc(bus.to)} · ${esc(bus.type)}. Set a separate fare for any seat or berth. Customers see each price on the seat map and pay exactly what the seat costs.</div><div id="sf-body"></div>
    <div style="display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap"><button class="btn btn-outline" id="sf-reset">Reset every seat to the bus fare</button><div style="display:flex;gap:10px"><button class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" id="sf-save">Save fares</button></div></div>`, {
    wide: true, onMount: m => { draw(m);
      $('#sf-reset', m).onclick = () => { Object.keys(fares).forEach(k => delete fares[k]); sel.clear(); draw(m); };
      $('#sf-save', m).onclick = () => { Store.update('buses', bus.id, { seatFares: { ...fares } }); closeModal(); const n = Object.keys(fares).length; toast(n ? `Fares saved · ${n} seat${n > 1 ? 's' : ''} with their own price` : 'Fares saved · all seats at the bus fare'); after && after(); }; } });
}
const BUS_TOOLS = [
  { id: 'photos', label: 'Photos', run: (r, rr) => mediaManager('bus', r, { after: rr }) },
  { id: 'seats', label: 'Seat layout', run: (r, rr) => seatLayoutEditor(r, rr) },
  { id: 'fares', label: 'Seat fares', run: (r, rr) => seatFareEditor(r, rr) },
  { id: 'stops', label: 'Stops', run: (r, rr) => stopsEditor(r, rr) },
];

/* =====================================================================
   4. LOGISTICS: transhipment hubs, manifests, printable copies with QR
   ===================================================================== */
SEED.manifests = () => [];
const HUB_STATUSES = ['Booked', 'Picked Up', 'Loaded', 'In Transit', 'Unloaded'];
const parcelLocation = p => p.location || p.fromBranch;
const nearestHub = city => Store.get('branches').filter(b => b.type === 'Hub' && b.status === 'Active').sort((a, b) => distanceKm(a.city, city) - distanceKm(b.city, city))[0] || null;
/* Where a parcel standing at `here` should go next: branch → its hub → destination hub → destination branch */
function nextHop(p, here) {
  const dest = p.toBranch ? Store.find('branches', p.toBranch) : null;
  if (p.toBranch === here.id || sameCity(p.toCity, here.city)) return null;
  const destHub = dest?.type === 'Hub' ? dest : nearestHub(p.toCity);
  if (here.type !== 'Hub') { const mine = nearestHub(here.city); return mine && mine.id !== here.id ? mine : destHub; }
  if (destHub && destHub.id !== here.id) return destHub;
  return dest && dest.id !== here.id ? dest : null;
}
function logParcel(p, note, patch = {}) { Store.update('parcels', p.id, x => ({ ...patch, history: [...x.history, { status: patch.status || x.status, at: new Date().toISOString(), note }] })); }
function movementLog(p) {
  const H = (p.history || []).filter(h => h.note);
  return H.length > 1 ? `<details class="mv-log"><summary>Movement log (${H.length} scans)</summary><div class="stack" style="margin-top:8px">${H.map(h => `<div class="line-item"><span>${esc(h.note)}</span><span class="muted small" style="white-space:nowrap">${fmtDateTime(h.at)}</span></div>`).join('')}</div></details>` : '';
}
function hubModule(body, rerender) {
  const B = Store.get('branches').filter(b => b.status === 'Active').sort((a, b) => (a.type === 'Hub' ? 0 : 1) - (b.type === 'Hub' ? 0 : 1) || a.name.localeCompare(b.name));
  if (!B.length) { body.innerHTML = '<div class="card empty-state">Add an active branch or hub first.</div>'; return; }
  let cur = Session.get('hubAt'); if (!B.some(b => b.id === cur)) cur = B[0].id;
  const here = B.find(b => b.id === cur), P = Store.get('parcels'), M = Store.get('manifests'), V = Store.get('vehicles').filter(v => v.status !== 'Inactive');
  const moving = new Set(M.filter(m => m.status === 'In transit').flatMap(m => m.parcelIds));
  const at = P.filter(p => HUB_STATUSES.includes(p.status) && parcelLocation(p) === cur && !moving.has(p.id));
  const fwd = at.map(p => [p, nextHop(p, here)]).filter(x => x[1]), local = at.filter(p => !nextHop(p, here));
  const inbound = M.filter(m => m.to === cur && m.status === 'In transit'), outbound = M.filter(m => m.from === cur).slice(0, 8);
  const bn = id => Store.find('branches', id)?.name || id;
  const pRow = (p, extra) => `<tr><td><input type="checkbox" value="${p.id}" aria-label="Select ${p.id}"></td><td class="mono">${esc(p.id)}</td><td>${esc(bn(p.fromBranch))}<div class="muted small">→ ${esc(p.toCity)}</div></td><td>${p.pkgs} pkg · ${p.weight} kg</td>${extra}</tr>`;
  body.innerHTML = `<div class="card" style="display:flex;gap:14px;flex-wrap:wrap;align-items:end;justify-content:space-between;margin-bottom:16px"><label class="field" style="flex:1 1 260px"><span>Working at</span><select class="input" id="hub-at">${B.map(b => `<option value="${b.id}" ${b.id === cur ? 'selected' : ''}>${esc(b.name)} (${b.type})</option>`).join('')}</select></label>
      <div class="kpis" style="flex:3 1 420px;grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">${kpi('Inbound trucks', inbound.length)}${kpi('To forward', fwd.length)}${kpi('For local delivery', local.length)}${kpi('Dispatched', outbound.filter(m => m.status === 'In transit').length, 'on the road')}</div></div>
    <div class="grid" style="gap:18px">
      <div class="card stack"><div><h3>1. Receive inbound manifests</h3><p class="muted small">Trucks on their way to ${esc(here.name)}. Receiving unloads every parcel on the manifest into this ${here.type.toLowerCase()}.</p></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Manifest</th><th>From</th><th>Vehicle</th><th>Load</th><th>Dispatched</th><th></th></tr></thead><tbody>${inbound.map(m => `<tr><td class="mono">${m.id}</td><td>${esc(bn(m.from))}</td><td class="mono">${esc(Store.find('vehicles', m.vehicle)?.regNo || '—')}</td><td>${m.parcelIds.length} parcels · ${m.pkgs} pkg · ${m.weight} kg</td><td>${fmtDateTime(m.createdAt)}</td><td class="row-actions"><button class="btn btn-sm btn-ghost" data-mf-print="${m.id}">Manifest</button><button class="btn btn-sm btn-green" data-mf-recv="${m.id}">Receive & unload</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No trucks are heading here right now.</td></tr>'}</tbody></table></div></div>
      <div class="card stack"><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;align-items:end"><div><h3>2. Sort and forward</h3><p class="muted small">Parcels at ${esc(here.name)} that travel onward. Each goes to its suggested next stop unless you choose one.</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><select class="input" id="fw-to" style="width:auto" aria-label="Send to"><option value="">Suggested next stop</option>${B.filter(b => b.id !== cur).map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select><select class="input" id="fw-veh" style="width:auto" aria-label="Vehicle">${V.map(v => `<option value="${v.id}">${esc(v.regNo)} · ${esc(v.type)}</option>`).join('')}</select><button class="btn btn-primary" id="fw-go">Create manifest & dispatch</button></div></div>
        <div class="table-wrap" id="fw-tbl"><table class="table"><thead><tr><th><input type="checkbox" id="fw-all" aria-label="Select all"></th><th>AWB</th><th>Route</th><th>Parcel</th><th>Suggested next stop</th></tr></thead><tbody>${fwd.map(([p, hop]) => pRow(p, `<td>${esc(hop.name)} <span class="chip ${hop.type === 'Hub' ? 'blue' : ''}">${hop.type}</span></td>`)).join('') || '<tr><td colspan="5" class="empty">Nothing waiting to be forwarded.</td></tr>'}</tbody></table></div></div>
      <div class="card stack"><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;align-items:end"><div><h3>3. Local delivery</h3><p class="muted small">Parcels whose destination is served from ${esc(here.name)}.</p></div><button class="btn btn-green" id="lc-go">Send selected out for delivery</button></div>
        <div class="table-wrap" id="lc-tbl"><table class="table"><thead><tr><th><input type="checkbox" id="lc-all" aria-label="Select all"></th><th>AWB</th><th>Route</th><th>Parcel</th><th>Receiver</th><th></th></tr></thead><tbody>${local.map(p => pRow(p, `<td>${esc(p.receiver)}<div class="muted small">${esc(p.receiverPhone)}</div></td><td class="row-actions"><button class="btn btn-sm btn-ghost" data-print-parcel="${p.id}">Print copies</button></td>`)).join('') || '<tr><td colspan="6" class="empty">No parcels for local delivery.</td></tr>'}</tbody></table></div></div>
      <div class="card stack"><h3>Manifests dispatched from here</h3><div class="table-wrap"><table class="table"><thead><tr><th>Manifest</th><th>To</th><th>Vehicle</th><th>Load</th><th>Status</th><th></th></tr></thead><tbody>${outbound.map(m => `<tr><td class="mono">${m.id}</td><td>${esc(bn(m.to))}</td><td class="mono">${esc(Store.find('vehicles', m.vehicle)?.regNo || '—')}</td><td>${m.parcelIds.length} parcels · ${m.weight} kg</td><td>${statusChip(m.status === 'In transit' ? 'In Transit' : 'Received')}</td><td class="row-actions"><button class="btn btn-sm btn-ghost" data-mf-print="${m.id}">Manifest</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No manifests yet.</td></tr>'}</tbody></table></div></div></div>`;
  $('#hub-at', body).onchange = e => { Session.set('hubAt', e.target.value); rerender(); };
  const picked = sel => $$(`${sel} tbody input:checked`, body).map(c => Store.find('parcels', c.value));
  [['#fw-all', '#fw-tbl'], ['#lc-all', '#lc-tbl']].forEach(([a, t]) => { const el = $(a, body); if (el) el.onchange = () => $$(`${t} tbody input`, body).forEach(c => c.checked = el.checked); });
  $('#fw-go', body).onclick = () => {
    const L = picked('#fw-tbl'); if (!L.length) return toast('Select the parcels to load', 'err');
    const v = Store.find('vehicles', $('#fw-veh', body).value); if (!v) return toast('Add a vehicle in the Fleet portal first', 'err');
    const forced = $('#fw-to', body).value, groups = {};
    L.forEach(p => { const to = forced || nextHop(p, here).id; (groups[to] = groups[to] || []).push(p); });
    Object.entries(groups).forEach(([to, list]) => {
      const m = { id: genNum('MFT', 6), from: cur, to, vehicle: v.id, parcelIds: list.map(p => p.id), pkgs: list.reduce((s, p) => s + p.pkgs, 0), weight: Math.round(list.reduce((s, p) => s + p.weight, 0) * 10) / 10, status: 'In transit', by: Auth.user()?.name || '', createdAt: new Date().toISOString() };
      Store.add('manifests', m);
      list.forEach(p => { const first = !['In Transit', 'Unloaded'].includes(p.status); logParcel(p, `Left ${here.name} for ${bn(to)} on ${v.regNo} · manifest ${m.id}`, { status: 'In Transit', vehicle: v.id, manifest: m.id }); if (first) Notify.event('parcel_update', Store.find('parcels', p.id)); });
    });
    toast(`${Object.keys(groups).length} manifest(s) dispatched with ${L.length} parcel(s)`); rerender();
  };
  $$('[data-mf-recv]', body).forEach(b => b.onclick = () => { const m = Store.find('manifests', b.dataset.mfRecv);
    Store.update('manifests', m.id, { status: 'Received', receivedAt: new Date().toISOString() });
    m.parcelIds.map(id => Store.find('parcels', id)).filter(Boolean).forEach(p => logParcel(p, `Arrived at ${here.name}${nextHop({ ...p, location: cur }, here) ? ' for transhipment' : ''} · manifest ${m.id}`, { location: cur, vehicle: '', manifest: '' }));
    toast(`${m.parcelIds.length} parcel(s) unloaded at ${here.name}`); rerender(); });
  $('#lc-go', body).onclick = () => { const L = picked('#lc-tbl'); if (!L.length) return toast('Select the parcels going out', 'err');
    L.forEach(p => { logParcel(p, `Out for delivery from ${here.name}`, { status: 'Out for Delivery' }); Notify.event('parcel_update', Store.find('parcels', p.id)); }); toast(`${L.length} parcel(s) out for delivery`); rerender(); };
  $$('[data-mf-print]', body).forEach(b => b.onclick = () => printManifest(Store.find('manifests', b.dataset.mfPrint)));
}

/* ----- QR + print ----- */
function qrSvg(text) {
  try { if (typeof qrcode === 'function') { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); } } catch (e) { /* fall through */ }
  return `<div class="qr-fallback mono">${esc(text)}</div>`;
}
const trackUrl = awb => `https://${SITE_CONFIG.siteHost || location.host || SITE_CONFIG.domain}/?awb=${encodeURIComponent(awb)}#logistics`;
const printBar = (what) => `<div class="no-print" style="display:flex;gap:10px;justify-content:flex-end;align-items:center;flex-wrap:wrap">${SITE_CONFIG.allowPrint === false ? `<span class="muted small">Printing is available on the live website; this preview shows what the ${what} will look like.</span>` : `<span class="muted small">Prints on one A4 sheet.</span><button class="btn btn-primary" data-do-print>Print ${what}</button>`}</div>`;
const letterhead = () => `<div class="ph-brand"><b>${esc(SITE_CONFIG.name)} Logistics</b><span>${esc(SITE_CONFIG.address)}</span><span>${[SITE_CONFIG.phone, SITE_CONFIG.email, SITE_CONFIG.gstin && 'GSTIN ' + SITE_CONFIG.gstin].filter(Boolean).map(esc).join(' · ')}</span></div>`;
function parcelCopy(p, kind) {
  const delivery = kind === 'delivery', from = Store.find('branches', p.fromBranch), add = [p.addons?.pickup && 'Door pickup', p.addons?.loading && 'Loading', p.addons?.unloading && 'Unloading', p.addons?.insure && 'Insured'].filter(Boolean).join(', ') || 'None';
  return `<section class="copy"><header>${letterhead()}<div class="ph-kind"><b>${delivery ? 'DELIVERY COPY' : 'BOOKING COPY'}</b><span>${delivery ? 'Proof of delivery (POD)' : 'Consignor receipt'}</span></div></header>
    <div class="ph-main"><div class="ph-qr">${qrSvg(trackUrl(p.id))}<span>Scan to track</span></div>
      <div class="ph-awb"><span>Airway bill no.</span><b class="mono">${esc(p.id)}</b><div class="ph-route"><b>${esc(from?.city || '')}</b><i></i><b>${esc(p.toCity)}</b></div><span>Booked ${fmtDateTime(p.createdAt)} at ${esc(from?.name || '')} · ${esc(p.service)}</span></div></div>
    <div class="ph-grid"><div><span>Consignor (sender)</span><b>${esc(p.sender)}</b>${esc(p.senderPhone)}</div><div><span>Consignee (receiver)</span><b>${esc(p.receiver)}</b>${esc(p.receiverPhone)}<br>${esc(p.receiverAddress)}, ${esc(p.toCity)}</div></div>
    <table class="ph-table"><tr><th>Contents</th><th>Packages</th><th>Weight</th><th>Declared value</th><th>Extra services</th><th>Charges (incl. GST)</th></tr><tr><td>${esc(p.type)}</td><td>${p.pkgs}</td><td>${p.weight} kg</td><td>${p.value ? inr(p.value) : '—'}</td><td>${esc(add)}</td><td><b>${inr(p.total)}</b> · Paid</td></tr></table>
    ${delivery ? `<div class="ph-sign"><div><span>Received the above in good condition</span><i></i>Receiver’s name &amp; signature</div><div><span>Date &amp; time</span><i></i>ID proof / mobile</div><div><span>Delivered by</span><i></i>Staff name &amp; signature</div></div>`
      : `<div class="ph-sign"><div><span>Consignor’s signature</span><i></i>I declare the contents are as stated and not prohibited.</div><div><span>For ${esc(SITE_CONFIG.name)} Logistics</span><i></i>Booking staff</div></div><p class="ph-terms">Carried under the Carriage by Road Act, 2007. Liability for loss or damage is limited as per the consignment terms unless insured. Claims within 7 days of delivery. Track at ${esc(SITE_CONFIG.siteHost || SITE_CONFIG.domain)}.</p>`}</section>`;
}
function printParcel(p) { openModal('Print copies · ' + p.id, `${printBar('both copies')}<div class="print-sheet">${parcelCopy(p, 'booking')}<div class="cut">✂ cut here</div>${parcelCopy(p, 'delivery')}</div>`, { wide: true }); }
function printManifest(m) {
  const bn = id => Store.find('branches', id)?.name || id, L = m.parcelIds.map(id => Store.find('parcels', id)).filter(Boolean), v = Store.find('vehicles', m.vehicle);
  openModal('Manifest · ' + m.id, `${printBar('manifest')}<div class="print-sheet"><section class="copy"><header>${letterhead()}<div class="ph-kind"><b>TRANSHIPMENT MANIFEST</b><span>${m.status === 'In transit' ? 'In transit' : 'Received ' + fmtDateTime(m.receivedAt)}</span></div></header>
    <div class="ph-main"><div class="ph-qr">${qrSvg(m.id)}<span>${esc(m.id)}</span></div><div class="ph-awb"><span>Manifest no.</span><b class="mono">${esc(m.id)}</b><div class="ph-route"><b>${esc(bn(m.from))}</b><i></i><b>${esc(bn(m.to))}</b></div><span>Dispatched ${fmtDateTime(m.createdAt)} · Vehicle ${esc(v?.regNo || '—')} · Driver ${esc(flCrew(m.vehicle, String(m.createdAt).slice(0, 10)) || '—')}</span></div></div>
    <table class="ph-table"><tr><th>#</th><th>AWB</th><th>Destination</th><th>Receiver</th><th>Pkgs</th><th>Weight</th><th>Recd ✓</th></tr>${L.map((p, i) => `<tr><td>${i + 1}</td><td class="mono">${esc(p.id)}</td><td>${esc(p.toCity)}</td><td>${esc(p.receiver)}</td><td>${p.pkgs}</td><td>${p.weight} kg</td><td></td></tr>`).join('')}<tr><th colspan="4">Total · ${L.length} parcels</th><th>${m.pkgs}</th><th>${m.weight} kg</th><th></th></tr></table>
    <div class="ph-sign"><div><span>Loaded by (${esc(bn(m.from))})</span><i></i>Name &amp; signature</div><div><span>Driver</span><i></i>Name &amp; signature</div><div><span>Received by (${esc(bn(m.to))})</span><i></i>Name, signature, date &amp; time</div></div></section></div>`, { wide: true });
}

/* ----- global click handlers for the pieces above ----- */
document.addEventListener('click', e => {
  const th = e.target.closest('[data-gal-thumb]'); if (th) { const box = th.closest('.gallery-box'); $('.gal-main', box).src = $('img', th).src; $$('[data-gal-thumb]', box).forEach(x => x.classList.toggle('on', x === th)); return; }
  const rv = e.target.closest('[data-reviews]'); if (rv) { const [type, id, base, name] = rv.dataset.reviews.split('|'); openModal(`Ratings & reviews${name ? ' · ' + name : ''}`, reviewsListHtml(type, id, base), { wide: true }); return; }
  const bp = e.target.closest('[data-busphotos]'); if (bp) { openModal('Bus photos', galleryHtml('bus', bp.dataset.busphotos), { wide: true }); return; }
  const pp = e.target.closest('[data-print-parcel]'); if (pp) { const p = Store.find('parcels', pp.dataset.printParcel); if (p) printParcel(p); return; }
  if (e.target.closest('[data-do-print]')) window.print();
});
/* Opening the site from a parcel QR code (…/?awb=JJL…#logistics) tracks that parcel straight away */
(() => { const base = ROUTES.logistics; if (!base) return; ROUTES.logistics = app => { base(app); const awb = new URLSearchParams(location.search).get('awb'); if (awb && $('#pt-id', app)) { $('#pt-id', app).value = awb; $('#pt', app).requestSubmit(); setTimeout(() => $('#pt', app).scrollIntoView({ block: 'center' }), 100); } }; })();
