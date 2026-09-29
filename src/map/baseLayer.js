/* =====================================================================
   CAPA BASE PROPIA: dibuja calles, ríos, barrios y localidades
   en teselas de canvas (funciona sin servidores de mapas externos).
   Se usa mientras cargan los tiles de CARTO, o si no están disponibles.
   ===================================================================== */
import L from 'leaflet';
import { hit, T_WATER, T_RAIL, T_ST, T_AV } from './geometry.js';
import { LOCS, DEPS, BARRIOS, BARRIOS_BB, PROV_W, CAPITAL, LOCS_BY_AREA, queryChunks, labelText } from './geodata.js';

export const MAPFONT = '"Space Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif';
const measureCtx = document.createElement('canvas').getContext('2d');
const COL = { bg: '#f6f2eb', env: '#ede5d8', envHi: '#f1ebe1', barrio: '#e4dace', dept: '#d3c8b8', water: '#9fc2d4', rail: '#b4a99c', stCase: '#ddd3c5', st: '#ffffff', avCase: '#e2c48d', av: '#f7e3b5', text: '#4f4845', halo: 'rgba(255,255,255,0.92)' };

function stWidth(z) { return z <= 12 ? 0.6 : z === 13 ? 1.1 : z === 14 ? 2 : z === 15 ? 3.6 : z === 16 ? 6 : z === 17 ? 10 : 15; }
function avWidth(z) { return z <= 10 ? 0.8 : z === 11 ? 1.2 : z === 12 ? 1.8 : z === 13 ? 2.6 : z === 14 ? 3.6 : z === 15 ? 5.5 : z === 16 ? 8 : z === 17 ? 12 : 17; }

function tracePath(ctx, p, S, ox, oy, close) {
  ctx.moveTo(p[0] * S - ox, p[1] * S - oy);
  for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i] * S - ox, p[i + 1] * S - oy);
  if (close) ctx.closePath();
}
function strokeChunks(ctx, list, S, ox, oy, width, color, dash) {
  if (!list.length || width <= 0) return;
  ctx.beginPath(); for (const ch of list) tracePath(ctx, ch.p, S, ox, oy, false);
  ctx.lineWidth = width; ctx.strokeStyle = color; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
}

/* --- etiquetas de calles, calculadas por "metateselas" para que no se pisen --- */
const META = 512; export const labelCache = new Map();
function streetFont(z, t) { const s = z >= 17 ? 13 : z === 16 ? 12 : z === 15 ? 11 : 10.5; return `${t === T_AV ? 700 : 600} ${t === T_AV ? s + 0.5 : s}px ${MAPFONT}`; }
function circlesFor(lb) {
  const r = lb.h / 2 + 2, n = Math.max(1, Math.ceil(lb.w / (lb.h))); const cs = [];
  const ca = Math.cos(lb.a), sa = Math.sin(lb.a);
  for (let k = 0; k < n; k++) { const d = -lb.w / 2 + (k + 0.5) * (lb.w / n); cs.push([lb.x + ca * d, lb.y + sa * d, r]); }
  return cs;
}
function collides(cs, placed) {
  for (const c of cs) for (const pl of placed) for (const d of pl) { const dx = c[0] - d[0], dy = c[1] - d[1], rr = c[2] + d[2]; if (dx * dx + dy * dy < rr * rr) return true; }
  return false;
}
function metaLabels(z, mx, my) {
  const key = z + '/' + mx + '/' + my; if (labelCache.has(key)) return labelCache.get(key);
  const S = Math.pow(2, z); const pad = 220;
  const gx0 = mx * META, gy0 = my * META;
  const chunks = queryChunks((gx0 - pad) / S, (gy0 - pad) / S, (gx0 + META + pad) / S, (gy0 + META + pad) / S);
  const cands = [];
  for (const ch of chunks) {
    if (ch.ni < 0) continue;
    if (ch.t === T_ST && z < 15) continue;
    if (ch.t !== T_ST && ch.t !== T_AV) continue;
    const raw = ch.loc.raw.names[ch.ni]; if (!raw) continue;
    const text = labelText(ch.loc, ch.ni);
    measureCtx.font = streetFont(z, ch.t);
    const w = measureCtx.measureText(text).width, h = z >= 16 ? 13 : 12;
    const p = ch.p; let acc = 0; const spacing = z >= 17 ? 380 : 460;
    let next = spacing * 0.35;
    for (let i = 0; i < p.length - 2; i += 2) {
      const x0 = p[i] * S, y0 = p[i + 1] * S, x1 = p[i + 2] * S, y1 = p[i + 3] * S;
      const L = Math.hypot(x1 - x0, y1 - y0);
      if (L >= w + 18) {
        const mid = acc + L / 2;
        if (next <= acc + L) {
          const along = Math.min(Math.max(next - acc, w / 2 + 9), L - w / 2 - 9);
          let a = Math.atan2(y1 - y0, x1 - x0); if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI;
          const x = x0 + (x1 - x0) * along / L, y = y0 + (y1 - y0) * along / L;
          if (x >= gx0 && x < gx0 + META && y >= gy0 && y < gy0 + META)
            cands.push({ x, y, a, w, h, text, t: ch.t, pr: (ch.t === T_AV ? 1e6 : 0) + L });
          next = acc + along + spacing;
        }
      }
      acc += L;
    }
  }
  cands.sort((a, b) => b.pr - a.pr);
  const placed = [], out = [];
  for (const c of cands) {
    if (out.some(o => o.text === c.text && Math.hypot(o.x - c.x, o.y - c.y) < 300)) continue;
    const cs = circlesFor(c); if (collides(cs, placed)) continue; placed.push(cs); out.push(c);
  }
  if (labelCache.size > 600) labelCache.clear();
  labelCache.set(key, out); return out;
}

