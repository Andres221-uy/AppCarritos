// ════════════════════════════════════════════════════════════
//  MENÚ DE USUARIO
// ════════════════════════════════════════════════════════════
function openUserMenu() {
  if (!currentUser) return;
  var profile = currentProfile || {};
  var role    = (currentUser.user_metadata && currentUser.user_metadata.role) || profile.role || 'cliente';
  var nombre  = (currentUser.user_metadata && currentUser.user_metadata.nombre) || profile.nombre || currentUser.email || currentUser.phone || 'Usuario';
  var sub     = currentUser.email || currentUser.phone || '';
  var initial = nombre.charAt(0).toUpperCase();

  document.getElementById('userMenuHeader').innerHTML =
    '<div class="user-menu-avatar">' + initial + '</div>'
    + '<div><div class="user-menu-name">' + nombre + '</div>'
    + '<div class="user-menu-email">' + sub + '</div>'
    + '<span class="user-menu-role ' + (role === 'dueno' ? 'role-dueno' : 'role-cliente') + '">'
    + (role === 'dueno' ? '🛒 Dueño de carrito' : '🙋 Cliente') + '</span></div>';

  var bodyHtml = '<div class="menu-section-title">General</div>';
  if (role === 'dueno') {
    bodyHtml += '<div class="menu-item-row" id="menuDashboard"><span class="menu-item-icon">🛒</span><span class="menu-item-label">Mi carrito</span><span class="menu-item-arrow">›</span></div>';
  }
  bodyHtml +=
    '<div class="menu-item-row" id="menuFavoritos"><span class="menu-item-icon">❤️</span><span class="menu-item-label">Mis favoritos</span><span class="menu-item-arrow">›</span></div>'
    + '<div class="menu-item-row" id="menuAlertas"><span class="menu-item-icon">🔔</span><span class="menu-item-label">Mis alertas</span><span class="menu-item-arrow">›</span></div>'
    + '<div class="menu-item-row" id="menuHistorial"><span class="menu-item-icon">🎫</span><span class="menu-item-label">Historial de visitas</span><span class="menu-item-arrow">›</span></div>'
    + '<div class="menu-item-row" id="menuNovedades"><span class="menu-item-icon">📣</span><span class="menu-item-label">Novedades</span><span class="menu-item-arrow">›</span></div>'
    + '<div class="menu-section-title">Cuenta</div>'
    + '<div class="menu-item-row" id="menuLogout"><span class="menu-item-icon">🚪</span><span class="menu-item-label danger">Cerrar sesión</span></div>';

  if (role === 'dueno') {
    bodyHtml +=
      '<div class="menu-section-title">Suscripción</div>'
      + '<div class="menu-item-row" id="menuPlanes"><span class="menu-item-icon">💎</span><span class="menu-item-label">Planes y suscripción</span><span class="menu-item-arrow">›</span></div>';
  }

  document.getElementById('userMenuBody').innerHTML = bodyHtml;

  if (role === 'dueno') {
    document.getElementById('menuDashboard').addEventListener('click', function() {
      document.getElementById('userMenu').classList.remove('open');
      openDashboard();
    });
    document.getElementById('menuPlanes').addEventListener('click', function() {
      document.getElementById('userMenu').classList.remove('open');
      openPlanesPanel();
    });
  }

  document.getElementById('menuFavoritos').addEventListener('click', function() {
    document.getElementById('userMenu').classList.remove('open');
    openFavPanel();
  });
  document.getElementById('menuAlertas').addEventListener('click', function() {
    document.getElementById('userMenu').classList.remove('open');
    openAlertPanel();
  });
  document.getElementById('menuHistorial').addEventListener('click', function() {
    document.getElementById('userMenu').classList.remove('open');
    openHistPanel();
  });
  document.getElementById('menuNovedades').addEventListener('click', function() {
    document.getElementById('userMenu').classList.remove('open');
    openNovedadesPanel();
  });
  document.getElementById('menuLogout').addEventListener('click', function() {
    sb.auth.signOut().then(function() {
      currentUser = null; currentProfile = null;
      updateHeaderAuth(null);
      document.getElementById('userMenu').classList.remove('open');
    });
  });

  document.getElementById('userMenu').classList.add('open');
}

