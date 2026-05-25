// ════════════════════════════════════════════════════════════
//  DASHBOARD DUEÑO
// ════════════════════════════════════════════════════════════
var EMOJIS_DASHBOARD = ['🥩', '🥞', '🌭', '🍕', '🥙', '🥗', '🌮', '🥐', '🍔', '☕'];

function openDashboard() {
  var c = currentCarrito || CARRITOS[0];
  var isOpen = c.estado === 'abierto';
  var body = document.getElementById('dashboardBody');

  body.innerHTML =
    '<div class="dashboard-banner">'
    + '<div class="dashboard-banner-emoji" id="dbEmoji">' + c.emoji + '</div>'
    + '<div class="dashboard-banner-info">'
    + '<div class="dashboard-banner-name">' + c.nombre + '</div>'
    + '<div class="dashboard-banner-barrio">' + c.barrio + '</div>'
    + '</div></div>'

    + '<div class="status-toggle">'
    + '<div>'
    + '<div class="status-toggle-label">Estado del carrito</div>'
    + '<div style="font-size:12px;color:' + (isOpen ? '#1a6b3c' : '#c0392b') + ';" id="statusLabel">' + (isOpen ? '🟢 Abierto ahora' : '🔴 Cerrado') + '</div>'
    + '</div>'
    + '<button class="toggle-switch ' + (isOpen ? 'on' : 'off') + '" id="statusToggle"><div class="toggle-knob"></div></button>'
    + '</div>'

    + '<div class="edit-section">'
    + '<div class="edit-section-title">Información del carrito</div>'
    + '<div class="field"><label>Nombre del carrito</label><input type="text" id="dbNombre" value="' + c.nombre + '"/></div>'
    + '<div class="field"><label>Barrio / Ubicación</label><input type="text" id="dbBarrio" value="' + c.barrio + '"/></div>'
    + '<div class="field"><label>Especialidad</label><input type="text" id="dbEspecialidad" value="' + c.especialidad + '"/></div>'
    + '<div class="field"><label>Horario de atención</label><input type="text" id="dbHorario" value="' + c.horario + '"/></div>'
    + '<div class="field"><label>Teléfono de contacto</label><input type="tel" id="dbTelefono" value="' + c.telefono + '"/></div>'
    + '</div>'

    + '<div class="edit-section" style="border-top:1px solid #f0f0e8;">'
    + '<div class="edit-section-title">Icono del carrito</div>'
    + '<div class="emoji-picker" id="emojiPicker">'
    + EMOJIS_DASHBOARD.map(function (em) {
      return '<button class="emoji-opt' + (em === c.emoji ? ' selected' : '') + '" data-em="' + em + '">' + em + '</button>';
    }).join('')
    + '</div></div>'

    + '<div class="edit-section" style="border-top:1px solid #f0f0e8;">'
    + '<button class="edit-save-btn" id="dbSaveBtn">💾 Guardar cambios</button>'
    + '<div id="dbSaveMsg" class="auth-msg" style="margin-top:10px;"></div>'
    + '</div>';

  // Inyectar strip de plan al inicio
  var planStrip = document.createElement('div');
  planStrip.id = 'planStripDashboard';
  var plan = PLANES.find(function (p) { return p.id === planActual.id; }) || PLANES[0];
  planStrip.innerHTML = buildPlanStrip(plan);
  body.insertBefore(planStrip, body.firstChild);

  // Toggle estado
  var toggle = document.getElementById('statusToggle');
  var statusLabel = document.getElementById('statusLabel');
  toggle.addEventListener('click', function () {
    var nowOpen = toggle.classList.contains('off');
    toggle.classList.toggle('on', nowOpen);
    toggle.classList.toggle('off', !nowOpen);
    statusLabel.textContent = nowOpen ? '🟢 Abierto ahora' : '🔴 Cerrado';
    statusLabel.style.color = nowOpen ? '#1a6b3c' : '#c0392b';
    c.estado = nowOpen ? 'abierto' : 'cerrado';
    leafletMarkers[c.id].setIcon(markerIcon(c));
    leafletMarkers[c.id].setPopupContent(popupHtml(c));
    renderCards(getFiltered());
    setTimeout(function () { checkAlertTriggers(c.id, c.estado); }, 100);
    // TODO: sb.from('carritos').update({ estado: c.estado }).eq('id', c.id)
  });

  // Emoji picker
  document.getElementById('emojiPicker').addEventListener('click', function (e) {
    var btn = e.target.closest('.emoji-opt');
    if (!btn) return;
    document.querySelectorAll('.emoji-opt').forEach(function (b) { b.classList.remove('selected'); });
    btn.classList.add('selected');
    document.getElementById('dbEmoji').textContent = btn.dataset.em;
  });

  // Guardar info
  document.getElementById('dbSaveBtn').addEventListener('click', function () {
    var nombre = document.getElementById('dbNombre').value.trim();
    var barrio = document.getElementById('dbBarrio').value.trim();
    var emoji = (document.querySelector('.emoji-opt.selected') || {}).dataset || {};
    if (!nombre || !barrio) {
      var msg = document.getElementById('dbSaveMsg');
      msg.textContent = 'Completá al menos nombre y barrio.';
      msg.className = 'auth-msg error';
      return;
    }
    c.nombre = nombre;
    c.barrio = barrio;
    c.especialidad = document.getElementById('dbEspecialidad').value;
    c.horario = document.getElementById('dbHorario').value;
    c.telefono = document.getElementById('dbTelefono').value;
    if (emoji.em) c.emoji = emoji.em;
    leafletMarkers[c.id].setIcon(markerIcon(c));
    leafletMarkers[c.id].setPopupContent(popupHtml(c));
    renderCards(getFiltered());
    var msg = document.getElementById('dbSaveMsg');
    msg.textContent = '✓ Cambios guardados (conectá Supabase para persistirlos)';
    msg.className = 'auth-msg success';
    sb.from('carritos').update({ nombre, barrio, emoji: c.emoji}).eq('id', c.id)
  });

  // Agregar sección de tabs del dueño
  var tabSection = document.createElement('div');
  tabSection.style.cssText = 'border-top:2px solid #e8f5ee;margin-top:8px;';
  tabSection.innerHTML =
    '<div style="display:flex;overflow-x:auto;scrollbar-width:none;padding:0 16px;border-bottom:1px solid #e8e8e0;" id="dbTabs">'
    + '<div class="tab active" style="flex-shrink:0;" data-dbtab="stats">📊 Stats</div>'
    + '<div class="tab" style="flex-shrink:0;" data-dbtab="menu">📝 Menú</div>'
    + '<div class="tab" style="flex-shrink:0;" data-dbtab="responder">💬 Reseñas</div>'
    + '<div class="tab" style="flex-shrink:0;" data-dbtab="novs">📣 Novedades</div>'
    + '</div>'
    + '<div style="padding:14px 16px;" id="dbTabContent"></div>';
  body.appendChild(tabSection);

  document.getElementById('dbTabs').addEventListener('click', function (e) {
    var t = e.target.closest('[data-dbtab]');
    if (t) renderDbTab(t.dataset.dbtab, c);
  });
  renderDbTab('stats', c);

  document.getElementById('dashboardPanel').classList.add('open');
}

