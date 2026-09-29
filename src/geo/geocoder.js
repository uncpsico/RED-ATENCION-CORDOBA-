/* =====================================================================
   UBICACIÓN AUTOMÁTICA DE DIRECCIONES (geocodificación)
   Usa la numeración oficial de las calles (catastro provincial/municipal).
   Donde no hay numeración, ubica sobre la calle. Si hace falta, también
   consulta el servicio Georef del Estado argentino (apis.datos.gob.ar).
   ===================================================================== */
import L from '../map/leaflet.js';
import { GEO_DATA, LOCS, BARRIOS, CAPITAL, ensureLines, labelText } from '../map/geodata.js';
import { norm, prettyName } from '../utils/texto.js';

const GEO = {};
const TIPOS_CALLE = new Set(['av', 'avda', 'avenida', 'bv', 'bvard', 'bulevar', 'boulevard', 'calle', 'pje', 'pasaje', 'peat', 'peatonal', 'diag', 'diagonal', 'cno', 'camino']);
const SINON = { general: 'grl', gral: 'grl', doctor: 'dr', dra: 'dr', doctora: 'dr', presidente: 'pte', teniente: 'tte', coronel: 'cnel', gobernador: 'gdor', ingeniero: 'ing', monsenor: 'mons', santa: 'sta', santo: 'sto', sargento: 'sgto', capitan: 'cap', comandante: 'cdte', almirante: 'alte', profesor: 'prof', maestro: 'mstro', presbitero: 'pbro' };
const STOP = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e']);
function tokensCalle(s) { return norm(s).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(Boolean).filter(t => !TIPOS_CALLE.has(t) && !STOP.has(t)).map(t => SINON[t] || t); }
function puntajeCalle(q, st) {
  if (!q.length) return -1;
  let exact = 0;
  for (const t of q) {
    let ok = false;
    for (const s of st) {
      if (s === t) { exact++; ok = true; break; }
      if ((t.length >= 3 && s.startsWith(t)) || (s.length >= 3 && t.startsWith(s) && t.length - s.length <= 6)) ok = true;
    }
    if (!ok) return -1;
  }
  return exact * 10 - (st.length - q.length) * 3 + (st.length === q.length ? 5 : 0);
}
function geoLoc(id) {
  if (GEO[id] !== undefined) return GEO[id];
  const d = GEO_DATA[id]; if (!d) return (GEO[id] = null);
  const s = d.s; let i = 0;
  const next = () => { let b, shift = 0, res = 0; do { b = s.charCodeAt(i++) - 63; res |= (b & 31) << shift; shift += 5; } while (b >= 32); return (res & 1) ? ~(res >> 1) : (res >> 1); };
  let pn = 0, px = 0, py = 0;
  const streets = d.n.map(name => {
    const cnt = next(); const segs = [];
    for (let k = 0; k < cnt; k++) {
      const a = pn + next(); const b = a + next(); pn = b;
      const y0 = py + next(), x0 = px + next(), y1 = y0 + next(), x1 = x0 + next(); px = x1; py = y1;
      segs.push([a, b, y0 / 1e5, x0 / 1e5, y1 / 1e5, x1 / 1e5]);
    }
    return { name, toks: tokensCalle(name), segs };
  });
  return (GEO[id] = streets);
}
export function buscarLocalidad(texto) {
  const n = norm(texto); if (!n) return null;
  let l = LOCS.find(x => norm(x.name) === n) || LOCS.find(x => norm(x.raw.n) === n);
  if (l) return l;
  if (BARRIOS.some(b => norm(b.name) === n)) return CAPITAL;       // un barrio de Córdoba Capital
  if (/^(cordoba|cba|cordoba capital|capital)$/.test(n)) return CAPITAL;
  return LOCS.find(x => norm(x.name).startsWith(n) && n.length >= 4) || null;
}
export function parseDireccion(texto) {
  let t = String(texto || '').split(/\s+(?:esq\.?|esquina|entre|casi|e\/)\s+/i)[0];
  const partes = t.split(',').map(s => s.trim()).filter(Boolean);
  let calle = partes[0] || '', num = null;
  const m = calle.match(/^(.*?[a-zñáéíóúü.].*?)\s+(?:n(?:ro|°|º)?\.?\s*)?(\d{1,5})\s*(?:bis|[a-z])?$/i);
  if (m) { calle = m[1].trim(); num = parseInt(m[2], 10); }
  return { calle, num, locTexto: partes.slice(1).join(' ') };
}
export function geocodificar(texto, locTexto) {
  const p = parseDireccion(texto);
  const loc = (p.locTexto && buscarLocalidad(p.locTexto)) || buscarLocalidad(locTexto) || CAPITAL;
  const q = tokensCalle(p.calle); if (!q.length) return null;
  const etiquetaLoc = loc.name;
  // 1) Numeración oficial
  const streets = geoLoc(loc.id);
  if (streets) {
    let best = [], bs = -1;
    for (const st of streets) { const sc = puntajeCalle(q, st.toks); if (sc < 0) continue; if (sc > bs) { bs = sc; best = [st]; } else if (sc === bs) best.push(st); }
    if (best.length) {
      const nombre = prettyName(best[0].name);
      if (p.num != null) {
        let near = null, nd = Infinity;
        for (const st of best) for (const s of st.segs) {
          const lo = Math.min(s[0], s[1]), hi = Math.max(s[0], s[1]);
          if (p.num >= lo && p.num <= hi) {
            const t = s[1] === s[0] ? 0.5 : (p.num - s[0]) / (s[1] - s[0]);
            return { lat: s[2] + (s[4] - s[2]) * t, lng: s[3] + (s[5] - s[3]) * t, precision: 'exacta', etiqueta: `${nombre} ${p.num}, ${etiquetaLoc}`, loc };
          }
          const d = p.num < lo ? lo - p.num : p.num - hi; if (d < nd) { nd = d; near = s; }
        }
        if (near && nd <= 300) {
          const useA = Math.abs(p.num - near[0]) < Math.abs(p.num - near[1]);
          return { lat: useA ? near[2] : near[4], lng: useA ? near[3] : near[5], precision: 'aproximada', etiqueta: `${nombre} (cerca del ${p.num}), ${etiquetaLoc}`, loc };
        }
      }
      const all = best.flatMap(st => st.segs); const s = all[Math.floor(all.length / 2)];
      return { lat: (s[2] + s[4]) / 2, lng: (s[3] + s[5]) / 2, precision: 'calle', etiqueta: `${nombre}, ${etiquetaLoc}`, loc };
    }
  }
  // 2) Sin numeración: se ubica sobre la calle
  ensureLines(loc);
  let bni = -1, bs = -1;
  loc.raw.names.forEach((n, ni) => { if (!n || !loc.byName.has(ni)) return; const sc = puntajeCalle(q, tokensCalle(n)); if (sc > bs) { bs = sc; bni = ni; } });
  if (bni >= 0) {
    const chs = loc.byName.get(bni); const ch = chs[Math.floor(chs.length / 2)]; const k = Math.floor(ch.p.length / 4) * 2;
    const ll = L.CRS.EPSG3857.pointToLatLng(L.point(ch.p[k], ch.p[k + 1]), 0);
    return { lat: ll.lat, lng: ll.lng, precision: 'calle', etiqueta: `${labelText(loc, bni)}, ${etiquetaLoc}`, loc };
  }
  return null;
}
export async function geocodificarOnline(texto, locTexto) {
  const p = parseDireccion(texto); if (!p.calle || p.num == null) return null;
  const loc = (p.locTexto && buscarLocalidad(p.locTexto)) || buscarLocalidad(locTexto) || CAPITAL;
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 5000);
  try {
    const u = `https://apis.datos.gob.ar/georef/api/direcciones?direccion=${encodeURIComponent(p.calle + ' ' + p.num)}&provincia=14&localidad=${encodeURIComponent(loc.name)}&max=1`;
    const r = await fetch(u, { signal: ctrl.signal }); const j = await r.json();
    const d = j.direcciones && j.direcciones[0];
    if (d && d.ubicacion && d.ubicacion.lat != null) return { lat: d.ubicacion.lat, lng: d.ubicacion.lon, precision: 'exacta', etiqueta: `${d.nomenclatura || p.calle + ' ' + p.num}`, loc };
  } catch (e) {} finally { clearTimeout(to); }
  return null;
}
