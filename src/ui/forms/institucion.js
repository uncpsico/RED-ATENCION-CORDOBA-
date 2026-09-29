/* =====================================================================
   FORMULARIO DE INSTITUCIÓN (alta pública; edición solo admin)
   ===================================================================== */
import { CATEGORIES, institutions, activeFilters, catDe, guardarPreferencias } from '../../state/store.js';
import { crearInstitucion, actualizarInstitucion } from '../../services/instituciones.js';
import { PROV_BOUNDS } from '../../map/mapa.js';
import { buscarLocalidad } from '../../geo/geocoder.js';
import { norm, val } from '../../utils/texto.js';
import { toggleModal, mostrarToast, toastError, conBoton } from '../modales.js';
import { abrirDetalle, cerrarDetalle } from '../detalle.js';
import { populateSelects } from '../categorias.js';
import { renderTodo } from '../render.js';
import { resetForm } from './formulario.js';
import { ubicarDireccion, ponerCoords, setGeoEstado, setGeoManual, reiniciarUbicacion } from './ubicacion.js';

let editandoId = null;

function modoEdicion(on) {
  document.getElementById('agregar-tabs').classList.toggle('hidden', on);
  document.getElementById('btn-guardar-inst').textContent = on ? 'Guardar cambios' : 'Guardar institución';
  if (on) document.getElementById('agregar-titulo').textContent = 'Editar institución';
}
function separarLocalidad(address) {
  const partes = String(address || '').split(',').map(x => x.trim()).filter(Boolean);
  if (partes.length > 1 && buscarLocalidad(partes[partes.length - 1])) return { dir: partes.slice(0, -1).join(', '), loc: partes[partes.length - 1] };
  return { dir: String(address || ''), loc: 'Córdoba' };
}

/** Solo admin */
export function openEditar(id) {
  const inst = institutions.find(i => i.id === id); if (!inst) return;
  cerrarDetalle(); editandoId = id;
  populateSelects(); setAgregarTab('inst'); resetForm('form-agregar');
  const { dir, loc } = separarLocalidad(inst.address);
  const set = (k, v) => { document.getElementById(k).value = v || ''; };
  set('f-name', inst.name); set('f-address', dir); set('f-loc', loc); set('f-phone', inst.phone === '-' ? '' : inst.phone);
  set('f-hours', inst.hours); set('f-contact', inst.contact); set('f-desc', inst.description);
  document.getElementById('f-cat').value = CATEGORIES[inst.category] ? inst.category : 'otro';
  setGeoManual(true); ponerCoords(inst.lat, inst.lng);
  setGeoEstado('ok', '📍 Se mantiene la ubicación actual. Si cambiás la dirección, se vuelve a ubicar sola.');
  modoEdicion(true);
  toggleModal('modal-agregar'); setTimeout(() => document.getElementById('f-name').focus(), 50);
}

export function openAgregar(tab) {
  if (editandoId) { editandoId = null; resetForm('form-agregar'); reiniciarUbicacion(); }
  modoEdicion(false);
  populateSelects(); setAgregarTab(tab === 'urg' ? 'urg' : 'inst');
  const pre = activeFilters.size === 1 ? [...activeFilters][0] : '';
  if (pre && CATEGORIES[pre]) { if (!val('f-cat')) document.getElementById('f-cat').value = pre; if (!val('u-cat')) document.getElementById('u-cat').value = pre; }
  toggleModal('modal-agregar'); setTimeout(() => document.getElementById(tab === 'urg' ? 'u-name' : 'f-name').focus(), 50);
}

export function setAgregarTab(tab) {
  const urg = tab === 'urg';
  document.getElementById('form-urgencia').classList.toggle('hidden', !urg);
  document.getElementById('form-agregar').classList.toggle('hidden', urg);
  document.getElementById('agregar-titulo').textContent = urg ? 'Agregar número de urgencia' : (editandoId ? 'Editar institución' : 'Agregar institución');
  const on = 'bg-[#fcfbf9] shadow-sm', off = 'text-[#8c8580] hover:text-[#433e3c]';
  document.getElementById('tab-inst').className = 'py-2 rounded-lg font-space font-bold text-sm transition ' + (urg ? off : on + ' text-[#433e3c]');
  document.getElementById('tab-urg').className = 'py-2 rounded-lg font-space font-bold text-sm transition ' + (urg ? on + ' text-[#8e4a55]' : off);
}

function terminar() {
  toggleModal('modal-agregar'); resetForm('form-agregar'); reiniciarUbicacion();
}

export async function guardarInstitucion(btn) {
  const category = val('f-cat');
  if (!CATEGORIES[category]) return toastError('Elegí una categoría');
  let lat = parseFloat(val('f-lat')), lng = parseFloat(val('f-lng'));
  if (!isFinite(lat) || !isFinite(lng)) { await ubicarDireccion(); lat = parseFloat(val('f-lat')); lng = parseFloat(val('f-lng')); }
  if (!isFinite(lat) || !isFinite(lng)) return toastError('No pudimos ubicar la dirección. Tocá "Corregir en el mapa".');
  if (!PROV_BOUNDS.contains([lat, lng])) return toastError('La ubicación tiene que estar dentro de la provincia');
  const dir = val('f-address'), locT = val('f-loc');
  const address = (locT && !norm(dir).includes(norm(locT))) ? `${dir}, ${locT}` : dir;
  const datos = { name: val('f-name'), category, address, phone: val('f-phone'), hours: val('f-hours'), contact: val('f-contact'), description: val('f-desc'), lat, lng };

  if (editandoId) {
    const id = editandoId;
    const nuevo = await conBoton(btn, () => actualizarInstitucion(id, datos));
    const idx = institutions.findIndex(i => i.id === id);
    if (idx >= 0) institutions[idx] = nuevo; else institutions.push(nuevo);
    activeFilters.add(category); guardarPreferencias();
    editandoId = null; modoEdicion(false); terminar();
    renderTodo(); mostrarToast('Cambios guardados ✓'); abrirDetalle(nuevo);
    return;
  }
  const inst = await conBoton(btn, () => crearInstitucion(datos));
  // (puede que la recarga en tiempo real ya la haya traído)
  if (!institutions.some(i => i.id === inst.id)) institutions.push(inst);
  activeFilters.add(category); guardarPreferencias();
  terminar();
  renderTodo(); mostrarToast(`Guardado en ${catDe(category).label} ✓`); abrirDetalle(inst);
}
