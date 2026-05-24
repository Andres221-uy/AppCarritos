// ════════════════════════════════════════════════════════════
//  PLANES Y MONETIZACIÓN
// ════════════════════════════════════════════════════════════
var pagoSelectedMethod = null;
var pagoSelectedPlan   = null;

function openPlanesPanel() {
  var scroll = document.getElementById('planesScroll');
  scroll.innerHTML = PLANES.map(function(p) {
    var isCurrent  = planActual.id === p.id;
    var badgeHtml  = p.popular   ? '<div class="plan-popular-badge">⭐ Más popular</div>'
                   : p.destacado ? '<div class="plan-destacado-badge">🏆 Premium</div>'
                   : '';
    var btnLabel   = isCurrent ? '✓ Plan actual' : p.btnLabel;
    var btnClass   = isCurrent ? 'plan-btn plan-btn-current' : 'plan-btn ' + p.btnClass;
    var priceHtml  = p.precio === 0
      ? '<div class="plan-price-free">$0</div>'
      : '<div class="plan-price-val">$' + p.precio + ' <span style="font-size:13px;font-weight:500;color:inherit;">UYU</span></div>';

    return '<div class="plan-card' + (p.popular ? ' popular' : '') + (p.destacado ? ' destacado' : '') + '" style="margin-top:' + (p.popular || p.destacado ? '18px' : '0') + '">'
      + badgeHtml
      + '<div class="plan-header">'
      + '<div><div class="plan-name">' + p.emoji + ' ' + p.nombre + '</div></div>'
      + '<div class="plan-price">' + priceHtml
      + (p.precio > 0 ? '<span class="plan-price-period">' + p.periodo + '</span>' : '')
      + '</div></div>'
      + '<ul class="plan-features">'
      + p.features.map(function(f) {
          return '<li class="' + (f.ok ? '' : 'disabled') + '">'
            + '<span class="pf-icon">' + (f.ok ? '✅' : '⬜') + '</span>'
            + f.txt + '</li>';
        }).join('')
      + '</ul>'
      + (isCurrent
          ? '<button class="' + btnClass + '" disabled>' + btnLabel + '</button>'
          : '<button class="' + btnClass + '" onclick="iniciarPago(\'' + p.id + '\')">' + btnLabel + '</button>')
      + '</div>';
  }).join('');

  document.getElementById('planesPanel').classList.add('open');
}

document.getElementById('planesClose').addEventListener('click', function() {
  document.getElementById('planesPanel').classList.remove('open');
});

