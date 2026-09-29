/* =====================================================================
   MAPA: Leaflet + tiles de CARTO (con capa propia de respaldo),
   máscara fuera de la provincia, pines agrupados y "mi ubicación".
   ===================================================================== */
import L from './leaflet.js';
import 'leaflet.markercluster';
import { WX, WY, T_ST, T_WATER } from './geometry.js';
import { PROV_LL, queryChunks, labelText } from './geodata.js';
import { CbaBaseLayer, labelCache, placeCache } from './baseLayer.js';
import { institutions, activeFilters, estado, catDe } from '../state/store.js';
import { esc } from '../utils/texto.js';
import { mostrarToast, toastError } from '../ui/modales.js';
import { abrirDetalle } from '../ui/detalle.js';
import { estaEligiendo, finishPick } from '../ui/forms/ubicacion.js';
import { TILES } from '../config.js';

export let map, base, clusters;
let youMarker = null;
export const PROV_BOUNDS = L.latLngBounds([-35.02, -65.78], [-29.49, -61.77]);

export function syncHeaderHeight() {
  const h = document.getElementById('app-header').offsetHeight;
  document.documentElement.style.setProperty('--header-h', h + 'px');
  const panel = document.getElementById('panel-detalle');
  panel.style.marginTop = window.innerWidth < 640 ? Math.max(h + 40, Math.round(window.innerHeight * 0.38)) + 'px' : '';
  if (map) map.invalidateSize();
}

export function initMap() {
  syncHeaderHeight();
  map = L.map('map-container', { zoomControl: false, zoomSnap: 0.5, minZoom: 6, maxZoom: 18, maxBounds: PROV_BOUNDS.pad(0.25), maxBoundsViscosity: 0.8, attributionControl: true });
  map.fitBounds(PROV_BOUNDS, { padding: [10, 10] });
  map.setMinZoom(Math.max(6, map.getZoom()));

  base = new CbaBaseLayer({ maxZoom: 18, keepBuffer: 3, updateWhenZooming: false }).addTo(map);

  map.createPane('mask'); map.getPane('mask').style.zIndex = 350; map.getPane('mask').style.pointerEvents = 'none';
  const provLL = []; for (let i = 0; i < PROV_LL.length; i += 2) provLL.push([PROV_LL[i], PROV_LL[i + 1]]);
  const maskRenderer = L.canvas({ pane: 'mask', padding: 0.5 });
  const extMask = L.layerGroup([
    L.polygon([[[-45, -80], [-45, -48], [-20, -48], [-20, -80]], provLL], { pane: 'mask', renderer: maskRenderer, stroke: false, fillColor: '#e3ddd3', fillOpacity: 0.85, interactive: false }),
    L.polyline(provLL.concat([provLL[0]]), { pane: 'mask', renderer: maskRenderer, color: '#a8998a', weight: 2, interactive: false })
  ]);
  // Tiles externos (opcionales): cuando carga el primero se quita la capa propia;
  // si fallan, se queda la propia. Ver TILES en config.js.
  if (TILES) {
    const tiles = L.tileLayer(TILES.url, { attribution: TILES.attribution, maxZoom: 18 });
    let tilesOk = false, tileErr = 0;
    tiles.on('tileload', () => { if (tilesOk) return; tilesOk = true; map.removeLayer(base); extMask.addTo(map); });
    tiles.on('tileerror', () => { if (!tilesOk && ++tileErr > 2 && map.hasLayer(tiles)) map.removeLayer(tiles); });
    tiles.addTo(map);
  }

  map.attributionControl.setPrefix(false);
  map.attributionControl.addAttribution('Cartografía: DGEyC Córdoba / Municipalidad de Córdoba (OpenDataCordoba)');

  L.control.zoom({ position: 'topright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(map);
  const Extra = L.Control.extend({
    options: { position: 'topright' },
    onAdd() {
      const div = L.DomUtil.create('div', 'leaflet-bar');
      div.innerHTML = `<a href="#" title="Ver toda la provincia" style="width:38px;height:38px;line-height:36px;font-size:17px;display:block;text-align:center">🗺️</a><a href="#" title="Mi ubicación" style="width:38px;height:38px;line-height:36px;font-size:17px;display:block;text-align:center">◎</a>`;
      const [a1, a2] = div.querySelectorAll('a');
      L.DomEvent.disableClickPropagation(div);
      a1.onclick = e => { e.preventDefault(); map.flyToBounds(PROV_BOUNDS, { duration: 0.8 }); };
      a2.onclick = e => { e.preventDefault(); ubicarme(); };
      return div;
    }
  });
  new Extra().addTo(map);

  clusters = L.markerClusterGroup({
    showCoverageOnHover: false, maxClusterRadius: 55, spiderfyOnMaxZoom: true, spiderfyDistanceMultiplier: 1.6,
    iconCreateFunction: c => { const n = c.getChildCount(); const s = n < 10 ? 44 : n < 50 ? 52 : 60; return L.divIcon({ html: `<div class="cluster-circle" style="font-size:${n < 10 ? 16 : 15}px">${n}</div>`, className: 'cluster-wrap', iconSize: [s, s] }); }
  });
  clusters.addTo(map);

  map.on('click', onMapClick);
  window.addEventListener('resize', syncHeaderHeight);
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load(`600 12px "Space Grotesk"`), document.fonts.load(`700 12px "Space Grotesk"`)]).then(() => { labelCache.clear(); placeCache.clear(); base.redraw(); }).catch(() => {});
}

