/* ---------- llamadas ----------
   En un navegador normal (celular o computadora), los enlaces tel: abren directamente
   la opción de llamar. Si la página está dentro de un marco (apps que embeben páginas),
   ese enlace puede estar bloqueado: mostramos una ventana con el número grande,
   un botón para llamar y otro para copiarlo. */
import { formatoTel } from '../utils/telefonos.js';
import { toggleModal, mostrarToast, toastError } from './modales.js';

const EN_MARCO = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

function abrirLlamada(tel, nombre) {
  document.getElementById('llamar-nombre').textContent = nombre || 'Llamar a';
  document.getElementById('llamar-numero').textContent = formatoTel(tel);
  const a = document.getElementById('llamar-link'); a.href = 'tel:' + tel; a.dataset.tel = tel;
  const m = document.getElementById('modal-llamar'); if (m.classList.contains('hidden')) toggleModal('modal-llamar');
}
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href^="tel:"]'); if (!a || !EN_MARCO || a.dataset.directo) return;
  e.preventDefault(); abrirLlamada(a.getAttribute('href').slice(4), a.dataset.nombre || '');
});

export async function copiar(text) {
  try { await navigator.clipboard.writeText(text); mostrarToast('Número copiado ✓'); return; } catch (e) {}
  try { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); mostrarToast('Número copiado ✓'); } catch (e) { toastError('No se pudo copiar'); }
}
