/* ---------- panel de detalle de una institución ---------- */
import { map } from '../map/mapa.js';
import { estado, catDe } from '../state/store.js';
import { esc } from '../utils/texto.js';
import { parsePhones, mapsUrl } from '../utils/telefonos.js';

function contactHtml(c) {
  if (!c) return 'Sin datos';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return `<a href="mailto:${esc(c)}" target="_blank" rel="noopener" class="text-[#a66d4f] font-bold hover:underline">${esc(c)}</a>`;
  if (/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(c)) { const u = /^https?:/i.test(c) ? c : 'https://' + c; return `<a href="${esc(u)}" target="_blank" rel="noopener" class="text-[#a66d4f] font-bold hover:underline">${esc(c)}</a>`; }
  return esc(c);
}

export function abrirDetalle(inst, soloDatos) {
  estado.instAbierta = inst;
  const cat = catDe(inst.category);
  const badge = document.getElementById('det-cat');
  badge.innerHTML = `<span>${esc(estado.useEmojis ? cat.emoji : cat.glyph)}</span> ${esc(cat.label)}`;
  badge.style.color = cat.color; badge.style.borderColor = cat.color; badge.style.backgroundColor = cat.color + '15';
  document.getElementById('det-name').textContent = inst.name;
  document.getElementById('det-address-text').textContent = inst.address;
  document.getElementById('det-address').href = mapsUrl(inst);
  document.getElementById('btn-maps').href = mapsUrl(inst);
  const phones = parsePhones(inst.phone);
  document.getElementById('det-phones').innerHTML = phones.length ? phones.map(p => p.tel
    ? `<span class="inline-flex items-stretch rounded-xl overflow-hidden border border-[#dfe5dd]"><a href="tel:${p.tel}" data-nombre="${esc(inst.name)}" class="bg-[#f0f2ef] hover:bg-[#e3e9e1] text-[#4f6a4b] font-space font-bold px-3 py-2 transition">📲 ${esc(p.label)}</a><button type="button" data-accion="copiar" data-arg="${p.tel}" title="Copiar número" class="bg-[#fcfbf9] hover:bg-[#f2efe9] text-[#8c8580] px-2.5 text-xs border-l border-[#dfe5dd]">Copiar</button></span>`
    : `<span class="px-3 py-2 rounded-xl bg-[#f4efe8] text-[#756f6b] text-sm">${esc(p.label)}${/interno/i.test(p.label) ? ' <span class="text-xs">(pedirlo en la central)</span>' : ''}</span>`
  ).join('') : '<span class="text-[#9e9791]">Sin teléfono cargado</span>';
  const first = phones.find(p => p.tel); const call = document.getElementById('btn-call');
  if (first) { call.href = 'tel:' + first.tel; call.dataset.nombre = inst.name; call.classList.remove('opacity-40', 'pointer-events-none'); call.textContent = '📞 Llamar'; }
  else { call.removeAttribute('href'); call.classList.add('opacity-40', 'pointer-events-none'); call.textContent = '📞 Sin teléfono'; }
  document.getElementById('det-hours').textContent = inst.hours || 'No especificado';
  document.getElementById('det-contact').innerHTML = contactHtml(inst.contact);
  document.getElementById('det-desc').textContent = inst.description || 'Sin descripción detallada.';
  document.getElementById('panel-detalle').classList.remove('translate-y-full', 'sm:translate-x-full');
  if (soloDatos) return;
  const z = Math.max(map.getZoom(), 16); const mobile = window.innerWidth < 640;
  const pt = map.project([inst.lat, inst.lng], z).add(mobile ? [0, map.getSize().y * 0.28] : [195, 0]);
  map.flyTo(map.unproject(pt, z), z, { duration: 0.8 });
}

export function cerrarDetalle() { estado.instAbierta = null; document.getElementById('panel-detalle').classList.add('translate-y-full', 'sm:translate-x-full'); }
