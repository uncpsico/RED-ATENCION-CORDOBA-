/* =====================================================================
   BUSCADOR: direcciones, calles, barrios y localidades
   ===================================================================== */
import L from '../map/leaflet.js';
import { map, worldBBoxToBounds } from '../map/mapa.js';
import { LOCS, BARRIOS, CAPITAL, ensureLines } from '../map/geodata.js';
import { T_ST } from '../map/geometry.js';
import { geocodificar, parseDireccion } from '../geo/geocoder.js';
import { esc, norm, prettyName } from '../utils/texto.js';
import { cerrarDetalle } from './detalle.js';

let SEARCH = null, highlight = null;
function buildSearch() {
  SEARCH = [];
  LOCS.forEach(l => SEARCH.push({ kind: 'Localidad', label: l.name, sub: '', key: norm(l.name), loc: l, rank: 0 }));
  BARRIOS.forEach(b => SEARCH.push({ kind: 'Barrio', label: b.name, sub: 'Córdoba', key: norm(b.name), barrio: b, rank: 1 }));
  LOCS.forEach(l => { const used = new Set(); for (const x of l.raw.L) if (x[0] >= T_ST) used.add(x[1]); l.raw.names.forEach((n, ni) => {
    if (!n || /^(S N|PJE S N)$/.test(n) || !used.has(ni)) return;
    const label = prettyName(n);
    SEARCH.push({ kind: 'Calle', label, sub: l.name, key: norm(label + ' ' + n), loc: l, ni, rank: l === CAPITAL ? 2 : 3 });
  }); });
}
function doSearch(q) {
  if (!SEARCH) buildSearch();
  const nq = norm(q).replace(/^(av|avenida|calle|bv|boulevard|bulevar)\s+/, ''); if (nq.length < 2) return [];
  const toks = nq.split(' ').filter(t => !/^\d+$/.test(t));
  if (!toks.length) return [];
  const dirItems = [];
  if (parseDireccion(q).num != null) { const g = geocodificar(q, ''); if (g) dirItems.push({ kind: 'Dirección', label: g.etiqueta, sub: g.precision === 'exacta' ? '' : 'aproximada', geo: g }); }
  const res = []; const qj = toks.join(' ');
  for (const it of SEARCH) {
    if (!toks.every(t => it.key.includes(t))) continue;
    if (it.base === undefined) it.base = norm(it.label).replace(/^(av|bv|pje|calle|gral|dr|pte) /, '');
    const quality = it.base === qj ? 0 : it.base.startsWith(qj) ? 1 : (' ' + it.base).includes(' ' + toks[0]) ? 2 : 3;
    res.push({ it, score: quality * 10 + it.rank + it.label.length / 200 });
  }
  res.sort((a, b) => a.score - b.score);
  return dirItems.concat(res.slice(0, 9 - dirItems.length).map(r => r.it));
}
function goTo(it) {
  const box = document.getElementById('search-results'); box.classList.add('hidden');
  document.getElementById('search').value = it.label + (it.sub ? ', ' + it.sub : '');
  document.getElementById('search').blur();
  if (highlight) { highlight.remove(); highlight = null; }
  cerrarDetalle();
  if (it.kind === 'Dirección') {
    map.flyTo([it.geo.lat, it.geo.lng], 17, { duration: 0.9 });
    highlight = L.circleMarker([it.geo.lat, it.geo.lng], { radius: 14, color: '#b06a6c', weight: 3, fillColor: '#b06a6c', fillOpacity: 0.2, interactive: false }).addTo(map);
  } else if (it.kind === 'Localidad') map.flyToBounds(worldBBoxToBounds(it.loc.bb), { maxZoom: 15, duration: 0.9 });
  else if (it.kind === 'Barrio') {
    map.flyToBounds(worldBBoxToBounds(it.barrio.bb), { maxZoom: 16, duration: 0.9 });
    const c = map.options.crs; highlight = L.polygon(it.barrio.rings.map(r => { const a = []; for (let i = 0; i < r.length; i += 2) a.push(c.pointToLatLng(L.point(r[i], r[i + 1]), 0)); return a; }), { color: '#a66d4f', weight: 3, fillOpacity: 0.06, interactive: false }).addTo(map);
  } else {
    ensureLines(it.loc); const chs = it.loc.byName.get(it.ni) || []; if (!chs.length) return;
    const bb = chs.reduce((a, ch) => [Math.min(a[0], ch.bb[0]), Math.min(a[1], ch.bb[1]), Math.max(a[2], ch.bb[2]), Math.max(a[3], ch.bb[3])], [Infinity, Infinity, -Infinity, -Infinity]);
    map.flyToBounds(worldBBoxToBounds(bb).pad(0.15), { maxZoom: 17, duration: 0.9 });
    const c = map.options.crs;
    highlight = L.polyline(chs.map(ch => { const a = []; for (let i = 0; i < ch.p.length; i += 2) a.push(c.pointToLatLng(L.point(ch.p[i], ch.p[i + 1]), 0)); return a; }), { color: '#b06a6c', weight: 7, opacity: 0.55, interactive: false }).addTo(map);
  }
  if (highlight) setTimeout(() => { if (highlight) { highlight.remove(); highlight = null; } }, 6000);
}
export function initSearch() {
  const inp = document.getElementById('search'), box = document.getElementById('search-results');
  let items = [], sel = -1, timer;
  const render = () => {
    if (!items.length) { box.innerHTML = inp.value.trim().length >= 2 ? '<div class="px-4 py-3 text-sm text-[#9e9791]">Sin resultados. Probá con otro nombre.</div>' : ''; box.classList.toggle('hidden', inp.value.trim().length < 2); return; }
    box.innerHTML = items.map((it, i) => `<button data-i="${i}" class="w-full text-left px-4 py-2.5 flex items-center gap-3 ${i === sel ? 'bg-[#f4efe8]' : 'hover:bg-[#f7f4ef]'} border-b border-[#f2efe9] last:border-0">
      <span class="text-base">${it.kind === 'Dirección' ? '🏠' : it.kind === 'Calle' ? '🛣️' : it.kind === 'Barrio' ? '🏘️' : '📍'}</span>
      <span class="min-w-0 flex-1"><span class="block text-sm font-space font-bold text-[#433e3c] truncate">${esc(it.label)}</span><span class="block text-xs text-[#8c8580] truncate">${it.kind}${it.sub ? ' · ' + esc(it.sub) : ''}</span></span></button>`).join('');
    box.classList.remove('hidden');
    box.querySelectorAll('button').forEach(b => b.onmousedown = ev => { ev.preventDefault(); goTo(items[+b.dataset.i]); });
  };
  inp.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { items = doSearch(inp.value); sel = -1; render(); }, 120); });
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); render(); e.preventDefault(); }
    else if (e.key === 'Enter') { if (items.length) goTo(items[Math.max(0, sel)]); e.preventDefault(); }
    else if (e.key === 'Escape') { box.classList.add('hidden'); inp.blur(); }
  });
  inp.addEventListener('focus', () => { if (items.length) box.classList.remove('hidden'); });
  inp.addEventListener('blur', () => setTimeout(() => box.classList.add('hidden'), 150));
}