document.getElementById('backUserMenu').addEventListener('click', function() {
  document.getElementById('userMenu').classList.remove('open');
});

// ════════════════════════════════════════════════════════════
//  PANEL FAVORITOS
// ════════════════════════════════════════════════════════════
function openFavPanel() {
  var body = document.getElementById('favBody');
  if (favs.length === 0) {
    body.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#bbb;"><div style="font-size:40px;margin-bottom:10px;">🤍</div><div style="font-size:14px;">No tenés favoritos todavía.<br>Tocá el ❤️ en un carrito para guardarlo.</div></div>';
  } else {
    body.innerHTML = favs.map(function(id) {
      var c = CARRITOS.find(function(x) { return x.id === id; });
      if (!c) return '';
      return '<div class="card" style="margin-bottom:8px;cursor:pointer;" onclick="openDetail(' + c.id + ')">'
        + '<div class="card-icon">' + c.emoji + '</div>'
        + '<div class="card-info">'
        + '<div class="card-name">' + c.nombre + '</div>'
        + '<div class="card-sub">' + c.tipo + ' · ' + c.barrio + '</div>'
        + '<div class="card-meta"><span class="badge ' + (c.estado === 'abierto' ? 'b-open' : 'b-closed') + '">'
        + (c.estado === 'abierto' ? '● Abierto' : '● Cerrado') + '</span>'
        + '<span class="stars">★ ' + c.rating + '</span></div></div>'
        + '<button class="fav-btn" style="position:static;width:28px;height:28px;margin-top:2px;" onclick="event.stopPropagation();toggleFav(' + c.id + ');openFavPanel();">❤️</button>'
        + '</div>';
    }).join('');
  }
  document.getElementById('favPanel').classList.add('open');
}
document.getElementById('backFav').addEventListener('click', function() { document.getElementById('favPanel').classList.remove('open'); });

// ════════════════════════════════════════════════════════════
//  PANEL ALERTAS
// ════════════════════════════════════════════════════════════
function openAlertPanel() {
  var body = document.getElementById('alertBody');
  body.innerHTML = '<p style="font-size:12px;color:#888;margin-bottom:14px;line-height:1.6;">Activá la alerta de un carrito y te notificamos cuando abra.</p>'
    + CARRITOS.map(function(c) {
      var checked = isAlerting(c.id);
      var uid = 'alt' + c.id;
      return '<div class="alert-card">'
        + '<div class="alert-card-icon">' + c.emoji + '</div>'
        + '<div class="alert-card-info">'
        + '<div class="alert-card-name">' + c.nombre + '</div>'
        + '<div class="alert-card-sub">' + c.barrio + ' · ' + (c.estado === 'abierto' ? '🟢 Abierto' : '🔴 Cerrado') + '</div>'
        + '</div>'
        + '<div class="alert-toggle">'
        + '<input type="checkbox" id="' + uid + '"' + (checked ? ' checked' : '') + '>'
        + '<label for="' + uid + '"></label>'
        + '</div></div>';
    }).join('');
  CARRITOS.forEach(function(c) {
    var chk = document.getElementById('alt' + c.id);
    if (chk) chk.addEventListener('change', function() { toggleAlert(c.id, c.nombre); });
  });
  document.getElementById('alertPanel').classList.add('open');
}
document.getElementById('backAlert').addEventListener('click', function() { document.getElementById('alertPanel').classList.remove('open'); });

// ════════════════════════════════════════════════════════════
//  PANEL HISTORIAL
// ════════════════════════════════════════════════════════════
function openHistPanel() {
  var body = document.getElementById('histBody');
  if (historial.length === 0) {
    body.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#bbb;"><div style="font-size:40px;margin-bottom:10px;">🎫</div><div style="font-size:14px;">Todavía no visitaste ningún carrito.</div></div>';
  } else {
    body.innerHTML = historial.map(function(h) {
      return '<div class="hist-entry">'
        + '<div class="hist-icon">' + h.emoji + '</div>'
        + '<div class="hist-info">'
        + '<div class="hist-name">' + h.nombre + '</div>'
        + '<div class="hist-date">Última visita: ' + h.fecha + '</div>'
        + '<div class="hist-count">' + h.count + ' ' + (h.count === 1 ? 'visita' : 'visitas') + '</div>'
        + '</div></div>';
    }).join('');
  }
  document.getElementById('histPanel').classList.add('open');
}
document.getElementById('backHist').addEventListener('click', function() { document.getElementById('histPanel').classList.remove('open'); });

