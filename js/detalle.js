// ════════════════════════════════════════════════════════════
//  PANEL DE DETALLE
// ════════════════════════════════════════════════════════════
window.openDetail = function(id) {
  var c = CARRITOS.find(function(x) { return x.id === id; });
  if (!c) return;
  currentCarrito = c;
  registerVisit(c);

  document.getElementById('dHeaderName').textContent = c.nombre;
  document.getElementById('dHeaderSub').textContent  = c.barrio;
  document.getElementById('dBanner').textContent     = c.emoji;
  document.getElementById('dName').textContent       = c.nombre;
  document.getElementById('dLoc').innerHTML          = '📍 ' + c.barrio;
  document.getElementById('dBadges').innerHTML =
    '<span class="badge ' + (c.estado === 'abierto' ? 'b-open' : 'b-closed') + '">'
    + (c.estado === 'abierto' ? '● Abierto ahora' : '● Cerrado') + '</span>'
    + '<span class="badge" style="background:#fff8e8;color:#b35a00;">⭐ ' + c.rating + ' (' + c.reviews + ')</span>'
    + '<span class="badge" style="background:#f5f5f0;color:#555;">' + c.especialidad + '</span>';

  document.getElementById('pane-info').innerHTML =
    '<div class="info-row"><span class="info-label">⏰ Horario</span><span class="info-val">' + c.horario + '</span></div>'
    + '<div class="info-row"><span class="info-label">📞 Teléfono</span><span class="info-val"><a href="tel:' + c.telefono + '" style="color:#3366cc;text-decoration:none;">' + c.telefono + '</a></span></div>'
    + '<div class="info-row"><span class="info-label">⭐ Calificación</span><span class="info-val" style="color:#e67e22;">★ ' + c.rating + ' / 5</span></div>'
    + '<div class="info-row"><span class="info-label">🍽️ Especialidad</span><span class="info-val">' + c.especialidad + '</span></div>'
    + '<div class="info-row"><span class="info-label">📍 Estado</span><span class="info-val ' + (c.estado === 'abierto' ? 'val-open' : 'val-closed') + '">' + (c.estado === 'abierto' ? 'Abierto' : 'Cerrado') + '</span></div>';

  document.getElementById('pane-menu').innerHTML = c.menu.map(function(m) {
    return '<div class="menu-item"><div class="menu-name">' + m.nombre + '</div>'
      + '<div class="menu-desc">' + m.desc + '</div>'
      + '<div class="menu-price">' + m.precio + '</div></div>';
  }).join('');

  renderReviews(c);
  renderFotosEnDetalle(c);

  // Reset tabs
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.tab-pane').forEach(function(p) { p.classList.remove('active'); });
  document.querySelector('.tab[data-tab="info"]').classList.add('active');
  document.getElementById('pane-info').classList.add('active');

  document.getElementById('btnNavWalk').onclick = function() {
    document.getElementById('detailPanel').classList.remove('open');
    showNavPanel(c.lat, c.lng, c.nombre);
  };
  document.getElementById('btnGMaps').onclick = function() { navGoogleMaps(c.lat, c.lng); };
  document.getElementById('btnWaze').onclick   = function() { navWaze(c.lat, c.lng); };

  document.getElementById('detailPanel').classList.add('open');
};

