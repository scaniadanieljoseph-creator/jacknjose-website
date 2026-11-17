/* Horizontal seat map, laid out like an operator's chart: the bus seen from above with the front on the left,
   the upper deck drawn above the lower deck, window and aisle berths on top, the single row below the aisle.
   A berth is two seat-lengths long. Used on wide screens; phones keep the upright decks side by side. */
'use strict';

function seatMapH(bus, btn, legend) {
  const D = seatLayout(bus), order = D.length > 1 ? [...D].reverse() : D;
  return `<div class="bus-h">${order.map(d => busDeckH(d, btn, d === D[0])).join('')}
    <div class="legend bus-h-legend">${legend.map(([c, l]) => `<span><i class="${c}"></i>${l}</span>`).join('')}</div></div>`;
}
function busDeckH(d, btn, front) {
  const W = d.rows[0].length, isBerth = c => d.sleeper || (d.mixed && (d.berths || []).includes(c)), occ = new Set(), items = [], at = (u, c) => u + ':' + c;
  let len = 0;
  d.rows.forEach((row, r) => { const u0 = d.sleeper ? r * 2 : r; let c = 0; // same placement as the upright grid, turned on its side
    row.forEach(cell => { while (occ.has(at(u0, c))) c++; const span = cell === null || cell === '' ? (d.sleeper ? 2 : 1) : isBerth(cell) ? 2 : 1;
      for (let i = 0; i < span; i++) occ.add(at(u0 + i, c)); if (cell) items.push({ cell, u: u0, c, span }); len = Math.max(len, u0 + span); c++; }); });
  const across = d.rows[0].map(x => x === null).reverse(); // the bus's right side at the top, as seen from above with the front on the left
  const name = String(d.name || '').replace(/\s*deck.*$/i, '') || 'Seats';
  return `<div class="deck-h"><div class="deck-h-side">${front ? `<span class="deck-h-wheel" title="Front · driver">${icon('steer')}</span>` : ''}<b>${esc(name)}</b></div>
    <div class="deck-h-grid" style="grid-template-columns:repeat(${len}, var(--hu));grid-template-rows:${across.map(a => a ? 'var(--ha)' : 'var(--hh)').join(' ')}">${items.map(it => `<div class="h-cell ${isBerth(it.cell) ? 'berth' : ''}" style="grid-row:${W - it.c};grid-column:${it.u + 1} / span ${it.span}">${btn(d, it.cell)}</div>`).join('')}</div></div>`;
}
