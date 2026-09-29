import { supabase } from '../lib/supabase.js';
import { verificar } from './errores.js';
import { norm } from '../utils/texto.js';

export async function listarCategorias() {
  return verificar(await supabase.from('categorias').select('id, nombre, emoji, color, orden').eq('estado', 'activo').order('orden').order('created_at'));
}

/** Crea una categoría. El id se arma a partir del nombre ("Comedores" → "comedores"). */
export async function crearCategoria({ nombre, emoji, color }, idsUsados = []) {
  const base = norm(nombre).replace(/[^a-z0-9]/g, '').slice(0, 36) || 'cat';
  const usados = new Set(idsUsados);
  let id = base, n = 2;
  for (let intento = 0; intento < 5; intento++) {
    while (usados.has(id)) id = base + n++;
    const { error } = await supabase.from('categorias').insert({ id, nombre, emoji, color });
    if (!error) return id;
    if (error.code !== '23505') verificar({ error });
    usados.add(id); // otra persona la creó justo antes (o está dada de baja): se prueba el siguiente
  }
  throw new Error('No se pudo crear la categoría. Probá con otro nombre.');
}

/** Solo admin: da de baja la categoría y pasa sus elementos a "Otro". */
export async function bajaCategoria(id) {
  verificar(await supabase.rpc('baja_categoria', { p_id: id }));
}