function renderReviews(c) {
  var rating = c.rating;
  var filled = Math.round(rating);
  var starsHtml = '';
  for (var i = 0; i < 5; i++) starsHtml += i < filled ? '★' : '☆';

  var writeBtn = currentUser
    ? '<div style="margin-top:14px;">'
      + '<div class="edit-section-title">Tu reseña</div>'
      + '<div class="star-selector" id="starSelector">'
      + '<span class="star-opt" data-v="1">★</span><span class="star-opt" data-v="2">★</span>'
      + '<span class="star-opt" data-v="3">★</span><span class="star-opt" data-v="4">★</span>'
      + '<span class="star-opt" data-v="5">★</span>'
      + '</div>'
      + '<div class="field"><textarea id="reviewText" placeholder="Contá tu experiencia…"></textarea></div>'
      + '<button class="edit-save-btn" id="submitReviewBtn">Publicar reseña</button>'
      + '</div>'
    : '<button class="write-review-btn" onclick="openAuthScreen()">✏️ Iniciá sesión para dejar una reseña</button>';

  document.getElementById('pane-resenas').innerHTML =
    '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:#f9f9f6;border-radius:12px;margin-bottom:12px;">'
    + '<div style="font-size:30px;font-weight:700;color:#111;">' + rating + '</div>'
    + '<div><div style="color:#e67e22;font-size:18px;">' + starsHtml + '</div>'
    + '<div style="font-size:12px;color:#aaa;">' + c.reviews + ' reseñas</div></div></div>'
    + c.resenas.map(function(r) {
      var rs = ''; for (var i = 0; i < r.stars; i++) rs += '★';
      return '<div class="review"><div class="review-top"><span class="reviewer">' + r.user + '</span><span class="review-date">' + r.fecha + '</span></div>'
        + '<div class="review-stars">' + rs + '</div>'
        + '<div class="review-text">' + r.texto + '</div></div>';
    }).join('')
    + writeBtn;

  if (currentUser) {
    var selectedStars = 0;
    document.getElementById('pane-resenas').addEventListener('click', function(e) {
      var star = e.target.closest('.star-opt');
      if (!star) return;
      selectedStars = parseInt(star.dataset.v, 10);
      document.querySelectorAll('.star-opt').forEach(function(s) {
        s.classList.toggle('filled', parseInt(s.dataset.v, 10) <= selectedStars);
      });
    });
    document.getElementById('submitReviewBtn').addEventListener('click', function() {
      var txt = document.getElementById('reviewText').value.trim();
      if (!selectedStars) { alert('Elegí una calificación (★)'); return; }
      if (!txt) { alert('Escribí algo en tu reseña'); return; }
      // TODO: 
      sb.from('reviews').insert({ carrito_id: c.id, user_id: currentUser.id, stars: selectedStars, texto: txt })
      alert('¡Reseña publicada! (conectá Supabase para guardarla de verdad)');
    });
  }
}

function renderFotosEnDetalle(c) {
  // Agregar tab de fotos si no existe
  var tabs = document.getElementById('detailTabs');
  if (!tabs.querySelector('[data-tab="fotos"]')) {
    var fotoTab = document.createElement('div');
    fotoTab.className = 'tab';
    fotoTab.dataset.tab = 'fotos';
    fotoTab.textContent = 'Fotos';
    tabs.appendChild(fotoTab);
    var fotoPane = document.createElement('div');
    fotoPane.className = 'tab-pane';
    fotoPane.id = 'pane-fotos';
    fotoPane.style.padding = '0';
    document.querySelector('.tab-body').appendChild(fotoPane);
  }
  var arr  = fotos[c.id] || [];
  var pane = document.getElementById('pane-fotos');
  if (arr.length === 0) {
    pane.innerHTML = '<div style="text-align:center;padding:24px 16px;color:#bbb;">'
      + '<div style="font-size:32px;margin-bottom:8px;">📷</div>'
      + '<div style="font-size:13px;">Sin fotos aún</div>'
      + '<button style="margin-top:10px;padding:8px 18px;border-radius:20px;border:1px solid #ddd;background:#fff;font-size:12px;font-weight:600;color:#555;cursor:pointer;" onclick="openFotosPanel(currentCarrito)">Agregar foto</button>'
      + '</div>';
  } else {
    pane.innerHTML = '<div class="photos-grid">'
      + arr.slice(0, 4).map(function(f) {
        return '<div class="photo-cell"><img src="' + f.src + '" alt=""/><div class="photo-user">' + f.user + '</div></div>';
      }).join('') + '</div>'
      + '<div style="text-align:center;padding-bottom:12px;"><button style="padding:7px 18px;border-radius:20px;border:1px solid #ddd;background:#fff;font-size:12px;font-weight:600;color:#555;cursor:pointer;" onclick="openFotosPanel(currentCarrito)">Ver todas las fotos</button></div>';
  }
}

document.getElementById('backBtn').addEventListener('click', function() {
  document.getElementById('detailPanel').classList.remove('open');
});

document.getElementById('detailTabs').addEventListener('click', function(e) {
  var tab = e.target.closest('.tab');
  if (!tab) return;
  var target = tab.dataset.tab;
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.tab-pane').forEach(function(p) { p.classList.remove('active'); });
  tab.classList.add('active');
  document.getElementById('pane-' + target).classList.add('active');
});
