/* =====================================================================
   CATEGORÍAS (alta pública; baja solo admin)
   ===================================================================== */
import { CATEGORIES, institutions, urgencias, activeFilters, guardarPreferencias } from '../state/store.js';
import { crearCategoria, bajaCategoria } from '../services/categorias.js';
import { esc, norm, val } from '../utils/texto.js';
import { toggleModal, confirmar, mostrarToast, toastError, conBoton } from './modales.js';
import { renderTodo } from './render.js';
import { resetForm } from './forms/formulario.js';

const EMOJIS = ['🍲', '🏠', '🧠', '💊', '🛡️', '📚', '👵', '♿', '🏳️‍🌈', '🚺', '🧒', '⚕️', '🏛️', '📞'];
const GLYPHS = ['◈', '◎', '◐', '◌', '◇', '◉', '◆', '○', '◍', '◑'];
let volverA = null; // select del formulario que pidió crear la categoría

export function renderCategoriesManager() {
  document.getElementById('lista-categorias').innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
    const n = institutions.filter(i => i.category === key).length, m = urgencias.filter(u => u.category === key && !u.fija).length;
    return `<div class="flex justify-between items-center bg-[#faf8f5] p-3 rounded-xl border border-[#ece8e0]">
      <div class="flex items-center gap-3 min-w-0"><div class="w-8 h-8 shrink-0 rounded-full flex items-center justify-center" style="background:${cat.color}20;border:1px solid ${cat.color}">${esc(cat.emoji)}</div>
      <div class="min-w-0"><div class="font-space font-bold text-[#433e3c] text-sm truncate">${esc(cat.label)}</div><div class="text-xs text-[#9e9791]">${n} lugar${n === 1 ? '' : 'es'} · ${m} número${m === 1 ? '' : 's'}</div></div></div>
      ${key !== 'otro' ? `<button data-accion="eliminarCategoria" data-arg="${esc(key)}" class="solo-admin text-xs font-space font-bold text-[#b06a6c] border border-[#dcc3c4] px-2.5 py-1.5 rounded-lg hover:bg-[#b06a6c] hover:text-[#fcfbf9] transition">Eliminar</button>` : ''}
    </div>`; }).join('');
  document.getElementById('emoji-sugeridos').innerHTML = EMOJIS.map(e => `<button type="button" data-accion="elegirEmoji" data-arg="${e}" class="w-9 h-9 rounded-lg bg-[#fcfbf9] border border-[#e6e1d8] hover:border-[#a66d4f] text-lg">${e}</button>`).join('');
}
export function elegirEmoji(e) { document.getElementById('c-emoji').value = e; }

export async function guardarCategoria(btn) {
  const label = val('c-name'), emoji = val('c-emoji'), color = document.getElementById('c-color').value;
  if (!norm(label).replace(/[^a-z0-9]/g, '')) return toastError('Escribí un nombre válido');
  if (Object.values(CATEGORIES).some(c => norm(c.label) === norm(label))) return toastError('Ya existe una categoría con ese nombre');
  const k = await conBoton(btn, () => crearCategoria({ nombre: label, emoji, color }, Object.keys(CATEGORIES)));
  if (!CATEGORIES[k]) CATEGORIES[k] = { label, emoji, color, glyph: GLYPHS[Object.keys(CATEGORIES).length % GLYPHS.length] };
  activeFilters.add(k); guardarPreferencias();
  resetForm('form-categoria'); document.getElementById('c-color').value = '#6f8fa6';
  renderTodo(); renderCategoriesManager(); mostrarToast('Categoría creada ✓');
  if (volverA) { const sel = volverA; volverA = null; toggleModal('modal-categorias'); document.getElementById(sel).value = k; }
}

/** Solo admin */
export function eliminarCategoria(key) {
  if (key === 'otro') return; const cat = CATEGORIES[key]; if (!cat) return;
  const n = institutions.filter(i => i.category === key).length + urgencias.filter(u => u.category === key).length;
  confirmar(`¿Eliminar "${cat.label}"?`, (n ? `Sus ${n} elemento${n > 1 ? 's pasan' : ' pasa'} a la categoría "Otro".` : 'No tiene lugares ni números asociados.') + ' Se quita para todas las personas.', 'Eliminar', async () => {
    try { await bajaCategoria(key); } catch (e) { return toastError(e.message); }
    institutions.forEach(i => { if (i.category === key) i.category = 'otro'; });
    urgencias.forEach(u => { if (u.category === key) u.category = 'otro'; });
    delete CATEGORIES[key]; activeFilters.delete(key); activeFilters.add('otro'); guardarPreferencias();
    renderTodo(); renderCategoriesManager(); mostrarToast('Categoría eliminada', '#b06a6c');
  });
}

export function onCatSelect(_arg, sel) { if (sel.value === '__new') { sel.value = ''; volverA = sel.id; toggleModal('modal-categorias'); setTimeout(() => document.getElementById('c-name').focus(), 50); } }
export const olvidarVolverA = () => { volverA = null; };

export function populateSelects() {
  ['f-cat', 'u-cat'].forEach(id => {
    const sel = document.getElementById(id); const cur = sel.value;
    sel.innerHTML = '<option value="" disabled selected>Seleccioná una categoría</option>' + Object.entries(CATEGORIES).map(([k, c]) => `<option value="${esc(k)}">${esc(c.emoji)} ${esc(c.label)}</option>`).join('') + '<option value="__new">➕ Crear nueva categoría…</option>';
    if (cur && CATEGORIES[cur]) sel.value = cur;
  });
}