// ── FLUJO DE PAGO ──
function iniciarPago(planId) {
  var plan = PLANES.find(function(p) { return p.id === planId; });
  if (!plan) return;
  pagoSelectedPlan   = plan;
  pagoSelectedMethod = null;

  if (plan.precio === 0) {
    savePlan({ id: 'gratis', nombre: 'Gratis', emoji: '🆓', vence: null });
    showToast('Cambiaste al plan Gratis');
    document.getElementById('planesPanel').classList.remove('open');
    return;
  }

  var inner = document.getElementById('pagoInner');
  inner.innerHTML =
    '<div class="pago-title">Suscribite a ' + plan.emoji + ' ' + plan.nombre + '</div>'
    + '<div class="pago-subtitle">Elegí cómo querés pagar</div>'
    + '<div class="pago-resumen">'
    + '<div class="pago-resumen-plan">' + plan.emoji + ' Plan ' + plan.nombre + '</div>'
    + '<div class="pago-resumen-price">$' + plan.precio + ' <span style="font-size:13px;font-weight:500;color:#888;">UYU</span></div>'
    + '<div class="pago-resumen-period">por mes · cancelás cuando querés</div>'
    + '</div>'
    + '<div class="pago-methods-title">Método de pago</div>'

    // Mercado Pago
    + '<div class="pago-method" id="pm-mp" onclick="selectPayMethod(\'mp\')">'
    + '<div class="pago-method-icon">💳</div>'
    + '<div class="pago-method-info"><div class="pago-method-name">Mercado Pago</div><div class="pago-method-sub">Tarjeta, débito, saldo MP o QR</div></div>'
    + '<div class="pago-method-radio" id="pr-mp"></div>'
    + '</div>'
    + '<div class="pago-method-detail" id="pd-mp">'
    + '<div class="mp-logo">Mercado Pago</div>'
    + '<p style="font-size:12px;color:#555;margin-bottom:12px;line-height:1.5;">Al continuar, te redirigimos a Mercado Pago donde podés pagar con tarjeta de crédito, débito, efectivo o saldo de tu cuenta MP.</p>'
    + '<button class="mp-btn" onclick="procesarPagoMP()">💳 Pagar con Mercado Pago — $' + plan.precio + ' UYU</button>'
    + '<p style="font-size:10px;color:#bbb;margin-top:8px;text-align:center;">Pago seguro procesado por Mercado Pago</p>'
    + '</div>'

    // Transferencia bancaria
    + '<div class="pago-method" id="pm-transf" onclick="selectPayMethod(\'transf\')">'
    + '<div class="pago-method-icon">🏦</div>'
    + '<div class="pago-method-info"><div class="pago-method-name">Transferencia bancaria</div><div class="pago-method-sub">BROU, Santander, BBVA, Itaú...</div></div>'
    + '<div class="pago-method-radio" id="pr-transf"></div>'
    + '</div>'
    + '<div class="pago-method-detail" id="pd-transf">'
    + '<div class="transf-data">'
    + '<strong>Banco:</strong> BROU<br>'
    + '<strong>Titular:</strong> CarritosUY SRL<br>'
    + '<strong>Cuenta corriente:</strong> 001234567-00001 <span class="transf-copy" onclick="copyText(\'001234567-00001\')">copiar</span><br>'
    + '<strong>Monto:</strong> $' + plan.precio + ' UYU<br>'
    + '<strong>Concepto:</strong> Plan ' + plan.nombre + ' — tu email<br>'
    + '</div>'
    + '<p style="font-size:11px;color:#888;margin-top:10px;line-height:1.5;">Una vez realizada la transferencia, mandá el comprobante a <strong>pagos@carritosuy.com</strong> y activamos tu plan en menos de 24hs.</p>'
    + '<button class="pago-submit" onclick="confirmarTransferencia()">Ya hice la transferencia</button>'
    + '</div>'

    // Stripe
    + '<div class="pago-method" id="pm-stripe" onclick="selectPayMethod(\'stripe\')">'
    + '<div class="pago-method-icon">💎</div>'
    + '<div class="pago-method-info"><div class="pago-method-name">Tarjeta internacional</div><div class="pago-method-sub">Visa, Mastercard, Amex — vía Stripe</div></div>'
    + '<div class="pago-method-radio" id="pr-stripe"></div>'
    + '</div>'
    + '<div class="pago-method-detail" id="pd-stripe">'
    + '<div class="stripe-field"><label>Número de tarjeta</label><input type="tel" id="stripe-num" placeholder="1234 5678 9012 3456" maxlength="19" oninput="formatCard(this)"/></div>'
    + '<div class="stripe-row">'
    + '<div class="stripe-field"><label>Vencimiento</label><input type="tel" id="stripe-exp" placeholder="MM/AA" maxlength="5" oninput="formatExp(this)"/></div>'
    + '<div class="stripe-field"><label>CVV</label><input type="tel" id="stripe-cvv" placeholder="123" maxlength="4"/></div>'
    + '</div>'
    + '<div class="stripe-field"><label>Nombre en la tarjeta</label><input type="text" id="stripe-name" placeholder="NOMBRE APELLIDO"/></div>'
    + '<p style="font-size:10px;color:#bbb;margin-bottom:10px;">🔒 Pago procesado por Stripe. CarritosUY nunca almacena datos de tu tarjeta.</p>'
    + '<button class="pago-submit" id="stripePayBtn" onclick="procesarStripe()">Pagar $' + plan.precio + ' UYU</button>'
    + '</div>'

    + '<p style="font-size:11px;color:#bbb;text-align:center;margin-top:20px;">Cancelás cuando querés. Sin permanencia.</p>';

  document.getElementById('pagoPanel').classList.add('open');
}

window.selectPayMethod = function(method) {
  ['mp', 'transf', 'stripe'].forEach(function(m) {
    document.getElementById('pm-' + m).classList.toggle('selected', m === method);
    document.getElementById('pd-' + m).classList.toggle('open',     m === method);
  });
  pagoSelectedMethod = method;
};

document.getElementById('pagoClose').addEventListener('click', function() {
  document.getElementById('pagoPanel').classList.remove('open');
});

// ── HELPERS DE FORMATO ──
window.copyText = function(txt) {
  if (navigator.clipboard) navigator.clipboard.writeText(txt);
  showToast('Copiado al portapapeles ✓');
};
window.formatCard = function(inp) {
  var v = inp.value.replace(/\D/g, '').substring(0, 16);
  inp.value = v.replace(/(.{4})/g, '$1 ').trim();
};
window.formatExp = function(inp) {
  var v = inp.value.replace(/\D/g, '');
  if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2, 4);
  inp.value = v;
};

