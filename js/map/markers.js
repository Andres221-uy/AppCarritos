import { state } from "../state.js";
import { carritos } from "../data.js";
import { openDetailPanel } from "../components/detailPanel.js";

export function renderMarkers() {

  carritos.forEach(carrito => {

    const marker = L.marker([
      carrito.lat,
      carrito.lng
    ]).addTo(state.map);

    marker.on("click", () => {
      openDetailPanel(carrito);
    });

    state.markers.push(marker);

  });
}