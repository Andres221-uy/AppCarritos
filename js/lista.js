// ════════════════════════════════════════════════════════════
//  LISTA DE CARRITOS
// ════════════════════════════════════════════════════════════
function getFiltered() {
  var q = document.getElementById('searchInput').value.toLowerCase();
  return CARRITOS.filter(function(c) {
    var okF = activeFilter === 'Todos' || c.cats.indexOf(activeFilter) > -1;
    var okS = !q || c.nombre.toLowerCase().indexOf(q) > -1
                 || c.barrio.toLowerCase().indexOf(q) > -1
                 || c.tipo.toLowerCase().indexOf(q) > -1;
    return okF && okS;
  });
}

function renderCards(list) {
  document.getElementById('listTitle').textContent = list.length + (list.length === 1 ? ' carrito encontrado' : ' carritos encontrados');
  document.getElementById('carritoList').innerHTML = list.map(function(c) {
    var dist = userLat !== null
      ? '<span class="badge b-dist">📍 ' + haversine(userLat, userLng, c.lat, c.lng).toFixed(1) + ' km</span>'
      : '';
    return '<div class="card" id="card-' + c.id + '" onclick="focusCarrito(' + c.id + ')">'
      + '<div class="card-icon">' + c.emoji + '</div>'
      + '<div class="card-info">'
      + '<div class="card-name">' + c.nombre + '</div>'
      + '<div class="card-sub">' + c.tipo + ' · ' + c.barrio + '</div>'
      + '<div class="card-meta">'
      + '<span class="badge ' + (c.estado === 'abierto' ? 'b-open' : 'b-closed') + '">'
      + (c.estado === 'abierto' ? '● Abierto' : '● Cerrado') + '</span>'
      + '<span class="stars">★ ' + c.rating + '</span>'
      + '<span class="rcount">(' + c.reviews + ')</span>'
      + dist + '</div></div></div>';
  }).join('');

  // Agregar botón favorito a cada card
  list.forEach(function(c) {
    var card = document.getElementById('card-' + c.id);
    if (!card) return;
    var btn = document.createElement('button');
    btn.className = 'fav-btn';
    btn.innerHTML = isFav(c.id) ? '❤️' : '🤍';
    btn.title = isFav(c.id) ? 'Quitar de favoritos' : 'Guardar';
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleFav(c.id);
      btn.innerHTML = isFav(c.id) ? '❤️' : '🤍';
    });
    card.style.paddingRight = '44px';
    card.appendChild(btn);
  });
}

function highlightCard(id) {
  document.querySelectorAll('.card').forEach(function(el) { el.classList.remove('highlighted'); });
  var card = document.getElementById('card-' + id);
  if (card) { card.classList.add('highlighted'); card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
}

window.focusCarrito = function(id) {
  var c = CARRITOS.find(function(x) { return x.id === id; });
  if (!c) return;
  map.flyTo([c.lat, c.lng], 15, { duration: 0.8 });
  setTimeout(function() { leafletMarkers[id].openPopup(); }, 850);
  highlightCard(id);
};

// ── FILTROS Y BÚSQUEDA ──
document.getElementById('filterBar').addEventListener('click', function(e) {
  var btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  activeFilter = btn.dataset.filter;
  renderCards(getFiltered());
});

document.getElementById('searchInput').addEventListener('input', function() {
  renderCards(getFiltered());
});
