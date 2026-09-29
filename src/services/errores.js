/** Traduce un error de Supabase/red a un mensaje para mostrar. */
export function mensajeError(error) {
  const code = error && error.code;
  const msg = String((error && error.message) || '');
  if (code === '42501' || /row-level security|permission denied/i.test(msg)) return 'No tenés permiso para hacer esto. Solo quien administra la página puede editar o eliminar.';
  if (code === '23514') return 'Algún dato no es válido (revisá el largo de los textos, el número o la ubicación).';
  if (code === '23505') return 'Eso ya existe.';
  if (code === '23503') return 'La categoría elegida ya no existe. Elegí otra.';
  if (/fetch|network|timeout/i.test(msg)) return 'No se pudo guardar. Revisá tu conexión e intentá de nuevo.';
  return 'Ocurrió un error al guardar. Probá de nuevo.';
}

/** Lanza un Error con mensaje amigable si la respuesta de Supabase trae error. */
export function verificar({ data, error }) {
  if (error) { const e = new Error(mensajeError(error)); e.causa = error; throw e; }
  return data;
}
