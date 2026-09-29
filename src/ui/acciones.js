/* =====================================================================
   ACCIONES DEL HTML (delegación de eventos)
   En lugar de onclick="..." en el HTML, los elementos declaran:
     data-modal="modal-x [modal-y]"  → abre/cierra esos modales
     data-accion="nombre" [data-arg="valor"] → ejecuta la acción registrada
     data-input="nombre" / data-change="nombre" → para inputs y selects
   Los modales con clase .modal-wrap se cierran al tocar el fondo.
   ===================================================================== */
import { toggleModal } from './modales.js';

const acciones = {};
export function registrarAcciones(obj) { Object.assign(acciones, obj); }

function ejecutar(nombre, el, e) {
  const fn = acciones[nombre];
  if (!fn) return console.warn('Acción no registrada:', nombre);
  Promise.resolve(fn(el.dataset.arg, el, e)).catch(err => console.error(err));
}

document.addEventListener('click', e => {
  const wrap = e.target.classList && e.target.classList.contains('modal-wrap') ? e.target : null;
  if (wrap) { toggleModal(wrap.id); return; }
  const el = e.target.closest && e.target.closest('[data-modal], [data-accion]');
  if (!el) return;
  if (el.tagName === 'A' && el.getAttribute('href') === '#') e.preventDefault();
  if (el.dataset.modal) el.dataset.modal.split(/\s+/).forEach(toggleModal);
  if (el.dataset.accion) ejecutar(el.dataset.accion, el, e);
});
document.addEventListener('input', e => { const n = e.target.dataset && e.target.dataset.input; if (n) ejecutar(n, e.target, e); });
document.addEventListener('change', e => { const n = e.target.dataset && e.target.dataset.change; if (n) ejecutar(n, e.target, e); });
