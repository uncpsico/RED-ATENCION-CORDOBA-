/* =====================================================================
   LÍNEAS DE URGENCIA
   Las oficiales (es_fija en la base) se muestran arriba con su estilo;
   las que agrega la comunidad, agrupadas por categoría.
   ===================================================================== */
import { CATEGORIES, urgencias, catDe } from '../state/store.js';
import { crearUrgencia, bajaUrgencia } from '../services/urgencias.js';
import { esc, val } from '../utils/texto.js';
import { telUrgencia } from '../utils/telefonos.js';
import { toggleModal, confirmar, mostrarToast, toastError, conBoton } from './modales.js';
import { renderTodo } from './render.js';
import { resetForm } from './forms/formulario.js';

function lineaFija(u) {
  const c = u.color || catDe(u.category).color;
  const largo = u.phone.replace(/\D/g, '').length > 4;
  const attrs = `href="tel:${esc(u.tel)}" data-nombre="${esc(u.name)}"`;
  if (u.estilo === 'principal') return `<a ${attrs} class="flex items-center justify-between gap-3 text-[#fcfbf9] p-4 rounded-2xl hover:brightness-90 transition" style="background:${c}">
        <div><div class="font-space font-bold text-lg">${esc(u.name)}</div>${u.desc ? `<div class="text-xs opacity-90">${esc(u.desc)}</div>` : ''}</div>
        <div class="font-space font-bold text-3xl whitespace-nowrap">${esc(u.phone)}</div></a>`;
  if (u.estilo === 'mini') return `<a ${attrs} class="border rounded-2xl p-3 text-center hover:brightness-95 transition" style="background:${c}14;border-color:${c}33"><div class="font-space font-bold text-xl" style="color:${c}">${esc(u.phone)}</div><div class="text-[11px] text-[#756f6b] leading-tight mt-0.5">${esc(u.name)}</div></a>`;
  return `<a ${attrs} class="flex items-center justify-between gap-3 border p-4 rounded-2xl hover:brightness-95 transition" style="background:${c}14;border-color:${c}33">
        <div><div class="font-space font-bold text-[#433e3c]">${esc(u.name)}</div>${u.desc ? `<div class="text-xs text-[#756f6b]">${esc(u.desc)}</div>` : ''}</div>
        <div class="font-space font-bold ${largo ? 'text-lg' : 'text-2xl'} whitespace-nowrap" style="color:${c}">${esc(u.phone)}</div></a>`;
}

export function renderUrgencias() {
  const fijas = urgencias.filter(u => u.fija);
  const mini = fijas.filter(u => u.estilo === 'mini');
  document.getElementById('urg-fijas').innerHTML = fijas.filter(u => u.estilo !== 'mini').map(lineaFija).join('')
    + (mini.length ? `<div class="grid grid-cols-3 gap-3 pt-1">${mini.map(lineaFija).join('')}</div>` : '');

  const box = document.getElementById('urg-custom');
  const comunidad = urgencias.filter(u => !u.fija);
  const grupos = Object.entries(CATEGORIES).map(([key, cat]) => ({ key, cat, items: comunidad.filter(u => u.category === key) })).filter(g => g.items.length);
  box.innerHTML = grupos.length ? `<h3 class="font-space font-bold text-[#433e3c] text-sm pt-1">Agregados por la comunidad</h3>` + grupos.map(g => `
    <section>
      <h4 class="font-space font-bold text-xs mb-1.5 flex items-center gap-1.5" style="color:${g.cat.color}">${esc(g.cat.emoji)} ${esc(g.cat.label)}</h4>
      <div class="space-y-2">${g.items.map(u => `
        <div class="flex items-stretch gap-2">
          <a href="tel:${esc(u.tel)}" data-nombre="${esc(u.name)}" class="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-[#fcfbf9] border border-[#ebe3dc] p-3.5 rounded-2xl hover:bg-[#f7f2ee] transition" style="border-left:4px solid ${g.cat.color}">
            <div class="min-w-[9rem] flex-1"><div class="font-space font-bold text-[#433e3c] leading-snug">${esc(u.name)}</div>${u.desc ? `<div class="text-xs text-[#756f6b]">${esc(u.desc)}</div>` : ''}</div>
            <div class="font-space font-bold text-lg whitespace-nowrap" style="color:${g.cat.color}">${esc(u.phone)}</div>
          </a>
          <button data-accion="eliminarUrgencia" data-arg="${esc(u.id)}" title="Eliminar este número" class="solo-admin shrink-0 w-11 rounded-2xl border border-[#ebd4d6] text-[#b06a6c] hover:bg-[#b06a6c] hover:text-[#fcfbf9] transition text-lg">×</button>
        </div>`).join('')}</div>
    </section>`).join('') : '';
}

export async function guardarUrgencia(btn) {
  const name = val('u-name'), phone = val('u-phone'), desc = val('u-desc'), category = val('u-cat');
  if (!CATEGORIES[category]) return toastError('Elegí una categoría');
  const tel = telUrgencia(phone);
  if (!tel) return toastError('Revisá el número: tiene que tener entre 3 y 15 dígitos');
  if (urgencias.some(u => u.tel === tel)) return toastError('Ese número ya está en Urgencias');
  const u = await conBoton(btn, () => crearUrgencia({ name, phone, desc, category }));
  if (!urgencias.some(x => x.id === u.id)) urgencias.push(u);
  resetForm('form-urgencia');
  renderTodo(); toggleModal('modal-agregar'); toggleModal('modal-urgencias');
  setTimeout(() => { const el = [...document.querySelectorAll('#urg-custom a')].find(a => a.getAttribute('href') === 'tel:' + tel); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
  mostrarToast(`Número guardado en ${catDe(category).label} ✓`);
}

/** Solo admin */
export function eliminarUrgencia(id) {
  const u = urgencias.find(x => x.id === id); if (!u) return;
  confirmar('¿Eliminar este número?', `"${u.name}" (${u.phone}) se va a quitar de Urgencias para todas las personas.`, 'Eliminar', async () => {
    try { await bajaUrgencia(id); } catch (e) { return toastError(e.message); }
    const idx = urgencias.findIndex(x => x.id === id); if (idx >= 0) urgencias.splice(idx, 1);
    renderTodo(); mostrarToast('Número eliminado', '#b06a6c');
  });
}
