/* =====================================================================
   FORMULARIOS: validación y envío
   Los botones "Guardar" no usan <form>: cada bloque tiene data-enviar="nombre"
   y el botón llama a la función registrada con ese nombre.
   ===================================================================== */
import { toastError } from '../modales.js';

const envios = {};
export function registrarEnvio(nombre, fn) { envios[nombre] = fn; }

function etiquetaDe(el) { const lab = el.closest('div')?.querySelector('label'); return lab ? lab.textContent.replace('*', '').trim() : 'este campo'; }
function validarForm(cont) {
  cont.querySelectorAll('.campo-error').forEach(el => el.classList.remove('campo-error'));
  for (const el of cont.querySelectorAll('[required]')) {
    if (el.offsetParent === null && el.type !== 'hidden') continue;
    const v = (el.value || '').trim();
    if (!v || v === '__new') {
      el.classList.add('campo-error'); el.focus({ preventScroll: false });
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      toastError(`Completá: ${etiquetaDe(el)}`); return false;
    }
  }
  return true;
}

// Campo trampa invisible: si viene completo, lo cargó un robot
const esRobot = () => !!document.getElementById('hp-web').value;

export function enviarForm(btn) {
  const cont = btn.closest('[data-enviar]'); if (!cont || btn.disabled) return;
  if (!validarForm(cont)) return;
  if (esRobot()) return;
  const fn = envios[cont.dataset.enviar];
  Promise.resolve(fn(btn)).catch(err => { console.error(err); toastError(err && err.message ? err.message : 'Ocurrió un error al guardar. Probá de nuevo.'); });
}

export function resetForm(id) {
  document.getElementById(id).querySelectorAll('input, textarea, select').forEach(el => {
    if (el.type === 'checkbox') el.checked = false; else if (el.tagName === 'SELECT') el.selectedIndex = 0; else if (el.type !== 'color') el.value = '';
    el.classList.remove('campo-error');
  });
}

document.addEventListener('input', e => { if (e.target.classList && e.target.classList.contains('campo-error')) e.target.classList.remove('campo-error'); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA' || e.isComposing) return;
  const cont = e.target.closest && e.target.closest('[data-enviar]'); if (!cont) return;
  e.preventDefault(); const btn = cont.querySelector('button[data-accion="enviarForm"]'); if (btn) enviarForm(btn);
});
