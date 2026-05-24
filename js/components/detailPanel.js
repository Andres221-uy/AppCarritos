export function openDetailPanel(carrito) {

  const panel = document.getElementById("detailPanel");

  panel.innerHTML = `
    <div class="panel-content">
      <h2>${carrito.nombre}</h2>

      <p>${carrito.barrio}</p>

      <p>${carrito.categoria}</p>
    </div>
  `;

  panel.classList.add("open");
}

export function closeDetailPanel() {

  const panel = document.getElementById("detailPanel");

  panel.classList.remove("open");
}