function renderDbTab(tab, c) {
  var content = document.getElementById('dbTabContent');
  document.querySelectorAll('[data-dbtab]').forEach(function (t) {
    t.classList.toggle('active', t.dataset.dbtab === tab);
  });

  if (tab === 'stats') {
    var views = Math.floor(Math.random() * 800) + 200;
    var clicks = Math.floor(Math.random() * 120) + 30;
    var h = historial.find(function (x) { return x.id === c.id; });
    var visitCount = h ? h.count : 0;
    content.innerHTML =
      '<div class="stats-grid">'
      + '<div class="stat-card"><div class="stat-card-val">' + views + '</div><div class="stat-card-label">Vistas del perfil este mes</div></div>'
      + '<div class="stat-card"><div class="stat-card-val">' + clicks + '</div><div class="stat-card-label">Clicks en "Cómo llegar"</div></div>'
      + '<div class="stat-card"><div class="stat-card-val">' + c.reviews + '</div><div class="stat-card-label">Reseñas totales</div></div>'
      + '<div class="stat-card"><div class="stat-card-val">' + c.rating + '</div><div class="stat-card-label">Calificación promedio</div></div>'
      + '</div>'
      + '<div class="stat-chart"><div class="stat-chart-title">Vistas por día (última semana)</div>'
      + '<div class="bar-chart" id="dbBarChart"></div>'
      + '<div style="display:flex;gap:4px;" id="dbBarLabels"></div></div>';

    var days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    var vals = days.map(function () { return Math.floor(Math.random() * 90) + 10; });
    var maxV = Math.max.apply(null, vals);
    var chart = document.getElementById('dbBarChart');
    var labels = document.getElementById('dbBarLabels');
    days.forEach(function (d, i) {
      var bar = document.createElement('div');
      bar.className = 'bar' + (i === 6 ? ' highlight' : '');
      bar.style.height = Math.round(vals[i] / maxV * 100) + '%';
      bar.style.flex = '1';
      chart.appendChild(bar);
      var lbl = document.createElement('div');
      lbl.className = 'bar-label';
      lbl.style.flex = '1';
      lbl.textContent = d;
      labels.appendChild(lbl);
    });

  } else if (tab === 'menu') {
    content.innerHTML = '<div id="menuEditList">'
      + c.menu.map(function (m, i) {
        return '<div class="menu-edit-item" id="medit' + i + '">'
          + '<button class="menu-edit-del" onclick="deleteMenuItem(' + i + ')">✕</button>'
          + '<div class="field" style="margin-bottom:8px;"><label>Nombre</label><input id="mnom' + i + '" value="' + m.nombre + '"/></div>'
          + '<div class="field" style="margin-bottom:8px;"><label>Descripción</label><textarea id="mdesc' + i + '" style="height:50px;">' + m.desc + '</textarea></div>'
          + '<div class="field" style="margin-bottom:0;"><label>Precio</label><input id="mprec' + i + '" value="' + m.precio + '"/></div>'
          + '</div>';
      }).join('')
      + '</div>'
      + '<button class="menu-add-btn" onclick="addMenuItem()">+ Agregar plato</button>'
      + '<button class="edit-save-btn" style="margin-top:10px;" onclick="saveMenuEdits()">💾 Guardar menú</button>'
      + '<div id="menuSaveMsg" class="auth-msg" style="margin-top:8px;"></div>';

  } else if (tab === 'responder') {
    content.innerHTML = '<div id="reseñasList">'
      + c.resenas.map(function (r, i) {
        var stars = ''; for (var s = 0; s < r.stars; s++) stars += '★';
        var replyHtml = r.respuesta
          ? '<div class="review-reply"><div class="review-reply-label">Respuesta del dueño</div>' + r.respuesta + '</div>'
          : '<button class="reply-btn" onclick="toggleReplyForm(' + i + ')">Responder ›</button>'
          + '<div class="reply-form" id="replyform' + i + '">'
          + '<textarea id="replytxt' + i + '" placeholder="Tu respuesta..."></textarea>'
          + '<button class="reply-submit" onclick="submitReply(' + i + ',currentCarrito)">Publicar</button>'
          + '</div>';
        return '<div class="review" id="rev' + i + '">'
          + '<div class="review-top"><span class="reviewer">' + r.user + '</span><span class="review-date">' + r.fecha + '</span></div>'
          + '<div class="review-stars">' + stars + '</div>'
          + '<div class="review-text">' + r.texto + '</div>'
          + replyHtml + '</div>';
      }).join('') + '</div>';

  } else if (tab === 'novs') {
    var myNovs = novedades.filter(function (n) { return n.carritoId === c.id; });
    content.innerHTML =
      '<div class="novedad-form hidden" id="novForm">'
      + '<div class="field" style="margin-bottom:8px;"><label>Mensaje</label>'
      + '<textarea id="novTxt" placeholder="Ej: Hoy hay descuento en empanadas hasta las 20hs..." style="height:80px;"></textarea></div>'
      + '<div class="field" style="margin-bottom:8px;"><label>Etiqueta (opcional)</label>'
      + '<input id="novBadge" placeholder="Ej: Descuento, Nuevo producto"/></div>'
      + '<div style="display:flex;gap:8px;">'
      + '<button class="edit-save-btn" style="margin-top:0;" onclick="publishNovedad()">📣 Publicar</button>'
      + '<button style="flex:0 0 80px;padding:13px;border-radius:12px;border:1px solid #ddd;background:#fff;font-size:13px;cursor:pointer;" onclick="document.getElementById(\'novForm\').classList.add(\'hidden\')">Cancelar</button>'
      + '</div></div>'
      + '<button class="nueva-novedad-btn" onclick="document.getElementById(\'novForm\').classList.toggle(\'hidden\')">📣 Nueva novedad</button>'
      + '<div style="margin-top:14px;">'
      + (myNovs.length === 0
        ? '<p style="color:#bbb;font-size:13px;text-align:center;padding:20px 0;">Aún no publicaste novedades.</p>'
        : myNovs.map(function (n) {
          return '<div class="novedad-card">'
            + '<div class="novedad-text">' + n.texto + '</div>'
            + (n.badge ? '<div class="novedad-badge">' + n.badge + '</div>' : '')
            + '<div style="font-size:10px;color:#bbb;margin-top:5px;">' + n.fecha + '</div>'
            + '</div>';
        }).join(''))
      + '</div>';
  }
}