/* --- etiquetas de localidades, departamentos y barrios (globales por zoom) --- */
export const placeCache = new Map();
function locMinZoom(rank) { return rank < 5 ? 7 : rank < 16 ? 8 : rank < 45 ? 9 : rank < 110 ? 10 : 11; }
function placeLabels(z) {
  if (placeCache.has(z)) return placeCache.get(z);
  const S = Math.pow(2, z); const out = []; const boxes = [];
  const tryAdd = (x, y, text, font, color, size, italic) => {
    measureCtx.font = font; const w = measureCtx.measureText(text).width;
    const b = [x - w / 2 - 4, y - size / 2 - 3, x + w / 2 + 4, y + size / 2 + 3];
    for (const o of boxes) if (b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) return;
    boxes.push(b); out.push({ x, y, text, font, color, w, size });
  };
  if (z <= 13) {
    LOCS_BY_AREA.forEach((l, rank) => {
      if (z < locMinZoom(rank)) return;
      if (l === CAPITAL && z >= 12) return;
      if (z >= 12 && rank > 60 && z === 13) return;
      const big = rank < 5; const size = big ? (z >= 10 ? 15 : 13) : (z >= 11 ? 12.5 : 11.5);
      tryAdd(l.cen[0] * S, l.cen[1] * S, l.name, `700 ${size}px ${MAPFONT}`, '#433e3c', size);
    });
  }
  if (z >= 13 && z <= 14) {
    [...BARRIOS].sort((a, b) => b.area - a.area).forEach(b => {
      if (z === 13 && b.area < 0.6) return;
      tryAdd(b.c[0] * S, b.c[1] * S, b.name, `italic 500 ${z === 13 ? 11 : 11.5}px ${MAPFONT}`, '#9a8c7c', 11);
    });
  }
  if (z <= 9) DEPS.forEach(d => tryAdd(d.c[0] * S, d.c[1] * S, 'Depto. ' + d.name, `italic 500 11px ${MAPFONT}`, '#b1a591', 11));
  placeCache.set(z, out); return out;
}

