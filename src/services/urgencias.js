import { supabase } from '../lib/supabase.js';
import { verificar } from './errores.js';
import { telUrgencia } from '../utils/telefonos.js';

const COLUMNAS = 'id, nombre, numero, descripcion, categoria_id, es_fija, estilo, color, orden';

const desdeFila = u => ({ id: u.id, name: u.nombre, phone: u.numero, tel: telUrgencia(u.numero || ''), desc: u.descripcion, category: u.categoria_id, fija: u.es_fija, estilo: u.estilo, color: u.color });

export async function listarUrgencias() {
  const filas = verificar(await supabase.from('urgencias').select(COLUMNAS).eq('estado', 'activo').order('orden').order('created_at'));
  return filas.map(desdeFila).filter(u => u.tel);
}

export async function crearUrgencia({ name, phone, desc, category }) {
  return desdeFila(verificar(await supabase.from('urgencias').insert({ nombre: name, numero: phone, descripcion: desc || '', categoria_id: category }).select(COLUMNAS).single()));
}

/** Solo admin */
export async function bajaUrgencia(id) {
  const filas = verificar(await supabase.from('urgencias').update({ estado: 'baja' }).eq('id', id).select('id'));
  if (!filas.length) throw new Error('No tenés permiso para eliminar este número.');
}
