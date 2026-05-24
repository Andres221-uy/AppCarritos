// ════════════════════════════════════════════════════════════
//  AUTH — LOGIN / REGISTRO
// ════════════════════════════════════════════════════════════
window.openAuthScreen = function() {
  renderAuthScreen('login', 'email');
  document.getElementById('authScreen').classList.add('open');
};

document.getElementById('btnOpenAuth').addEventListener('click', openAuthScreen);
document.getElementById('authClose').addEventListener('click', function() {
  document.getElementById('authScreen').classList.remove('open');
});

function renderAuthScreen(mode, method) {
  var inner   = document.getElementById('authInner');
  var isLogin = mode === 'login';
  var isEmail = method === 'email';

  if (mode === 'otp') {
    inner.innerHTML =
      '<div class="auth-logo">📱</div>'
      + '<div class="auth-title">Verificá tu número</div>'
      + '<div class="auth-subtitle">Ingresá el código de 6 dígitos que enviamos a<br><strong>' + otpTarget + '</strong></div>'
      + '<div id="authMsg" class="auth-msg"></div>'
      + '<div class="otp-wrap" id="otpWrap">'
      + '<input class="otp-input" maxlength="1" type="tel"/>'
      + '<input class="otp-input" maxlength="1" type="tel"/>'
      + '<input class="otp-input" maxlength="1" type="tel"/>'
      + '<input class="otp-input" maxlength="1" type="tel"/>'
      + '<input class="otp-input" maxlength="1" type="tel"/>'
      + '<input class="otp-input" maxlength="1" type="tel"/>'
      + '</div>'
      + '<button class="auth-submit" id="authSubmit">Confirmar</button>'
      + '<div class="auth-link" id="authResend">Reenviar código</div>';

    var inputs = document.querySelectorAll('.otp-input');
    inputs.forEach(function(inp, i) {
      inp.addEventListener('input', function() { if (inp.value && i < inputs.length - 1) inputs[i + 1].focus(); });
      inp.addEventListener('keydown', function(e) { if (e.key === 'Backspace' && !inp.value && i > 0) inputs[i - 1].focus(); });
    });
    inputs[0].focus();

    document.getElementById('authSubmit').addEventListener('click', function() {
      var code = Array.from(inputs).map(function(i) { return i.value; }).join('');
      if (code.length < 6) { showAuthMsg('Ingresá los 6 dígitos', 'error'); return; }
      verifyOTP(otpTarget, code);
    });
    document.getElementById('authResend').addEventListener('click', function() {
      sendPhoneOTP(otpTarget);
      showAuthMsg('Código reenviado ✓', 'success');
    });
    return;
  }

  inner.innerHTML =
    '<div class="auth-logo">🛒</div>'
    + '<div class="auth-title">' + (isLogin ? 'Bienvenido de vuelta' : 'Crear cuenta') + '</div>'
    + '<div class="auth-subtitle">' + (isLogin ? 'Ingresá para guardar favoritos y dejar reseñas' : 'Registrate gratis') + '</div>'
    + '<div class="auth-tabs">'
    + '<button class="auth-tab' + (isLogin ? ' active' : '') + '" id="tabLogin">Ingresar</button>'
    + '<button class="auth-tab' + (!isLogin ? ' active' : '') + '" id="tabRegister">Registrarme</button>'
    + '</div>'
    + (!isLogin
      ? '<div class="auth-role-toggle">'
        + '<button class="role-btn active" id="roleCliente" data-role="cliente"><span class="role-btn-emoji">🙋</span><div class="role-btn-label">Soy cliente</div><div class="role-btn-sub">Busco carritos</div></button>'
        + '<button class="role-btn" id="roleDueno" data-role="dueno"><span class="role-btn-emoji">🛒</span><div class="role-btn-label">Soy dueño</div><div class="role-btn-sub">Tengo un carrito</div></button>'
        + '</div>'
      : '')
    + '<div class="auth-method-toggle">'
    + '<button class="method-btn' + (isEmail ? ' active' : '') + '" id="methEmail">✉️ Email</button>'
    + '<button class="method-btn' + (!isEmail ? ' active' : '') + '" id="methPhone">📱 Teléfono</button>'
    + '</div>'
    + '<div id="authMsg" class="auth-msg"></div>'
    + (isEmail
      ? '<div class="field"><label>Email</label><input type="email" id="authEmail" placeholder="tu@email.com" autocomplete="email"/></div>'
        + '<div class="field"><label>Contraseña</label><input type="password" id="authPass" placeholder="Mínimo 6 caracteres" autocomplete="' + (isLogin ? 'current-password' : 'new-password') + '"/></div>'
        + (!isLogin ? '<div class="field"><label>Confirmar contraseña</label><input type="password" id="authPass2" placeholder="Repetí la contraseña"/></div>' : '')
      : '<div class="field"><label>Número de celular</label>'
        + '<div class="phone-wrap">'
        + '<input class="phone-prefix" type="tel" id="authPrefix" value="+598" placeholder="+598"/>'
        + '<input type="tel" id="authPhone" placeholder="99 123 456" style="flex:1"/>'
        + '</div></div>'
    )
    + (!isLogin && isEmail ? '<div class="field"><label>Nombre o apodo</label><input type="text" id="authName" placeholder="¿Cómo te llamás?"/></div>' : '')
    + '<button class="auth-submit" id="authSubmit">'
    + (isEmail ? (isLogin ? 'Ingresar' : 'Crear cuenta') : 'Enviar código SMS')
    + '</button>';

  document.getElementById('tabLogin').addEventListener('click',    function() { renderAuthScreen('login', method); });
  document.getElementById('tabRegister').addEventListener('click', function() { renderAuthScreen('register', method); });
  document.getElementById('methEmail').addEventListener('click',   function() { renderAuthScreen(mode, 'email'); });
  document.getElementById('methPhone').addEventListener('click',   function() { renderAuthScreen(mode, 'phone'); });

  if (!isLogin) {
    var activeRole = 'cliente';
    document.querySelectorAll('.role-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.role-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        activeRole = btn.dataset.role;
      });
    });
    document.getElementById('authSubmit').addEventListener('click', function() {
      if (isEmail) doEmailRegister(activeRole); else doPhoneRegister();
    });
  } else {
    document.getElementById('authSubmit').addEventListener('click', function() {
      if (isEmail) doEmailLogin(); else doPhoneLogin();
    });
  }
}

