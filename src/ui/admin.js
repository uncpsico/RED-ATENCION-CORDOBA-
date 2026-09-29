/* =====================================================================
   ADMINISTRACIÓN
   Se entra con /#admin (o desde el enlace al pie de "¿Cómo pedir ayuda?").
   Con sesión de admin, <body> lleva la clase .es-admin y se muestran los
   elementos .solo-admin (editar / eliminar). La seguridad real la dan las
   políticas RLS de Supabase: esto solo muestra u oculta botones.
   ===================================================================== */
import { estado } from '../state/store.js';
import { iniciarSesion, cerrarSesion, escucharSesion } from '../services/auth.js';
import { val } from '../utils/texto.js';
import { toggleModal, estaAbierto, mostrarToast, toastError, conBoton } from './modales.js';

export function abrirLogin() {
  if (estado.esAdmin) return mostrarToast('Ya estás en modo administración', '#5a5451');
  if (!estaAbierto('modal-admin')) toggleModal('modal-admin');
  setTimeout(() => document.getElementById('a-email').focus(), 50);
}

export async function enviarLogin(btn) {
  try { await conBoton(btn, () => iniciarSesion(val('a-email'), document.getElementById('a-pass').value)); }
  catch (e) { return toastError(e.message); }
  document.getElementById('a-pass').value = '';
  toggleModal('modal-admin'); mostrarToast('Modo administración activado ✓');
}

export async function salirAdmin() { await cerrarSesion(); mostrarToast('Sesión cerrada', '#5a5451'); }

export function initAdmin() {
  escucharSesion((esAdmin, email) => {
    estado.esAdmin = esAdmin;
    document.body.classList.toggle('es-admin', esAdmin);
    document.getElementById('admin-email').textContent = email;
  });
  const revisarHash = () => { if (location.hash === '#admin') { history.replaceState(null, '', location.pathname + location.search); abrirLogin(); } };
  window.addEventListener('hashchange', revisarHash);
  revisarHash();
}
