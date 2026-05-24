// ════════════════════════════════════════════════════════════
//  ESTADO GLOBAL
// ════════════════════════════════════════════════════════════
var activeFilter  = 'Todos';
var userLat       = null;
var userLng       = null;
var userMarker    = null;
var leafletMarkers= {};
var currentCarrito= null;
var currentUser   = null;   // objeto de Supabase auth
var currentProfile= null;   // fila de la tabla profiles
var navPolyline   = null;
var otpTarget     = null;   // para flujo OTP teléfono

// ════════════════════════════════════════════════════════════
//  ALMACENAMIENTO LOCAL
//  TODO: reemplazar con sb.from(...) cuando tengas DB
// ════════════════════════════════════════════════════════════
var favs      = JSON.parse(localStorage.getItem('favs')  || '[]');
var alerts_   = JSON.parse(localStorage.getItem('alerts')|| '[]');
var historial = JSON.parse(localStorage.getItem('hist')  || '[]');
var fotos     = JSON.parse(localStorage.getItem('fotos') || '{}');
var novedades = JSON.parse(localStorage.getItem('novs')  || '[]');
var planActual= JSON.parse(localStorage.getItem('planActual') || '{"id":"gratis","nombre":"Gratis","emoji":"🆓","vence":null}');

function saveFavs()   { localStorage.setItem('favs',    JSON.stringify(favs)); }
function saveAlerts() { localStorage.setItem('alerts',  JSON.stringify(alerts_)); }
function saveHist()   { localStorage.setItem('hist',    JSON.stringify(historial)); }
function saveFotos()  { localStorage.setItem('fotos',   JSON.stringify(fotos)); }
function saveNovs()   { localStorage.setItem('novs',    JSON.stringify(novedades)); }
function savePlan(p)  { planActual = p; localStorage.setItem('planActual', JSON.stringify(p)); }

// ════════════════════════════════════════════════════════════
//  UTILIDADES
// ════════════════════════════════════════════════════════════
function haversine(la1, lo1, la2, lo2) {
  var R = 6371;
  var dLa = (la2 - la1) * Math.PI / 180;
  var dLo = (lo2 - lo1) * Math.PI / 180;
  var a = Math.sin(dLa/2)*Math.sin(dLa/2)
        + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)
          *Math.sin(dLo/2)*Math.sin(dLo/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function showLoader() { document.getElementById('loaderOverlay').classList.add('show'); }
function hideLoader() { document.getElementById('loaderOverlay').classList.remove('show'); }

function showToast(msg) {
  var t = document.getElementById('toastMsg');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toastMsg';
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);background:#111;color:#fff;padding:9px 18px;border-radius:20px;font-size:13px;font-weight:500;z-index:9999;opacity:0;transition:all .25s;pointer-events:none;white-space:nowrap;max-width:280px;text-align:center;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  setTimeout(function() { t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)'; }, 10);
  setTimeout(function() { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(20px)'; }, 2400);
}

// ── FAVORITOS ──
function isFav(id) { return favs.indexOf(id) > -1; }
function toggleFav(id) {
  if (isFav(id)) { favs = favs.filter(function(x) { return x !== id; }); }
  else { favs.push(id); showToast('Guardado en favoritos ❤️'); }
  saveFavs();
  renderCards(getFiltered());
}

// ── ALERTAS ──
function isAlerting(id) { return alerts_.indexOf(id) > -1; }
function toggleAlert(id, nombre) {
  if (isAlerting(id)) { alerts_ = alerts_.filter(function(x) { return x !== id; }); }
  else { alerts_.push(id); showToast('Te avisamos cuando ' + nombre + ' abra 🔔'); }
  saveAlerts();
}
function checkAlertTriggers(carritoId, nuevoEstado) {
  if (nuevoEstado === 'abierto' && isAlerting(carritoId)) {
    var c = CARRITOS.find(function(x) { return x.id === carritoId; });
    if (c) showToast('🔔 ' + c.nombre + ' acaba de abrir!');
  }
}

// ── HISTORIAL ──
function registerVisit(c) {
  var entry = historial.find(function(h) { return h.id === c.id; });
  if (entry) { entry.count++; entry.fecha = new Date().toLocaleDateString('es-UY'); }
  else { historial.unshift({ id:c.id, nombre:c.nombre, emoji:c.emoji, fecha:new Date().toLocaleDateString('es-UY'), count:1 }); }
  if (historial.length > 50) historial = historial.slice(0, 50);
  saveHist();
}