// ════════════════════════════════════════════════════════════
//  PANEL FOTOS
// ════════════════════════════════════════════════════════════
var currentFotosCarrito = null;
function openFotosPanel(c) {
  currentFotosCarrito = c;
  document.getElementById('fotosPanelTitle').textContent = '📸 ' + c.nombre;
  renderFotosGrid(c.id);
  document.getElementById('fotosPanel').classList.add('open');
}
function renderFotosGrid(id) {
  var arr  = fotos[id] || [];
  var body = document.getElementById('fotosBody');
  var addBtn = '<div class="photo-add" id="photoAddBtn"><span>📷</span><span>Subir foto</span></div>';
  var cells  = arr.map(function(f) {
    return '<div class="photo-cell"><img src="' + f.src + '" alt="foto"/><div class="photo-user">' + f.user + '</div></div>';
  }).join('');
  body.innerHTML = '<div class="photos-grid">' + cells + addBtn + '</div>';
  if (arr.length === 0) {
    body.innerHTML += '<div style="text-align:center;padding:10px 20px 20px;color:#bbb;font-size:13px;">Aún no hay fotos. ¡Sé el primero!</div>';
  }
  document.getElementById('photoAddBtn').addEventListener('click', function() {
    document.getElementById('photoUploader').click();
  });
}
document.getElementById('photoUploader').addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file || !currentFotosCarrito) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var id   = currentFotosCarrito.id;
    var user = currentUser ? (currentUser.email || currentUser.phone || 'Vos').split('@')[0] : 'Anónimo';
    if (!fotos[id]) fotos[id] = [];
    fotos[id].unshift({ src: ev.target.result, user: user, fecha: new Date().toLocaleDateString('es-UY') });
    saveFotos();
    renderFotosGrid(id);
    showToast('Foto subida ✓');
  };
  reader.readAsDataURL(file);
  this.value = '';
});
document.getElementById('backFotos').addEventListener('click', function() { document.getElementById('fotosPanel').classList.remove('open'); });

// ════════════════════════════════════════════════════════════
//  PANEL NOVEDADES
// ════════════════════════════════════════════════════════════
function openNovedadesPanel() {
  var body = document.getElementById('novedadesBody');
  if (novedades.length === 0) {
    novedades = [
      { carritoId:1, emoji:'🥩', nombre:'El Chivito de Pancho', texto:'Hoy hay descuento del 20% en chivito al pan. Solo hasta las 20hs!', fecha:'Hace 2 horas', badge:'Descuento' },
      { carritoId:2, emoji:'🥞', nombre:'Tortas Fritas Doña Carmen', texto:'Esta semana abrimos también los lunes desde las 8am.', fecha:'Hace 1 dia', badge:'Novedad' },
      { carritoId:3, emoji:'🍕', nombre:'La Pizza del Gato', texto:'Nueva pizza de rucula y jamon serrano. Probala este finde.', fecha:'Hace 3 dias', badge:'Nuevo producto' },
    ];
    saveNovs();
  }
  body.innerHTML = novedades.map(function(n) {
    return '<div class="novedad-card">'
      + '<div class="novedad-header">'
      + '<div class="novedad-emoji">' + n.emoji + '</div>'
      + '<div class="novedad-meta">'
      + '<div class="novedad-carrito">' + n.nombre + '</div>'
      + '<div class="novedad-time">' + n.fecha + '</div>'
      + '</div></div>'
      + '<div class="novedad-text">' + n.texto + '</div>'
      + (n.badge ? '<div class="novedad-badge">' + n.badge + '</div>' : '')
      + '</div>';
  }).join('');
  document.getElementById('novedadesPanel').classList.add('open');
}
document.getElementById('backNovedades').addEventListener('click', function() { document.getElementById('novedadesPanel').classList.remove('open'); });
