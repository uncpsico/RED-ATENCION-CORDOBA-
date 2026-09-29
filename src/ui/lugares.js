/* ---------- listado de lugares y baja de instituciones ---------- */
import { CATEGORIES, institutions, estado } from '../state/store.js';
import { bajaInstitucion } from '../services/instituciones.js';
import { esc, norm } from '../utils/texto.js';
import { toggleModal, confirmar, mostrarToast, toastError } from './modales.js';
import { cerrarDetalle } from './detalle.js';
import { renderTodo } from './render.js';

export function openLugares() { document.getElementById('lugares-filtro').value = ''; renderLugares(); toggleModal('modal-lugares'); }

export function renderLugares() {
  const q = norm(document.getElementById('lugares-filtro').value);
  const box = document.getElementById('lista-lugares');
  const grupos = Object.entries(CATEGORIES).map(([key, cat]) => ({ key, cat, items: institutions.filter(i => i.category === key && (!q || norm(i.name + ' ' + i.address + ' ' + cat.label).includes(q))).sort((a, b) => a.name.localeCompare(b.name, 'es')) })).filter(g => g.items.length);
  if (!grupos.length) { box.innerHTML = '<p class="text-sm text-[#9e9791] text-center py-6">No hay lugares que coincidan.</p>'; return; }
  box.innerHTML = grupos.map(g => `
    <section>
      <h3 class="font-space font-bold text-sm mb-2 flex items-center gap-2" style="color:${g.cat.color}">${esc(g.cat.emoji)} ${esc(g.cat.label)} <span class="text-[#9e9791] font-medium">(${g.items.length})</span></h3>
      <div class="space-y-2">${g.items.map(i => `
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2 bg-[#faf8f5] p-3 rounded-2xl border border-[#ece8e0]" style="border-left:4px solid ${g.cat.color}">
          <button data-modal="modal-lugares" data-accion="verLugar" data-arg="${esc(i.id)}" class="flex-1 min-w-[11rem] text-left">
            <div class="font-space font-bold text-sm text-[#433e3c] truncate">${esc(i.name)}</div>
            <div class="text-xs text-[#8c8580] truncate">${esc(i.address)}</div>
          </button>
          <span class="solo-admin flex gap-2 ml-auto"><button data-modal="modal-lugares" data-accion="openEditar" data-arg="${esc(i.id)}" class="shrink-0 text-xs font-space font-bold text-[#5a5451] border border-[#dcd6cf] px-2.5 py-1.5 rounded-lg hover:bg-[#5a5451] hover:text-[#fcfbf9] transition">Editar</button>
          <button data-accion="eliminarInstitucion" data-arg="${esc(i.id)}" class="shrink-0 text-xs font-space font-bold text-[#b06a6c] border border-[#dcc3c4] px-2.5 py-1.5 rounded-lg hover:bg-[#b06a6c] hover:text-[#fcfbf9] transition">Eliminar</button></span>
        </div>`).join('')}</div>
    </section>`).join('');
}

/** Solo admin */
export function eliminarInstitucion(id) {
  const inst = institutions.find(i => i.id === id); if (!inst) return;
  confirmar('¿Eliminar este lugar?', `"${inst.name}" se va a quitar del mapa para todas las personas. Queda guardado en la base por si hay que recuperarlo.`, 'Eliminar', async () => {
    try { await bajaInstitucion(id); } catch (e) { return toastError(e.message); }
    const idx = institutions.findIndex(i => i.id === id); if (idx >= 0) institutions.splice(idx, 1);
    if (estado.instAbierta && estado.instAbierta.id === id) cerrarDetalle();
    renderTodo(); mostrarToast('Lugar eliminado', '#b06a6c');
  });
}
