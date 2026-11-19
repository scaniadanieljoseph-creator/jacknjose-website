'use strict';
/* Hotel Jothi Grand: leave. Staff ask from My attendance on their phone; owner / manager approve or reject on the Leave page.
   Approved days are written into attendance (paid leave L, half day H, unpaid A), so payroll follows automatically. */

const LEAVE_T = { CL: 'Casual leave', SL: 'Sick leave', EL: 'Earned leave', CO: 'Compensatory off', LOP: 'Unpaid leave (loss of pay)' };
const LEAVE_SHORT = { CL: 'Casual', SL: 'Sick', EL: 'Earned', CO: 'Comp-off', LOP: 'Unpaid' };
const LEAVE_C = { Pending: 'c-amber', Approved: 'c-green', Rejected: 'c-red', Cancelled: '' };
const DEF_QUOTA = { CL: 12, SL: 7, EL: 12, CO: 0 };
const quotaOf = () => ({ ...DEF_QUOTA, ...(S().leaveQuota || {}) });
const lvDates = l => l.from === l.to ? fmtD(l.from) + (l.half ? ' · half day' : '') : `${fmtD(l.from)} → ${fmtD(l.to)}`;
const lvDays = l => `${l.days} day${l.days === 1 ? '' : 's'}`;
const lvType = t => chip(LEAVE_SHORT[t] || t, t === 'LOP' ? 'c-red' : t === 'SL' ? 'c-pink' : t === 'CO' ? 'c-violet' : 'c-blue');

/* ---------- staff side (inside My attendance) ---------- */
function leaveBlock(j) {
  const q = j.quota, u = j.used || {}, mine = j.leaves || [];
  const bal = Object.keys(q).filter(k => +q[k] > 0).map(k => { const used = (u[k] || 0) + (u[k + '_p'] || 0), left = Math.max(0, q[k] - used); return `<div class="lv-bal"><b>${left}</b><small>${LEAVE_SHORT[k]} left</small><i>${u[k] || 0} taken${u[k + '_p'] ? ` · ${u[k + '_p']} waiting` : ''} of ${q[k]}</i></div>`; }).join('');
  return `<div class="card" style="margin-top:18px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px"><h3 style="margin:0">Leave ${new Date().getFullYear()}</h3><button class="btn btn-p" id="lv-apply">+ Ask for leave</button></div>
    <div class="lv-bals">${bal || '<p class="muted small">Your manager has not set leave allowances.</p>'}</div>
    <div style="margin-top:14px">${mine.map(l => `<div class="lv-row"><div><b>${esc(LEAVE_SHORT[l.type])}</b> · ${lvDates(l)} <span class="muted small">(${lvDays(l)})</span><div class="small muted">${esc(l.reason || '')}${l.note ? ` · <b>${l.status === 'Rejected' ? 'Reason' : 'Note'}:</b> ${esc(l.note)}` : ''}</div>${l.attachment ? `<div class="fchips">${fileChips(l.attachment, 'Certificate')}</div>` : ''}</div><div style="text-align:right">${chip(l.status, LEAVE_C[l.status])}${(l.status === 'Pending' || (l.status === 'Approved' && l.from > iso())) ? `<br><button class="btn btn-s btn-g" data-lvx="${esc(l.id)}" style="margin-top:6px">Cancel</button>` : ''}</div></div>`).join('') || '<p class="muted small">No leave requests yet.</p>'}</div></div>`;
}
function leaveForm(j, after, staffPick = null) {
  const left = k => { const q = (j?.quota || quotaOf())[k]; if (!(+q > 0) || !j) return ''; const u = j.used || {}; return ` · ${Math.max(0, q - (u[k] || 0) - (u[k + '_p'] || 0))} left`; };
  const F = [...(staffPick ? [{ name: 'staffId', label: 'Staff member', type: 'select', required: true, blank: 'Choose', options: staffPick }] : []),
    { name: 'type', label: 'Type of leave', type: 'select', options: Object.entries(LEAVE_T).map(([k, v]) => [k, v + left(k)]) }, { name: 'half', label: 'Half day only', type: 'check' },
    { name: 'from', label: 'First day', type: 'date', required: true }, { name: 'to', label: 'Last day', type: 'date', required: true },
    { name: 'reason', label: 'Reason', full: true, required: !staffPick, placeholder: 'Family function, fever, travelling home…' },
    { name: 'attachment', label: 'Medical certificate / letter (optional)', type: 'files', kind: 'leave', cam: 'environment' }];
  formModal(staffPick ? 'Add leave for a staff member' : 'Ask for leave', F, { type: 'CL', from: addDays(iso(), 1), to: addDays(iso(), 1) }, async v => {
    if (v.to < v.from) throw new Error('The last day is before the first day.'); if (v.half && v.from !== v.to) throw new Error('A half day must be a single date.');
    const r = await call('applyLeave', { ...v, approve: !!staffPick });
    toast(staffPick ? `${r.leave.id} added and marked in attendance` : `Sent to the manager · ${r.leave.days} day(s)${r.leave.overBalance ? ' (more than your balance)' : ''}`); after && after(r.leave);
  });
  const f = $('#modal-body form'); if (f) { const sync = () => { if (f.half.checked) f.to.value = f.from.value; f.to.disabled = f.half.checked; }; f.half.onchange = sync; f.from.addEventListener('change', () => { if (f.to.value < f.from.value || f.half.checked) f.to.value = f.from.value; }); f.addEventListener('submit', () => { f.to.disabled = false; }, true); }
}
function bindLeave(el, j) {
  const a = $('#lv-apply', el); if (a) a.onclick = () => leaveForm(j);
  $$('[data-lvx]', el).forEach(b => b.onclick = () => confirm('Cancel this leave request?') && act(() => call('cancelLeave', { id: b.dataset.lvx }), 'Leave request cancelled'));
}

