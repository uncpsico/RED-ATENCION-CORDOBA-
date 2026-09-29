/* ---------- utilidades de geometría ----------
   Las geometrías vienen codificadas como polilíneas (formato de Google, 1e5).
   Se pasan a "coordenadas mundo" de Web Mercator (0..256 en zoom 0). */
export function makeDecoder() {
  let lat = 0, lng = 0;
  return function (str) {
    const out = []; let i = 0; const n = str.length;
    while (i < n) {
      let b, shift = 0, res = 0;
      do { b = str.charCodeAt(i++) - 63; res |= (b & 31) << shift; shift += 5; } while (b >= 32);
      lat += (res & 1) ? ~(res >> 1) : (res >> 1);
      shift = 0; res = 0;
      do { b = str.charCodeAt(i++) - 63; res |= (b & 31) << shift; shift += 5; } while (b >= 32);
      lng += (res & 1) ? ~(res >> 1) : (res >> 1);
      out.push(lat / 1e5, lng / 1e5);
    }
    return out;
  };
}
const D2R = Math.PI / 180;
export const WX = lng => (lng + 180) / 360 * 256;
export const WY = lat => { const s = Math.sin(lat * D2R); return 128 - 256 / (4 * Math.PI) * Math.log((1 + s) / (1 - s)); };
export function toWorld(ll) { const p = new Float64Array(ll.length); for (let i = 0; i < ll.length; i += 2) { p[i] = WX(ll[i + 1]); p[i + 1] = WY(ll[i]); } return p; }
export function bboxOf(p) { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (let i = 0; i < p.length; i += 2) { if (p[i] < a) a = p[i]; if (p[i] > c) c = p[i]; if (p[i+1] < b) b = p[i+1]; if (p[i+1] > d) d = p[i+1]; } return [a, b, c, d]; }
export const hit = (b, x0, y0, x1, y1) => b[0] <= x1 && b[2] >= x0 && b[1] <= y1 && b[3] >= y0;

// Tipos de línea en los datos de calles
export const T_WATER = 0, T_RAIL = 1, T_ST = 2, T_AV = 3;
