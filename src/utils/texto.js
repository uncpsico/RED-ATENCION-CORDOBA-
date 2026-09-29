/* ---------- nombres legibles ---------- */
const ABBR = { AV: 'Av.', BV: 'Bv.', PJE: 'Pje.', GRL: 'Gral.', GRAL: 'Gral.', GDOR: 'Gdor.', DR: 'Dr.', DRA: 'Dra.', PTE: 'Pte.', CNEL: 'Cnel.', TTE: 'Tte.', STA: 'Sta.', STO: 'Sto.', ING: 'Ing.', PBRO: 'Pbro.', CAP: 'Cap.', SGTO: 'Sgto.', MSTRO: 'Mtro.', PROF: 'Prof.', MONS: 'Mons.', CDTE: 'Cdte.', ALTE: 'Alte.', CALLE: 'Calle' };
const ACC = { COLON:'Colón', VELEZ:'Vélez', NUNEZ:'Núñez', PERON:'Perón', SUQUIA:'Suquía', CORDOBA:'Córdoba', RIOS:'Ríos', RIO:'Río', MARTIN:'Martín', JOSE:'José', MARIA:'María', GUEMES:'Güemes', DEAN:'Deán', GARCIA:'García', GONZALEZ:'González', FERNANDEZ:'Fernández', LOPEZ:'López', RODRIGUEZ:'Rodríguez', MARTINEZ:'Martínez', PEREZ:'Pérez', GOMEZ:'Gómez', DIAZ:'Díaz', SANCHEZ:'Sánchez', RAMON:'Ramón', JULIAN:'Julián', SEBASTIAN:'Sebastián', AGUSTIN:'Agustín', CONCEPCION:'Concepción', CONSTITUCION:'Constitución', REPUBLICA:'República', AMERICA:'América', BOLIVAR:'Bolívar', TUCUMAN:'Tucumán', MAIPU:'Maipú', NEUQUEN:'Neuquén', ITUZAINGO:'Ituzaingó', CIRCUNVALACION:'Circunvalación', JAPON:'Japón', ALVAREZ:'Álvarez', ANGEL:'Ángel', ANDRES:'Andrés', NICOLAS:'Nicolás', TOMAS:'Tomás', LUCIA:'Lucía', INES:'Inés', TERESA:'Teresa', PAMPA:'Pampa', PAZ:'Paz', FATIMA:'Fátima', CARCANO:'Cárcano', JUAREZ:'Juárez', SAENZ:'Sáenz', HERNANDEZ:'Hernández', RAMIREZ:'Ramírez', JIMENEZ:'Jiménez', GUTIERREZ:'Gutiérrez', ALFEREZ:'Alférez', LEON:'León', BELEN:'Belén', ASUNCION:'Asunción', ESTACION:'Estación', UNION:'Unión', NACION:'Nación', LIBERTADOR:'Libertador', ARGUELLO:'Argüello', CANADA:'Cañada', PEÑA:'Peña', PENA:'Peña', ESPANA:'España', MUNIZ:'Muñiz', NINO:'Niño', MONSENOR:'Monseñor', SENOR:'Señor', CAÑADA:'Cañada', MAXIMO:'Máximo', FELIX:'Félix', HECTOR:'Héctor', OSCAR:'Óscar', VICTOR:'Víctor', CESAR:'César', RAUL:'Raúl', ARTIGAS:'Artigas', TRANSITO:'Tránsito', CATAMARCA:'Catamarca', MEXICO:'México', PERU:'Perú', PARANA:'Paraná', ROMAN:'Román', LUJAN:'Luján', AVILA:'Ávila', CRISTOBAL:'Cristóbal', GALVEZ:'Gálvez', SARMIENTO:'Sarmiento', ONCATIVO:'Oncativo', MARQUES:'Marqués', MONTANA:'Montaña', PANAMA:'Panamá', ALMIRON:'Almirón', ACUNA:'Acuña', SIMON:'Simón', PASCUAL:'Pascual', LAPRIDA:'Laprida', CALCHIN:'Calchín', SAN:'San', VIDELA:'Videla', JESUS:'Jesús', INMACULADA:'Inmaculada', TUPAC:'Túpac', MALAGUENO:'Malagueño', MALAGUEÑO:'Malagueño', QUINTO:'Quinto' };
const LOWER = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y', 'E']);
export function prettyName(raw) {
  if (!raw) return '';
  return raw.trim().split(/\s+/).map((w, i) => {
    const u = w.toUpperCase();
    if (ABBR[u]) return ABBR[u];
    if (ACC[u]) return ACC[u];
    if (i > 0 && LOWER.has(u)) return u.toLowerCase();
    if (/^[IVXL]+$/.test(u) && u.length <= 4) return u;
    if (/^\d/.test(u)) return u;
    return u.charAt(0) + u.slice(1).toLowerCase();
  }).join(' ');
}
export const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.\-]/g, ' ').replace(/\s+/g, ' ').trim();

/* ---------- html y formularios ---------- */
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const val = id => document.getElementById(id).value.trim();

/* ---------- almacenamiento local (solo preferencias y caché) ---------- */
export function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
export function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
export function parseOr(s, f) { try { const v = JSON.parse(s); return v ?? f; } catch (e) { return f; } }
