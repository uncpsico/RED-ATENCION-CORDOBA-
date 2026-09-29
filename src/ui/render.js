/* ---------- redibujar todo lo que depende de los datos ---------- */
import { renderPins } from '../map/mapa.js';
import { renderFilters } from './filtros.js';
import { populateSelects, renderCategoriesManager } from './categorias.js';
import { renderUrgencias } from './urgencias.js';
import { renderLugares } from './lugares.js';
import { estaAbierto } from './modales.js';

export function renderTodo() {
  renderFilters(); populateSelects(); renderPins(); renderUrgencias();
  if (estaAbierto('modal-lugares')) renderLugares();
  if (estaAbierto('modal-categorias')) renderCategoriesManager();
}