// Al tocar una calle (con zoom alto y la capa propia visible) muestra su nombre
function onMapClick(e) {
  if (estaEligiendo()) return finishPick(e.latlng);
  if (map.getZoom() < 14 || !map.hasLayer(base)) return;
  const z = map.getZoom(), S = Math.pow(2, z); const px = WX(e.latlng.lng) * S, py = WY(e.latlng.lat) * S; const tol = 12;
  const chunks = queryChunks((px - tol) / S, (py - tol) / S, (px + tol) / S, (py + tol) / S);
  let best = null, bd = tol;
  for (const ch of chunks) {
    if (ch.t < T_ST && ch.t !== T_WATER) continue;
    const p = ch.p;
    for (let i = 0; i < p.length - 2; i += 2) {
      const x0 = p[i] * S, y0 = p[i + 1] * S, x1 = p[i + 2] * S, y1 = p[i + 3] * S;
      const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy; let t = L2 ? ((px - x0) * dx + (py - y0) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy)); if (d < bd) { bd = d; best = ch; }
    }
  }
  if (best && best.ni >= 0 && best.loc.raw.names[best.ni]) {
    L.popup({ closeButton: false, offset: [0, -4] }).setLatLng(e.latlng).setContent(`<b>${esc(labelText(best.loc, best.ni))}</b><br><span style="color:#8c8580">${esc(best.loc.name)}</span>`).openOn(map);
  }
}

function ubicarme() {
  if (!navigator.geolocation) return toastError('Tu navegador no permite ubicarte');
  mostrarToast('Buscando tu ubicación…', '#5a5451');
  navigator.geolocation.getCurrentPosition(pos => {
    const ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
    if (!PROV_BOUNDS.contains(ll)) return toastError('Tu ubicación está fuera de la provincia');
    if (youMarker) youMarker.remove();
    youMarker = L.marker(ll, { icon: L.divIcon({ className: '', html: '<div class="you-dot"></div>', iconSize: [18, 18] }), interactive: false, zIndexOffset: 1000 }).addTo(map);
    map.flyTo(ll, 16, { duration: 0.9 });
  }, () => toastError('No se pudo obtener tu ubicación. Revisá los permisos del navegador.'), { enableHighAccuracy: true, timeout: 10000 });
}

export function renderPins() {
  if (!clusters) return;
  clusters.clearLayers(); let count = 0; const markers = [];
  institutions.filter(i => activeFilters.has(i.category)).forEach(inst => {
    count++;
    const cat = catDe(inst.category);
    const icon = estado.useEmojis ? cat.emoji : cat.glyph;
    const size = estado.useEmojis ? (Array.from(icon).length > 2 ? 12 : 18) : 22;
    const m = L.marker([inst.lat, inst.lng], {
      title: inst.name,
      icon: L.divIcon({ className: 'custom-pin', html: `<div class="pin-shape" style="border-color:${cat.color};color:${cat.color}"><div class="pin-icon font-space font-bold" style="font-size:${size}px">${esc(icon)}</div></div>`, iconSize: [38, 38], iconAnchor: [19, 44] })
    });
    m.on('click', () => abrirDetalle(inst));
    markers.push(m);
  });
  clusters.addLayers(markers);
  const base_ = count === 1 ? '1 lugar en la red' : `${count} lugares en la red`;
  document.getElementById('counter').textContent = base_ + (estado.sync === 'offline' ? ' · sin conexión (última versión guardada)' : estado.sync === 'cargando' ? ' · actualizando…' : '');
}

/** Convierte una caja en coordenadas mundo a límites de Leaflet. */
export function worldBBoxToBounds(bb) { const c = map.options.crs; return L.latLngBounds(c.pointToLatLng(L.point(bb[0], bb[1]), 0), c.pointToLatLng(L.point(bb[2], bb[3]), 0)); }
