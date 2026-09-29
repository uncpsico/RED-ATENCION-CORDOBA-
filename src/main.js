/* =====================================================================
   RED DE ATENCIÓN — CÓRDOBA
   Arranque: datos del mapa → mapa → datos de la red (Supabase) → interfaz
   ===================================================================== */
import './styles/main.css';
import './ui/llamadas.js';
import { cargarGeodata, LOCS } from './map/geodata.js';
import { initMap, renderPins } from './map/mapa.js';
import { institutions, estado, setDatos } from './state/store.js';
import { cargarTodo, datosEnCache, escucharCambios } from './services/datos.js';
import { esc } from './utils/texto.js';
import { registrarAcciones } from './ui/acciones.js';
import { toggleModal, alAbrirCerrar } from './ui/modales.js';
import { copiar } from './ui/llamadas.js';
import { renderTodo } from './ui/render.js';
import { toggleVisualMode } from './ui/filtros.js';
import { abrirDetalle, cerrarDetalle } from './ui/detalle.js';
import { openLugares, renderLugares, eliminarInstitucion } from './ui/lugares.js';
import { eliminarUrgencia, guardarUrgencia } from './ui/urgencias.js';
import { renderCategoriesManager, olvidarVolverA, guardarCategoria, eliminarCategoria, onCatSelect, elegirEmoji } from './ui/categorias.js';
import { initSearch } from './ui/busqueda.js';
import { initAdmin, abrirLogin, enviarLogin, salirAdmin } from './ui/admin.js';
import { textoCarga, ocultarCarga, errorCarga } from './ui/carga.js';
import { enviarForm, registrarEnvio } from './ui/forms/formulario.js';
import { openAgregar, openEditar, setAgregarTab, guardarInstitucion } from './ui/forms/institucion.js';
import { onDireccionInput, geoManual, startPick, cancelPick, estaEligiendo, alAbrirFormulario, alCerrarFormulario } from './ui/forms/ubicacion.js';

/* ---------- acciones que dispara el HTML ---------- */
registrarAcciones({
  toggleVisualMode, openLugares, renderLugares, openAgregar, openEditar, setAgregarTab,
  onDireccionInput, geoManual, startPick, cancelPick, onCatSelect, elegirEmoji,
  eliminarInstitucion, eliminarUrgencia, eliminarCategoria, cerrarDetalle, copiar,
  abrirLogin, salirAdmin,
  enviarForm: (_arg, btn) => enviarForm(btn),
  verLugar: id => { const inst = institutions.find(x => x.id === id); if (inst) abrirDetalle(inst); },
  editarActual: () => { if (estado.instAbierta) openEditar(estado.instAbierta.id); },
  eliminarActual: () => { if (estado.instAbierta) eliminarInstitucion(estado.instAbierta.id); },
  copiarLlamada: () => copiar(document.getElementById('llamar-link').dataset.tel),
  cerrarAviso: (_arg, el) => el.parentElement.classList.add('hidden'),
  recargarPagina: () => location.reload(),
});
registrarEnvio('guardarInstitucion', guardarInstitucion);
registrarEnvio('guardarUrgencia', guardarUrgencia);
registrarEnvio('guardarCategoria', guardarCategoria);
registrarEnvio('iniciarSesionAdmin', enviarLogin);

alAbrirCerrar('modal-agregar', { abrir: alAbrirFormulario, cerrar: alCerrarFormulario });
alAbrirCerrar('modal-categorias', { abrir: renderCategoriesManager, cerrar: olvidarVolverA });

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (estaEligiendo()) return cancelPick();
  const open = [...document.querySelectorAll('[id^="modal-"]')].filter(m => !m.classList.contains('hidden'));
  if (open.length) toggleModal(open[open.length - 1].id); else if (estado.instAbierta) cerrarDetalle();
});

/* ---------- datos de la red ---------- */
let firmaDatos = '';
function aplicar(datos) {
  const firma = JSON.stringify(datos);
  if (firma === firmaDatos) { renderPins(); return; }   // nada cambió: no redibujar
  firmaDatos = firma;
  setDatos(datos); renderTodo();
  // si había un lugar abierto, se refresca (o se cierra si lo eliminaron)
  if (estado.instAbierta) { const again = institutions.find(i => i.id === estado.instAbierta.id); if (again) abrirDetalle(again, true); else cerrarDetalle(); }
}

let recargando = null;
function recargar() {
  if (recargando) return recargando;
  recargando = cargarTodo()
    .then(d => { estado.sync = 'ok'; aplicar(d); })
    .catch(err => { console.warn('No se pudieron cargar los datos', err); estado.sync = 'offline'; renderPins(); })
    .finally(() => { recargando = null; });
  return recargando;
}

/* ---------- arranque ---------- */
const esperar = ms => new Promise(r => setTimeout(r, ms));

async function iniciar() {
  const primeraCarga = recargar();   // en paralelo con los datos del mapa
  try { await cargarGeodata(); }
  catch (e) { console.error(e); errorCarga('No se pudo cargar el mapa. Revisá tu conexión e intentá de nuevo.'); return; }
  textoCarga('Dibujando calles y barrios…');
  initMap();
  const cache = datosEnCache();
  if (cache && !firmaDatos) aplicar(cache);   // se muestra la última versión mientras llega la nueva
  else renderTodo();
  initSearch();
  document.getElementById('lista-localidades').innerHTML = [...LOCS].sort((a, b) => a.name.localeCompare(b.name, 'es')).map(l => `<option value="${esc(l.name)}">`).join('');
  initAdmin();
  // Se espera a los lugares de la red para que los pines aparezcan junto con el mapa,
  // pero sin trabar la página si la base tarda (en ese caso llegan después).
  if (!firmaDatos) textoCarga('Buscando los lugares de la red…');
  await Promise.race([primeraCarga, esperar(2500)]);
  ocultarCarga();
  await primeraCarga;
  renderPins();   // actualiza el contador ("sin conexión" si falló)
  escucharCambios(recargar);
}
iniciar();
