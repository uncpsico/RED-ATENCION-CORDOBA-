/* =====================================================================
   CONFIGURACIÓN
   ===================================================================== */

/* Fondo del mapa (variable VITE_MAP_TILES):
   - 'propia' → solo la capa propia dibujada con los datos de OpenDataCordoba
                (sin servidores externos, sin límites de uso).
   - 'osm'    → tiles de OpenStreetMap (más detalle: comercios, edificios…).
                Uso liviano permitido con atribución: tile.openstreetmap.org
   - una URL  → cualquier otro proveedor con formato {z}/{x}/{y}
                (por ej. CARTO o Stadia, que hoy piden API key). */
const PROVEEDORES = {
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  },
};

const elegido = (import.meta.env.VITE_MAP_TILES || 'propia').trim();
export const TILES = elegido === 'propia' ? null
  : PROVEEDORES[elegido] || { url: elegido, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' };