function drawTile(ctx, coords, r) {
  const z = coords.z, S = Math.pow(2, z), ox = coords.x * 256, oy = coords.y * 256;
  ctx.scale(r, r);
  ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, 256, 256);
  const wx0 = ox / S, wy0 = oy / S, wx1 = (ox + 256) / S, wy1 = (oy + 256) / S;
  const padW = 24 / S;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // Manchas urbanas (envolventes)
  ctx.beginPath(); let anyEnv = false;
  for (const l of LOCS) { if (!hit(l.bb, wx0, wy0, wx1, wy1)) continue; for (const ring of l.env) { tracePath(ctx, ring, S, ox, oy, true); anyEnv = true; } }
  if (anyEnv) { ctx.fillStyle = z >= 13 ? COL.envHi : COL.env; ctx.fill(); }

  // Límites departamentales
  if (z <= 11) {
    ctx.beginPath(); for (const d of DEPS) for (const ring of d.rings) tracePath(ctx, ring, S, ox, oy, true);
    ctx.lineWidth = 1; ctx.strokeStyle = COL.dept; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
  }
  // Barrios de Córdoba Capital
  if (z >= 12 && hit(BARRIOS_BB, wx0, wy0, wx1, wy1)) {
    ctx.beginPath(); for (const b of BARRIOS) if (hit(b.bb, wx0, wy0, wx1, wy1)) for (const ring of b.rings) tracePath(ctx, ring, S, ox, oy, true);
    ctx.lineWidth = z >= 15 ? 1.5 : 1; ctx.strokeStyle = COL.barrio; ctx.stroke();
  }

  if (z >= 10) {
    const chunks = queryChunks(wx0 - padW, wy0 - padW, wx1 + padW, wy1 + padW);
    const water = [], rail = [], st = [], av = [];
    for (const ch of chunks) (ch.t === T_WATER ? water : ch.t === T_RAIL ? rail : ch.t === T_ST ? st : av).push(ch);
    strokeChunks(ctx, water, S, ox, oy, z < 13 ? 1.3 : z < 15 ? 2.5 : 4.5, COL.water);
    if (z >= 12) strokeChunks(ctx, rail, S, ox, oy, z >= 15 ? 2 : 1.3, COL.rail, [6, 4]);
    if (z >= 13) {
      const sw = stWidth(z), aw = avWidth(z);
      if (z >= 14) strokeChunks(ctx, st, S, ox, oy, sw + 1.6, COL.stCase);
      strokeChunks(ctx, av, S, ox, oy, aw + 1.8, COL.avCase);
      strokeChunks(ctx, st, S, ox, oy, sw, z === 13 ? '#e7dfd3' : COL.st);
      strokeChunks(ctx, av, S, ox, oy, aw, COL.av);
    } else if (z >= 11) {
      strokeChunks(ctx, av, S, ox, oy, avWidth(z), '#e9cf9c');
    }
    // Etiquetas de calles
    if (z >= 14) {
      const LP = 170; const mx0 = Math.floor((ox - LP) / META), mx1 = Math.floor((ox + 256 + LP) / META), my0 = Math.floor((oy - LP) / META), my1 = Math.floor((oy + 256 + LP) / META);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      for (let mx = mx0; mx <= mx1; mx++) for (let my = my0; my <= my1; my++) {
        for (const lb of metaLabels(z, mx, my)) {
          if (lb.x + lb.w < ox - 10 || lb.x - lb.w > ox + 266 || lb.y + lb.w < oy - 10 || lb.y - lb.w > oy + 266) continue;
          ctx.save(); ctx.translate(lb.x - ox, lb.y - oy); ctx.rotate(lb.a);
          ctx.font = streetFont(z, lb.t); ctx.lineWidth = 3.5; ctx.strokeStyle = COL.halo; ctx.strokeText(lb.text, 0, 0.5);
          ctx.fillStyle = lb.t === T_AV ? '#5b4a33' : COL.text; ctx.fillText(lb.text, 0, 0.5); ctx.restore();
        }
      }
    }
  }
  // Fuera de la provincia: gris apagado + borde provincial
  ctx.beginPath(); ctx.rect(0, 0, 256, 256); tracePath(ctx, PROV_W, S, ox, oy, true);
  ctx.fillStyle = '#e3ddd3'; ctx.fill('evenodd');
  ctx.beginPath(); tracePath(ctx, PROV_W, S, ox, oy, true); ctx.lineWidth = 2; ctx.strokeStyle = '#a8998a'; ctx.stroke();

  // Localidades / barrios / departamentos
  const places = placeLabels(z);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of places) {
    if (p.x + p.w < ox - 10 || p.x - p.w > ox + 266 || p.y < oy - 30 || p.y > oy + 286) continue;
    ctx.font = p.font; ctx.lineWidth = 4; ctx.strokeStyle = COL.halo; ctx.strokeText(p.text, p.x - ox, p.y - oy);
    ctx.fillStyle = p.color; ctx.fillText(p.text, p.x - ox, p.y - oy);
  }
}

export const CbaBaseLayer = L.GridLayer.extend({
  createTile(coords) {
    const c = document.createElement('canvas'); const r = Math.min(window.devicePixelRatio || 1, 2);
    c.width = c.height = 256 * r;
    try { drawTile(c.getContext('2d'), coords, r); } catch (e) { console.error(e); }
    return c;
  }
});
