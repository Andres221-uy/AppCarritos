import { carritos } from "../data.js";
import { openDetailPanel } from "./detailPanel.js";

export function renderCarritos() {

  const container = document.getElementById("carritoList");

  container.innerHTML = "";

  carritos.forEach(carrito => {

    const card = document.createElement("div");

    card.className = "carrito-card";

    card.innerHTML = `
      <h3>${carrito.nombre}</h3>
      <p>${carrito.barrio}</p>
      <span>${carrito.categoria}</span>
    `;

    card.addEventListener("click", () => {
      openDetailPanel(carrito);
    });

    container.appendChild(card);

  });
}