// Extrae los datos cartográficos embebidos en el HTML del prototipo (artifact)
// y los guarda como JSON en public/data/. Se usa una sola vez, o cuando se
// actualicen los datos de OpenDataCordoba en el prototipo.
//
// Uso: node scripts/extraer-artifact.mjs ruta/al/artifact.html [carpeta-salida-extra]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , entrada, extra] = process.argv;
if (!entrada) {
  console.error('Uso: node scripts/extraer-artifact.mjs ruta/al/artifact.html [carpeta-salida-extra]');
  process.exit(1);
}

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const salidaDatos = join(raiz, 'public', 'data');
mkdirSync(salidaDatos, { recursive: true });

const lineas = readFileSync(entrada, 'utf8').split('\n');

const DATOS = {
  PROV_DATA: 'provincia.json',
  DEPS_DATA: 'departamentos.json',
  BARR_DATA: 'barrios.json',
  GEO_DATA: 'geocoder.json',
};

const usadas = new Set();
for (const [nombre, archivo] of Object.entries(DATOS)) {
  const i = lineas.findIndex(l => l.startsWith(`const ${nombre} = `));
  if (i < 0) throw new Error(`No se encontró ${nombre} en el HTML`);
  const json = lineas[i].slice(`const ${nombre} = `.length).replace(/;\s*$/, '');
  JSON.parse(json); // valida
  writeFileSync(join(salidaDatos, archivo), json);
  usadas.add(i);
  console.log(`✓ ${archivo} (${(json.length / 1024).toFixed(0)} KB)`);
}

// Opcional: vuelca markup, CSS propio y lógica para migrarlos a mano.
if (extra) {
  mkdirSync(extra, { recursive: true });
  const bodyIni = lineas.findIndex(l => l.startsWith('<body'));
  const scriptIni = lineas.findIndex((l, i) => i > bodyIni && l.trim() === '<script>');
  const scriptFin = lineas.findIndex((l, i) => i > scriptIni && l.trim() === '</script>');
  writeFileSync(join(extra, 'markup.html'), lineas.slice(bodyIni + 1, scriptIni).join('\n'));
  writeFileSync(join(extra, 'app.js'), lineas.slice(scriptIni + 1, scriptFin).filter((_, k) => !usadas.has(scriptIni + 1 + k)).join('\n'));
  console.log(`✓ markup.html y app.js en ${extra}`);
}
