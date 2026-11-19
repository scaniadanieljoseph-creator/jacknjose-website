'use strict';
/* Hotel Jothi Grand: uploads and camera. Photos are shrunk on the device before upload; files are kept in the hotel database
   and opened only through the signed-in API (they never have a public web address). */

/* ---------- prepare a file: photos are resized to at most 1600 px and saved as JPEG; PDFs go as they are ---------- */
async function shrinkPhoto(blob, max = 1600, q = .82) {
  let img;
  try { img = await createImageBitmap(blob, { imageOrientation: 'from-image' }); }
  catch (e) { img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('That photo could not be read. Try a JPG or PNG.')); i.src = URL.createObjectURL(blob); }); }
  const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight, k = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise(ok => c.toBlob(ok, 'image/jpeg', q));
}
const toB64 = blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => no(new Error('Could not read the file.')); r.readAsDataURL(blob); });
async function uploadFile(kind, file, name) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  if (!isPdf && !/^image\//.test(file.type || 'image/')) throw new Error('Choose a photo or a PDF.');
  const blob = isPdf ? file : await shrinkPhoto(file);
  if (blob.size > 4 * 1024 * 1024) throw new Error('That file is larger than 4 MB. Please use a smaller PDF.');
  const base = (name || file.name || 'photo').replace(/\.[a-z0-9]+$/i, '');
  return (await call('upload', { kind, name: base + (isPdf ? '.pdf' : '.jpg'), data: await toB64(blob) })).file;
}

/* ---------- open a stored file ---------- */
const FILE_URLS = new Map();
async function fileUrl(id) {
  if (FILE_URLS.has(id)) return FILE_URLS.get(id);
  const r = await fetch('api.php', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth': TOKEN }, body: JSON.stringify({ action: 'file', id }) });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'Could not open the file.'); }
  const u = URL.createObjectURL(await r.blob()); FILE_URLS.set(id, u); return u;
}
async function viewFile(ref) {
  if (!ref) return;
  if (ref.mime === 'application/pdf') { const w = open('', '_blank'); try { const u = await fileUrl(ref.id); if (w) w.location = u; else location.href = u; } catch (e) { w && w.close(); toast(e.message, 1); } return; }
  const v = document.createElement('div'); v.className = 'viewer'; v.innerHTML = `<div class="viewer-in"><div class="viewer-h"><b>${esc(ref.name || 'Photo')}</b><span class="grow"></span><a class="btn btn-s btn-g" download="${esc(ref.name || 'photo.jpg')}">Download</a><button class="icon-btn" aria-label="Close">×</button></div><div class="viewer-b">Loading…</div></div>`;
  document.body.append(v); const close = () => v.remove(); $('.icon-btn', v).onclick = close; v.onclick = e => { if (e.target === v) close(); };
  try { const u = await fileUrl(ref.id); $('.viewer-b', v).innerHTML = `<img src="${u}" alt="">`; $('a', v).href = u; } catch (e) { $('.viewer-b', v).textContent = e.message; }
}
/* small clickable chips for a list of files: <button data-file='{…}'> handled below */
function fileChips(list, label = '') {
  const L2 = (Array.isArray(list) ? list : [list]).filter(Boolean); if (!L2.length) return '';
  return L2.map((f, i) => `<button type="button" class="fchip" data-file='${esc(JSON.stringify(f))}' title="${esc(f.name || '')}">${f.mime === 'application/pdf' ? '📄' : '🖼'} ${esc(label || (L2.length > 1 ? `File ${i + 1}` : 'View'))}</button>`).join('');
}
const thumb = (ref, cls = 'thumb') => ref ? `<img class="${cls}" data-thumb="${esc(ref.id)}" data-file='${esc(JSON.stringify(ref))}' alt="" title="Open photo">` : `<span class="${cls} none"></span>`;
document.addEventListener('click', e => { const b = e.target.closest('[data-file]'); if (!b || b.closest('.fileset .x')) return; e.preventDefault(); try { viewFile(JSON.parse(b.dataset.file)); } catch (x) {} });
async function hydrateThumbs(root = document) {
  for (const img of $$('img[data-thumb]:not([src])', root)) { try { img.src = await fileUrl(img.dataset.thumb); } catch (e) { img.classList.add('none'); } }
}

/* ---------- camera ---------- */
function camera(facing = 'user', title = 'Take a photo') {
  return new Promise(resolve => {
    const v = document.createElement('div'); v.className = 'viewer cam';
    v.innerHTML = `<div class="viewer-in"><div class="viewer-h"><b>${esc(title)}</b><span class="grow"></span><button class="icon-btn" data-x aria-label="Close">×</button></div>
      <div class="cam-b"><video autoplay playsinline muted></video><img alt="" hidden><p class="muted" data-msg hidden></p></div>
      <div class="cam-f"><label class="btn btn-g">Choose a file<input type="file" accept="image/*" capture="${facing === 'user' ? 'user' : 'environment'}" hidden></label><span class="grow"></span><button class="btn btn-g" data-flip>Switch camera</button><button class="btn btn-g" data-retake hidden>Retake</button><button class="btn btn-p" data-shoot>Take photo</button><button class="btn btn-p" data-use hidden>Use this photo</button></div></div>`;
    document.body.append(v);
    const video = $('video', v), pic = $('img', v), msg = $('[data-msg]', v); let stream = null, shot = null, face = facing;
    const stop = () => { stream && stream.getTracks().forEach(t => t.stop()); stream = null; };
    const done = b => { stop(); v.remove(); resolve(b); };
    const start = async () => { stop(); try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: face, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false }); video.srcObject = stream; video.style.transform = face === 'user' ? 'scaleX(-1)' : 'none'; video.hidden = false; msg.hidden = true; }
      catch (e) { video.hidden = true; msg.hidden = false; msg.textContent = 'The camera could not be opened (allow camera access for this site, or use “Choose a file”).'; $('[data-shoot]', v).hidden = true; $('[data-flip]', v).hidden = true; } };
    $('[data-x]', v).onclick = () => done(null); v.onclick = e => { if (e.target === v) done(null); };
    $('[data-flip]', v).onclick = () => { face = face === 'user' ? 'environment' : 'user'; start(); };
    $('[data-shoot]', v).onclick = () => { if (!video.videoWidth) return; const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight; c.getContext('2d').drawImage(video, 0, 0);
      c.toBlob(b => { shot = b; pic.src = URL.createObjectURL(b); pic.hidden = false; video.hidden = true; ['[data-shoot]', '[data-flip]'].forEach(s => $(s, v).hidden = true); ['[data-retake]', '[data-use]'].forEach(s => $(s, v).hidden = false); }, 'image/jpeg', .9); };
    $('[data-retake]', v).onclick = () => { shot = null; pic.hidden = true; video.hidden = false; ['[data-shoot]', '[data-flip]'].forEach(s => $(s, v).hidden = false); ['[data-retake]', '[data-use]'].forEach(s => $(s, v).hidden = true); };
    $('[data-use]', v).onclick = () => done(shot);
    $('input', v).onchange = e => { const f = e.target.files[0]; if (f) done(f); };
    if (navigator.mediaDevices?.getUserMedia) start(); else { video.hidden = true; msg.hidden = false; msg.textContent = 'This browser cannot open the camera here. Use “Choose a file”.'; $('[data-shoot]', v).hidden = true; $('[data-flip]', v).hidden = true; }
  });
}