// Acciones globales del dashboard
window.deleteMenuItem = function (i) {
  if (confirm('¿Eliminar este plato?')) {
    var el = document.getElementById('medit' + i);
    if (el) el.remove();
  }
};
window.addMenuItem = function () {
  var list = document.getElementById('menuEditList');
  var i = list.children.length;
  var div = document.createElement('div');
  div.className = 'menu-edit-item';
  div.id = 'medit' + i;
  div.innerHTML = '<button class="menu-edit-del" onclick="deleteMenuItem(' + i + ')">✕</button>'
    + '<div class="field" style="margin-bottom:8px;"><label>Nombre</label><input id="mnom' + i + '" placeholder="Nombre del plato"/></div>'
    + '<div class="field" style="margin-bottom:8px;"><label>Descripción</label><textarea id="mdesc' + i + '" style="height:50px;" placeholder="Descripción..."></textarea></div>'
    + '<div class="field" style="margin-bottom:0;"><label>Precio</label><input id="mprec' + i + '" placeholder="$000"/></div>';
  list.appendChild(div);
};
window.saveMenuEdits = function () {
  var c = currentCarrito || CARRITOS[0];
  var items = document.querySelectorAll('.menu-edit-item');
  var newMenu = [];
  items.forEach(function (item) {
    var nom = item.querySelector('[id^="mnom"]');
    var desc = item.querySelector('[id^="mdesc"]');
    var prec = item.querySelector('[id^="mprec"]');
    if (nom && nom.value.trim()) {
      newMenu.push({ nombre: nom.value.trim(), desc: (desc ? desc.value : ''), precio: (prec ? prec.value : '') });
    }
  });
  c.menu = newMenu;
  var msg = document.getElementById('menuSaveMsg');
  msg.textContent = 'Menú guardado ✓ (conecta Supabase para persistir)';
  msg.className = 'auth-msg success';
  showToast('Menú actualizado ✓');
  // TODO: sb.from('menu_items').delete().eq('carrito_id', c.id).then(() => sb.from('menu_items').insert(newMenu))
};
window.toggleReplyForm = function (i) {
  var form = document.getElementById('replyform' + i);
  if (form) form.classList.toggle('open');
};
window.submitReply = function (i, c) {
  if (!c) return;
  var txt = document.getElementById('replytxt' + i).value.trim();
  if (!txt) { showToast('Escribí tu respuesta primero'); return; }
  c.resenas[i].respuesta = txt;
  var rev = document.getElementById('rev' + i);
  if (rev) {
    var btn = rev.querySelector('.reply-btn');
    var form = rev.querySelector('.reply-form');
    if (btn) btn.remove();
    if (form) form.remove();
    var replyDiv = document.createElement('div');
    replyDiv.className = 'review-reply';
    replyDiv.innerHTML = '<div class="review-reply-label">Respuesta del dueño</div>' + txt;
    rev.appendChild(replyDiv);
  }
  showToast('Respuesta publicada ✓');
  // TODO: sb.from('review_replies').insert({ review_id: ..., texto: txt })
};
window.publishNovedad = function () {
  var c = currentCarrito || CARRITOS[0];
  var txt = document.getElementById('novTxt').value.trim();
  var badge = document.getElementById('novBadge').value.trim();
  if (!txt) { showToast('Escribí el mensaje primero'); return; }
  var nov = { carritoId: c.id, emoji: c.emoji, nombre: c.nombre, texto: txt, fecha: 'Ahora mismo', badge: badge || null };
  novedades.unshift(nov);
  saveNovs();
  document.getElementById('novTxt').value = '';
  document.getElementById('novBadge').value = '';
  document.getElementById('novForm').classList.add('hidden');
  showToast('Novedad publicada ✓');
  // TODO: sb.from('novedades').insert({ carrito_id: c.id, texto: txt, badge })
};

document.getElementById('backDashboard').addEventListener('click', function () {
  document.getElementById('dashboardPanel').classList.remove('open');
});

// ── HELPERS ──
function buildPlanStrip(plan) {
  return '<div class="plan-current-strip">'
    + '<div class="plan-current-info">'
    + '<div class="plan-current-icon">' + plan.emoji + '</div>'
    + '<div><div class="plan-current-name">Plan ' + plan.nombre + '</div>'
    + (planActual.vence
      ? '<div class="plan-current-sub">Vence: ' + planActual.vence + '</div>'
      : '<div class="plan-current-sub">Plan gratuito</div>')
    + '</div></div>'
    + (planActual.id !== 'destacado'
      ? '<button class="plan-upgrade-btn' + (planActual.id === 'pro' ? ' gold' : '') + '" onclick="openPlanesPanel()">'
      + (planActual.id === 'gratis' ? '⬆️ Mejorar' : '🏆 Destacado') + '</button>'
      : '<span style="font-size:11px;color:#c07800;font-weight:700;">Plan máximo ✓</span>')
    + '</div>';
}
