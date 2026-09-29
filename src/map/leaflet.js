// Leaflet como global: el plugin leaflet.markercluster se engancha a window.L.
// Este módulo se importa antes que el plugin para garantizar el orden.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';

window.L = window.L || L;
export default L;
