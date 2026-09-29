# Red de Atención — Córdoba

Mapa colaborativo de instituciones y líneas de ayuda de la Provincia de Córdoba
(judiciales, salud, niñez, organizaciones sociales, atención psicosocial).
Cualquier persona puede consultar y **agregar** lugares, números de urgencia y
categorías; lo que se carga se ve al instante para todas las personas.
Quien administra puede **editar y dar de baja**.

## Tecnologías

- **Vite + JavaScript (módulos ES)**: SPA sin framework.
- **Leaflet** + **leaflet.markercluster**: el mapa y los pines agrupados.
- **Tailwind CSS 3**: los estilos.
- **Supabase** (Postgres + RLS + Realtime + Auth): los datos compartidos.
- Cartografía de **OpenDataCordoba** (DGEyC / Municipalidad de Córdoba), en `public/data/`.
- Geocodificación offline con la numeración oficial de calles, más la API **Georef** (datos.gob.ar) como respaldo.

## Cómo correrlo

```bash
npm install
cp .env.example .env        # y completar con los datos del proyecto de Supabase
npm run dev                 # http://localhost:5173
npm run build               # genera dist/
```

### Variables de entorno

| Variable | Qué es |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto (Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Publishable key (es pública: la seguridad la dan las políticas RLS) |
| `VITE_MAP_TILES` | Opcional. `propia` (por defecto), `osm` o la URL de otro proveedor de tiles |

## Estructura

```
index.html                 Markup de la app (sin JS inline: usa data-accion / data-modal)
public/data/*.json         Cartografía de Córdoba (localidades, calles, barrios, numeración)
src/
  main.js                  Arranque y registro de acciones
  config.js                Configuración (proveedor del fondo del mapa)
  lib/supabase.js          Cliente de Supabase
  state/store.js           Estado en memoria (categorías, instituciones, urgencias, filtros)
  services/                ÚNICA capa que habla con la base
    datos.js               Carga completa + caché offline + cambios en tiempo real
    instituciones.js  urgencias.js  categorias.js  auth.js  errores.js
  map/
    geometry.js            Decodificación de polilíneas y proyección
    geodata.js             Carga de public/data y el índice espacial de calles
    baseLayer.js           Capa base propia dibujada en canvas
    mapa.js                Mapa, pines, clusters, "mi ubicación"
    leaflet.js             Leaflet como global (para el plugin de clusters)
  geo/geocoder.js          Dirección → coordenadas
  ui/                      Pantallas y modales (detalle, lugares, urgencias, categorías,
                           búsqueda, filtros, admin) y formularios (ui/forms/)
  utils/                   Texto, teléfonos
supabase/migrations/       Esquema, políticas RLS y datos iniciales (versionados)
scripts/extraer-artifact.mjs  Extrae la cartografía del prototipo original (se usó una vez)
```

**Cómo agregar algo nuevo:**
- Una tabla nueva lleva una migración en `supabase/migrations/`, un servicio en `src/services/` y su pantalla en `src/ui/`.
- Un botón nuevo lleva `data-accion="miAccion"` en el HTML y `registrarAcciones({ miAccion })` en `main.js`.

## Base de datos

| Tabla | Contenido |
|---|---|
| `categorias` | id (slug), nombre, emoji, color, orden, estado |
| `instituciones` | nombre, categoría, dirección, teléfono, horario, contacto, servicios, lat/lng, estado |
| `urgencias` | nombre, número, descripción, categoría, `es_fija` (líneas oficiales: 911, 144…), estilo, estado |
| `admins` | usuarios de Supabase Auth que pueden editar y dar de baja |
| `sync_version` | contador que avisa a los navegadores que hubo cambios (Realtime) |

**Seguridad (RLS):**
- Cualquiera puede **leer** lo activo y **agregar**. Lo nuevo entra siempre activo y nadie puede crear líneas "oficiales".
- Solo los usuarios que están en `admins` pueden **editar** o dar de **baja**.
- La baja es lógica (`estado = 'baja'`): la fila queda guardada y nadie puede borrarla desde la API.
- La base valida los largos de los textos, el formato de los números y que las coordenadas caigan dentro de la provincia.

### Crear un administrador

1. En Supabase: **Authentication → Users → Add user** (email y contraseña).
2. En el **SQL Editor**:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'tu-email@ejemplo.com';
   ```
3. En la página, entrar a `/#admin` (o usar "Acceso para administración", al pie de "¿Cómo pedir ayuda?").

## El mapa

- Por defecto usa una **capa propia** que se dibuja en el navegador con los datos de OpenDataCordoba: calles con nombre, avenidas, ríos, barrios y departamentos. No depende de ningún servidor externo ni tiene límites de uso.
- Con `VITE_MAP_TILES=osm` se usan los tiles de OpenStreetMap, con más detalle (comercios, edificios). Su política de uso permite tráfico liviano con atribución.
- Los basemaps de CARTO que usaba el prototipo hoy piden API key.

## Deploy (Vercel)

1. Subir el repo a GitHub e importarlo en Vercel. Detecta Vite solo: build `npm run build`, salida `dist`.
2. Cargar las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en *Settings → Environment Variables*.
3. `vercel.json` configura el caché de los archivos de `public/data/`.
