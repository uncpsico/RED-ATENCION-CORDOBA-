/* ---------- modales, confirmación y aviso breve (toast) ---------- */

// Cada módulo puede reaccionar cuando se abre o cierra "su" modal
const hooks = {};
export function alAbrirCerrar(id, { abrir, cerrar } = {}) { hooks[id] = { abrir, cerrar }; }

export function toggleModal(id) {
  const el = document.getElementById(id); if (!el) return;
  el.classList.toggle('hidden'); el.classList.toggle('flex');
  const h = hooks[id]; if (!h) return;
  if (el.classList.contains('hidden')) h.cerrar && h.cerrar(); else h.abrir && h.abrir();
}
export const estaAbierto = id => !document.getElementById(id).classList.contains('hidden');

export function confirmar(title, text, okLabel, fn) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-text').textContent = text;
  const ok = document.getElementById('confirm-ok'); ok.textContent = okLabel;
  ok.onclick = () => { toggleModal('modal-confirm'); fn(); };
  toggleModal('modal-confirm');
}

let toastT;
export function mostrarToast(msg, bg = '#798f75') {
  const t = document.getElementById('toast'); t.textContent = msg; t.style.backgroundColor = bg;
  t.classList.remove('opacity-0'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('opacity-0'), 3200);
}
export const toastError = msg => mostrarToast(msg, '#b06a6c');

/** Pone un botón en estado "Guardando…" mientras corre `fn`. */
export async function conBoton(btn, fn) {
  const txt = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = 'Guardando…'; btn.classList.add('opacity-60'); }
  try { return await fn(); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = txt; btn.classList.remove('opacity-60'); } }
}
