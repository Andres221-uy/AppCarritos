import { initMap } from "./map/map.js";
import { renderCarritos } from "./components/carritoCard.js";
import { initAuth } from "./auth/auth.js";
import { initFilters } from "./components/tabs.js";

window.addEventListener("DOMContentLoaded", () => {

  initMap();

  renderCarritos();

  initAuth();

  initFilters();

});