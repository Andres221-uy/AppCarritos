// ════════════════════════════════════════════════════════════
//  MAPA (Leaflet)
// ════════════════════════════════════════════════════════════
var map = L.map('map', { center: [-32.8, -56.2], zoom: 7, zoomControl: false });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19
}).addTo(map);
L.control.zoom({ position: 'topright' }).addTo(map);

function markerIcon(c) {
  return L.divIcon({
    className: '',
    html: '<div class="cm' + (c.estado === 'cerrado' ? ' closed' : '') + '">'
        + c.emoji + ' ' + c.nombre.split(' ').slice(0, 2).join(' ') + '</div>',
    iconAnchor: [0, 12]
  });
}

function popupHtml(c) {
  var dist = userLat !== null
    ? '<div class="popup-row">📍 ' + haversine(userLat, userLng, c.lat, c.lng).toFixed(1) + ' km de vos</div>'
    : '';
  return '<div class="popup-inner">'
    + '<div class="popup-head"><span class="popup-emoji">' + c.emoji + '</span>'
    + '<div><div class="popup-name">' + c.nombre + '</div><div class="popup-type">' + c.tipo + '</div></div></div>'
    + '<div class="popup-row">' + (c.estado === 'abierto' ? '🟢 Abierto ahora' : '🔴 Cerrado') + '</div>'
    + '<div class="popup-row">⏰ ' + c.horario + '</div>'
    + '<div class="popup-row">⭐ ' + c.rating + ' (' + c.reviews + ' reseñas)</div>'
    + dist
    + '<div class="popup-actions">'
    + '<button class="popup-btn popup-btn-primary" data-action="detail" data-id="' + c.id + '">Ver detalle</button>'
    + '<button class="popup-btn popup-btn-nav" data-action="nav" data-lat="' + c.lat + '" data-lng="' + c.lng + '" data-nombre="' + c.nombre + '">🧭 Ir</button>'
    + '</div></div>';
}

// Inicializar marcadores
CARRITOS.forEach(function(c) {
  var m = L.marker([c.lat, c.lng], { icon: markerIcon(c) }).addTo(map);
  m.bindPopup(popupHtml(c), { maxWidth: 260, closeButton: false });
  m.on('click', function() { highlightCard(c.id); });
  leafletMarkers[c.id] = m;
});

// Delegación de eventos en popups
document.getElementById('map').addEventListener('click', function(e) {
  var btn = e.target.closest('[data-action]');
  if (!btn) return;
  var action = btn.dataset.action;
  if (action === 'detail') { openDetail(parseInt(btn.dataset.id, 10)); }
  if (action === 'nav')    { showNavPanel(parseFloat(btn.dataset.lat), parseFloat(btn.dataset.lng), btn.dataset.nombre); }
});

// ── NAVEGACIÓN ──
window.showNavPanel = function(lat, lng, nombre) {
  map.closePopup();

  function drawRoute() {
    if (navPolyline) map.removeLayer(navPolyline);
    navPolyline = L.polyline([[userLat, userLng], [lat, lng]], {
      color: '#1a6b3c', weight: 4, opacity: .85, dashArray: '8 6'
    }).addTo(map);
    map.fitBounds([[userLat, userLng], [lat, lng]], { padding: [40, 40] });

    var km      = haversine(userLat, userLng, lat, lng);
    var walkMin = Math.round(km / 0.083);
    var carMin  = Math.round(km / 0.5);

    document.getElementById('navPanelDest').textContent   = '📍 ' + nombre;
    document.getElementById('navDist').textContent        = km < 1 ? Math.round(km * 1000) + 'm' : km.toFixed(1) + 'km';
    document.getElementById('navTime').textContent        = walkMin < 60 ? walkMin + 'min' : Math.floor(walkMin/60) + 'h ' + walkMin%60 + 'm';
    document.getElementById('navTimeCar').textContent     = carMin < 60 ? carMin + 'min' : Math.floor(carMin/60) + 'h ' + carMin%60 + 'm';
    document.getElementById('navBtnGMaps').onclick        = function() { navGoogleMaps(lat, lng); };
    document.getElementById('navBtnWaze').onclick         = function() { navWaze(lat, lng); };
    document.getElementById('navBtnOSM').onclick          = function() { navOSM(lat, lng); };
    document.getElementById('navPanel').classList.add('open');
  }

  if (userLat !== null) { drawRoute(); return; }
  if (!navigator.geolocation) { alert('Tu navegador no soporta geolocalización.'); return; }
  navigator.geolocation.getCurrentPosition(function(pos) {
    userLat = pos.coords.latitude; userLng = pos.coords.longitude;
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([userLat, userLng], {
      icon: L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconAnchor: [7, 7] })
    }).addTo(map);
    CARRITOS.forEach(function(c) { leafletMarkers[c.id].setPopupContent(popupHtml(c)); });
    drawRoute();
  }, function() { alert('No se pudo obtener tu ubicación.'); });
};

document.getElementById('navPanelClose').addEventListener('click', function() {
  document.getElementById('navPanel').classList.remove('open');
  if (navPolyline) { map.removeLayer(navPolyline); navPolyline = null; }
});

// ── APPS EXTERNAS ──
window.navGoogleMaps = function(lat, lng) {
  var url = userLat !== null
    ? 'https://www.google.com/maps/dir/?api=1&origin=' + userLat + ',' + userLng + '&destination=' + lat + ',' + lng + '&travelmode=walking'
    : 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng;
  window.open(url, '_blank');
};
window.navOSM = function(lat, lng) {
  var url = userLat !== null
    ? 'https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=' + userLat + ',' + userLng + ';' + lat + ',' + lng
    : 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lng + '#map=17/' + lat + '/' + lng;
  window.open(url, '_blank');
};
window.navWaze = function(lat, lng) {
  window.open('https://waze.com/ul?ll=' + lat + ',' + lng + '&navigate=yes', '_blank');
};

// ── GEOLOCALIZACIÓN ──
document.getElementById('geoBtn').addEventListener('click', function() {
  if (!navigator.geolocation) { alert('Tu navegador no soporta geolocalización.'); return; }
  navigator.geolocation.getCurrentPosition(function(pos) {
    userLat = pos.coords.latitude; userLng = pos.coords.longitude;
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([userLat, userLng], {
      icon: L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconAnchor: [7, 7] })
    }).addTo(map).bindPopup('📍 Estás aquí').openPopup();
    map.flyTo([userLat, userLng], 14, { duration: 1.2 });
    CARRITOS.forEach(function(c) { leafletMarkers[c.id].setPopupContent(popupHtml(c)); });
    var sorted = CARRITOS.slice().sort(function(a, b) {
      return haversine(userLat, userLng, a.lat, a.lng) - haversine(userLat, userLng, b.lat, b.lng);
    });
    renderCards(sorted);
    document.getElementById('listTitle').textContent = 'Carritos más cercanos a vos';
  }, function() { alert('No se pudo obtener tu ubicación.'); });
});
