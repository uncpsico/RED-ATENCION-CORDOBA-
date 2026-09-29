/* =====================================================================
   UBICACIÓN DENTRO DEL FORMULARIO DE INSTITUCIÓN
   Ubica la dirección sola mientras se escribe, o se corrige tocando el mapa.
   ===================================================================== */
import L from '../../map/leaflet.js';
import { map, PROV_BOUNDS } from '../../map/mapa.js';
import { geocodificar, geocodificarOnline, parseDireccion } from '../../geo/geocoder.js';
import { esc, val } from '../../utils/texto.js';
import { toggleModal, mostrarToast, toastError } from '../modales.js';
import { cerrarDetalle } from '../detalle.js';

let geoTimer = null, geoSeq = 0, geoManualFlag = false;
let picking = false, pickMarker = null;

export const MSJ_INICIAL = '📍 Escribí la dirección y la ubicamos en el mapa automáticamente.';
export const setGeoManual = v => { geoManualFlag = v; };
export const estaEligiendo = () => picking;

export function onDireccionInput() { geoManualFlag = false; clearTimeout(geoTimer); geoTimer = setTimeout(ubicarDireccion, 450); }
export function setGeoEstado(tipo, html) {
  const el = document.getElementById('f-geo');
  const cls = { ok: 'bg-[#eef4ec] border-[#c9dcc4] text-[#4f6a4b]', aprox: 'bg-[#fdf6e7] border-[#ecdcb6] text-[#8a6a2c]', error: 'bg-[#fbf0f0] border-[#ecd0d1] text-[#9a4f55]', info: 'bg-[#fcfbf9] border-[#dfe5dd] text-[#756f6b]' }[tipo];
  el.className = 'text-sm leading-relaxed rounded-xl px-3 py-2 border ' + cls; el.innerHTML = html;
}
export function ponerCoords(lat, lng) {
  document.getElementById('f-lat').value = (+lat).toFixed(6); document.getElementById('f-lng').value = (+lng).toFixed(6);
  if (pickMarker) pickMarker.remove();
  pickMarker = L.marker([lat, lng], { icon: L.divIcon({ className: 'custom-pin', html: '<div class="pin-shape" style="border-color:#433e3c;color:#433e3c"><div class="pin-icon" style="font-size:16px">＋</div></div>', iconSize: [38, 38], iconAnchor: [19, 44] }), interactive: false }).addTo(map);
}
export function quitarMarcador() { if (pickMarker) { pickMarker.remove(); pickMarker = null; } }
export function limpiarCoords() { document.getElementById('f-lat').value = ''; document.getElementById('f-lng').value = ''; quitarMarcador(); }

/** Deja la sección de ubicación como al principio. */
export function reiniciarUbicacion() {
  document.getElementById('f-loc').value = 'Córdoba';
  limpiarCoords(); geoManualFlag = false; setGeoEstado('info', MSJ_INICIAL);
}

export async function ubicarDireccion() {
  if (geoManualFlag) return true;
  const dir = val('f-address'), locT = val('f-loc'); const seq = ++geoSeq;
  if (dir.length < 3) { limpiarCoords(); setGeoEstado('info', MSJ_INICIAL); return false; }
  let r = geocodificar(dir, locT);
  if (!r || (r.precision !== 'exacta' && parseDireccion(dir).num != null)) {
    setGeoEstado('info', '🔎 Buscando la dirección…');
    const on = await geocodificarOnline(dir, locT); if (seq !== geoSeq) return false;
    if (on) r = on;
  }
  if (seq !== geoSeq) return false;
  if (!r) { limpiarCoords(); setGeoEstado('error', '✗ No encontramos esa calle en la localidad elegida. Revisá cómo está escrita o tocá <b>Corregir en el mapa</b> para marcar el lugar.'); return false; }
  ponerCoords(r.lat, r.lng);
  if (r.precision === 'exacta') setGeoEstado('ok', `✓ Ubicada automáticamente en el mapa: <b>${esc(r.etiqueta)}</b>`);
  else setGeoEstado('aprox', `≈ Ubicación aproximada sobre <b>${esc(r.etiqueta)}</b>. Si querés más precisión, tocá <b>Corregir en el mapa</b>.`);
  return true;
}
export function geoManual() { geoManualFlag = true; const lat = parseFloat(val('f-lat')), lng = parseFloat(val('f-lng')); if (isFinite(lat) && isFinite(lng)) { ponerCoords(lat, lng); setGeoEstado('ok', '✓ Ubicación cargada a mano.'); } }

/* ---------- corregir la ubicación tocando el mapa ---------- */
const banner = on => { const b = document.getElementById('pick-banner'); b.classList.toggle('hidden', !on); b.classList.toggle('flex', on); };
export function startPick() {
  toggleModal('modal-agregar'); picking = true; cerrarDetalle();
  document.body.classList.add('pick-mode'); banner(true);
  const lat = parseFloat(val('f-lat')), lng = parseFloat(val('f-lng'));
  if (isFinite(lat) && isFinite(lng)) map.flyTo([lat, lng], 17, { duration: 0.6 });
  else if (map.getZoom() < 14) mostrarToast('Acercate con el zoom o el buscador y tocá el lugar exacto', '#5a5451');
}
export function cancelPick() { picking = false; document.body.classList.remove('pick-mode'); banner(false); toggleModal('modal-agregar'); }
export function finishPick(ll) {
  if (!PROV_BOUNDS.contains(ll)) return toastError('Elegí un punto dentro de la provincia');
  picking = false; document.body.classList.remove('pick-mode'); banner(false);
  geoManualFlag = true; ponerCoords(ll.lat, ll.lng); setGeoEstado('ok', '✓ Ubicación marcada a mano en el mapa.');
  setTimeout(() => toggleModal('modal-agregar'), 250);
}

/** Al cerrar el formulario se quita el pin temporal; al abrirlo se vuelve a mostrar. */
export function alAbrirFormulario() { const la = parseFloat(val('f-lat')), ln = parseFloat(val('f-lng')); if (isFinite(la) && isFinite(ln) && !pickMarker) ponerCoords(la, ln); }
export function alCerrarFormulario() { setTimeout(() => { if (!picking) quitarMarcador(); }, 0); }
