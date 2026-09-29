/* =====================================================================
   SINCRONIZACIÓN: carga todo desde Supabase y avisa cuando otra persona
   cambia algo. Guarda una copia en el navegador para abrir sin conexión.
   ===================================================================== */
import { supabase } from '../lib/supabase.js';
import { listarCategorias } from './categorias.js';
import { listarInstituciones } from './instituciones.js';
import { listarUrgencias } from './urgencias.js';
import { lsGet, lsSet, parseOr } from '../utils/texto.js';

const CLAVE_CACHE = 'redCba_cache_v2';

export async function cargarTodo() {
  const [cats, instituciones, lineas] = await Promise.all([listarCategorias(), listarInstituciones(), listarUrgencias()]);
  const datos = { categorias: cats.map(c => ({ id: c.id, label: c.nombre, emoji: c.emoji, color: c.color })), instituciones, lineas };
  lsSet(CLAVE_CACHE, JSON.stringify(datos));
  return datos;
}

/** Última versión guardada en este navegador (o null). */
export function datosEnCache() {
  const d = parseOr(lsGet(CLAVE_CACHE), null);
  return d && Array.isArray(d.categorias) && Array.isArray(d.instituciones) && Array.isArray(d.lineas) ? d : null;
}

/**
 * Llama a `alCambiar` cada vez que cambia algo en la base (Realtime sobre
 * la tabla sync_version), y también al volver a la pestaña o a tener conexión.
 */
export function escucharCambios(alCambiar) {
  let t = null;
  const avisar = () => { clearTimeout(t); t = setTimeout(alCambiar, 250); };
  supabase.channel('cambios')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sync_version' }, avisar)
    .subscribe();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') avisar(); });
  window.addEventListener('online', avisar);
}