// ── PROCESADORES ──
window.procesarPagoMP = function() {
  showLoader();
  setTimeout(function() {
    hideLoader();
    // TODO (producción): crear preferencia MP vía backend y redirigir a checkout_url
    // Ej: fetch('/api/mp/crear-preferencia', { method:'POST', body: JSON.stringify({ plan: pagoSelectedPlan.id }) })
    //       .then(r => r.json()).then(d => window.location.href = d.checkout_url)
    pagoExito(pagoSelectedPlan, 'Mercado Pago');
  }, 1800);
};

window.confirmarTransferencia = function() {
  showLoader();
  setTimeout(function() {
    hideLoader();
    var inner = document.getElementById('pagoInner');
    inner.innerHTML = '<div class="pago-success">'
      + '<div class="pago-success-icon">📨</div>'
      + '<div class="pago-success-title">¡Transferencia registrada!</div>'
      + '<div class="pago-success-sub">En cuanto recibamos el comprobante activamos tu plan <strong>' + pagoSelectedPlan.nombre + '</strong>.<br><br>'
      + 'Mandá el comprobante a <strong>pagos@carritosuy.com</strong>.<br>Tiempo de activación: menos de 24hs.</div>'
      + '<button class="pago-submit" style="margin-top:24px;" onclick="cerrarPago()">Entendido</button>'
      + '</div>';
  }, 1000);
};

window.procesarStripe = function() {
  var num  = (document.getElementById('stripe-num')  || {}).value || '';
  var exp  = (document.getElementById('stripe-exp')  || {}).value || '';
  var cvv  = (document.getElementById('stripe-cvv')  || {}).value || '';
  var name = (document.getElementById('stripe-name') || {}).value || '';
  if (num.replace(/\s/g, '').length < 16 || exp.length < 5 || cvv.length < 3 || !name.trim()) {
    showToast('Completá todos los campos de la tarjeta');
    return;
  }
  showLoader();
  setTimeout(function() {
    hideLoader();
    // TODO (producción): tokenizar con Stripe.js y enviar token al backend
    // Ej: stripe.createToken(cardElement).then(result => fetch('/api/stripe/cobrar', { ... }))
    pagoExito(pagoSelectedPlan, 'Stripe');
  }, 2000);
};

// ── ÉXITO DE PAGO ──
function pagoExito(plan, metodo) {
  var vence = new Date();
  vence.setMonth(vence.getMonth() + 1);
  savePlan({ id: plan.id, nombre: plan.nombre, emoji: plan.emoji, vence: vence.toLocaleDateString('es-UY'), metodo: metodo });

  // Aplicar badge dorado al marcador si es plan destacado
  if (plan.id === 'destacado' && currentCarrito) {
    var m = leafletMarkers[currentCarrito.id];
    if (m) {
      var goldDiv = document.createElement('div');
      goldDiv.className = 'cm gold';
      goldDiv.textContent = '🏆 ' + currentCarrito.nombre.split(' ').slice(0, 2).join(' ');
      m.setIcon(L.divIcon({ className: '', html: goldDiv.outerHTML, iconAnchor: [0, 12] }));
    }
  }

  var inner = document.getElementById('pagoInner');
  inner.innerHTML = '<div class="pago-success">'
    + '<div class="pago-success-icon">🎉</div>'
    + '<div class="pago-success-title">¡Bienvenido al plan ' + plan.nombre + '!</div>'
    + '<div class="pago-success-sub">Pago recibido vía <strong>' + metodo + '</strong>.<br>'
    + 'Tu plan está activo hasta el <strong>' + vence.toLocaleDateString('es-UY') + '</strong>.<br><br>'
    + 'Ya podés usar todas las funciones de tu plan.</div>'
    + '<button class="pago-submit" style="margin-top:24px;" onclick="cerrarPago()">¡Empezar a usarlo!</button>'
    + '</div>';

  showToast(plan.emoji + ' Plan ' + plan.nombre + ' activado!');
}

window.cerrarPago = function() {
  document.getElementById('pagoPanel').classList.remove('open');
  document.getElementById('planesPanel').classList.remove('open');
  // Refrescar strip del dashboard si está abierto
  var strip = document.getElementById('planStripDashboard');
  if (strip) {
    var plan = PLANES.find(function(p) { return p.id === planActual.id; }) || PLANES[0];
    strip.innerHTML = buildPlanStrip(plan);
  }
};
