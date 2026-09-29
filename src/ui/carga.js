/* ---------- pantalla de carga inicial ----------
   Está en index.html con estilos en línea, así se ve bien desde el primer
   instante. Se oculta con un fundido cuando el mapa ya está dibujado. */

const el = () => document.getElementById('carga');

export function textoCarga(msg) {
  const t = document.getElementById('carga-texto'); if (t) t.textContent = msg;
}

export function ocultarCarga() {
  const c = el(); if (!c || c.classList.contains('listo')) return;
  // se espera a que el navegador pinte el mapa antes del fundido
  requestAnimationFrame(() => requestAnimationFrame(() => {
    c.classList.add('listo');
    c.addEventListener('transitionend', () => c.remove(), { once: true });
    setTimeout(() => c.remove(), 800); // por si no hay transición (movimiento reducido)
  }));
}

export function errorCarga(msg) {
  const c = el(); if (!c) return;
  if (msg) document.getElementById('carga-error').textContent = msg;
  c.classList.add('con-error');
}
