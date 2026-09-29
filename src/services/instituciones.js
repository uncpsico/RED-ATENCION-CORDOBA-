import { supabase } from '../lib/supabase.js';
import { verificar } from './errores.js';

const COLUMNAS = 'id, nombre, categoria_id, direccion, telefono, horario, contacto, servicios, lat, lng';

// Conversión entre la fila de la base y el formato que usa la interfaz
const desdeFila = r => ({ id: r.id, name: r.nombre, category: r.categoria_id, address: r.direccion, phone: r.telefono, hours: r.horario, contact: r.contacto, description: r.servicios, lat: +r.lat, lng: +r.lng });
const aFila = i => ({ nombre: i.name, categoria_id: i.category, direccion: i.address, telefono: i.phone || '', horario: i.hours || '', contacto: i.contact || '', servicios: i.description || '', lat: i.lat, lng: i.lng });

export async function listarInstituciones() {
  const filas = verificar(await supabase.from('instituciones').select(COLUMNAS).eq('estado', 'activo').order('nombre'));
  return filas.map(desdeFila).filter(r => isFinite(r.lat) && isFinite(r.lng));
}

export async function crearInstitucion(inst) {
  return desdeFila(verificar(await supabase.from('instituciones').insert(aFila(inst)).select(COLUMNAS).single()));
}

/** Solo admin */
export async function actualizarInstitucion(id, inst) {
  const filas = verificar(await supabase.from('instituciones').update(aFila(inst)).eq('id', id).eq('estado', 'activo').select(COLUMNAS));
  if (!filas.length) throw new Error('Ese lugar ya no existe o no tenés permiso para editarlo.');
  return desdeFila(filas[0]);
}

/** Solo admin: baja lógica (la fila queda guardada por si hay que recuperarla). */
export async function bajaInstitucion(id) {
  const filas = verificar(await supabase.from('instituciones').update({ estado: 'baja' }).eq('id', id).select('id'));
  if (!filas.length) throw new Error('No tenés permiso para eliminar este lugar.');
}