/* ---------- manager side: the Leave page ---------- */
function leave(el, acts) {
  const mgr = isMgr(), t = iso(), mon = t.slice(0, 7), yr = t.slice(0, 4), LV = L('leaves').sort((a, b) => String(b.appliedAt).localeCompare(String(a.appliedAt)));
  const view = STATE.lvView || (LV.some(l => l.status === 'Pending') ? 'pending' : 'current');
  if (mgr) topBtn(acts, '+ Add leave for staff', () => leaveForm(null, null, L('staff').filter(s => s.status !== 'Inactive').map(s => [s.id, `${s.name} · ${s.id}`])));
  const away = LV.filter(l => l.status === 'Approved' && l.from <= t && t <= l.to);
  const groups = { pending: l => l.status === 'Pending', current: l => l.status === 'Approved' && l.to >= t, all: () => true };
  const rows = view === 'balances' ? [] : LV.filter(groups[view]);
  el.innerHTML = `<div class="grid g4" style="margin-bottom:16px">${kpi('Waiting for approval', LV.filter(l => l.status === 'Pending').length)}${kpi('On leave today', away.length, away.map(l => esc(l.staffName)).slice(0, 3).join(', '))}${kpi('Leave days this month', sum(LV.filter(l => l.status === 'Approved' && l.from.slice(0, 7) === mon), l => l.days))}${kpi('Unpaid days this month', sum(LV.filter(l => l.status === 'Approved' && l.type === 'LOP' && l.from.slice(0, 7) === mon), l => l.days))}</div>
    <div class="tabs">${[['pending', 'Waiting', LV.filter(groups.pending).length], ['current', 'Approved · now & upcoming', LV.filter(groups.current).length], ['all', 'All requests', LV.length], ['balances', `Balances ${yr}`, '']].map(([k, l, n]) => `<button data-v="${k}" class="${k === view ? 'on' : ''}">${l}${n !== '' ? `<span>${n}</span>` : ''}</button>`).join('')}</div><div id="lvv"></div>`;
  $$('[data-v]', el).forEach(b => b.onclick = () => { STATE.lvView = b.dataset.v; render(); });
  const box = $('#lvv', el);
  if (view === 'balances') {
    const q = quotaOf(), types = Object.keys(q).filter(k => +q[k] > 0);
    box.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Staff</th>${types.map(k => `<th class="r">${LEAVE_SHORT[k]} (${q[k]})</th>`).join('')}<th class="r">Unpaid</th><th class="r">Waiting</th></tr></thead><tbody>${L('staff').filter(s => s.status !== 'Inactive').sort((a, b) => a.id.localeCompare(b.id)).map(s => { const mine = LV.filter(l => l.staffId === s.id && l.from.slice(0, 4) === yr), used = k => sum(mine.filter(l => l.type === k && l.status === 'Approved'), l => l.days);
      return `<tr><td><b>${esc(s.name)}</b><div class="small muted">${esc(s.dept || '')}</div></td>${types.map(k => { const left = q[k] - used(k); return `<td class="r"><b ${left < 0 ? 'style="color:var(--red)"' : ''}>${left}</b> <span class="small muted">left · ${used(k)} used</span></td>`; }).join('')}<td class="r">${used('LOP')}</td><td class="r">${sum(mine.filter(l => l.status === 'Pending'), l => l.days)}</td></tr>`; }).join('') || '<tr><td colspan="9" class="empty">Add staff first.</td></tr>'}</tbody></table></div><p class="muted small" style="margin-top:10px">Yearly allowances are set in Settings → Leave allowance.</p>`;
    return;
  }
  box.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Staff</th><th>Leave</th><th>Dates</th><th>Reason</th><th>Asked</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(l => `<tr><td><b>${esc(l.staffName)}</b><div class="small muted">${esc(l.staffId)}${l.dept ? ' · ' + esc(l.dept) : ''}</div></td><td>${lvType(l.type)}<div class="small muted">${lvDays(l)}</div></td><td class="nowrap">${lvDates(l)}</td>
      <td class="small" style="max-width:280px">${esc(l.reason || '')}${l.attachment ? `<div class="fchips">${fileChips(l.attachment, 'Certificate')}</div>` : ''}${l.overBalance && l.status === 'Pending' ? '<div style="color:var(--red)">More than the balance left</div>' : ''}${lvClash(l)}</td>
      <td class="small nowrap">${esc(String(l.appliedAt || '').slice(0, 16))}<div class="muted">${esc(l.appliedBy || '')}</div></td><td>${chip(l.status, LEAVE_C[l.status])}${l.decidedBy ? `<div class="small muted">${esc(l.decidedBy)}${l.note ? ': ' + esc(l.note) : ''}</div>` : ''}</td>
      <td><div class="row-acts">${mgr && l.status === 'Pending' ? `<button class="btn btn-s btn-ok" data-ok="${esc(l.id)}">Approve</button><button class="btn btn-s btn-del" data-no="${esc(l.id)}">Reject</button>` : ''}${mgr && l.status === 'Approved' ? `<button class="btn btn-s btn-g" data-cx="${esc(l.id)}">Cancel</button>` : ''}</div></td></tr>`).join('') || `<tr><td colspan="7" class="empty">${view === 'pending' ? 'No requests waiting. 🎉' : 'Nothing here.'}</td></tr>`}</tbody></table></div>
    <p class="muted small" style="margin-top:10px">Approving marks each day in attendance: paid leave as L, a half day as H, unpaid leave as A. Days the person actually checked in are kept as worked. Payroll uses these automatically.</p>`;
  $$('[data-ok]', box).forEach(b => b.onclick = () => { const l = find('leaves', b.dataset.ok); formModal(`Approve · ${l.staffName}`, [{ name: 'note', label: 'Note to the staff member (optional)', full: true }], {}, async v => { const r = await call('decideLeave', { id: l.id, approve: true, note: v.note }); upsert('leaves', r.leave); await refreshAtt(); toast(`Approved · ${r.leave.marked || 0} day(s) marked in attendance`); }, `<p class="full">${lvType(l.type)} ${lvDates(l)} · <b>${lvDays(l)}</b><br><span class="muted small">${esc(l.reason || '')}</span></p>`); });
  $$('[data-no]', box).forEach(b => b.onclick = () => { const l = find('leaves', b.dataset.no); formModal(`Reject · ${l.staffName}`, [{ name: 'note', label: 'Reason (the staff member sees this)', full: true, required: true }], {}, async v => { const r = await call('decideLeave', { id: l.id, approve: false, note: v.note }); upsert('leaves', r.leave); toast('Leave rejected'); }); });
  $$('[data-cx]', box).forEach(b => b.onclick = () => { const l = find('leaves', b.dataset.cx); if (confirm(`Cancel ${l.staffName}'s approved leave? The days are taken off attendance.`)) act(async () => { const r = await call('cancelLeave', { id: l.id }); upsert('leaves', r.leave); await refreshAtt(); }, 'Leave cancelled'); });
}
/* someone else from the same department already away on those dates */
function lvClash(l) {
  if (l.status !== 'Pending') return '';
  const c = L('leaves').filter(o => o.id !== l.id && o.status === 'Approved' && o.dept && o.dept === l.dept && o.from <= l.to && l.from <= o.to);
  return c.length ? `<div style="color:#9a5b00">Also away from ${esc(l.dept)}: ${c.map(o => esc(o.staffName)).join(', ')}</div>` : '';
}
async function refreshAtt() { try { const j = await call('poll', { since: SYNC || '2000-01-01 00:00:00' }); Object.entries(j.data || {}).forEach(([c, d]) => d.forEach(x => upsert(c, x))); } catch (e) {} }

/* tell managers when a new request comes in */
POLL_HOOKS.push(fresh => {
  if (!ME || !isMgr()) return;
  const neu = (fresh.leaves || []).filter(l => l.status === 'Pending' && !(STATE.lvSeen = STATE.lvSeen || new Set()).has(l.id));
  neu.forEach(l => STATE.lvSeen.add(l.id));
  if (neu.length) toast(neu.length === 1 ? `Leave request from ${neu[0].staffName}: ${LEAVE_SHORT[neu[0].type]}, ${lvDays(neu[0])}` : `${neu.length} new leave requests`);
});

Object.assign(VIEWS, { leave });
