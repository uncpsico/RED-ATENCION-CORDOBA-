/* =====================================================================
   DATOS CARTOGRÁFICOS (calles, localidades, barrios, departamentos)
   Fuente: Dirección General de Estadística y Censos de Córdoba / Municipalidad
   de Córdoba, vía OpenDataCordoba. Codificados como polilíneas en public/data/.
   ===================================================================== */
import { makeDecoder, toWorld, bboxOf, hit, WX, WY } from './geometry.js';
import { prettyName } from '../utils/texto.js';

export let PROV_LL, PROV_W, DEPS, BARRIOS, BARRIOS_BB, LOCS, CAPITAL, LOCS_BY_AREA, GEO_DATA;

async function leer(nombre) {
  const r = await fetch(`${import.meta.env.BASE_URL}data/${nombre}.json`);
  if (!r.ok) throw new Error(`No se pudo cargar ${nombre}.json (${r.status})`);
  return r.json();
}

export async function cargarGeodata() {
  const [PROV_DATA, DEPS_DATA, BARR_DATA, GEO] = await Promise.all(['provincia', 'departamentos', 'barrios', 'geocoder'].map(leer));
  GEO_DATA = GEO;
  PROV_LL = makeDecoder()(DEPS_DATA.prov[0]);
  PROV_W = toWorld(PROV_LL);
  DEPS = DEPS_DATA.deps.map(d => { const dec = makeDecoder(); const rings = d.r.map(s => toWorld(dec(s))); return { name: prettyName(d.n), rings, c: [WX(d.c[0]), WY(d.c[1])] }; });
  BARRIOS = BARR_DATA.map(b => { const dec = makeDecoder(); const rings = b.r.map(s => toWorld(dec(s))); let bb = null; rings.forEach(r => { const x = bboxOf(r); bb = bb ? [Math.min(bb[0], x[0]), Math.min(bb[1], x[1]), Math.max(bb[2], x[2]), Math.max(bb[3], x[3])] : x; }); return { name: prettyName(b.n), rings, bb, c: [WX(b.c[0]), WY(b.c[1])], area: b.a }; });
  BARRIOS_BB = BARRIOS.reduce((a, b) => [Math.min(a[0], b.bb[0]), Math.min(a[1], b.bb[1]), Math.max(a[2], b.bb[2]), Math.max(a[3], b.bb[3])], [Infinity, Infinity, -Infinity, -Infinity]);
  LOCS = PROV_DATA.locs.map((l, i) => {
    const dec = makeDecoder();
    const env = l.env.map(s => toWorld(dec(s)));
    const bb = [WX(l.b[0]), WY(l.b[3]), WX(l.b[2]), WY(l.b[1])];
    return { i, id: l.id, name: prettyName(l.n), raw: l, bb, cen: [WX(l.c[0]), WY(l.c[1])], area: l.a, env, chunks: null, grid: null, byName: null };
  });
  CAPITAL = LOCS.find(l => l.id === 'cordoba');
  LOCS_BY_AREA = [...LOCS].sort((a, b) => b.area - a.area);
}

/* ---------- índice espacial de calles (se arma por localidad, al necesitarlo) ---------- */
const CELL = 0.004; // tamaño de celda del índice espacial (unidades mundo)
export function ensureLines(loc) {
  if (loc.chunks) return;
  const dec = makeDecoder(); const chunks = []; const grid = new Map(); const byName = new Map();
  for (const [t, ni, s] of loc.raw.L) {
    const p = toWorld(dec(s)); const npts = p.length / 2;
    for (let st = 0; st < npts - 1; st += 23) {
      const en = Math.min(npts, st + 24);
      const cp = p.subarray(st * 2, en * 2);
      const ch = { t, ni, loc, p: cp, bb: bboxOf(cp), q: 0 };
      chunks.push(ch);
      if (ni >= 0) { if (!byName.has(ni)) byName.set(ni, []); byName.get(ni).push(ch); }
      const x0 = Math.floor(ch.bb[0] / CELL), x1 = Math.floor(ch.bb[2] / CELL), y0 = Math.floor(ch.bb[1] / CELL), y1 = Math.floor(ch.bb[3] / CELL);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const k = x * 100000 + y; let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(ch); }
    }
  }
  loc.chunks = chunks; loc.grid = grid; loc.byName = byName;
}
let QSTAMP = 1;
export function queryChunks(x0, y0, x1, y1) {
  const q = ++QSTAMP; const res = [];
  for (const loc of LOCS) {
    if (!hit(loc.bb, x0, y0, x1, y1)) continue;
    ensureLines(loc);
    const cx0 = Math.floor(x0 / CELL), cx1 = Math.floor(x1 / CELL), cy0 = Math.floor(y0 / CELL), cy1 = Math.floor(y1 / CELL);
    for (let x = cx0; x <= cx1; x++) for (let y = cy0; y <= cy1; y++) {
      const a = loc.grid.get(x * 100000 + y); if (!a) continue;
      for (const ch of a) { if (ch.q === q) continue; ch.q = q; if (hit(ch.bb, x0, y0, x1, y1)) res.push(ch); }
    }
  }
  return res;
}

const labelTextCache = new Map();
export function labelText(loc, ni) { const k = loc.i * 100000 + ni; let t = labelTextCache.get(k); if (!t) { t = prettyName(loc.raw.names[ni]); labelTextCache.set(k, t); } return t; }
