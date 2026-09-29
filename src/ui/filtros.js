/* ---------- filtros por categoría (chips del encabezado) ---------- */
import { CATEGORIES, activeFilters, estado, guardarPreferencias } from '../state/store.js';
import { map, renderPins, syncHeaderHeight } from '../map/mapa.js';
import { esc } from '../utils/texto.js';
import { toggleModal } from './modales.js';
import { abrirDetalle } from './detalle.js';

export function renderFilters() {
  const c = document.getElementById('filters'); c.innerHTML = '';
  Object.entries(CATEGORIES).forEach(([key, cat]) => {
    const on = activeFilters.has(key); const b = document.createElement('button');
    b.className = `whitespace-nowrap px-3.5 py-1.5 rounded-full border-2 text-sm font-space font-bold transition-all ${on ? 'bg-[#fcfbf9] shadow-sm text-[#433e3c]' : 'bg-transparent text-[#9e9791] border-transparent hover:bg-[#f2efe9]'}`;
    b.style.borderColor = on ? cat.color : 'transparent';
    b.innerHTML = `<span style="color:${cat.color}" class="mr-1">${esc(estado.useEmojis ? cat.emoji : cat.glyph)}</span>${esc(cat.label)}`;
    b.onclick = () => { on ? activeFilters.delete(key) : activeFilters.add(key); guardarPreferencias(); renderFilters(); renderPins(); };
    c.appendChild(b);
  });
  const add = document.createElement('button');
  add.className = 'whitespace-nowrap px-3.5 py-1.5 rounded-full border-2 border-dashed border-[#d8d1c7] text-sm font-space font-bold text-[#8c8580] hover:bg-[#f2efe9] transition';
  add.textContent = '＋ Nueva categoría'; add.onclick = () => toggleModal('modal-categorias');
  c.appendChild(add);
  if (map) syncHeaderHeight();
}

export function toggleVisualMode() {
  estado.useEmojis = !estado.useEmojis; document.getElementById('btn-visual').textContent = estado.useEmojis ? 'Glifos' : 'Emojis';
  renderFilters(); renderPins(); if (estado.instAbierta) abrirDetalle(estado.instAbierta, true);
}
