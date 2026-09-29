/* =====================================================================
   ESTADO DE LA APLICACIÓN
   Colecciones en memoria con el formato que usa la interfaz. Se modifican
   "en el lugar" (sin reasignar) para que todos los módulos vean lo mismo.
   ===================================================================== */
import { lsGet, lsSet, parseOr } from '../utils/texto.js';

export const CATEGORIES = {};   // { id: { label, emoji, color, glyph } }
export const institutions = []; // [{ id, name, category, address, phone, hours, contact, description, lat, lng }]
export const urgencias = [];    // [{ id, name, phone, tel, desc, category, fija, estilo, color }]
export const activeFilters = new Set();

export const estado = {
  useEmojis: true,
  instAbierta: null,   // institución abierta en el panel de detalle
  esAdmin: false,
  sync: 'cargando',    // 'cargando' | 'ok' | 'offline'
};

const GLYPHS_BASE = { judicial: '◈', salud: '◎', ninez: '◐', soccivil: '◌', psicosocial: '◇', otro: '◉' };
const GLYPHS = ['◈', '◎', '◐', '◌', '◇', '◉', '◆', '○', '◍', '◑'];
const OTRO = { label: 'Otro', emoji: '📍', color: '#9e9791', glyph: '◉' };

export const catDe = key => CATEGORIES[key] || CATEGORIES.otro || OTRO;

/** Reemplaza todos los datos (ya convertidos al formato interno). */
export function setDatos({ categorias, instituciones, lineas }) {
  for (const k of Object.keys(CATEGORIES)) delete CATEGORIES[k];
  categorias.forEach((c, i) => { CATEGORIES[c.id] = { label: c.label, emoji: c.emoji, color: c.color, glyph: GLYPHS_BASE[c.id] || GLYPHS[i % GLYPHS.length] }; });
  if (!CATEGORIES.otro) CATEGORIES.otro = { ...OTRO };
  const enCat = x => ({ ...x, category: CATEGORIES[x.category] ? x.category : 'otro' });
  institutions.splice(0, institutions.length, ...instituciones.map(enCat));
  urgencias.splice(0, urgencias.length, ...lineas.map(enCat));
  completarFiltros();
  guardarPreferencias();
}

/* ---------- filtros por categoría (se recuerdan en el navegador) ---------- */
let filtrosCargados = false;
function completarFiltros() {
  if (!filtrosCargados) {
    filtrosCargados = true;
    const f = parseOr(lsGet('redCba_filters'), null);
    if (Array.isArray(f)) f.forEach(k => activeFilters.add(k));
    else Object.keys(CATEGORIES).forEach(k => activeFilters.add(k));
  }
  // las categorías nuevas (que este navegador no conocía) aparecen activadas
  const known = new Set(parseOr(lsGet('redCba_knownCats'), []) || []);
  Object.keys(CATEGORIES).forEach(k => { if (!known.has(k)) activeFilters.add(k); });
}
export function guardarPreferencias() {
  lsSet('redCba_filters', JSON.stringify([...activeFilters]));
  lsSet('redCba_knownCats', JSON.stringify(Object.keys(CATEGORIES)));
}