/* ---------- upload field used inside forms: {type:'files', kind, multi, cam:'user'|'environment'} ---------- */
function filesFieldHTML(f, val) {
  const list = (Array.isArray(val) ? val : [val]).filter(Boolean);
  return `<div class="f full">${esc(f.label)}<div class="fileset" data-fs="${f.name}" data-kind="${f.kind}" ${f.multi ? 'data-multi' : ''} data-cam="${f.cam || ''}"></div><input type="hidden" name="${f.name}" value="${esc(JSON.stringify(list))}"></div>`;
}
function bindFiles(root) {
  $$('.fileset', root).forEach(box => {
    const input = root.querySelector(`input[type=hidden][name="${box.dataset.fs}"]`), multi = box.hasAttribute('data-multi'), kind = box.dataset.kind, cam = box.dataset.cam;
    let list = []; try { list = JSON.parse(input.value || '[]'); } catch (e) {}
    const set = l => { list = l; input.value = JSON.stringify(list); draw(); };
    const add = async file => { const st = $('.fs-st', box); st.textContent = 'Uploading…'; try { const ref = await uploadFile(kind, file); set(multi ? [...list, ref] : [ref]); } catch (e) { st.textContent = ''; toast(e.message, 1); } };
    const draw = () => {
      box.innerHTML = `${list.map((f, i) => `<span class="fs-item">${f.mime === 'application/pdf' ? `<button type="button" class="fchip" data-file='${esc(JSON.stringify(f))}'>📄 ${esc(f.name)}</button>` : `<img class="thumb" data-thumb="${esc(f.id)}" data-file='${esc(JSON.stringify(f))}' alt="">`}<button type="button" class="x" data-rm="${i}" aria-label="Remove">×</button></span>`).join('')}
        ${cam ? `<button type="button" class="btn btn-s btn-g" data-cam>📷 ${cam === 'user' ? 'Take photo' : 'Photograph'}</button>` : ''}<label class="btn btn-s btn-g">⬆ Upload<input type="file" accept="image/*,application/pdf" ${multi ? 'multiple' : ''} hidden></label><span class="fs-st small muted"></span>`;
      $$('[data-rm]', box).forEach(b => b.onclick = () => set(list.filter((_, i) => i !== +b.dataset.rm)));
      const c = $('[data-cam]', box); if (c) c.onclick = async () => { const b = await camera(cam, cam === 'user' ? 'Photo' : 'Photograph the document'); if (b) add(b); };
      $('input[type=file]', box).onchange = async e => { for (const f of [...e.target.files].slice(0, multi ? 6 : 1)) await add(f); };
      hydrateThumbs(box);
    };
    draw();
  });
}
