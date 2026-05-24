import { MAP_CONFIG } from "../config.js";
import { state } from "../state.js";
import { renderMarkers } from "./markers.js";

export function initMap() {

  state.map = L.map("map").setView(
    [MAP_CONFIG.lat, MAP_CONFIG.lng],
    MAP_CONFIG.zoom
  );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "© OpenStreetMap"
    }
  ).addTo(state.map);

  renderMarkers();
}