function showAuthMsg(txt, type) {
  var el = document.getElementById('authMsg');
  if (!el) return;
  el.textContent = txt;
  el.className = 'auth-msg ' + type;
}

function doEmailRegister(role) {
  var email = (document.getElementById('authEmail') || {}).value || '';
  var pass  = (document.getElementById('authPass')  || {}).value || '';
  var pass2 = (document.getElementById('authPass2') || {}).value || '';
  var name  = (document.getElementById('authName')  || {}).value || '';
  if (!email || !pass) { showAuthMsg('Completá todos los campos', 'error'); return; }
  if (pass.length < 6) { showAuthMsg('La contraseña debe tener al menos 6 caracteres', 'error'); return; }
  if (pass !== pass2)  { showAuthMsg('Las contraseñas no coinciden', 'error'); return; }
  showLoader();
  sb.auth.signUp({
    email: email,
    password: pass,
    options: { data: { nombre: name || email.split('@')[0], role: role } }
  }).then(function(res) {
    hideLoader();
    if (res.error) { showAuthMsg(res.error.message, 'error'); return; }
    showAuthMsg('¡Cuenta creada! Revisá tu email para confirmar.', 'success');
    setTimeout(function() { document.getElementById('authScreen').classList.remove('open'); }, 2000);
    if (role === 'dueno') { setTimeout(function() { openPlanesPanel(); }, 2600); }
  });
}

function doEmailLogin() {
  var email = (document.getElementById('authEmail') || {}).value || '';
  var pass  = (document.getElementById('authPass')  || {}).value || '';
  if (!email || !pass) { showAuthMsg('Completá todos los campos', 'error'); return; }
  showLoader();
  sb.auth.signInWithPassword({ email: email, password: pass }).then(function(res) {
    hideLoader();
    if (res.error) { showAuthMsg(res.error.message, 'error'); return; }
    document.getElementById('authScreen').classList.remove('open');
    onAuthSuccess(res.data.user);
  });
}

function doPhoneRegister() {
  var prefix = (document.getElementById('authPrefix') || {}).value || '+598';
  var phone  = (document.getElementById('authPhone')  || {}).value || '';
  var full   = prefix.replace(/\s/g, '') + phone.replace(/\s/g, '');
  if (phone.length < 7) { showAuthMsg('Ingresá un número válido', 'error'); return; }
  sendPhoneOTP(full);
}
function doPhoneLogin() { doPhoneRegister(); }

function sendPhoneOTP(phone) {
  showLoader();
  otpTarget = phone;
  sb.auth.signInWithOtp({ phone: phone }).then(function(res) {
    hideLoader();
    if (res.error) { showAuthMsg(res.error.message, 'error'); return; }
    renderAuthScreen('otp', 'phone');
  });
}

function verifyOTP(phone, token) {
  showLoader();
  sb.auth.verifyOtp({ phone: phone, token: token, type: 'sms' }).then(function(res) {
    hideLoader();
    if (res.error) { showAuthMsg('Código incorrecto. Intentá de nuevo.', 'error'); return; }
    document.getElementById('authScreen').classList.remove('open');
    onAuthSuccess(res.data.user);
  });
}

function onAuthSuccess(user) {
  currentUser = user;
  updateHeaderAuth(user);
  sb.from('profiles').select('*').eq('id', user.id).single().then(function(res) {
    if (res.data) currentProfile = res.data;
  });
}

function updateHeaderAuth(user) {
  var area = document.getElementById('authArea');
  if (!user) {
    area.innerHTML = '<button class="auth-btn auth-btn-login" id="btnOpenAuth">Entrar</button>';
    document.getElementById('btnOpenAuth').addEventListener('click', openAuthScreen);
    return;
  }
  var initial = (user.email || user.phone || 'U').charAt(0).toUpperCase();
  area.innerHTML = '<button class="auth-btn-avatar" id="btnUserMenu">' + initial + '</button>';
  document.getElementById('btnUserMenu').addEventListener('click', openUserMenu);
}

// Escuchar cambios de sesión
sb.auth.onAuthStateChange(function(event, session) {
  if (session && session.user) { onAuthSuccess(session.user); }
  else { currentUser = null; currentProfile = null; updateHeaderAuth(null); }
});
